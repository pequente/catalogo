"use client";

import { useState, type KeyboardEvent } from "react";
import { FieldHint } from "@/components/admin/FieldHint";
import { formatBrl, maskBrlInput, parseBrlInput } from "@/src/lib/front/format";
import type { Product } from "@/src/schemas/product";
import { variantAttr } from "@/src/schemas/product";
import type { SiteDimensao } from "@/src/schemas/site-personalization";
import { DEFAULT_DIMENSOES } from "@/src/config/store-copy-defaults";

export type ProductVariantDraft = Product["variantes"][number];

const SIZE_SUGGESTIONS = [
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
];

type Props = {
  variantes: ProductVariantDraft[];
  onChange: (variantes: ProductVariantDraft[]) => void;
  dimensoes?: SiteDimensao[];
  /** Estoque persistido — usado para destacar reduções em edição. */
  baselineVariantes?: { id: string; estoque: number }[];
  disabled?: boolean;
};

function normalizeToken(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueSorted(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = normalizeToken(raw);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function parseTokens(raw: string) {
  return uniqueSorted(raw.split(/[,;\n]+/));
}

function sortSizes(values: string[]) {
  return [...values].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true }),
  );
}

function sortColors(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function variantKeyFromAttrs(atributos: Record<string, string>, dimIds: string[]) {
  return dimIds
    .map((id) => `${id}:${(atributos[id] ?? "").trim().toLowerCase()}`)
    .join("::");
}

function syncVariantes(
  dimIds: [string, string],
  dim0Values: string[],
  dim1Values: string[],
  previous: ProductVariantDraft[],
): ProductVariantDraft[] {
  const v0 = uniqueSorted(dim0Values);
  const v1 = uniqueSorted(dim1Values);
  if (!v0.length || !v1.length) return [];

  const byKey = new Map(
    previous.map((v) => [variantKeyFromAttrs(v.atributos, dimIds), v]),
  );
  const next: ProductVariantDraft[] = [];

  for (const val0 of sortSizes(v0)) {
    for (const val1 of sortColors(v1)) {
      const atributos = { [dimIds[0]]: val0, [dimIds[1]]: val1 };
      const existing = byKey.get(variantKeyFromAttrs(atributos, dimIds));
      if (existing) {
        next.push({
          ...existing,
          atributos,
          estoque: Math.max(0, Number(existing.estoque) || 0),
          preco:
            existing.preco != null &&
            Number.isFinite(existing.preco) &&
            existing.preco >= 0
              ? existing.preco
              : null,
        });
      } else {
        next.push({
          id: crypto.randomUUID(),
          atributos,
          estoque: 0,
          preco: null,
        });
      }
    }
  }

  return next;
}

function ChipInput({
  label,
  hint,
  values,
  onChange,
  placeholder,
  disabled,
  suggestions,
}: {
  label: string;
  hint: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  function addTokens(raw: string) {
    const next = uniqueSorted([...values, ...parseTokens(raw)]);
    if (next.length !== values.length || next.some((v, i) => v !== values[i])) {
      onChange(next);
    }
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) addTokens(draft);
      return;
    }
    if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function remove(value: string) {
    onChange(values.filter((v) => v.toLowerCase() !== value.toLowerCase()));
  }

  function toggleSuggestion(value: string) {
    const key = value.toLowerCase();
    if (values.some((v) => v.toLowerCase() === key)) {
      onChange(values.filter((v) => v.toLowerCase() !== key));
    } else {
      onChange(uniqueSorted([...values, value]));
    }
  }

  return (
    <div className="admin-chip-field">
      <div className="admin-field-label">
        {label}
        <FieldHint text={hint} />
      </div>
      <div className="admin-chip-input">
        {values.map((value) => (
          <span key={value} className="admin-chip">
            {value}
            <button
              type="button"
              className="admin-chip__remove"
              disabled={disabled}
              onClick={() => remove(value)}
              aria-label={`Remover ${value}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="admin-chip-input__field"
          value={draft}
          disabled={disabled}
          placeholder={values.length === 0 ? placeholder : "Adicionar…"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) addTokens(draft);
          }}
        />
      </div>
      {suggestions?.length ? (
        <div className="admin-chip-suggestions">
          {suggestions.map((size) => {
            const active = values.some(
              (v) => v.toLowerCase() === size.toLowerCase(),
            );
            return (
              <button
                key={size}
                type="button"
                className={
                  active
                    ? "admin-chip-suggestion admin-chip-suggestion--active"
                    : "admin-chip-suggestion"
                }
                disabled={disabled}
                onClick={() => toggleSuggestion(size)}
              >
                {size}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function seedFromVariantes(
  variantes: ProductVariantDraft[],
  dimIds: [string, string],
) {
  return {
    dim0: uniqueSorted(
      variantes
        .map((v) => variantAttr(v, dimIds[0]))
        .filter((v): v is string => Boolean(v?.trim())),
    ),
    dim1: uniqueSorted(
      variantes
        .map((v) => variantAttr(v, dimIds[1]))
        .filter((v): v is string => Boolean(v?.trim())),
    ),
  };
}

export function ProductVariantsEditor({
  variantes,
  onChange,
  dimensoes = [...DEFAULT_DIMENSOES],
  baselineVariantes,
  disabled,
}: Props) {
  const dimIds: [string, string] = [
    dimensoes[0]?.id ?? "tamanho",
    dimensoes[1]?.id ?? "cor",
  ];
  const dim0Label = dimensoes[0]?.rotulo ?? "Tamanho";
  const dim1Label = dimensoes[1]?.rotulo ?? "Cor";
  const seeded = seedFromVariantes(variantes, dimIds);
  const [dim0Values, setDim0Values] = useState(seeded.dim0);
  const [dim1Values, setDim1Values] = useState(seeded.dim1);

  const matrixSizes = sortSizes(dim0Values);
  const matrixColors = sortColors(dim1Values);
  const variantByKey = new Map(
    variantes.map((v) => [variantKeyFromAttrs(v.atributos, dimIds), v]),
  );
  const baselineStockById = new Map(
    (baselineVariantes ?? []).map((v) => [v.id, v.estoque]),
  );
  const totalUnits = variantes.reduce(
    (sum, v) => sum + (Number(v.estoque) || 0),
    0,
  );
  const inactiveCount = variantes.filter(
    (v) => (Number(v.estoque) || 0) === 0,
  ).length;
  const hasStockDecrease = variantes.some((v) => {
    const baseline = baselineStockById.get(v.id);
    if (baseline == null) return false;
    return (Number(v.estoque) || 0) < baseline;
  });

  function applySelection(nextDim0: string[], nextDim1: string[]) {
    setDim0Values(nextDim0);
    setDim1Values(nextDim1);
    onChange(syncVariantes(dimIds, nextDim0, nextDim1, variantes));
  }

  function updateEstoque(id: string, estoque: number) {
    onChange(
      variantes.map((v) =>
        v.id === id ? { ...v, estoque: Math.max(0, estoque) } : v,
      ),
    );
  }

  function updatePreco(id: string, preco: number | null) {
    onChange(
      variantes.map((v) => (v.id === id ? { ...v, preco } : v)),
    );
  }

  function parseEstoqueInput(raw: string): number {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "0") return 0;
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  }

  return (
    <div className="admin-variants">
      <p className="admin-form__section-desc">
        Selecione {dim0Label.toLowerCase()} e {dim1Label.toLowerCase()} — as
        combinações abaixo atualizam automaticamente. Depois informe estoque e,
        se precisar, um preço específico de cada combinação.
      </p>

      <div className="admin-variants__generator">
        <ChipInput
          label={dim0Label}
          hint={`Digite e pressione Enter. Remover um valor tira todas as combinações associadas.`}
          values={dim0Values}
          onChange={(next) => applySelection(next, dim1Values)}
          placeholder="Ex.: 39"
          disabled={disabled}
          suggestions={dimIds[0] === "tamanho" ? SIZE_SUGGESTIONS : undefined}
        />
        <ChipInput
          label={dim1Label}
          hint="Digite cada valor e pressione Enter. Remover um valor tira todas as combinações associadas."
          values={dim1Values}
          onChange={(next) => applySelection(dim0Values, next)}
          placeholder="Ex.: Preto"
          disabled={disabled}
        />
      </div>

      <div className="admin-variants__list-header">
        <div>
          <strong>Combinações</strong>
          <p className="admin-variants__list-hint">
            {dim1Label} nas colunas, {dim0Label.toLowerCase()} nas linhas.
            Estoque e preço são editáveis.
          </p>
        </div>
        <span className="admin-variants__count">
          {variantes.length === 0
            ? "Nenhuma ainda"
            : `${variantes.length} ${variantes.length === 1 ? "combinação" : "combinações"} · ${totalUnits} ${totalUnits === 1 ? "unidade" : "unidades"}`}
        </span>
      </div>

      {variantes.length > 0 ? (
        <>
          <p className="admin-variants__stock-tip" role="note">
            <strong>Estoque 0 = desativada.</strong> A combinação continua na
            tabela, mas fica indisponível para o cliente na loja. Para voltar a
            vender, informe uma quantidade maior que zero.
            {inactiveCount > 0
              ? ` (${inactiveCount} ${inactiveCount === 1 ? "desativada" : "desativadas"} agora.)`
              : null}
          </p>
          {hasStockDecrease ? (
            <p className="admin-variants__stock-decrease-tip" role="status">
              Detectamos redução de estoque (campos destacados). Ao salvar,
              você poderá optar por registrar a baixa via pedido para manter
              rastreabilidade.
            </p>
          ) : null}
          <p className="admin-variants__price-tip" role="note">
            <strong>Preço da variante (opcional).</strong> Deixe vazio para
            usar o preço e a promoção definidos na seção Preço. Se preencher,
            esse valor vira o preço cobrado só desta combinação; o preço
            normal do produto aparece riscado na loja quando o override for
            menor. A promoção global do produto não se aplica a essa variante.
          </p>
        </>
      ) : null}

      {variantes.length === 0 ? (
        <p className="admin-variants__empty">
          Selecione pelo menos um {dim0Label.toLowerCase()} e um{" "}
          {dim1Label.toLowerCase()} para montar as combinações.
        </p>
      ) : (
        <div className="admin-variants__matrix-wrap">
          <table className="admin-variants__matrix">
            <thead>
              <tr>
                <th scope="col" className="admin-variants__matrix-corner">
                  {dim0Label}
                </th>
                {matrixColors.map((cor) => (
                  <th
                    key={cor}
                    scope="col"
                    className="admin-variants__matrix-color"
                  >
                    {cor}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixSizes.map((tamanho) => (
                <tr key={tamanho}>
                  <th scope="row" className="admin-variants__matrix-size">
                    <span className="admin-variants__size">{tamanho}</span>
                  </th>
                  {matrixColors.map((cor) => {
                    const variant = variantByKey.get(
                      variantKeyFromAttrs(
                        { [dimIds[0]]: tamanho, [dimIds[1]]: cor },
                        dimIds,
                      ),
                    );
                    const stock = Number(variant?.estoque) || 0;
                    const inactive = !variant || stock === 0;
                    const baselineStock = variant
                      ? baselineStockById.get(variant.id)
                      : undefined;
                    const decreased =
                      baselineStock != null && stock < baselineStock;
                    return (
                      <td key={cor} className="admin-variants__matrix-cell">
                        {variant ? (
                          <div className="admin-variants__matrix-fields">
                            <label className="admin-variants__field">
                              <span className="admin-variants__field-label">
                                Estoque
                              </span>
                              <input
                                className={
                                  decreased
                                    ? "input admin-variants__stock-input admin-variants__stock-input--decreased"
                                    : "input admin-variants__stock-input"
                                }
                                type="number"
                                min={0}
                                step={1}
                                inputMode="numeric"
                                aria-label={`Estoque ${tamanho} ${cor}${inactive ? " (desativada)" : ""}${decreased ? " (reduzido)" : ""}`}
                                title={
                                  decreased
                                    ? "Estoque menor que o salvo — ao salvar, sugeriremos registrar via pedido"
                                    : inactive
                                      ? "Estoque 0: combinação desativada na loja"
                                      : undefined
                                }
                                value={
                                  variant.estoque > 0 ? variant.estoque : ""
                                }
                                placeholder="0"
                                disabled={disabled}
                                onChange={(e) =>
                                  updateEstoque(
                                    variant.id,
                                    parseEstoqueInput(e.target.value),
                                  )
                                }
                              />
                            </label>
                            <label className="admin-variants__field">
                              <span className="admin-variants__field-label">
                                Preço
                              </span>
                              <input
                                className="input admin-variants__price-input"
                                inputMode="numeric"
                                aria-label={`Preço ${tamanho} ${cor}`}
                                title="Opcional. Vazio = preço do produto. Preenchido = preço cobrado só desta variante."
                                value={
                                  variant.preco != null
                                    ? formatBrl(variant.preco)
                                    : ""
                                }
                                placeholder="Opcional"
                                disabled={disabled}
                                onChange={(e) =>
                                  updatePreco(
                                    variant.id,
                                    parseBrlInput(
                                      maskBrlInput(e.target.value),
                                    ),
                                  )
                                }
                              />
                            </label>
                            <span
                              className="admin-variants__inactive-label"
                              aria-hidden={!inactive}
                            >
                              {inactive ? "desativada" : null}
                            </span>
                          </div>
                        ) : (
                          <span
                            className="admin-variants__matrix-empty"
                            aria-hidden
                          >
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
