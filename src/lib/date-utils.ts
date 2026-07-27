export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
