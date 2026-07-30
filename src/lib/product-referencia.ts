/** Trim product reference; empty string when unset. */
export function normalizeProductReferencia(value: string | undefined): string {
  return (value ?? "").trim();
}

/** WhatsApp display name with optional internal reference. */
export function productNomeForWaMessage(
  nome: string,
  opts?: { referencia?: string; incluirReferencia?: boolean },
): string {
  const ref = normalizeProductReferencia(opts?.referencia);
  if (opts?.incluirReferencia && ref) {
    return `${nome} (Ref. ${ref})`;
  }
  return nome;
}
