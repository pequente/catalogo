import type { SiteFonteId, SiteTema } from "@/src/schemas/site-personalization";

export const LARGURA_PRESETS = [
  {
    id: "compacta" as const,
    label: "Compacta",
    value: "960px",
    descricao: "Conteúdo mais estreito, ideal para catálogos enxutos.",
  },
  {
    id: "padrao" as const,
    label: "Padrão",
    value: "1120px",
    descricao: "Equilíbrio entre leitura e espaço — recomendado.",
  },
  {
    id: "ampla" as const,
    label: "Ampla",
    value: "1280px",
    descricao: "Mais espaço horizontal para vitrines densas.",
  },
] as const;

export type LarguraPresetId = (typeof LARGURA_PRESETS)[number]["id"];

export const RAIO_SAMPLES = [0, 4, 8, 16, 24] as const;

export const TIPOGRAFIA_PRESETS = [
  {
    id: "lookbook" as const,
    label: "Lookbook",
    descricao: "Títulos marcantes com texto acolhedor.",
    fonteDisplay: "bebas-neue" as const,
    fonteCorpo: "poppins" as const,
  },
  {
    id: "moderna" as const,
    label: "Moderna",
    descricao: "Limpa e contemporânea, boa para marcas digitais.",
    fonteDisplay: "poppins" as const,
    fonteCorpo: "inter" as const,
  },
  {
    id: "sistema" as const,
    label: "Sistema",
    descricao: "Usa as fontes do dispositivo do visitante.",
    fonteDisplay: "system" as const,
    fonteCorpo: "system" as const,
  },
] as const;

export type TipografiaPresetId = (typeof TIPOGRAFIA_PRESETS)[number]["id"];

export const FONTE_CORPO_OPTIONS: Array<{
  id: SiteFonteId;
  label: string;
}> = [
  { id: "poppins", label: "Poppins" },
  { id: "inter", label: "Inter" },
  { id: "system", label: "Sistema" },
];

export const FONTE_DISPLAY_OPTIONS: Array<{
  id: SiteFonteId;
  label: string;
}> = [
  { id: "bebas-neue", label: "Bebas Neue" },
  { id: "poppins", label: "Poppins" },
  { id: "system", label: "Sistema" },
];

export function matchLarguraPreset(
  value: string,
): LarguraPresetId | "personalizada" {
  const normalized = value.trim().toLowerCase();
  const found = LARGURA_PRESETS.find(
    (p) => p.value.toLowerCase() === normalized,
  );
  return found?.id ?? "personalizada";
}

export function matchTipografiaPreset(
  tema: Pick<SiteTema, "fonteCorpo" | "fonteDisplay">,
): TipografiaPresetId | "personalizada" {
  const found = TIPOGRAFIA_PRESETS.find(
    (p) =>
      p.fonteCorpo === tema.fonteCorpo &&
      p.fonteDisplay === tema.fonteDisplay,
  );
  return found?.id ?? "personalizada";
}

export function fontFamilyCss(fonte: SiteFonteId, role: "corpo" | "display") {
  if (fonte === "system") return "system-ui, sans-serif";
  if (fonte === "inter") return "var(--font-inter), Inter, system-ui, sans-serif";
  if (fonte === "bebas-neue") {
    return 'var(--font-lookbook), "Bebas Neue", Impact, "Arial Narrow", sans-serif';
  }
  if (role === "display") {
    return "var(--font-poppins), Poppins, system-ui, sans-serif";
  }
  return "var(--font-poppins), Poppins, system-ui, sans-serif";
}

export function containerPreviewWidth(largura: string): string {
  const raw = largura.trim();
  if (!raw) return "100%";
  const match = /^(\d+(?:\.\d+)?)(px|rem|em|%)?$/i.exec(raw);
  if (!match) return "92%";
  const num = Number(match[1]);
  const unit = (match[2] ?? "px").toLowerCase();
  if (unit === "%") return `${Math.min(num, 100)}%`;
  // Map common px widths into a relative preview scale.
  if (unit === "px") {
    const pct = Math.min(100, Math.max(55, Math.round((num / 1400) * 100)));
    return `${pct}%`;
  }
  return "88%";
}
