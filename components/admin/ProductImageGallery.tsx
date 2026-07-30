"use client";

import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/src/lib/front/format";
import {
  UPLOAD_SOFT_LIMIT_BYTES,
  createLocalImageDraft,
  revokePreviewUrl,
  validateImageFile,
} from "@/components/admin/uploadClient";

export type ProductImageDraft = {
  id: string;
  path: string;
  alt?: string;
  ordem: number;
  file?: File;
  previewUrl?: string;
  pending?: boolean;
};

const MAX_IMAGES = 12;

type Props = {
  images: ProductImageDraft[];
  onChange: (images: ProductImageDraft[]) => void;
  disabled?: boolean;
};

function reindex(images: ProductImageDraft[]): ProductImageDraft[] {
  return images.map((img, ordem) => ({ ...img, ordem }));
}

export function ProductImageGallery({ images, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const remaining = MAX_IMAGES - images.length;
  const canUpload = !disabled && remaining > 0;
  const pendingCount = images.filter((img) => Boolean(img.file)).length;

  useEffect(() => {
    return () => {
      for (const img of images) revokePreviewUrl(img.previewUrl);
    };
    // Only revoke on unmount of current draft set via replace below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);
    setStatus(null);
    const files = Array.from(fileList).slice(0, remaining);
    if (!files.length) {
      setError(`Máximo de ${MAX_IMAGES} imagens por produto.`);
      return;
    }

    const next = [...images];
    let ok = 0;
    for (const file of files) {
      const validation = validateImageFile(file);
      if (validation) {
        setError(validation);
        continue;
      }
      if (file.size > UPLOAD_SOFT_LIMIT_BYTES) {
        setStatus("Arquivo acima de 5 MB — o envio no salvar pode demorar.");
      }
      try {
        const draft = createLocalImageDraft(file);
        next.push({
          id: draft.id,
          path: "",
          alt: "",
          ordem: next.length,
          file: draft.file,
          previewUrl: draft.previewUrl,
          pending: true,
        });
        ok += 1;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Arquivo inválido");
      }
    }
    onChange(reindex(next));
    if (ok > 0) {
      setStatus(
        ok === 1
          ? "1 foto pronta — será enviada ao salvar."
          : `${ok} fotos prontas — serão enviadas ao salvar.`,
      );
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function setAlt(id: string, alt: string) {
    onChange(images.map((img) => (img.id === id ? { ...img, alt } : img)));
  }

  function remove(id: string) {
    const target = images.find((img) => img.id === id);
    revokePreviewUrl(target?.previewUrl);
    onChange(reindex(images.filter((img) => img.id !== id)));
  }

  function move(id: string, direction: -1 | 1) {
    const index = images.findIndex((img) => img.id === id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(reindex(next));
  }

  function makeCover(id: string) {
    const index = images.findIndex((img) => img.id === id);
    if (index <= 0) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(reindex(next));
  }

  function reorderById(fromId: string, toId: string) {
    if (fromId === toId) return;
    const from = images.findIndex((img) => img.id === fromId);
    const to = images.findIndex((img) => img.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(reindex(next));
  }

  function openPicker() {
    if (!canUpload) return;
    inputRef.current?.click();
  }

  function onDropFiles(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!canUpload) return;
    onFiles(e.dataTransfer.files);
  }

  return (
    <div className={`admin-gallery${disabled ? " is-readonly" : ""}`}>
      <div className="admin-gallery__header">
        <div>
          <strong>Imagens do produto</strong>
          <p className="admin-image-field__hint">
            {disabled
              ? "Modo visualização. Clique em Editar para adicionar ou alterar fotos."
              : `Até ${MAX_IMAGES} fotos. A capa é a primeira. Novas fotos só sobem ao salvar o produto (um único envio).`}
          </p>
        </div>
        {images.length > 0 ? (
          <span className="admin-gallery__count">
            {images.length}/{MAX_IMAGES}
            {pendingCount > 0 ? ` · ${pendingCount} pendente(s)` : ""}
          </span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        hidden
        disabled={!canUpload}
        onChange={(e) => onFiles(e.target.files)}
      />

      {images.length === 0 ? (
        <button
          type="button"
          className={`admin-gallery__dropzone${dragOver ? " is-dragover" : ""}`}
          disabled={!canUpload}
          onClick={openPicker}
          title={disabled ? "Clique em Editar para adicionar fotos" : undefined}
          onDragEnter={(e) => {
            e.preventDefault();
            if (canUpload) setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (canUpload) setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDragOver(false);
            }
          }}
          onDrop={onDropFiles}
        >
          <span className="admin-gallery__dropzone-icon" aria-hidden>
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
          <span className="admin-gallery__dropzone-title">
            {disabled
              ? "Nenhuma foto ainda"
              : dragOver
                ? "Solte as fotos aqui"
                : "Clique ou arraste as fotos aqui"}
          </span>
          <span className="admin-gallery__dropzone-hint">
            {disabled
              ? "Clique em Editar para enviar imagens"
              : "JPEG ou PNG · preferível até 5 MB (máx. 10 MB) · envio no salvar"}
          </span>
        </button>
      ) : (
        <>
          <p className="admin-gallery__howto">
            {disabled
              ? "Ordem e capa só podem ser alteradas no modo edição"
              : "Arraste as fotos para mudar a ordem · a primeira é a capa"}
          </p>
          <ul className="admin-gallery__grid">
            {images.map((img, index) => {
              const src = img.previewUrl || mediaUrl(img.path);
              const isCover = index === 0;
              const isDragging = draggingId === img.id;
              const isDropTarget =
                dropTargetId === img.id && draggingId !== img.id;
              const isPending = Boolean(img.file);

              return (
                <li
                  key={img.id}
                  className={[
                    "admin-gallery__item",
                    isCover ? "is-cover" : "",
                    isDragging ? "is-dragging" : "",
                    isDropTarget ? "is-drop-target" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (draggingId && draggingId !== img.id) {
                      setDropTargetId(img.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dropTargetId === img.id) setDropTargetId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromId =
                      e.dataTransfer.getData("text/plain") || draggingId;
                    if (fromId) reorderById(fromId, img.id);
                    setDraggingId(null);
                    setDropTargetId(null);
                  }}
                >
                  <div
                    className="admin-gallery__thumb"
                    draggable={!disabled}
                    onDragStart={(e) => {
                      setDraggingId(img.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", img.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTargetId(null);
                    }}
                    title="Arraste para mudar a ordem"
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" draggable={false} />
                    ) : null}

                    {isCover ? (
                      <span className="admin-gallery__badge">Capa</span>
                    ) : null}
                    {isPending ? (
                      <span className="admin-gallery__badge admin-gallery__badge--pending">
                        Pendente
                      </span>
                    ) : null}

                    <span className="admin-gallery__grip" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
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
                      className="admin-gallery__delete"
                      disabled={disabled}
                      onClick={() => remove(img.id)}
                      onMouseDown={(e) => e.stopPropagation()}
                      aria-label="Excluir foto"
                      title="Excluir foto"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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

                  <div className="admin-gallery__item-body">
                    {!isCover ? (
                      <button
                        type="button"
                        className="admin-gallery__cover-btn"
                        disabled={disabled}
                        onClick={() => makeCover(img.id)}
                      >
                        Usar como capa
                      </button>
                    ) : (
                      <span className="admin-gallery__cover-current">
                        Foto de capa
                      </span>
                    )}

                    <div className="admin-gallery__order">
                      <button
                        type="button"
                        className="admin-gallery__order-btn"
                        disabled={disabled || index === 0}
                        onClick={() => move(img.id, -1)}
                        aria-label="Mover para a esquerda"
                      >
                        ←
                      </button>
                      <span className="admin-gallery__order-label">
                        {index + 1}º
                      </span>
                      <button
                        type="button"
                        className="admin-gallery__order-btn"
                        disabled={disabled || index === images.length - 1}
                        onClick={() => move(img.id, 1)}
                        aria-label="Mover para a direita"
                      >
                        →
                      </button>
                    </div>

                    <label className="admin-gallery__alt">
                      <span>Descrição (opcional)</span>
                      <input
                        className="input"
                        value={img.alt ?? ""}
                        onChange={(e) => setAlt(img.id, e.target.value)}
                        disabled={disabled}
                        placeholder="Ex.: tênis vermelho"
                      />
                    </label>
                  </div>
                </li>
              );
            })}

            {remaining > 0 ? (
              <li className="admin-gallery__add-wrap">
                <button
                  type="button"
                  className={`admin-gallery__add${dragOver ? " is-dragover" : ""}`}
                  disabled={!canUpload}
                  onClick={openPicker}
                  title={
                    disabled ? "Clique em Editar para adicionar fotos" : undefined
                  }
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (canUpload) setDragOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (canUpload) setDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOver(false);
                    }
                  }}
                  onDrop={onDropFiles}
                >
                  <span className="admin-gallery__add-plus" aria-hidden>
                    +
                  </span>
                  <span>
                    {dragOver && !disabled
                      ? "Solte aqui"
                      : "Adicionar fotos"}
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        </>
      )}

      {status ? <p className="admin-image-field__hint">{status}</p> : null}
      {error ? <p className="admin-alert">{error}</p> : null}
    </div>
  );
}
