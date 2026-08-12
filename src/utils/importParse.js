// Parse a CSV back into entry objects. Matches the column layout the app
// exports (Date, Name, Renewal, RD Amount, RD Scheme, FD Amount, FD Scheme),
// where an entry can span multiple rows — continuation rows leave Name blank
// and just add more RD/FD items.

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      /* ignore */
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const num = (v) => Number(String(v ?? "").replace(/,/g, "").trim()) || 0;

export function parseEntriesCsv(text) {
  const rows = parseCsvRows(text).filter((r) => r.some((c) => String(c).trim() !== ""));
  if (rows.length === 0) return [];

  // Drop a header row if present.
  const first = (rows[0][0] || "").toString().trim().toLowerCase();
  const dataRows = first === "date" ? rows.slice(1) : rows;

  const todayFriendly = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const entries = [];
  let cur = null;

  for (const r of dataRows) {
    const [date, name, renewal, rdAmt, rdSch, fdAmt, fdSch] = r;
    if (name && name.trim()) {
      cur = {
        name: name.trim(),
        renewal: num(renewal),
        date: (date && date.trim()) || todayFriendly,
        rdArray: [],
        fdArray: [],
      };
      entries.push(cur);
    }
    if (!cur) continue;
    if (num(rdAmt) > 0) cur.rdArray.push({ rdAmount: num(rdAmt), rdScheme: (rdSch || "").trim() });
    if (num(fdAmt) > 0) cur.fdArray.push({ fdAmount: num(fdAmt), fdScheme: (fdSch || "").trim() });
  }

  return entries;
}
