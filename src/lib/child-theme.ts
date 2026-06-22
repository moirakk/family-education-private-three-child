export const CHILD_THEMES = [
  {
    dot: "bg-amber-400",
    border: "border-l-amber-400",
    surface: "bg-amber-50",
    text: "text-amber-800"
  },
  {
    dot: "bg-teal-400",
    border: "border-l-teal-400",
    surface: "bg-teal-50",
    text: "text-teal-800"
  },
  {
    dot: "bg-blue-400",
    border: "border-l-blue-400",
    surface: "bg-blue-50",
    text: "text-blue-800"
  },
  {
    dot: "bg-rose-400",
    border: "border-l-rose-400",
    surface: "bg-rose-50",
    text: "text-rose-800"
  }
] as const;

export function getChildTheme(index: number) {
  return CHILD_THEMES[Math.max(0, index) % CHILD_THEMES.length];
}
