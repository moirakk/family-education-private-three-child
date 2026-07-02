import type { CSSProperties } from "react";
import type { Child } from "./types";

export type ChildTheme = {
  hex: string;
  dotStyle: CSSProperties;
  borderStyle: CSSProperties;
  surfaceStyle: CSSProperties;
  textStyle: CSSProperties;
  avatarBgStyle: CSSProperties;
  avatarTextStyle: CSSProperties;
};

const FALLBACK_COLOR = "#64748b";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const parsed = Number.parseInt(expanded, 16);

  if (Number.isNaN(parsed) || expanded.length !== 6) {
    return { r: 100, g: 116, b: 139 };
  }

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  };
}

function mixWithChannel(channel: number, target: number, amount: number) {
  return Math.round(channel + (target - channel) * amount);
}

function toRgbString(r: number, g: number, b: number) {
  return `rgb(${r}, ${g}, ${b})`;
}

export function getChildTheme(child: Pick<Child, "avatarColor"> | null | undefined): ChildTheme {
  const hex = child?.avatarColor || FALLBACK_COLOR;
  const { r, g, b } = hexToRgb(hex);
  const bg = {
    r: mixWithChannel(255, r, 0.15),
    g: mixWithChannel(255, g, 0.15),
    b: mixWithChannel(255, b, 0.15)
  };
  const text = {
    r: mixWithChannel(0, r, 0.55),
    g: mixWithChannel(0, g, 0.55),
    b: mixWithChannel(0, b, 0.55)
  };

  return {
    hex,
    dotStyle: { backgroundColor: hex },
    borderStyle: { borderLeftColor: hex },
    surfaceStyle: { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.08)` },
    textStyle: { color: hex },
    avatarBgStyle: { backgroundColor: toRgbString(bg.r, bg.g, bg.b) },
    avatarTextStyle: { color: toRgbString(text.r, text.g, text.b) }
  };
}
