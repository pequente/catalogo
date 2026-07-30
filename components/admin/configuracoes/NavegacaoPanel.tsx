"use client";

import { NavegacaoEditor } from "@/components/admin/NavegacaoEditor";
import { DEFAULT_NAVEGACAO } from "@/src/schemas/navigation";
import type { Category } from "@/src/schemas/category";
import type { SiteConfig } from "@/src/schemas/site-config";

export function NavegacaoPanel({
  formId,
  config,
  initialCategories,
  disabled,
  error,
  saved,
  onSubmit,
  onConfigChange,
}: {
  formId: string;
  config: SiteConfig;
  initialCategories: Category[];
  disabled?: boolean;
  error?: string | null;
  saved?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onConfigChange: (next: SiteConfig) => void;
}) {
  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className={[
        "admin-form",
        "admin-form--sections",
        disabled ? "admin-form--busy" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy={disabled || undefined}
    >
      <section className="admin-form__section">
        <header className="admin-form__section-header">
          <h2 className="admin-form__section-title">Menus do site</h2>
          <p className="admin-form__section-desc">
            Menus do topo e do celular.
          </p>
        </header>
        <div className="admin-form__section-body">
          <NavegacaoEditor
            value={config.navegacao ?? DEFAULT_NAVEGACAO}
            categories={initialCategories}
            storeLabel={config.nomeLoja}
            disabled={disabled}
            onChange={(navegacao) =>
              onConfigChange({ ...config, navegacao })
            }
          />
        </div>
      </section>
      {error ? <p className="admin-alert">{error}</p> : null}
      {saved ? (
        <p className="admin-alert admin-alert--ok" role="status">
          Salvo.
        </p>
      ) : null}
    </form>
  );
}
