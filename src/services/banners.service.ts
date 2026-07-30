import "server-only";
import { cache } from "react";
import { commitFiles, listJsonDir, readBinary, readJson } from "@/src/lib/data";
import { buildMutationFiles } from "@/src/lib/data/commit-mutation";
import { AppError } from "@/src/lib/api/errors";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import { revalidateStorefront } from "@/src/lib/admin/revalidate-storefront";
import { getSlotDef } from "@/components/public/layouts/banner-slots";
import {
  BANNER_POSICAO_LABELS,
  bannerSchema,
  type Banner,
  type BannerPosicao,
  type bannerCreateSchema,
  type bannerUpdateSchema,
} from "@/src/schemas/banner";
import { getSiteConfig } from "@/src/services/site-config.service";
import {
  prepareImageBinary,
  type PendingBinary,
} from "@/src/services/upload.service";
import type { z } from "zod";

const DIR = "banners";

function pathFor(id: string) {
  return `${DIR}/${id}.json`;
}

type ImageInput = z.infer<typeof bannerCreateSchema>["imagem"];

function withPosicaoAlt(
  imagem: Banner["imagem"],
  posicao: BannerPosicao,
): Banner["imagem"] {
  return {
    ...imagem,
    alt: imagem.alt?.trim() || BANNER_POSICAO_LABELS[posicao],
  };
}

async function assertSlotAllowsWrite(
  posicao: BannerPosicao,
  opts: { excludeId?: string; isCreate: boolean },
): Promise<void> {
  const site = await getSiteConfig();
  const slot = getSlotDef(site.layout, posicao);
  if (!slot) {
    throw new AppError(
      "VALIDATION_ERROR",
      `A posição "${BANNER_POSICAO_LABELS[posicao]}" não é usada pelo layout atual.`,
      400,
    );
  }

  const existing = await listBanners({ posicao });
  const others = opts.excludeId
    ? existing.filter((b) => b.id !== opts.excludeId)
    : existing;

  if (opts.isCreate && others.length >= slot.maxItems) {
    throw new AppError(
      "POSICAO_CAPACITY",
      slot.maxItems === 1
        ? `Já existe um banner de "${slot.label}". Remova ou edite o existente.`
        : `Limite de ${slot.maxItems} banners em "${slot.label}" atingido.`,
      409,
    );
  }

  if (!opts.isCreate && others.length > slot.maxItems) {
    throw new AppError(
      "POSICAO_CAPACITY",
      `Há mais banners do que o layout permite em "${slot.label}". Remova os extras.`,
      409,
    );
  }
}

async function resolveBannerImage(
  imagem: ImageInput,
  pendingBinaries: Map<string, PendingBinary>,
): Promise<{
  imagem: Banner["imagem"];
  binaryWrites: { path: string; bytes: Buffer }[];
}> {
  const pending = pendingBinaries.get(imagem.id);
  if (pending || imagem.pending) {
    if (!pending) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Arquivo pendente não enviado para a imagem do banner",
        400,
      );
    }
    const prepared = prepareImageBinary(pending, "banners", imagem.id);
    return {
      imagem: {
        id: prepared.id,
        path: prepared.path,
        alt: imagem.alt,
      },
      binaryWrites: [{ path: prepared.path, bytes: prepared.bytes }],
    };
  }

  const bytes = await readBinary(imagem.path);
  if (!bytes) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Imagem do banner não encontrada. Selecione o arquivo novamente.",
      400,
    );
  }
  return {
    imagem: {
      id: imagem.id,
      path: imagem.path,
      alt: imagem.alt,
    },
    binaryWrites: [],
  };
}

const loadAllBanners = cache(async (): Promise<Banner[]> => {
  const files = await listJsonDir(DIR);
  const results = await Promise.all(
    files.map(async (file) => {
      const raw = await readJson<unknown>(`${DIR}/${file}`);
      const parsed = bannerSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(`[banners] invalid file ${file}`, parsed.error.flatten());
        return null;
      }
      return parsed.data;
    }),
  );
  return results
    .filter((b): b is Banner => b !== null)
    .sort((a, b) => a.ordem - b.ordem);
});

export async function listBanners(opts?: {
  onlyActive?: boolean;
  posicao?: Banner["posicao"];
}): Promise<Banner[]> {
  let items = await loadAllBanners();
  if (opts?.onlyActive) items = items.filter((b) => b.ativo);
  if (opts?.posicao) items = items.filter((b) => b.posicao === opts.posicao);
  return items;
}

