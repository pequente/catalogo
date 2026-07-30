"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { FieldHint } from "@/components/admin/FieldHint";
import {
  clamp,
  expandHexIfComplete,
  hexToHsva,
  hueToCss,
  hsvaToHex,
  hsvaToOpaqueHex,
  normalizeHexForPicker,
  type HsvaColor,
} from "@/components/admin/configuracoes/siteTheme";
import styles from "./ColorField.module.css";

type DragKind = "sv" | "hue" | "alpha";

function roundHsva(hsva: HsvaColor): HsvaColor {
  return {
    h: Math.round(hsva.h * 10) / 10,
    s: Math.round(hsva.s * 1000) / 1000,
    v: Math.round(hsva.v * 1000) / 1000,
    a: Math.round(hsva.a * 1000) / 1000,
  };
}

function sameHex(a: string, b: string): boolean {
  return normalizeHexForPicker(a) === normalizeHexForPicker(b);
}

export function ColorField({
  label,
  hint,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  hint: string;
  value: string;
  disabled?: boolean;
  onCommit: (hex: string) => void;
}) {
  const [hexDraft, setHexDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [hsva, setHsva] = useState<HsvaColor>(() => hexToHsva(value));
  const dragKindRef = useRef<DragKind | null>(null);
  const hsvaRef = useRef(hsva);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const previewHex = hsvaToHex(hsva);
  const opaqueHex = hsvaToOpaqueHex(hsva);

  useEffect(() => {
    hsvaRef.current = hsva;
  }, [hsva]);

  useEffect(() => {
    setHexDraft(value);
    if (dragKindRef.current) return;
    const next = hexToHsva(value);
    setHsva((prev) => {
      if (
        Math.abs(prev.h - next.h) < 0.05 &&
        Math.abs(prev.s - next.s) < 0.002 &&
        Math.abs(prev.v - next.v) < 0.002 &&
        Math.abs(prev.a - next.a) < 0.002
      ) {
        return prev;
      }
      // Preserve hue when saturation/value collapse to grayscale.
      if (next.s < 0.002 && prev.s >= 0.002) {
        return { ...next, h: prev.h };
      }
      return next;
    });
  }, [value]);

  const commitHsva = useCallback(
    (next: HsvaColor) => {
      const rounded = roundHsva(next);
      setHsva(rounded);
      hsvaRef.current = rounded;
      const hex = hsvaToHex(rounded);
      setHexDraft(hex);
      if (!sameHex(hex, value)) onCommit(hex);
    },
    [onCommit, value],
  );

  const close = useCallback(() => {
    setOpen(false);
    dragKindRef.current = null;
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;

    function onDocPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        dragKindRef.current = null;
      }
    }

    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }

    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  function readSv(clientX: number, clientY: number): HsvaColor {
    const el = svRef.current;
    if (!el) return hsvaRef.current;
    const rect = el.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    const y = clamp((clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
    return {
      ...hsvaRef.current,
      s: x,
      v: 1 - y,
    };
  }

  function readHue(clientX: number): HsvaColor {
    const el = hueRef.current;
    if (!el) return hsvaRef.current;
    const rect = el.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    return {
      ...hsvaRef.current,
      h: x * 360,
    };
  }

  function readAlpha(clientX: number): HsvaColor {
    const el = alphaRef.current;
    if (!el) return hsvaRef.current;
    const rect = el.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    return {
      ...hsvaRef.current,
      a: x,
    };
  }

  function beginDrag(
    kind: DragKind,
    e: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragKindRef.current = kind;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (kind === "sv") commitHsva(readSv(e.clientX, e.clientY));
    else if (kind === "hue") commitHsva(readHue(e.clientX));
    else commitHsva(readAlpha(e.clientX));
  }

  function onDragMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragKindRef.current) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if (dragKindRef.current === "sv") commitHsva(readSv(e.clientX, e.clientY));
    else if (dragKindRef.current === "hue")
      commitHsva(readHue(e.clientX));
    else commitHsva(readAlpha(e.clientX));
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragKindRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragKindRef.current = null;
  }

  function nudgeSv(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const step = e.shiftKey ? 0.08 : 0.02;
    const { h, a } = hsva;
    let { s, v } = hsva;
    if (e.key === "ArrowRight") s = clamp(s + step, 0, 1);
    else if (e.key === "ArrowLeft") s = clamp(s - step, 0, 1);
    else if (e.key === "ArrowUp") v = clamp(v + step, 0, 1);
    else if (e.key === "ArrowDown") v = clamp(v - step, 0, 1);
    else return;
    e.preventDefault();
    commitHsva({ h, s, v, a });
  }

  function nudgeHue(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const step = e.shiftKey ? 12 : 2;
    let { h } = hsva;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") h = (h + step) % 360;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown")
      h = (h - step + 360) % 360;
    else return;
    e.preventDefault();
    commitHsva({ ...hsva, h });
  }

  function nudgeAlpha(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const step = e.shiftKey ? 0.1 : 0.02;
    let { a } = hsva;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") a = clamp(a + step, 0, 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown")
      a = clamp(a - step, 0, 1);
    else return;
    e.preventDefault();
    commitHsva({ ...hsva, a });
  }

  function applyHexDraft(raw: string) {
    setHexDraft(raw);
    const expanded = expandHexIfComplete(raw);
    if (expanded) {
      setHsva(hexToHsva(expanded));
      onCommit(expanded);
    }
  }

  const svStyle = {
    "--cf-hue": hueToCss(hsva.h),
  } as CSSProperties;

  const alphaStyle = {
    "--cf-opaque": opaqueHex,
  } as CSSProperties;

  const swatchColor = normalizeHexForPicker(value);

  return (
    <div
      className={`admin-form__field admin-config-color ${styles.root}`}
      ref={wrapRef}
    >
      <span className="admin-field-label">
        {label}
        <FieldHint text={hint} />
      </span>

      <div className={styles.field}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.swatch}
          disabled={disabled}
          aria-label={`Selecionar ${label.toLowerCase()}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
          }}
        >
          <span
            className={styles.swatchFill}
            style={{ backgroundColor: swatchColor }}
            aria-hidden
          />
        </button>
        <input
          className={`input ${styles.hexInput}`}
          value={hexDraft}
          spellCheck={false}
          disabled={disabled}
          aria-label={`${label} em hexadecimal`}
          onChange={(e) => {
            applyHexDraft(e.target.value);
          }}
          onBlur={() => {
            const expanded = expandHexIfComplete(hexDraft);
            if (expanded) {
              const canonical = hsvaToHex(hexToHsva(expanded));
              setHexDraft(canonical);
              setHsva(hexToHsva(expanded));
              onCommit(canonical);
            } else {
              setHexDraft(value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
        />
      </div>

      {open ? (
        <div
          id={panelId}
          className={styles.popover}
          role="dialog"
          aria-label={`Seletor de cor · ${label}`}
        >
          <div
            ref={svRef}
            className={styles.sv}
            style={svStyle}
            role="slider"
            tabIndex={0}
            aria-label="Saturação e brilho"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsva.s * 100)}
            aria-valuetext={`Saturação ${Math.round(hsva.s * 100)}%, brilho ${Math.round(hsva.v * 100)}%`}
            onPointerDown={(e) => beginDrag("sv", e)}
            onPointerMove={onDragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={nudgeSv}
          >
            <span
              className={styles.svThumb}
              style={{
                left: `${hsva.s * 100}%`,
                top: `${(1 - hsva.v) * 100}%`,
                backgroundColor: opaqueHex,
              }}
              aria-hidden
            />
          </div>

          <div className={styles.controls}>
            <span className={styles.preview} aria-hidden>
              <span
                className={styles.previewFill}
                style={{ backgroundColor: previewHex }}
              />
            </span>
            <div className={styles.sliders}>
              <div
                ref={hueRef}
                className={styles.hue}
                role="slider"
                tabIndex={0}
                aria-label="Matiz"
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={Math.round(hsva.h)}
                aria-valuetext={`${Math.round(hsva.h)} graus`}
                onPointerDown={(e) => beginDrag("hue", e)}
                onPointerMove={onDragMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={nudgeHue}
              >
                <span
                  className={styles.trackThumb}
                  style={{ left: `${(hsva.h / 360) * 100}%` }}
                  aria-hidden
                />
              </div>
              <div
                ref={alphaRef}
                className={styles.alpha}
                style={alphaStyle}
                role="slider"
                tabIndex={0}
                aria-label="Opacidade"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(hsva.a * 100)}
                aria-valuetext={`${Math.round(hsva.a * 100)}%`}
                onPointerDown={(e) => beginDrag("alpha", e)}
                onPointerMove={onDragMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={nudgeAlpha}
              >
                <span
                  className={styles.trackThumb}
                  style={{ left: `${hsva.a * 100}%` }}
                  aria-hidden
                />
              </div>
            </div>
          </div>

          <div className={styles.metaRow}>
            <label className={styles.meta}>
              <span className={styles.metaLabel}>HEX</span>
              <input
                className={`input ${styles.popoverHex}`}
                value={hexDraft}
                spellCheck={false}
                disabled={disabled}
                onChange={(e) => {
                  applyHexDraft(e.target.value);
                }}
                onBlur={() => {
                  const expanded = expandHexIfComplete(hexDraft);
                  if (expanded) {
                    const canonical = hsvaToHex(hexToHsva(expanded));
                    setHexDraft(canonical);
                    setHsva(hexToHsva(expanded));
                    onCommit(canonical);
                  } else {
                    setHexDraft(previewHex);
                  }
                }}
              />
            </label>
            <span className={styles.alphaReadout} aria-hidden>
              {Math.round(hsva.a * 100)}%
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
