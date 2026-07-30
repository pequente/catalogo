const CONSENT_KEY = "vn_consent";
const SESSION_KEY = "vn_sid";
const YEAR_SECONDS = 60 * 60 * 24 * 365;

export type ConsentStatus = "unknown" | "accepted" | "declined";

function canUseDom() {
  return typeof document !== "undefined" && typeof window !== "undefined";
}

function readCookie(name: string): string | null {
  if (!canUseDom()) return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

function writeCookie(name: string, value: string, maxAge = YEAR_SECONDS) {
  if (!canUseDom()) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (!canUseDom()) return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function getConsentStatus(): ConsentStatus {
  if (!canUseDom()) return "unknown";
  try {
    const fromLs = localStorage.getItem(CONSENT_KEY);
    if (fromLs === "1") return "accepted";
    if (fromLs === "0") return "declined";
  } catch {
    /* ignore */
  }
  const fromCookie = readCookie(CONSENT_KEY);
  if (fromCookie === "1") return "accepted";
  if (fromCookie === "0") return "declined";
  return "unknown";
}

export function setConsentAccepted(): string {
  try {
    localStorage.setItem(CONSENT_KEY, "1");
  } catch {
    /* ignore */
  }
  writeCookie(CONSENT_KEY, "1");
  const sid = ensureSessionId();
  writeCookie(SESSION_KEY, sid);
  return sid;
}

export function setConsentDeclined(): void {
  try {
    localStorage.setItem(CONSENT_KEY, "0");
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  writeCookie(CONSENT_KEY, "0");
  clearCookie(SESSION_KEY);
}

export function getSessionId(): string | null {
  if (getConsentStatus() !== "accepted") return null;
  try {
    const fromLs = localStorage.getItem(SESSION_KEY);
    if (fromLs && isUuid(fromLs)) return fromLs;
  } catch {
    /* ignore */
  }
  const fromCookie = readCookie(SESSION_KEY);
  if (fromCookie && isUuid(fromCookie)) return fromCookie;
  return null;
}

export function ensureSessionId(): string {
  const existing = getSessionId();
  if (existing) return existing;
  const sid = createUuid();
  try {
    localStorage.setItem(SESSION_KEY, sid);
  } catch {
    /* ignore */
  }
  writeCookie(SESSION_KEY, sid);
  return sid;
}

/** UUID v4 — falls back when randomUUID is missing (HTTP over LAN IP). */
function createUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
