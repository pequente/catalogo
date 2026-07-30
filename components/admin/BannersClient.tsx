"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminBusy } from "@/components/admin/AdminBusy";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { FieldHint } from "@/components/admin/FieldHint";
import { ImageField, type ImageMeta } from "@/components/admin/ImageField";
import { LoadingButton } from "@/components/admin/LoadingButton";
import { mutationFetch, assertMutationOk } from "@/components/admin/mutationFetch";
import {
  toastMutationError,
  toastMutationSuccess,
  toastMutationWarning,
} from "@/components/admin/adminToast";
import {
  UPLOAD_SOFT_LIMIT_BYTES,
  buildMutationFormData,
  createLocalImageDraft,
  revokePreviewUrl,
  validateImageFile,
} from "@/components/admin/uploadClient";
import {
  getBannerSlotsForLayout,
  getPublishedSlotCapacity,
  type LayoutBannerSlot,
} from "@/components/public/layouts/banner-slots";
import { DEFAULT_BANNER_CTA } from "@/src/config/store-copy-defaults";
import { mediaUrl } from "@/src/lib/front/format";
import type { Banner, BannerPosicao } from "@/src/schemas/banner";
import type { SiteLayoutId } from "@/src/schemas/site-config";

type SlotDraft = {
  ativo: boolean;
  imagem: ImageMeta | null;
};

type LinkDraft = {
  href: string;
  ctaTexto: string;
};

function imageFromBanner(b: Banner): ImageMeta {
  return {
    id: b.imagem.id,
    path: b.imagem.path,
    alt: b.imagem.alt,
  };
}

function pickPrimary(banners: Banner[]): Banner | null {
  return (
    [...banners].sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      return a.ordem - b.ordem;
    })[0] ?? null
  );
}

function sortByOrdem(banners: Banner[]): Banner[] {
  return [...banners].sort((a, b) => a.ordem - b.ordem);
}

function isValidBannerHref(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  return (
    t.startsWith("/") || t.startsWith("http://") || t.startsWith("https://")
  );
}

