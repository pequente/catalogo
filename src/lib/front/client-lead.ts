import { normalizeWaDigits } from "@/src/lib/wa";

export const CLIENT_LEAD_KEY = "vn_cliente";

export type ClientLead = {
  id?: string;
  nome: string;
  email?: string;
  celular?: string;
};

export function isValidClientLead(lead: unknown): lead is ClientLead {
  if (!lead || typeof lead !== "object") return false;
  const o = lead as Record<string, unknown>;
  const nome = typeof o.nome === "string" ? o.nome.trim() : "";
  if (!nome) return false;
  const email =
    typeof o.email === "string" && o.email.trim() ? o.email.trim() : undefined;
  const celularRaw =
    typeof o.celular === "string" && o.celular.trim()
      ? o.celular.trim()
      : undefined;
  const celular = celularRaw ? normalizeWaDigits(celularRaw) : undefined;
  if (!email && !celular) return false;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (celular && (celular.length < 10 || celular.length > 11)) return false;
  return true;
}

export function getClientLead(): ClientLead | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CLIENT_LEAD_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidClientLead(parsed)) return null;
    return {
      id: typeof (parsed as ClientLead).id === "string" ? (parsed as ClientLead).id : undefined,
      nome: (parsed as ClientLead).nome.trim(),
      email: (parsed as ClientLead).email?.trim() || undefined,
      celular: (parsed as ClientLead).celular
        ? normalizeWaDigits((parsed as ClientLead).celular!) || undefined
        : undefined,
    };
  } catch {
    return null;
  }
}

export function setClientLead(lead: ClientLead): void {
  if (typeof window === "undefined") return;
  const payload: ClientLead = {
    id: lead.id,
    nome: lead.nome.trim(),
    email: lead.email?.trim() || undefined,
    celular: lead.celular
      ? normalizeWaDigits(lead.celular) || undefined
      : undefined,
  };
  localStorage.setItem(CLIENT_LEAD_KEY, JSON.stringify(payload));
}

/** Prefixa a mensagem do WhatsApp com o nome do cliente, se ainda não estiver. */
export function withClientGreeting(href: string, nome: string): string {
  try {
    const url = new URL(href);
    const text = url.searchParams.get("text") ?? "";
    const greeting = `Olá, sou ${nome.trim()}!!!`;
    if (
      !nome.trim() ||
      text.startsWith(greeting) ||
      text.startsWith("Olá, sou ")
    ) {
      return href;
    }
    url.searchParams.set(
      "text",
      text ? `${greeting}\n\n${text}` : greeting,
    );
    return url.toString();
  } catch {
    return href;
  }
}

export type ClientLeadFormErrors = {
  nome?: string;
  email?: string;
  celular?: string;
  contact?: string;
};

export function validateClientLeadForm(input: {
  nome: string;
  email: string;
  celular: string;
}): { ok: true; lead: ClientLead } | { ok: false; errors: ClientLeadFormErrors } {
  const errors: ClientLeadFormErrors = {};
  const nome = input.nome.trim();
  const email = input.email.trim();
  const celular = input.celular.trim()
    ? normalizeWaDigits(input.celular)
    : "";

  if (!nome) errors.nome = "Informe seu nome";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "E-mail inválido";
  }
  if (input.celular.trim() && (celular.length < 10 || celular.length > 11)) {
    errors.celular = "Celular inválido";
  }
  if (!email && !celular) {
    errors.contact = "Informe e-mail ou celular";
  }

  if (errors.nome || errors.email || errors.celular || errors.contact) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    lead: {
      nome,
      email: email || undefined,
      celular: celular || undefined,
    },
  };
}
