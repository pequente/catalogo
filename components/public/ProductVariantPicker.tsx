"use client";

import type { ProductVariant } from "@/src/schemas/product";
import { variantAttr } from "@/src/schemas/product";
import {
  combinationExists,
  findVariant,
  isCorAvailable,
  isTamanhoAvailable,
  uniqueDimensionValues,
} from "@/src/lib/front/variants";
import { formatEstoqueVarios } from "@/src/lib/front/store-copy";
import type { SiteDimensao } from "@/src/schemas/site-personalization";
import type { SiteTextosExtended } from "@/src/schemas/site-personalization";
import { ProductQuantityStepper } from "@/components/public/ProductQuantityStepper";
import { DEFAULT_DIMENSOES } from "@/src/config/store-copy-defaults";

type Props = {
  variantes: ProductVariant[];
  tamanho: string | null;
  cor: string | null;
  quantidade: number;
  dimensoes?: SiteDimensao[];
  copy: SiteTextosExtended["produto"];
  selecioneVariante: string;
  onChange: (next: {
    tamanho: string | null;
    cor: string | null;
    variant: ProductVariant | null;
  }) => void;
  onQuantidadeChange: (next: number) => void;
};

export function ProductVariantPicker({
  variantes,
  tamanho,
  cor,
  quantidade,
  dimensoes = [...DEFAULT_DIMENSOES],
  copy,
  selecioneVariante,
  onChange,
  onQuantidadeChange,
}: Props) {
  if (variantes.length === 0) return null;

  const dim0 = dimensoes[0]?.id ?? "tamanho";
  const dim1 = dimensoes[1]?.id ?? "cor";
  const label0 = dimensoes[0]?.rotulo ?? "Tamanho";
  const label1 = dimensoes[1]?.rotulo ?? "Cor";

  const values0 = uniqueDimensionValues(variantes, dim0);
  const values1 = uniqueDimensionValues(variantes, dim1);
  const selected = findVariant(variantes, tamanho, cor);
  const stockMax = selected?.estoque ?? 0;
  const qtyEnabled = Boolean(selected) && stockMax > 0;

  function selectDim0(next: string) {
    const next0 = tamanho === next ? null : next;
    const next1 =
      next0 && cor && !combinationExists(variantes, next0, cor) ? null : cor;
    onChange({
      tamanho: next0,
      cor: next1,
      variant: findVariant(variantes, next0, next1),
    });
  }

  function selectDim1(next: string) {
    const next1 = cor === next ? null : next;
    const next0 =
      next1 && tamanho && !combinationExists(variantes, tamanho, next1)
        ? null
        : tamanho;
    onChange({
      tamanho: next0,
      cor: next1,
      variant: findVariant(variantes, next0, next1),
    });
  }

  let stockLabel = selecioneVariante;
  if (tamanho && cor) {
    if (!selected) {
      stockLabel = copy.estoqueIndisponivel;
    } else if (selected.estoque <= 0) {
      stockLabel = copy.badgeEsgotado;
    } else if (selected.estoque === 1) {
      stockLabel = copy.estoqueUm;
    } else {
      stockLabel = formatEstoqueVarios(copy.estoqueVarios, selected.estoque);
    }
  }

  return (
    <div className="product-variants">
      <div className="product-variants__group">
        <p className="product-variants__label">{label0}</p>
        <div
          className="product-variants__chips"
          role="group"
          aria-label={label0}
        >
          {values0.map((t) => {
            const available = isTamanhoAvailable(variantes, t, cor);
            const existsAlone = variantes.some(
              (v) =>
                variantAttr(v, dim0)?.trim().toLowerCase() ===
                t.trim().toLowerCase(),
            );
            const isActive = tamanho === t;
            const soldOut = existsAlone && !available;
            return (
              <button
                key={t}
                type="button"
                className={[
                  "product-variants__chip",
                  isActive ? "product-variants__chip--active" : "",
                  soldOut ? "product-variants__chip--soldout" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={isActive}
                aria-label={
                  soldOut
                    ? `${label0} ${t}, ${copy.badgeEsgotado.toLowerCase()}`
                    : `${label0} ${t}`
                }
                onClick={() => selectDim0(t)}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="product-variants__group">
        <p className="product-variants__label">{label1}</p>
        <div
          className="product-variants__chips"
          role="group"
          aria-label={label1}
        >
          {values1.map((c) => {
            const available = isCorAvailable(variantes, c, tamanho);
            const existsAlone = variantes.some(
              (v) =>
                variantAttr(v, dim1)?.trim().toLowerCase() ===
                c.trim().toLowerCase(),
            );
            const isActive = cor === c;
            const soldOut = existsAlone && !available;
            return (
              <button
                key={c}
                type="button"
                className={[
                  "product-variants__chip",
                  isActive ? "product-variants__chip--active" : "",
                  soldOut ? "product-variants__chip--soldout" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={isActive}
                aria-label={
                  soldOut
                    ? `${label1} ${c}, ${copy.badgeEsgotado.toLowerCase()}`
                    : `${label1} ${c}`
                }
                onClick={() => selectDim1(c)}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <ProductQuantityStepper
        value={quantidade}
        max={qtyEnabled ? stockMax : 0}
        disabled={!qtyEnabled}
        onChange={onQuantidadeChange}
      />

      <p
        className={[
          "product-variants__stock",
          selected && selected.estoque <= 0
            ? "product-variants__stock--out"
            : "",
          selected && selected.estoque > 0
            ? "product-variants__stock--ok"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {stockLabel}
      </p>
    </div>
  );
}
