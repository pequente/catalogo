"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

export type ChooseOptions = {
  title: string;
  description?: string;
  primaryLabel: string;
  secondaryLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

export type ChooseResult = "primary" | "secondary" | "cancel";

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  choose: (options: ChooseOptions) => Promise<ChooseResult>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type PendingConfirm = ConfirmOptions & {
  kind: "confirm";
  resolve: (value: boolean) => void;
};

type PendingChoose = ChooseOptions & {
  kind: "choose";
  resolve: (value: ChooseResult) => void;
};

type Pending = PendingConfirm | PendingChoose;

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const titleId = useId();
  const descId = useId();
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const next: PendingConfirm = { ...options, kind: "confirm", resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const choose = useCallback((options: ChooseOptions) => {
    return new Promise<ChooseResult>((resolve) => {
      const next: PendingChoose = { ...options, kind: "choose", resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    const current = pendingRef.current;
    if (!current || current.kind !== "confirm") return;
    current.resolve(value);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const closeChoose = useCallback((value: ChooseResult) => {
    const current = pendingRef.current;
    if (!current || current.kind !== "choose") return;
    current.resolve(value);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const dismiss = useCallback(() => {
    const current = pendingRef.current;
    if (!current) return;
    if (current.kind === "confirm") {
      current.resolve(false);
    } else {
      current.resolve("cancel");
    }
    pendingRef.current = null;
    setPending(null);
  }, []);

  useEffect(() => {
    if (!pending) return;
    primaryBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pending, dismiss]);

  const tone = pending?.tone ?? "default";
  const primaryBtnClass = `btn ${tone === "danger" ? "btn-primary" : "btn-dark"}`;

  return (
    <ConfirmContext.Provider value={{ confirm, choose }}>
      {children}
      {pending ? (
        <div
          className="confirm-dialog"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
        >
          <div
            className="confirm-dialog__panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={pending.description ? descId : undefined}
          >
            <h2 id={titleId} className="confirm-dialog__title">
              {pending.title}
            </h2>
            {pending.description ? (
              <p id={descId} className="confirm-dialog__desc">
                {pending.description}
              </p>
            ) : null}
            <div
              className={
                pending.kind === "choose"
                  ? "confirm-dialog__actions confirm-dialog__actions--choose"
                  : "confirm-dialog__actions"
              }
            >
              {pending.kind === "confirm" ? (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => closeConfirm(false)}
                  >
                    {pending.cancelLabel ?? "Cancelar"}
                  </button>
                  <button
                    ref={primaryBtnRef}
                    type="button"
                    className={primaryBtnClass}
                    onClick={() => closeConfirm(true)}
                  >
                    {pending.confirmLabel ?? "Confirmar"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => closeChoose("cancel")}
                  >
                    {pending.cancelLabel ?? "Voltar"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => closeChoose("secondary")}
                  >
                    {pending.secondaryLabel}
                  </button>
                  <button
                    ref={primaryBtnRef}
                    type="button"
                    className={primaryBtnClass}
                    onClick={() => closeChoose("primary")}
                  >
                    {pending.primaryLabel}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}
