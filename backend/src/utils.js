export function getMonthKey(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const safe = isNaN(d) ? new Date() : d;
  return `${safe.getFullYear()}-${String(safe.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyToLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
