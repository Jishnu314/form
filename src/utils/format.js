export function formatINR(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("en-IN");
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// e.g. "August 2026" — used to stamp the current month into the title.
export function getCurrentMonthLabel(date = new Date()) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// e.g. "2026-08" — a sortable key used to bucket entries by month.
export function getMonthKey(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d)) return getMonthKey(new Date());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// e.g. "2026-08" -> "August 2026"
export function monthKeyToLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// Adds Indian-style comma grouping (last 3 digits, then groups of 2) to a
// raw digit string as the person types, e.g. "10000" -> "10,000".
// Keeps a trailing decimal point/partial decimal intact while typing.
export function formatAmountInput(raw) {
  if (raw === null || raw === undefined) return "";
  const str = String(raw);
  const [intPartRaw, ...decRest] = str.split(".");
  const intPart = intPartRaw.replace(/\D/g, "");
  if (!intPart) return decRest.length ? "." + decRest.join("") : "";

  const lastThree = intPart.slice(-3);
  const other = intPart.slice(0, -3);
  const grouped = other
    ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
    : lastThree;

  return decRest.length ? `${grouped}.${decRest.join("")}` : grouped;
}

// Strips commas back out so the raw value can be stored/parsed as a number.
export function unformatAmountInput(display) {
  return String(display || "").replace(/,/g, "");
}
