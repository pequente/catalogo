"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type BusyState = {
  active: boolean;
  label: string | null;
  /** null = indeterminate */
  progress: number | null;
};

type StartOptions = {
  label?: string;
  /** When true, progress starts at 0 and expects setProgress calls. */
  determinate?: boolean;
};

type MutationCtx = {
  setProgress: (value: number) => void;
};

type AdminBusyContextValue = {
  busy: BusyState;
  start: (options?: StartOptions) => void;
  setProgress: (value: number) => void;
  finish: () => void;
  fail: () => void;
  runMutation: <T>(
    options: StartOptions,
    fn: (ctx: MutationCtx) => Promise<T>,
  ) => Promise<T>;
};

const AdminBusyContext = createContext<AdminBusyContextValue | null>(null);

const IDLE: BusyState = {
  active: false,
  label: null,
  progress: null,
};

export function AdminBusyProvider({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState<BusyState>(IDLE);
  const generationRef = useRef(0);

  const start = useCallback((options?: StartOptions) => {
    generationRef.current += 1;
    setBusy({
      active: true,
      label: options?.label ?? null,
      progress: options?.determinate ? 0 : null,
    });
  }, []);

  const setProgress = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    setBusy((prev) =>
      prev.active ? { ...prev, progress: clamped } : prev,
    );
  }, []);

  const finish = useCallback(() => {
    const gen = generationRef.current;
    setBusy((prev) =>
      prev.active && prev.progress != null
        ? { ...prev, progress: 100 }
        : prev,
    );
    window.setTimeout(() => {
      if (generationRef.current !== gen) return;
      setBusy(IDLE);
    }, 220);
  }, []);

  const fail = useCallback(() => {
    generationRef.current += 1;
    setBusy(IDLE);
  }, []);

  const runMutation = useCallback(
    async <T,>(
      options: StartOptions,
      fn: (ctx: MutationCtx) => Promise<T>,
    ): Promise<T> => {
      start(options);
      try {
        const result = await fn({ setProgress });
        finish();
        return result;
      } catch (err) {
        fail();
        throw err;
      }
    },
    [fail, finish, setProgress, start],
  );

  const value = useMemo(
    () => ({ busy, start, setProgress, finish, fail, runMutation }),
    [busy, fail, finish, runMutation, setProgress, start],
  );

  const determinate = busy.active && busy.progress != null;

  return (
    <AdminBusyContext.Provider value={value}>
      {children}
      <div
        className={[
          "admin-busy-bar",
          busy.active ? "admin-busy-bar--active" : "",
          busy.active && !determinate ? "admin-busy-bar--indeterminate" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="progressbar"
        aria-hidden={!busy.active}
        aria-busy={busy.active}
        aria-label={busy.label ?? "Processando"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? (busy.progress ?? 0) : undefined}
      >
        <div
          className="admin-busy-bar__fill"
          style={
            determinate
              ? { width: `${busy.progress ?? 0}%` }
              : undefined
          }
        />
      </div>
    </AdminBusyContext.Provider>
  );
}

export function useAdminBusy(): AdminBusyContextValue {
  const ctx = useContext(AdminBusyContext);
  if (!ctx) {
    throw new Error("useAdminBusy must be used within AdminBusyProvider");
  }
  return ctx;
}
