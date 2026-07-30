"use client";

import { useId, useRef, useState } from "react";
import { mediaUrl } from "@/src/lib/front/format";
import {
  UPLOAD_SOFT_LIMIT_BYTES,
  createLocalImageDraft,
  revokePreviewUrl,
  validateImageFile,
  type UploadDomain,
} from "@/components/admin/uploadClient";

export type ImageMeta = {
  id: string;
  path: string;
  alt?: string;
  file?: File;
  previewUrl?: string;
  pending?: boolean;
};

type Props = {
  dominio: UploadDomain;
  value: ImageMeta | null;
  onChange: (image: ImageMeta | null) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  /** When false, hides the alt text input (alt is set server-side). Default true. */
  showAlt?: boolean;
  /** When false, hides the clear button (replace still available). Default true. */
  showRemove?: boolean;
  alt?: string;
  onAltChange?: (alt: string) => void;
};

export function ImageField({
  dominio: _dominio,
  value,
  onChange,
  disabled,
  label = "Imagem",
  required,
  showAlt = true,
  showRemove = true,
  alt = "",
  onAltChange,
}: Props) {
  void _dominio;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [softWarn, setSoftWarn] = useState<string | null>(null);
  const preview = value?.previewUrl || mediaUrl(value?.path);
  const isPending = Boolean(value?.file);

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setSoftWarn(null);
    const validation = validateImageFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    if (file.size > UPLOAD_SOFT_LIMIT_BYTES) {
      setSoftWarn("Arquivo acima de 5 MB — o envio no salvar pode demorar.");
    }
    try {
      revokePreviewUrl(value?.previewUrl);
      const draft = createLocalImageDraft(file, {
        alt: alt.trim() || undefined,
      });
      onChange({
        id: draft.id,
        path: "",
        alt: draft.alt,
        file: draft.file,
        previewUrl: draft.previewUrl,
        pending: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Arquivo inválido");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="admin-image-field">
      <div className="admin-image-field__preview" aria-hidden={!preview}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" />
        ) : (
          <span>Sem imagem</span>
        )}
      </div>
      <div className="admin-image-field__controls">
        <span className="admin-image-field__label">
          {label}
          {required ? " *" : ""}
          {isPending ? " · pendente de salvar" : ""}
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          disabled={disabled}
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {showAlt ? (
          <label>
            Texto alternativo (alt)
            <input
              className="input"
              value={alt}
              onChange={(e) => {
                const next = e.target.value;
                onAltChange?.(next);
                if (value) {
                  onChange({ ...value, alt: next.trim() || undefined });
                }
              }}
              disabled={disabled}
              placeholder="Descrição acessível da imagem"
            />
          </label>
        ) : null}
        <div className="admin-image-field__actions">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {value ? "Trocar imagem" : "Escolher imagem"}
          </button>
          {value && showRemove ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost-danger"
              disabled={disabled}
              onClick={() => {
                revokePreviewUrl(value.previewUrl);
                onChange(null);
                setError(null);
                setSoftWarn(null);
              }}
            >
              Remover
            </button>
          ) : null}
        </div>
        {softWarn ? <p className="admin-image-field__hint">{softWarn}</p> : null}
        {error ? <p className="admin-alert">{error}</p> : null}
        <p className="admin-image-field__hint">
          JPEG ou PNG · máx. 10 MB
        </p>
      </div>
    </div>
  );
}
