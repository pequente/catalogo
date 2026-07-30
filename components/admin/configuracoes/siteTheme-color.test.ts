import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clamp,
  expandHexIfComplete,
  hexToHsva,
  hexToHsv,
  hexToRgb,
  hexToRgba,
  hueToCss,
  hsvaToHex,
  hsvaToOpaqueHex,
  hsvToHex,
  hsvToRgb,
  normalizeHexForPicker,
  rgbToHex,
  rgbToHsv,
  rgbaToHex,
} from "@/components/admin/configuracoes/siteTheme";

describe("clamp", () => {
  it("limits values to the inclusive range", () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-1, 0, 10), 0);
    assert.equal(clamp(11, 0, 10), 10);
    assert.equal(clamp(Number.NaN, 0, 10), 0);
  });
});

describe("hex ↔ rgba", () => {
  it("parses #RRGGBB, #RGB, #RGBA and #RRGGBBAA", () => {
    assert.deepEqual(hexToRgba("#FF0000"), { r: 255, g: 0, b: 0, a: 1 });
    assert.deepEqual(hexToRgb("#0f0"), { r: 0, g: 255, b: 0 });
    assert.deepEqual(hexToRgb("#abc"), { r: 170, g: 187, b: 204 });
    const half = hexToRgba("#FF000080");
    assert.ok(half);
    assert.equal(half.r, 255);
    assert.equal(half.g, 0);
    assert.equal(half.b, 0);
    assert.ok(Math.abs(half.a - 128 / 255) < 1e-9);
    assert.deepEqual(hexToRgba("#f008"), {
      r: 255,
      g: 0,
      b: 0,
      a: 0x88 / 255,
    });
  });

  it("returns null for incomplete hex", () => {
    assert.equal(hexToRgba("nope"), null);
    assert.equal(hexToRgb("#12"), null);
  });

  it("round-trips rgb/rgba to uppercase hex", () => {
    assert.equal(rgbToHex({ r: 255, g: 224, b: 224 }), "#FFE0E0");
    assert.equal(rgbToHex({ r: 0, g: 0, b: 0 }), "#000000");
    assert.equal(rgbToHex({ r: 37.4, g: 211.2, b: 102.6 }), "#25D367");
    assert.equal(rgbaToHex({ r: 255, g: 0, b: 0, a: 1 }), "#FF0000");
    assert.equal(rgbaToHex({ r: 255, g: 0, b: 0, a: 0.5 }), "#FF000080");
    assert.equal(rgbaToHex({ r: 255, g: 0, b: 0, a: 0 }), "#FF000000");
  });
});

describe("rgb ↔ hsv", () => {
  it("converts primary colors", () => {
    assert.deepEqual(rgbToHsv({ r: 255, g: 0, b: 0 }), {
      h: 0,
      s: 1,
      v: 1,
    });
    const green = rgbToHsv({ r: 0, g: 255, b: 0 });
    assert.equal(green.h, 120);
    assert.equal(green.s, 1);
    assert.equal(green.v, 1);

    const blue = rgbToHsv({ r: 0, g: 0, b: 255 });
    assert.equal(blue.h, 240);
    assert.equal(blue.s, 1);
    assert.equal(blue.v, 1);
  });

  it("handles grayscale (zero saturation)", () => {
    const gray = rgbToHsv({ r: 128, g: 128, b: 128 });
    assert.equal(gray.h, 0);
    assert.equal(gray.s, 0);
    assert.ok(Math.abs(gray.v - 128 / 255) < 1e-9);
  });

  it("round-trips hsv → rgb → hsv for saturated colors", () => {
    const samples = [
      { h: 0, s: 1, v: 1 },
      { h: 30, s: 0.8, v: 0.9 },
      { h: 180, s: 0.5, v: 0.75 },
      { h: 300, s: 1, v: 0.4 },
    ];
    for (const hsv of samples) {
      const back = rgbToHsv(hsvToRgb(hsv));
      assert.ok(Math.abs(back.h - hsv.h) < 1.5, `h drift for ${hsv.h}`);
      assert.ok(Math.abs(back.s - hsv.s) < 0.02, `s drift for ${hsv.h}`);
      assert.ok(Math.abs(back.v - hsv.v) < 0.02, `v drift for ${hsv.h}`);
    }
  });
});

describe("hex ↔ hsva", () => {
  it("maps known hex values and preserves alpha", () => {
    const red = hexToHsva("#FF0000");
    assert.equal(red.h, 0);
    assert.equal(red.s, 1);
    assert.equal(red.v, 1);
    assert.equal(red.a, 1);

    assert.equal(hsvToHex({ h: 0, s: 1, v: 1 }), "#FF0000");
    assert.equal(hsvToHex({ h: 120, s: 1, v: 1 }), "#00FF00");
    assert.equal(hsvaToHex({ h: 0, s: 1, v: 1, a: 0.5 }), "#FF000080");
    assert.equal(hsvaToOpaqueHex({ h: 0, s: 1, v: 1, a: 0.5 }), "#FF0000");
  });

  it("round-trips common site palette colors", () => {
    for (const hex of [
      "#FFE0E0",
      "#25D366",
      "#E1306C",
      "#111111",
      "#FFF",
      "#FFE0E080",
      "#f008",
    ]) {
      const normalized = expandHexIfComplete(hex)!;
      const back = hsvaToHex(hexToHsva(normalized));
      assert.equal(
        normalizeHexForPicker(back),
        normalizeHexForPicker(normalized),
      );
    }
  });

  it("falls back for invalid input via normalizeHexForPicker", () => {
    const fallback = hexToHsv("not-a-color");
    assert.ok(fallback.v > 0);
    assert.equal(hsvToHex(fallback), hsvToHex(hexToHsv("#111111")));
  });

  it("normalizes opaque 8-digit hex to 6 digits", () => {
    assert.equal(normalizeHexForPicker("#AABBCCFF"), "#aabbcc");
    assert.equal(hsvaToHex(hexToHsva("#AABBCCFF")), "#AABBCC");
  });
});

describe("hueToCss", () => {
  it("returns a fully saturated hue color", () => {
    assert.equal(hueToCss(0), "#FF0000");
    assert.equal(hueToCss(120), "#00FF00");
    assert.equal(hueToCss(240), "#0000FF");
    // HSV sector boundary at 60° lands on green; near-yellow sits just below.
    assert.equal(hueToCss(59.9).startsWith("#FF"), true);
  });
});
