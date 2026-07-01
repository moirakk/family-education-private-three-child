import type { CSSProperties } from "react";
import type { Child } from "@/lib/types";

export type ChildTheme = {
  hex: string;
  dotStyle: CSSProperties;
  borderStyle: CSSProperties;
  surfaceStyle: CSSProperties;
  textStyle: CSSProperties;
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

export function getChildTheme(child: Pick<Child, "avatarColor"> | null | undefined): ChildTheme {
  const hex = child?.avatarColor || FALLBACK_COLOR;
  const { r, g, b } = hexToRgb(hex);

  return {
    hex,
    dotStyle: { backgroundColor: hex },
    borderStyle: { borderLeftColor: hex },
    surfaceStyle: { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.08)` },
    textStyle: { color: hex }
  };
}
