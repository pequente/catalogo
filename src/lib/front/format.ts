export function mediaUrl(relativePath: string | undefined | null): string | null {
  if (!relativePath) return null;
  const cleaned = relativePath.replace(/^imagens\//, "");
  return `/media/${cleaned}`;
}

export function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Máscara de digitação: "1234" → "R$ 12,34". Vazio permanece vazio. */
export function maskBrlInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return formatBrl(Number(digits) / 100);
}

/** Converte valor mascarado ("R$ 12,34") em número. Vazio → null. */
export function parseBrlInput(masked: string): number | null {
  const digits = masked.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits) / 100;
}
