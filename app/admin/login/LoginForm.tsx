"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toastMutationError } from "@/components/admin/adminToast";
import { apiClientErrorFromResponse } from "@/src/lib/api/client-error";
import styles from "@/components/admin/AdminLogin.module.css";

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.5 10.7a3.25 3.25 0 004.6 4.6M9.4 5.7A9.4 9.4 0 0112 5.5C18 5.5 21.5 12 21.5 12a17.6 17.6 0 01-4.1 4.7M6.2 6.4A16.7 16.7 0 002.5 12S6 18.5 12 18.5c1.3 0 2.5-.25 3.6-.7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw apiClientErrorFromResponse(res.status, data, "Falha no login");
      }
      router.replace(search.get("next") || "/admin");
      router.refresh();
    } catch (err) {
      toastMutationError(err, { id: "admin-login" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>Acesso ao painel</h2>
        <p className={styles.formHint}>Entre com suas credenciais de administrador.</p>
      </div>
      <label className={styles.field}>
        Usuário
        <input
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
      </label>
      <label className={styles.field}>
        Senha
        <span className={styles.passwordWrap}>
          <input
            className={`input ${styles.passwordInput}`}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </span>
      </label>
      <button
        className={`btn btn-primary ${styles.submit}`}
        disabled={loading}
        type="submit"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