export async function getBanner(id: string): Promise<Banner | null> {
  const raw = await readJson<unknown>(pathFor(id));
  if (!raw) return null;
  const parsed = bannerSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function createBanner(
  input: z.infer<typeof bannerCreateSchema>,
  pendingBinaries: Map<string, PendingBinary> = new Map(),
): Promise<Banner> {
  await assertSlotAllowsWrite(input.posicao, { isCreate: true });

  const siblings = await listBanners({ posicao: input.posicao });
  const nextOrdem =
    input.ordem ??
    (siblings.length === 0
      ? 0
      : Math.max(...siblings.map((b) => b.ordem)) + 1);

  const { imagem: resolved, binaryWrites } = await resolveBannerImage(
    input.imagem,
    pendingBinaries,
  );
  const imagem = withPosicaoAlt(resolved, input.posicao);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const ctaTexto = input.ctaTexto ?? undefined;
  const href = input.href ?? undefined;
  const banner: Banner = {
    id,
    versao: 1,
    posicao: input.posicao,
    ordem: nextOrdem,
    ativo: input.ativo ?? true,
    imagem,
    ...(href ? { href } : {}),
    ...(ctaTexto ? { ctaTexto } : {}),
    criadoEm: now,
    atualizadoEm: now,
  };
  bannerSchema.parse(banner);

  await commitFiles(
    buildMutationFiles({
      binaryWrites,
      jsonWrites: [{ path: pathFor(id), data: banner }],
    }),
    `feat(data): create banner ${banner.posicao}`,
  );
  revalidateStorefront(CACHE_TAGS.banners, CACHE_TAGS.dashboard, CACHE_TAGS.media);
  return banner;
}

export async function updateBanner(
  id: string,
  input: z.infer<typeof bannerUpdateSchema>,
  pendingBinaries: Map<string, PendingBinary> = new Map(),
): Promise<Banner> {
  const current = await getBanner(id);
  if (!current) throw new AppError("NOT_FOUND", "Banner não encontrado", 404);
  if (current.versao !== input.versao) {
    throw new AppError(
      "VERSION_CONFLICT",
      "Versão desatualizada. Recarregue e tente novamente.",
      409,
    );
  }

  const nextPosicao = input.posicao ?? current.posicao;
  if (nextPosicao !== current.posicao) {
    await assertSlotAllowsWrite(nextPosicao, {
      excludeId: id,
      isCreate: true,
    });
  } else {
    await assertSlotAllowsWrite(nextPosicao, {
      excludeId: id,
      isCreate: false,
    });
  }

  const {
    versao: _ignoredVersao,
    imagem: inputImagem,
    href,
    ctaTexto,
    ...rest
  } = input;
  void _ignoredVersao;

  let imagem = current.imagem;
  let binaryWrites: { path: string; bytes: Buffer }[] = [];
  const deletes: string[] = [];

  if (inputImagem) {
    const resolved = await resolveBannerImage(inputImagem, pendingBinaries);
    imagem = resolved.imagem;
    binaryWrites = resolved.binaryWrites;
    if (imagem.path !== current.imagem.path) {
      deletes.push(current.imagem.path);
    }
  }

  const updated: Banner = {
    ...current,
    ...rest,
    id,
    posicao: nextPosicao,
    imagem: withPosicaoAlt(imagem, nextPosicao),
    versao: current.versao + 1,
    atualizadoEm: new Date().toISOString(),
  };

  if (href !== undefined) {
    if (href) updated.href = href;
    else delete updated.href;
  }

  if (ctaTexto !== undefined) {
    if (ctaTexto) updated.ctaTexto = ctaTexto;
    else delete updated.ctaTexto;
  }

  bannerSchema.parse(updated);

  await commitFiles(
    buildMutationFiles({
      binaryWrites,
      jsonWrites: [{ path: pathFor(id), data: updated }],
      deletes,
    }),
    `chore(data): update banner ${updated.posicao}`,
  );

  revalidateStorefront(CACHE_TAGS.banners, CACHE_TAGS.dashboard, CACHE_TAGS.media);
  return updated;
}

export async function deleteBanner(id: string): Promise<void> {
  const current = await getBanner(id);
  if (!current) throw new AppError("NOT_FOUND", "Banner não encontrado", 404);
  await commitFiles(
    buildMutationFiles({
      deletes: [pathFor(id), current.imagem.path],
    }),
    `chore(data): delete banner ${current.posicao}`,
  );
  revalidateStorefront(CACHE_TAGS.banners, CACHE_TAGS.dashboard, CACHE_TAGS.media);
}
