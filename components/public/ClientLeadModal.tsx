"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  validateClientLeadForm,
  type ClientLead,
  type ClientLeadFormErrors,
} from "@/src/lib/front/client-lead";
import { formatBrWhatsApp, normalizeWaDigits } from "@/src/lib/wa";
import { WhatsAppIcon } from "@/components/public/icons/StorefrontIcons";
import type { SiteTextosExtended } from "@/src/schemas/site-personalization";

type Props = {
  copy: SiteTextosExtended["leadModal"];
  onClose: () => void;
  onComplete: (lead: ClientLead) => void;
};

export function ClientLeadModal({ copy, onClose, onComplete }: Props) {
  const titleId = useId();
  const descId = useId();
  const nomeRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [celular, setCelular] = useState("");
  const [errors, setErrors] = useState<ClientLeadFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => nomeRef.current?.focus(), 40);

    const vv = window.visualViewport;
    const panel = document.querySelector(".client-lead-modal__panel");
    function syncKeyboard() {
      if (!(panel instanceof HTMLElement) || !vv) return;
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      panel.style.marginBottom = overlap > 0 ? `${overlap}px` : "";
    }
    vv?.addEventListener("resize", syncKeyboard);
    vv?.addEventListener("scroll", syncKeyboard);
    syncKeyboard();

    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      vv?.removeEventListener("resize", syncKeyboard);
      vv?.removeEventListener("scroll", syncKeyboard);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const result = validateClientLeadForm({ nome, email, celular });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    onComplete(result.lead);
  }

  return (
    <div
      className="client-lead-modal"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="client-lead-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <button
          type="button"
          className="client-lead-modal__close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="client-lead-modal__head">
          <p className="client-lead-modal__eyebrow">{copy.eyebrow}</p>
          <h2 id={titleId} className="client-lead-modal__title">
            {copy.titulo}
          </h2>
          <p id={descId} className="client-lead-modal__desc">
            {copy.descricao}
          </p>
        </div>

        <form className="client-lead-modal__form" onSubmit={submit} noValidate>
          <label className="client-lead-modal__field">
            <span>{copy.labelNome}</span>
            <input
              ref={nomeRef}
              className="client-lead-modal__input"
              name="nome"
              autoComplete="name"
              enterKeyHint="next"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={copy.placeholderNome}
              aria-invalid={Boolean(errors.nome)}
            />
            {errors.nome ? (
              <span className="client-lead-modal__error">{errors.nome}</span>
            ) : null}
          </label>

          <label className="client-lead-modal__field">
            <span>{copy.labelCelular}</span>
            <input
              className="client-lead-modal__input"
              name="celular"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="next"
              value={celular}
              onChange={(e) =>
                setCelular(formatBrWhatsApp(normalizeWaDigits(e.target.value)))
              }
              placeholder={copy.placeholderCelular}
              aria-invalid={Boolean(errors.celular)}
            />
            {errors.celular ? (
              <span className="client-lead-modal__error">{errors.celular}</span>
            ) : null}
          </label>

          <label className="client-lead-modal__field">
            <span>{copy.labelEmail}</span>
            <input
              className="client-lead-modal__input"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="go"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.placeholderEmail}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? (
              <span className="client-lead-modal__error">{errors.email}</span>
            ) : null}
          </label>

          {errors.contact ? (
            <p className="client-lead-modal__error client-lead-modal__error--banner">
              {errors.contact}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn-whatsapp client-lead-modal__submit"
            disabled={submitting}
          >
            <WhatsAppIcon size={18} className="btn__icon" />
            {copy.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
