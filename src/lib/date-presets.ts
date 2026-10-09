export type PeriodPreset = "today" | "week" | "month" | "30days" | "year" | "all" | "custom";

export function formatLocalDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getPresetDates(preset: PeriodPreset): { start: string; end: string } {
  const now = new Date();
  const todayStr = formatLocalDate(now);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  if (preset === "today") {
    return { start: todayStr, end: todayStr };
  } else if (preset === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
    return { start: formatLocalDate(startOfWeek), end: todayStr };
  } else if (preset === "month") {
    return { start: `${yyyy}-${mm}-01`, end: todayStr };
  } else if (preset === "30days") {
    const past30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    return { start: formatLocalDate(past30), end: todayStr };
  } else if (preset === "year") {
    return { start: `${yyyy}-01-01`, end: todayStr };
  }
  return { start: "", end: "" };
}
