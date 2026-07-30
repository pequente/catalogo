"use client";

type Props = {
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
};

export function ProductQuantityStepper({
  value,
  max,
  disabled = false,
  onChange,
}: Props) {
  const effectiveMax = Math.max(0, Math.floor(max));
  const canDecrement = !disabled && value > 1;
  const canIncrement = !disabled && effectiveMax > 0 && value < effectiveMax;
  const atMax = !disabled && effectiveMax > 0 && value >= effectiveMax;

  return (
    <div className="product-quantity">
      <p className="product-variants__label" id="product-quantity-label">
        Quantidade
      </p>
      <div
        className="product-quantity__controls"
        role="group"
        aria-labelledby="product-quantity-label"
      >
        <button
          type="button"
          className="product-quantity__btn"
          aria-label="Diminuir quantidade"
          disabled={!canDecrement}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <span
          className="product-quantity__value"
          aria-live="polite"
          aria-atomic="true"
        >
          {value}
        </span>
        <button
          type="button"
          className="product-quantity__btn"
          aria-label={
            atMax
              ? `Aumentar quantidade, máximo ${effectiveMax} disponível`
              : "Aumentar quantidade"
          }
          disabled={!canIncrement}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
      {atMax ? (
        <p className="product-quantity__hint">Máximo disponível</p>
      ) : null}
    </div>
  );
}