export function BannersClient({
  initialItems,
  layout,
  publishedLayout,
  embedded = false,
  onItemsChange,
}: {
  initialItems: Banner[];
  layout: SiteLayoutId;
  /** Layout already published — capacity validation uses this. */
  publishedLayout?: SiteLayoutId;
  /** Omit page header when nested inside Configurações tabs. */
  embedded?: boolean;
  onItemsChange?: (items: Banner[]) => void;
}) {
  const { confirm } = useConfirm();
  const { runMutation } = useAdminBusy();
  const [items, setItems] = useState<Banner[]>(initialItems);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Partial<Record<BannerPosicao, SlotDraft>>
  >({});
  const effectivePublished = publishedLayout ?? layout;
  const layoutDraft = layout !== effectivePublished;
  const slots = useMemo(() => getBannerSlotsForLayout(layout), [layout]);

  useEffect(() => {
    onItemsChange?.(items);
    // Notify parent for live preview; intentionally omit onItemsChange identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const byPosicao = useMemo(() => {
    const map = {} as Partial<Record<BannerPosicao, Banner[]>>;
    for (const slot of slots) map[slot.posicao] = [];
    for (const b of items) {
      if (map[b.posicao]) map[b.posicao]!.push(b);
    }
    return map;
  }, [items, slots]);

  async function load() {
    const res = await fetch("/api/v1/admin/banners");
    const data = await res.json();
    const next = data.items ?? [];
    setItems(next);
    return next as Banner[];
  }

  function clearDraft(posicao: BannerPosicao) {
    setDrafts((prev) => {
      const next = { ...prev };
      const draft = next[posicao];
      if (draft?.imagem?.previewUrl) revokePreviewUrl(draft.imagem.previewUrl);
      delete next[posicao];
      return next;
    });
  }

  function slotState(posicao: BannerPosicao) {
    const group = byPosicao[posicao] ?? [];
    const primary = pickPrimary(group);
    const extras = primary
      ? group.filter((b) => b.id !== primary.id)
      : group;
    const draft = drafts[posicao];
    const ativo = draft?.ativo ?? primary?.ativo ?? true;
    const imagem =
      draft?.imagem !== undefined
        ? draft.imagem
        : primary
          ? imageFromBanner(primary)
          : null;
    return { primary, extras, ativo, imagem };
  }

  function updateDraft(
    posicao: BannerPosicao,
    patch: Partial<SlotDraft>,
    baseline?: SlotDraft,
  ) {
    setDrafts((prev) => {
      const current =
        prev[posicao] ??
        baseline ?? {
          ativo: true,
          imagem: null,
        };
      return {
        ...prev,
        [posicao]: { ...current, ...patch },
      };
    });
  }

  function slotLock(slot: LayoutBannerSlot): {
    locked: boolean;
    reason: string | null;
    publishedMax: number;
  } {
    const publishedMax = getPublishedSlotCapacity(
      effectivePublished,
      slot.posicao,
    );
    if (publishedMax <= 0) {
      return {
        locked: true,
        publishedMax: 0,
        reason:
          "Esta área só fica disponível depois que você salvar o novo modelo.",
      };
    }
    return { locked: false, publishedMax, reason: null };
  }

  async function saveBanner(opts: {
    key: string;
    label: string;
    existing?: Banner | null;
    posicao: BannerPosicao;
    ativo: boolean;
    imagem: ImageMeta;
  }) {
    const { key, label, existing, posicao, ativo, imagem } = opts;
    const slotLabel =
      slots.find((s) => s.posicao === posicao)?.label ?? posicao;

    const imagemPayload = imagem.file
      ? {
          id: imagem.id,
          path: "",
          alt: slotLabel,
          pending: true as const,
        }
      : {
          id: imagem.id,
          path: imagem.path,
          alt: slotLabel,
        };

    const pendingFiles = imagem.file
      ? [{ id: imagem.id, file: imagem.file }]
      : [];
    const hasUploads = pendingFiles.length > 0;

    setBusyKey(key);
    try {
      await runMutation(
        { label, determinate: hasUploads },
        async ({ setProgress }) => {
          const payload = existing
            ? {
                versao: existing.versao,
                ativo,
                imagem: imagemPayload,
              }
            : {
                posicao,
                ativo,
                imagem: imagemPayload,
              };

          const res = await mutationFetch(
            existing
              ? `/api/v1/admin/banners/${existing.id}`
              : "/api/v1/admin/banners",
            {
              method: existing ? "PATCH" : "POST",
              body: buildMutationFormData(payload, pendingFiles),
            },
            {
              onUploadProgress: hasUploads ? setProgress : undefined,
            },
          );
          const data = await res.json();
          assertMutationOk(res, data, "Erro ao salvar banner");
          clearDraft(posicao);
          await load();
        },
      );
    } catch (err) {
      toastMutationError(err, { id: "banner-save" });
    } finally {
      setBusyKey(null);
    }
  }

  async function patchBanner(
    banner: Banner,
    body: Record<string, unknown>,
    key: string,
    label: string,
  ) {
    setBusyKey(key);
    try {
      await runMutation({ label }, async () => {
        const res = await mutationFetch(`/api/v1/admin/banners/${banner.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versao: banner.versao, ...body }),
        });
        const data = await res.json();
        assertMutationOk(res, data, label);
        await load();
      });
    } catch (err) {
      toastMutationError(err, { id: "banner-patch" });
      throw err;
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleAtivo(posicao: BannerPosicao) {
    const { primary, ativo, imagem } = slotState(posicao);
    const next = !ativo;

    if (!primary) {
      updateDraft(posicao, { ativo: next, imagem }, { ativo, imagem });
      return;
    }

    if (drafts[posicao]?.imagem?.file) {
      updateDraft(posicao, { ativo: next });
      return;
    }

    try {
      await patchBanner(
        primary,
        { ativo: next },
        `${posicao}:toggle`,
        "Atualizando status",
      );
      clearDraft(posicao);
    } catch {
      /* error already surfaced */
    }
  }

  async function postBannerCreate(
    posicao: BannerPosicao,
    imagem: ImageMeta,
    setProgress?: (value: number) => void,
  ) {
    const slotLabel =
      slots.find((s) => s.posicao === posicao)?.label ?? posicao;
    const imagemPayload = {
      id: imagem.id,
      path: "",
      alt: slotLabel,
      pending: true as const,
    };
    const pendingFiles = imagem.file
      ? [{ id: imagem.id, file: imagem.file }]
      : [];
    const hasUploads = pendingFiles.length > 0;

    const res = await mutationFetch(
      "/api/v1/admin/banners",
      {
        method: "POST",
        body: buildMutationFormData(
          { posicao, ativo: true, imagem: imagemPayload },
          pendingFiles,
        ),
      },
      {
        onUploadProgress: hasUploads ? setProgress : undefined,
      },
    );
    const data = await res.json();
    assertMutationOk(res, data, "Erro ao criar banner");
  }

  async function addSlides(posicao: BannerPosicao, images: ImageMeta[]) {
    if (!images.length) return;
    const slot = slots.find((s) => s.posicao === posicao);
    const publishedMax = getPublishedSlotCapacity(effectivePublished, posicao);
    const currentCount = (byPosicao[posicao] ?? []).length;
    const remaining = Math.min(
      (slot?.maxItems ?? images.length) - currentCount,
      publishedMax - currentCount,
    );
    const batch = images.slice(0, Math.max(0, remaining));
    if (!batch.length) {
      toastMutationWarning(
        layoutDraft && publishedMax < (slot?.maxItems ?? 0)
          ? "Salve o novo modelo antes de adicionar mais slides."
          : `Limite de ${slot?.maxItems ?? 0} slides atingido.`,
        { id: "banner-limit" },
      );
      return;
    }

    setBusyKey(`${posicao}:save`);
    try {
      await runMutation(
        {
          label:
            batch.length === 1
              ? `Criando ${slot?.label ?? "slide"}`
              : `Adicionando ${batch.length} slides`,
          determinate: true,
        },
        async ({ setProgress }) => {
          for (let i = 0; i < batch.length; i++) {
            const base = (i / batch.length) * 100;
            const span = 100 / batch.length;
            await postBannerCreate(posicao, batch[i]!, (p) => {
              setProgress(base + (p / 100) * span);
            });
            setProgress(((i + 1) / batch.length) * 100);
          }
          await load();
        },
      );
    } catch (err) {
      toastMutationError(err, { id: "banner-add-slides" });
      await load().catch(() => undefined);
    } finally {
      for (const img of images) revokePreviewUrl(img.previewUrl);
      setBusyKey(null);
    }
  }

  async function reorderSlides(posicao: BannerPosicao, orderedIds: string[]) {
    const group = sortByOrdem(byPosicao[posicao] ?? []);
    const currentIds = group.map((b) => b.id);
    if (
      orderedIds.length !== currentIds.length ||
      orderedIds.every((id, i) => id === currentIds[i])
    ) {
      return;
    }

    const byId = new Map(group.map((b) => [b.id, b]));
    for (const id of orderedIds) {
      if (!byId.has(id)) return;
    }

    setBusyKey(`${posicao}:move`);
    try {
      await runMutation({ label: "Reordenando" }, async () => {
        const working = new Map(
          group.map((b) => [b.id, { versao: b.versao, ordem: b.ordem }]),
        );

        for (let i = 0; i < orderedIds.length; i++) {
          const id = orderedIds[i]!;
          const current = working.get(id)!;
          if (current.ordem === i) continue;

          const res = await mutationFetch(`/api/v1/admin/banners/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ versao: current.versao, ordem: i }),
          });
          const data = await res.json();
          assertMutationOk(res, data, "Erro ao reordenar");
          const updated = data as Banner;
          working.set(id, { versao: updated.versao, ordem: updated.ordem });
        }
        await load();
      });
    } catch (err) {
      toastMutationError(err, { id: "banner-reorder" });
      await load().catch(() => undefined);
    } finally {
      setBusyKey(null);
    }
  }

  function moveSlide(posicao: BannerPosicao, bannerId: string, direction: -1 | 1) {
    const group = sortByOrdem(byPosicao[posicao] ?? []);
    const idx = group.findIndex((b) => b.id === bannerId);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= group.length) return;
    const ordered = group.map((b) => b.id);
    const [id] = ordered.splice(idx, 1);
    ordered.splice(target, 0, id!);
    void reorderSlides(posicao, ordered);
  }

  async function removeBanner(id: string, posicao: BannerPosicao) {
    const ok = await confirm({
      title: "Excluir banner?",
      description: "A imagem associada também será removida.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setBusyKey(`${id}:delete`);
    try {
      await runMutation({ label: "Excluindo banner" }, async () => {
        const res = await mutationFetch(`/api/v1/admin/banners/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        assertMutationOk(res, data, "Erro ao excluir");
        clearDraft(posicao);
        await load();
      });
    } catch (err) {
      toastMutationError(err, { id: "banner-delete" });
    } finally {
      setBusyKey(null);
    }
  }

  const anyBusy = busyKey !== null;
  const multiColumn = slots.length > 1;

  const body = (
    <>
      {!embedded ? (
        <header className="admin-page__header">
          <div className="admin-page__intro">
            <p className="admin-page__eyebrow">Vitrine</p>
            <h1 className="admin-page__title">Banners</h1>
            <p className="admin-page__desc">
              Áreas disponíveis conforme o layout selecionado em Configurações.
              Ao escolher a imagem, o banner é criado ou atualizado
              automaticamente.
            </p>
          </div>
        </header>
      ) : null}

      <div
        className={
          multiColumn
            ? "admin-banner-slots"
            : "admin-banner-slots admin-banner-slots--single"
        }
      >
        {slots.map((slot, index) => {
          const lock = slotLock(slot);
          return slot.maxItems > 1 ? (
            <MultiBannerSlot
              key={slot.posicao}
              step={index + 1}
              slot={slot}
              items={sortByOrdem(byPosicao[slot.posicao] ?? [])}
              anyBusy={anyBusy}
              busyKey={busyKey}
              locked={lock.locked}
              lockReason={lock.reason}
              publishedMax={lock.publishedMax}
              layoutDraft={layoutDraft}
              onAdd={(images) => void addSlides(slot.posicao, images)}
              onReplace={(banner, imagem) => {
                void saveBanner({
                  key: `${banner.id}:save`,
                  label: "Atualizando slide",
                  existing: banner,
                  posicao: slot.posicao,
                  ativo: banner.ativo,
                  imagem,
                }).finally(() => revokePreviewUrl(imagem.previewUrl));
              }}
              onToggle={(banner) =>
                void patchBanner(
                  banner,
                  { ativo: !banner.ativo },
                  `${banner.id}:toggle`,
                  "Atualizando status",
                ).catch(() => undefined)
              }
              onSaveDetails={(banner, details) =>
                void patchBanner(
                  banner,
                  {
                    href: details.href.trim() || null,
                    ctaTexto: details.ctaTexto.trim() || null,
                  },
                  `${banner.id}:details`,
                  "Salvando detalhes",
                )
                  .then(() =>
                    toastMutationSuccess("Detalhes do slide salvos", {
                      id: "banner-details",
                    }),
                  )
                  .catch(() => undefined)
              }
              onReorder={(orderedIds) =>
                void reorderSlides(slot.posicao, orderedIds)
              }
              onMove={(bannerId, dir) =>
                moveSlide(slot.posicao, bannerId, dir)
              }
              onRemove={(id) => void removeBanner(id, slot.posicao)}
            />
          ) : (
            <SingleBannerSlot
              key={slot.posicao}
              step={index + 1}
              slot={slot}
              state={slotState(slot.posicao)}
              draft={drafts[slot.posicao]}
              anyBusy={anyBusy}
              busyKey={busyKey}
              locked={lock.locked}
              lockReason={lock.reason}
              onUpdateDraft={updateDraft}
              onCommit={(imagem, ativo) => {
                if (lock.locked) {
                  toastMutationWarning(
                    lock.reason ?? "Salve o modelo antes de editar esta área.",
                    { id: "banner-locked" },
                  );
                  return;
                }
                const { primary } = slotState(slot.posicao);
                void saveBanner({
                  key: `${slot.posicao}:save`,
                  label: primary
                    ? `Atualizando ${slot.label}`
                    : `Criando ${slot.label}`,
                  existing: primary,
                  posicao: slot.posicao,
                  ativo,
                  imagem,
                });
              }}
              onToggle={() => {
                if (lock.locked) return;
                void toggleAtivo(slot.posicao);
              }}
              onSaveDetails={(banner, details) =>
                void patchBanner(
                  banner,
                  {
                    href: details.href.trim() || null,
                    ctaTexto: slot.temBotao
                      ? details.ctaTexto.trim() || null
                      : undefined,
                  },
                  `${banner.id}:details`,
                  "Salvando detalhes",
                )
                  .then(() =>
                    toastMutationSuccess("Detalhes do banner salvos", {
                      id: "banner-details",
                    }),
                  )
                  .catch(() => undefined)
              }
              onRemove={(id) => void removeBanner(id, slot.posicao)}
            />
          );
        })}
      </div>
    </>
  );

  if (embedded) {
    return <div className="admin-banners-embed">{body}</div>;
  }

  return <div className="admin-page">{body}</div>;
}

function BannerLinkFields({
  banner,
  temBotao,
  disabled,
  busy,
  onSave,
}: {
  banner: Banner;
  temBotao: boolean;
  disabled: boolean;
  busy: boolean;
  onSave: (details: LinkDraft) => void;
}) {
  const [href, setHref] = useState(banner.href ?? "");
  const [ctaTexto, setCtaTexto] = useState(banner.ctaTexto ?? "");
  const [hrefError, setHrefError] = useState<string | null>(null);

  useEffect(() => {
    setHref(banner.href ?? "");
    setCtaTexto(banner.ctaTexto ?? "");
    setHrefError(null);
  }, [banner.id, banner.versao, banner.href, banner.ctaTexto]);

  const dirty =
    href.trim() !== (banner.href ?? "").trim() ||
    (temBotao && ctaTexto.trim() !== (banner.ctaTexto ?? "").trim());

  return (
    <div className="admin-banner-slot__details">
      <label className="admin-banner-slot__field">
        <span className="admin-field-label">
          Destino ao clicar
          <FieldHint text="Caminho interno (ex.: /catalogo) ou link completo começando com https://. Deixe em branco para abrir o catálogo." />
        </span>
        <input
          className="input"
          type="text"
          inputMode="url"
          placeholder="/catalogo"
          value={href}
          disabled={disabled || busy}
          onChange={(e) => {
            setHref(e.target.value);
            setHrefError(null);
          }}
        />
        {hrefError ? (
          <span className="admin-banner-slot__field-error">{hrefError}</span>
        ) : (
          <span className="admin-banner-slot__field-hint">
            Ex.: /catalogo ou https://sua-loja.com/oferta
          </span>
        )}
      </label>

      {temBotao ? (
        <label className="admin-banner-slot__field">
          <span className="admin-field-label">
            Texto do botão
            <FieldHint text="Texto exibido no botão sobre a imagem. Deixe em branco para usar o texto padrão da loja." />
          </span>
          <input
            className="input"
            type="text"
            maxLength={80}
            placeholder={DEFAULT_BANNER_CTA}
            value={ctaTexto}
            disabled={disabled || busy}
            onChange={(e) => setCtaTexto(e.target.value)}
          />
        </label>
      ) : (
        <p className="admin-banner-slot__field-hint">
          Nesta área, a imagem inteira é o link — não há botão separado.
        </p>
      )}

      <div className="admin-banner-slot__actions">
        <LoadingButton
          type="button"
          className="btn btn-sm btn-primary"
          loading={busy}
          loadingLabel="Salvando…"
          disabled={disabled || !dirty}
          onClick={() => {
            if (!isValidBannerHref(href)) {
              setHrefError(
                "Use um caminho começando com / ou uma URL http(s).",
              );
              return;
            }
            onSave({ href, ctaTexto });
          }}
        >
          Salvar detalhes
        </LoadingButton>
      </div>
    </div>
  );
}

function SingleBannerSlot({
  step,
  slot,
  state,
  draft,
  anyBusy,
  busyKey,
  locked,
  lockReason,
  onUpdateDraft,
  onCommit,
  onToggle,
  onSaveDetails,
  onRemove,
}: {
  step: number;
  slot: LayoutBannerSlot;
  state: {
    primary: Banner | null;
    extras: Banner[];
    ativo: boolean;
    imagem: ImageMeta | null;
  };
  draft?: SlotDraft;
  anyBusy: boolean;
  busyKey: string | null;
  locked: boolean;
  lockReason: string | null;
  onUpdateDraft: (
    posicao: BannerPosicao,
    patch: Partial<SlotDraft>,
    baseline?: SlotDraft,
  ) => void;
  onCommit: (imagem: ImageMeta, ativo: boolean) => void;
  onToggle: () => void;
  onSaveDetails: (banner: Banner, details: LinkDraft) => void;
  onRemove: (id: string) => void;
}) {
  const { primary, extras, ativo, imagem } = state;
  const saving = busyKey === `${slot.posicao}:save`;
  const detailsBusy = primary
    ? busyKey === `${primary.id}:details`
    : false;
  const pendingFile = Boolean(draft?.imagem?.file);
  const disabled = anyBusy || locked;

  return (
    <section
      className={[
        "admin-panel",
        "admin-banner-slot",
        locked ? "admin-banner-slot--locked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${step}. ${slot.label}`}
    >
      <div className="admin-panel__head admin-banner-slot__head">
        <div className="admin-banner-slot__title-row">
          <span className="admin-banner-slot__step" aria-hidden>
            {step}
          </span>
          <h2>{slot.label}</h2>
        </div>
        <span
          className="admin-banner-slot__ratio"
          style={{ aspectRatio: slot.aspectRatio }}
          title={`Proporção aproximada · ${slot.dimensaoIdeal}`}
          aria-hidden
        />
      </div>
      <div className="admin-panel__body">
        <p className="admin-banner-slot__where">
          <strong>Onde aparece:</strong> {slot.ondeAparece}
        </p>
        <p className="admin-banner-slot__hint">
          Tamanho ideal: <strong>{slot.dimensaoIdeal}</strong>. JPEG ou PNG.
        </p>

        {locked && lockReason ? (
          <p className="admin-alert admin-alert--warn" role="status">
            {lockReason}
          </p>
        ) : null}

        <ImageField
          dominio="banners"
          value={imagem}
          showAlt={false}
          showRemove={!primary}
          required={!primary}
          disabled={disabled}
          onChange={(next) => {
            const baseline = {
              ativo,
              imagem: primary ? imageFromBanner(primary) : null,
            };
            if (next === null) {
              onUpdateDraft(slot.posicao, { imagem: null }, baseline);
              return;
            }
            onUpdateDraft(slot.posicao, { imagem: next, ativo }, baseline);
            onCommit(next, ativo);
          }}
        />

        {saving ? (
          <p className="admin-banner-slot__hint" aria-live="polite">
            Salvando imagem e definição do banner…
          </p>
        ) : null}

        <label className="admin-banner-slot__status">
          <span>Status na loja</span>
          <select
            className="select"
            value={ativo ? "ativo" : "inativo"}
            disabled={disabled || !primary}
            onChange={onToggle}
          >
            <option value="ativo">Ativo — aparece na vitrine</option>
            <option value="inativo">Inativo — oculto na vitrine</option>
          </select>
        </label>

        {primary && !locked ? (
          <BannerLinkFields
            banner={primary}
            temBotao={slot.temBotao}
            disabled={anyBusy}
            busy={detailsBusy}
            onSave={(details) => onSaveDetails(primary, details)}
          />
        ) : null}

        {pendingFile && imagem?.file && !saving ? (
          <div className="admin-banner-slot__actions">
            <LoadingButton
              type="button"
              className="btn btn-primary"
              loading={false}
              disabled={disabled}
              onClick={() => onCommit(imagem, ativo)}
            >
              Tentar novamente
            </LoadingButton>
          </div>
        ) : null}

        {primary ? (
          <div className="admin-banner-slot__actions">
            <LoadingButton
              type="button"
              className="btn btn-sm btn-ghost-danger"
              loading={busyKey === `${primary.id}:delete`}
              loadingLabel="Excluindo…"
              disabled={anyBusy}
              onClick={() => onRemove(primary.id)}
            >
              Excluir
            </LoadingButton>
          </div>
        ) : null}

        {extras.length > 0 ? (
          <div className="admin-banner-slot__extras">
            <p className="admin-alert">
              Há {extras.length}{" "}
              {extras.length === 1 ? "banner extra" : "banners extras"} nesta
              área. Exclua os duplicados.
            </p>
            <ul className="admin-banner-slot__extra-list">
              {extras.map((extra) => (
                <li key={extra.id}>
                  <span>
                    {extra.ativo ? "Ativo" : "Inativo"} · v{extra.versao}
                  </span>
                  <LoadingButton
                    type="button"
                    className="btn-quiet btn-quiet--danger"
                    loading={busyKey === `${extra.id}:delete`}
                    loadingLabel="Excluindo…"
                    disabled={anyBusy}
                    onClick={() => onRemove(extra.id)}
                  >
                    Excluir
                  </LoadingButton>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MultiBannerSlot({
  step,
  slot,
  items,
  anyBusy,
  busyKey,
  locked,
  lockReason,
  publishedMax,
  layoutDraft,
  onAdd,
  onReplace,
  onToggle,
  onSaveDetails,
  onReorder,
  onMove,
  onRemove,
}: {
  step: number;
  slot: LayoutBannerSlot;
  items: Banner[];
  anyBusy: boolean;
  busyKey: string | null;
  locked: boolean;
  lockReason: string | null;
  publishedMax: number;
  layoutDraft: boolean;
  onAdd: (images: ImageMeta[]) => void;
  onReplace: (banner: Banner, imagem: ImageMeta) => void;
  onToggle: (banner: Banner) => void;
  onSaveDetails: (banner: Banner, details: LinkDraft) => void;
  onReorder: (orderedIds: string[]) => void;
  onMove: (bannerId: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<Banner | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const effectiveMax = Math.min(slot.maxItems, Math.max(publishedMax, 0));
  const remaining = effectiveMax - items.length;
  const canAdd = !anyBusy && !locked && remaining > 0;
  const saving = busyKey === `${slot.posicao}:save`;
  const moving = busyKey === `${slot.posicao}:move`;
  const pendingCapacity =
    layoutDraft && publishedMax > 0 && publishedMax < slot.maxItems;

  function filesToDrafts(fileList: FileList | null): ImageMeta[] {
    if (!fileList?.length) return [];
    setStatus(null);
    const files = Array.from(fileList).slice(0, Math.max(0, remaining));
    if (!files.length) {
      toastMutationWarning(
        pendingCapacity
          ? "Salve o novo modelo antes de adicionar mais slides."
          : `Limite de ${slot.maxItems} slides atingido.`,
        { id: "banner-slot-limit" },
      );
      return [];
    }

    const drafts: ImageMeta[] = [];
    for (const file of files) {
      const validation = validateImageFile(file);
      if (validation) {
        toastMutationWarning(validation, { id: "banner-file-validation" });
        continue;
      }
      if (file.size > UPLOAD_SOFT_LIMIT_BYTES) {
        setStatus("Arquivo acima de 5 MB — o envio pode demorar.");
      }
      try {
        const draft = createLocalImageDraft(file);
        drafts.push({
          id: draft.id,
          path: "",
          alt: slot.label,
          file: draft.file,
          previewUrl: draft.previewUrl,
          pending: true,
        });
      } catch (err) {
        toastMutationWarning(
          err instanceof Error ? err.message : "Arquivo inválido",
          { id: "banner-file-validation" },
        );
      }
    }
    return drafts;
  }

  function handleAddFiles(fileList: FileList | null) {
    const drafts = filesToDrafts(fileList);
    if (addInputRef.current) addInputRef.current.value = "";
    if (drafts.length) onAdd(drafts);
  }

  function openAddPicker() {
    if (!canAdd) return;
    addInputRef.current?.click();
  }

  function openReplacePicker(banner: Banner) {
    if (anyBusy || locked) return;
    replaceTargetRef.current = banner;
    replaceInputRef.current?.click();
  }

  function handleReplaceFile(fileList: FileList | null) {
    const banner = replaceTargetRef.current;
    replaceTargetRef.current = null;
    if (replaceInputRef.current) replaceInputRef.current.value = "";
    if (!banner || !fileList?.[0]) return;

    const file = fileList[0];
    const validation = validateImageFile(file);
    if (validation) {
      toastMutationWarning(validation, { id: "banner-file-validation" });
      return;
    }
    try {
      const draft = createLocalImageDraft(file);
      onReplace(banner, {
        id: draft.id,
        path: "",
        alt: slot.label,
        file: draft.file,
        previewUrl: draft.previewUrl,
        pending: true,
      });
    } catch (err) {
      toastMutationWarning(
        err instanceof Error ? err.message : "Arquivo inválido",
        { id: "banner-file-validation" },
      );
    }
  }

  function reorderById(fromId: string, toId: string) {
    if (fromId === toId || anyBusy) return;
    const from = items.findIndex((b) => b.id === fromId);
    const to = items.findIndex((b) => b.id === toId);
    if (from < 0 || to < 0) return;
    const next = items.map((b) => b.id);
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id!);
    onReorder(next);
  }

  function onDropFiles(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!canAdd) return;
    handleAddFiles(e.dataTransfer.files);
  }

  const dropzoneHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      if (canAdd && e.dataTransfer.types.includes("Files")) setDragOver(true);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (canAdd && e.dataTransfer.types.includes("Files")) setDragOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragOver(false);
      }
    },
    onDrop: onDropFiles,
  };

  return (
    <section
      className={[
        "admin-panel",
        "admin-banner-slot",
        "admin-banner-slot--multi",
        locked ? "admin-banner-slot--locked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${step}. ${slot.label}`}
    >
      <div className="admin-panel__head admin-banner-slot__head">
        <div className="admin-banner-slot__title-row">
          <span className="admin-banner-slot__step" aria-hidden>
            {step}
          </span>
          <h2>{slot.label}</h2>
        </div>
        <span className="tag-chip tag-chip--soft">
          {items.length}/{slot.maxItems}
        </span>
      </div>
      <div className="admin-panel__body">
        <p className="admin-banner-slot__where">
          <strong>Onde aparece:</strong> {slot.ondeAparece}
        </p>
        <p className="admin-banner-slot__hint">
          Tamanho ideal: <strong>{slot.dimensaoIdeal}</strong>. Até{" "}
          {slot.maxItems} fotos · JPEG ou PNG.
        </p>

        {locked && lockReason ? (
          <p className="admin-alert admin-alert--warn" role="status">
            {lockReason}
          </p>
        ) : null}

        {pendingCapacity && !locked ? (
          <p className="admin-alert admin-alert--warn" role="status">
            O modelo publicado ainda permite só {publishedMax}{" "}
            {publishedMax === 1 ? "foto" : "fotos"} aqui. Salve o novo modelo
            para liberar até {slot.maxItems} slides.
          </p>
        ) : null}

        <input
          ref={addInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          disabled={!canAdd}
          onChange={(e) => handleAddFiles(e.target.files)}
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept="image/jpeg,image/png"
          hidden
          disabled={anyBusy || locked}
          onChange={(e) => handleReplaceFile(e.target.files)}
        />

        {items.length === 0 ? (
          <button
            type="button"
            className={`admin-banner-carousel__dropzone${dragOver ? " is-dragover" : ""}${saving ? " is-busy" : ""}`}
            disabled={!canAdd}
            onClick={openAddPicker}
            {...dropzoneHandlers}
          >
            <span className="admin-banner-carousel__dropzone-icon" aria-hidden>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V8m0 0-3 3m3-3 3 3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="admin-banner-carousel__dropzone-title">
              {dragOver
                ? "Solte as imagens aqui"
                : locked
                  ? "Área bloqueada até salvar o modelo"
                  : "Clique ou arraste as imagens aqui"}
            </span>
            <span className="admin-banner-carousel__dropzone-hint">
              JPEG ou PNG · várias de uma vez · até {slot.maxItems} slides ·
              ideal {slot.dimensaoIdeal}
            </span>
          </button>
        ) : (
          <>
            <p className="admin-banner-carousel__howto">
              Arraste para reordenar · setas no celular · a ordem é a do
              carrossel
            </p>
            <ul className="admin-banner-carousel__grid">
              {items.map((banner, index) => {
                const preview = mediaUrl(banner.imagem.path);
                const isDragging = draggingId === banner.id;
                const isDropTarget =
                  dropTargetId === banner.id && draggingId !== banner.id;
                const itemBusy =
                  busyKey === `${banner.id}:save` ||
                  busyKey === `${banner.id}:delete` ||
                  busyKey === `${banner.id}:toggle` ||
                  busyKey === `${banner.id}:details`;
                const expanded = expandedId === banner.id;

                return (
                  <li
                    key={banner.id}
                    className={[
                      "admin-banner-carousel__item",
                      !banner.ativo ? "is-inactive" : "",
                      isDragging ? "is-dragging" : "",
                      isDropTarget ? "is-drop-target" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (draggingId && draggingId !== banner.id) {
                        setDropTargetId(banner.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dropTargetId === banner.id) setDropTargetId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromId =
                        e.dataTransfer.getData("text/plain") || draggingId;
                      if (fromId) reorderById(fromId, banner.id);
                      setDraggingId(null);
                      setDropTargetId(null);
                    }}
                  >
                    <div
                      className="admin-banner-carousel__thumb"
                      draggable={!anyBusy}
                      onDragStart={(e) => {
                        setDraggingId(banner.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", banner.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropTargetId(null);
                      }}
                      title="Arraste para mudar a ordem"
                    >
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt={banner.imagem.alt || `${slot.label} ${index + 1}`}
                          draggable={false}
                        />
                      ) : null}

                      <span className="admin-banner-carousel__badge">
                        Slide {index + 1}
                      </span>
                      {!banner.ativo ? (
                        <span className="admin-banner-carousel__badge admin-banner-carousel__badge--inactive">
                          Inativo
                        </span>
                      ) : null}

                      <span className="admin-banner-carousel__grip" aria-hidden>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <circle cx="5" cy="4" r="1.3" />
                          <circle cx="11" cy="4" r="1.3" />
                          <circle cx="5" cy="8" r="1.3" />
                          <circle cx="11" cy="8" r="1.3" />
                          <circle cx="5" cy="12" r="1.3" />
                          <circle cx="11" cy="12" r="1.3" />
                        </svg>
                      </span>

                      <button
                        type="button"
                        className="admin-banner-carousel__delete"
                        disabled={anyBusy}
                        onClick={() => onRemove(banner.id)}
                        onMouseDown={(e) => e.stopPropagation()}
                        aria-label={`Excluir slide ${index + 1}`}
                        title="Excluir"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M6 7h12M10 7V5h4v2m-6 0 1 12h6l1-12"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="admin-banner-carousel__item-body">
                      <div className="admin-banner-carousel__order">
                        <button
                          type="button"
                          className="admin-banner-carousel__order-btn"
                          disabled={anyBusy || index === 0}
                          onClick={() => onMove(banner.id, -1)}
                          aria-label="Mover para a esquerda"
                        >
                          ←
                        </button>
                        <span className="admin-banner-carousel__order-label">
                          {index + 1}º
                        </span>
                        <button
                          type="button"
                          className="admin-banner-carousel__order-btn"
                          disabled={anyBusy || index === items.length - 1}
                          onClick={() => onMove(banner.id, 1)}
                          aria-label="Mover para a direita"
                        >
                          →
                        </button>
                      </div>

                      <div className="admin-banner-carousel__actions">
                        <button
                          type="button"
                          className="admin-banner-carousel__action"
                          disabled={anyBusy}
                          onClick={() => onToggle(banner)}
                        >
                          {banner.ativo ? "Inativar" : "Ativar"}
                        </button>
                        <button
                          type="button"
                          className="admin-banner-carousel__action"
                          disabled={anyBusy || locked}
                          onClick={() => openReplacePicker(banner)}
                        >
                          Trocar
                        </button>
                      </div>

                      <button
                        type="button"
                        className="admin-banner-carousel__action admin-banner-carousel__action--wide"
                        disabled={anyBusy}
                        onClick={() =>
                          setExpandedId(expanded ? null : banner.id)
                        }
                      >
                        {expanded ? "Ocultar link e botão" : "Link e botão"}
                      </button>

                      {expanded ? (
                        <BannerLinkFields
                          banner={banner}
                          temBotao={slot.temBotao}
                          disabled={anyBusy}
                          busy={busyKey === `${banner.id}:details`}
                          onSave={(details) => onSaveDetails(banner, details)}
                        />
                      ) : null}

                      {itemBusy ? (
                        <p
                          className="admin-banner-carousel__item-status"
                          aria-live="polite"
                        >
                          Atualizando…
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}

              {remaining > 0 ? (
                <li className="admin-banner-carousel__add-wrap">
                  <button
                    type="button"
                    className={`admin-banner-carousel__add${dragOver ? " is-dragover" : ""}`}
                    disabled={!canAdd}
                    onClick={openAddPicker}
                    {...dropzoneHandlers}
                  >
                    <span className="admin-banner-carousel__add-plus" aria-hidden>
                      +
                    </span>
                    <span>
                      {dragOver ? "Solte aqui" : "Adicionar imagens"}
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>
          </>
        )}

        {saving ? (
          <p className="admin-banner-slot__hint" aria-live="polite">
            Salvando slides…
          </p>
        ) : null}
        {moving ? (
          <p className="admin-banner-slot__hint" aria-live="polite">
            Reordenando…
          </p>
        ) : null}
        {!canAdd && remaining <= 0 && items.length > 0 ? (
          <p className="admin-banner-slot__hint">
            {pendingCapacity
              ? `Limite atual: ${publishedMax}. Salve o modelo para liberar mais slides.`
              : `Limite de ${slot.maxItems} slides atingido.`}
          </p>
        ) : null}
        {status ? (
          <p className="admin-banner-slot__hint">{status}</p>
        ) : null}
      </div>
    </section>
  );
}
