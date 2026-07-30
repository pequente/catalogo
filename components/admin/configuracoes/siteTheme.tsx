import type { SiteConfig, SiteLayoutId } from "@/src/schemas/site-config";

const HEX3 = /^#[0-9A-Fa-f]{3}$/;
const HEX4 = /^#[0-9A-Fa-f]{4}$/;
const HEX6 = /^#[0-9A-Fa-f]{6}$/;
const HEX8 = /^#[0-9A-Fa-f]{8}$/;

export type HsvColor = {
  /** 0–360 */
  h: number;
  /** 0–1 */
  s: number;
  /** 0–1 */
  v: number;
};

export type HsvaColor = HsvColor & {
  /** 0–1 */
  a: number;
};

export type RgbColor = {
  /** 0–255 */
  r: number;
  /** 0–255 */
  g: number;
  /** 0–255 */
  b: number;
};

export type RgbaColor = RgbColor & {
  /** 0–1 */
  a: number;
};

function toHexByte(n: number): string {
  return clamp(Math.round(n), 0, 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

/** Expand short forms; keep alpha when present. Returns uppercase or null. */
export function expandHexIfComplete(raw: string): string | null {
  const v = raw.trim();
  if (HEX8.test(v)) return v.toUpperCase();
  if (HEX6.test(v)) return v.toUpperCase();
  if (HEX4.test(v)) {
    const [, r, g, b, a] = v;
    return `#${r}${r}${g}${g}${b}${b}${a}${a}`.toUpperCase();
  }
  if (HEX3.test(v)) {
    const [, r, g, b] = v;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

/**
 * Canonical hex for comparison/CSS: lowercase #rrggbb, or #rrggbbaa when
 * alpha is not fully opaque.
 */
export function normalizeHexForPicker(value: string): string {
  const expanded = expandHexIfComplete(value);
  if (!expanded) return "#111111";
  if (expanded.length === 7) return expanded.toLowerCase();
  const rgb = expanded.slice(0, 7);
  const alpha = expanded.slice(7);
  if (alpha.toLowerCase() === "ff") return rgb.toLowerCase();
  return `${rgb}${alpha}`.toLowerCase();
}

export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function hexToRgba(hex: string): RgbaColor | null {
  const normalized = expandHexIfComplete(hex);
  if (!normalized) return null;
  const body = normalized.slice(1);
  if (body.length === 6) {
    const n = Number.parseInt(body, 16);
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255,
      a: 1,
    };
  }
  const n = Number.parseInt(body, 16);
  return {
    r: (n >>> 24) & 255,
    g: (n >>> 16) & 255,
    b: (n >>> 8) & 255,
    a: (n & 255) / 255,
  };
}

export function hexToRgb(hex: string): RgbColor | null {
  const rgba = hexToRgba(hex);
  if (!rgba) return null;
  return { r: rgba.r, g: rgba.g, b: rgba.b };
}

export function rgbaToHex({ r, g, b, a }: RgbaColor): string {
  const rgb = `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
  const alpha = clamp(a, 0, 1);
  if (alpha >= 1 - 0.5 / 255) return rgb;
  return `${rgb}${toHexByte(alpha * 255)}`;
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

export function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const hh = ((clamp(h, 0, 360) % 360) + 360) % 360;
  const ss = clamp(s, 0, 1);
  const vv = clamp(v, 0, 1);

  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;

  let rn = 0;
  let gn = 0;
  let bn = 0;
  if (hh < 60) {
    rn = c;
    gn = x;
  } else if (hh < 120) {
    rn = x;
    gn = c;
  } else if (hh < 180) {
    gn = c;
    bn = x;
  } else if (hh < 240) {
    gn = x;
    bn = c;
  } else if (hh < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }

  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  };
}

export function hexToHsva(hex: string): HsvaColor {
  const rgba = hexToRgba(normalizeHexForPicker(hex));
  if (!rgba) return { h: 0, s: 0, v: 0.067, a: 1 };
  return { ...rgbToHsv(rgba), a: rgba.a };
}

export function hexToHsv(hex: string): HsvColor {
  const { h, s, v } = hexToHsva(hex);
  return { h, s, v };
}

export function hsvaToHex(hsva: HsvaColor): string {
  const rgb = hsvToRgb(hsva);
  return rgbaToHex({ ...rgb, a: clamp(hsva.a, 0, 1) });
}

export function hsvToHex(hsv: HsvColor): string {
  return rgbToHex(hsvToRgb(hsv));
}

/** Pure hue at full saturation/value — used as SV plane base fill. */
export function hueToCss(h: number): string {
  return hsvToHex({ h: clamp(h, 0, 360), s: 1, v: 1 });
}

/** Opaque RGB hex for gradients that should ignore alpha. */
export function hsvaToOpaqueHex(hsva: HsvaColor): string {
  return rgbToHex(hsvToRgb(hsva));
}

/** Keep document theme in sync with configurações without a full page reload. */
export function applySiteTheme(config: Pick<SiteConfig, "cores" | "layout">) {
  const { cores, layout } = config;
  const root = document.documentElement;
  root.style.setProperty("--vn-primary", cores.primaria);
  root.style.setProperty("--vn-secondary", cores.secundaria);
  root.style.setProperty("--vn-surface", cores.fundo);
  root.style.setProperty("--vn-muted", cores.fundoNeutro);
  root.style.setProperty("--vn-border", cores.borda);
  const thumbByLayout: Record<string, [string, string]> = {
    classic: [
      `color-mix(in srgb, ${cores.primaria} 45%, transparent)`,
      `color-mix(in srgb, ${cores.primaria} 70%, transparent)`,
    ],
    split: [
      `color-mix(in srgb, ${cores.primaria} 40%, transparent)`,
      cores.primaria,
    ],
    gallery: [
      `color-mix(in srgb, ${cores.primaria} 28%, transparent)`,
      `color-mix(in srgb, ${cores.primaria} 50%, transparent)`,
    ],
  };
  const [thumb, thumbHover] =
    thumbByLayout[layout ?? "classic"] ?? thumbByLayout.classic!;
  root.style.setProperty("--vn-scrollbar-thumb", thumb);
  root.style.setProperty("--vn-scrollbar-thumb-hover", thumbHover);
  if (layout) {
    root.dataset.layout = layout;
    document.body.dataset.layout = layout;
  }
}

export function LayoutPreview({
  id,
  primaryColor,
}: {
  id: SiteLayoutId;
  primaryColor: string;
}) {
  if (id === "split") {
    return (
      <svg viewBox="0 0 160 88" aria-hidden="true">
        <rect width="160" height="10" fill="#111" />
        <rect y="10" width="160" height="14" fill={primaryColor} />
        <rect y="24" width="80" height="64" fill={primaryColor} />
        <rect x="80" y="24" width="80" height="64" fill="#111" />
        <circle cx="120" cy="56" r="16" fill="#555" opacity="0.5" />
      </svg>
    );
  }

  if (id === "gallery") {
    return (
      <svg viewBox="0 0 160 88" aria-hidden="true">
        <rect width="160" height="10" fill="#f5f5f5" />
        <rect y="10" width="160" height="12" fill="#fff" stroke="#ddd" />
        <rect y="22" width="160" height="48" fill="#222" />
        <rect x="14" y="48" width="52" height="7" fill="#fff" opacity="0.92" />
        <rect x="14" y="58" width="34" height="4" fill="#fff" opacity="0.5" />
        <circle cx="70" cy="64" r="2" fill="#fff" />
        <circle cx="78" cy="64" r="2" fill="#fff" opacity="0.45" />
        <circle cx="86" cy="64" r="2" fill="#fff" opacity="0.45" />
        <rect y="70" width="50" height="18" fill="#eee" />
        <rect x="55" y="70" width="50" height="18" fill="#f5f5f5" />
        <rect x="110" y="70" width="50" height="18" fill="#eee" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 160 88" aria-hidden="true">
      <rect width="160" height="10" fill="#111" />
      <rect y="10" width="160" height="14" fill={primaryColor} />
      <defs>
        <linearGradient id="classicHero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor="#111" />
        </linearGradient>
      </defs>
      <rect y="24" width="160" height="44" fill="url(#classicHero)" />
      <rect x="18" y="38" width="56" height="8" fill="#fff" opacity="0.9" />
      <rect x="18" y="50" width="36" height="5" fill="#fff" opacity="0.55" />
      <rect y="68" width="50" height="20" fill="#eee" />
      <rect x="55" y="68" width="50" height="20" fill="#f5f5f5" />
      <rect x="110" y="68" width="50" height="20" fill="#eee" />
    </svg>
  );
}
