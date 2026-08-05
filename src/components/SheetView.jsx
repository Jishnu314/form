import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Trash2, X } from "lucide-react";
import { formatINR, monthKeyToLabel } from "../utils/format.js";
import { useSettings } from "../hooks/useSettings.js"; // ← ADD THIS IMPORT

// ---- helpers ----------------------------------------------------------
function entryTotals(en) {
  const rd = en.rdArray.reduce((s, r) => s + (r.rdAmount || 0), 0);
  const fd = en.fdArray.reduce((s, f) => s + (f.fdAmount || 0), 0);
  return { rd, fd, total: (en.renewal || 0) + rd + fd };
}

function entryMonthKey(en) {
  const d = new Date(en.createdAt || en.timestamp || en.date);
  if (isNaN(d)) return "unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const COLUMNS = [
  { key: "date", label: "Date" },
  { key: "name", label: "Name" },
  { key: "renewal", label: "Renewal", num: true },
  { key: "rd", label: "RD", num: true },
  { key: "fd", label: "FD", num: true },
  { key: "total", label: "Total", num: true },
];

// ---- inline edit row --------------------------------------------------
function EditRow({ entry, onSave, onCancel }) {
  const [name, setName] = useState(entry.name);
  const [renewal, setRenewal] = useState(String(entry.renewal ?? ""));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const ok = await onSave(entry.id, {
      name: name.trim(),
      renewal: Number(renewal) || 0,
    });
    setBusy(false);
    if (ok) onCancel();
  }

  const { rd, fd } = entryTotals(entry);
  return (
    <tr className="rdfd-sheet-editrow">
      <td>{entry.date}</td>
      <td>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="num">
        <input
          value={renewal}
          inputMode="numeric"
          onChange={(e) => setRenewal(e.target.value.replace(/[^\d.]/g, ""))}
        />
      </td>
      <td className="num">{formatINR(rd)}</td>
      <td className="num">{formatINR(fd)}</td>
      <td className="num">{formatINR((Number(renewal) || 0) + rd + fd)}</td>
      <td className="rdfd-sheet-actions">
        <button type="button" title="Save" onClick={save} disabled={busy}>
          <Check size={14} />
        </button>
        <button type="button" title="Cancel" onClick={onCancel}>
          <X size={14} />
        </button>
      </td>
    </tr>
  );
}

// ---- the sheet --------------------------------------------------------
export default function SheetView({
  entries,
  canEdit = true,
  onUpdateEntry,
  onRemoveEntry,
}) {
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [month, setMonth] = useState("all");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // ← ADD THIS:
  const { settings } = useSettings();

  const months = useMemo(() => {
    const keys = [...new Set(entries.map(entryMonthKey))].filter(
      (k) => k !== "unknown",
    );
    return keys.sort().reverse();
  }, [entries]);

  const rows = useMemo(() => {
    let list = entries.map((en) => ({
      en,
      ...entryTotals(en),
      monthKey: entryMonthKey(en),
    }));
    if (month !== "all") list = list.filter((r) => r.monthKey === month);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((r) => r.en.name.toLowerCase().includes(q));

    list.sort((a, b) => {
      let av, bv;
      if (sortKey === "date") {
        av =
          new Date(a.en.createdAt || a.en.timestamp || a.en.date).getTime() ||
          0;
        bv =
          new Date(b.en.createdAt || b.en.timestamp || b.en.date).getTime() ||
          0;
      } else if (sortKey === "name") {
        av = a.en.name.toLowerCase();
        bv = b.en.name.toLowerCase();
      } else if (sortKey === "renewal") {
        av = a.en.renewal || 0;
        bv = b.en.renewal || 0;
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [entries, month, query, sortKey, sortDir]);

  const totals = rows.reduce(
    (acc, r) => {
      acc.renewal += r.en.renewal || 0;
      acc.rd += r.rd;
      acc.fd += r.fd;
      acc.total += r.total;
      return acc;
    },
    { renewal: 0, rd: 0, fd: 0, total: 0 },
  );

  function clickSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <div
      className={`rdfd-sheet ${settings.stickyNameColumn ? "sticky-enabled" : ""}`}
    >
      {" "}
      {/* ← CHANGED THIS LINE */}
      <div className="rdfd-sheet-toolbar">
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">All months</option>
          {months.map((k) => (
            <option key={k} value={k}>
              {monthKeyToLabel(k)}
            </option>
          ))}
        </select>
        <input
          placeholder="Filter by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="rdfd-sheet-count">
          {rows.length} row{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="rdfd-sheet-scroll">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={c.num ? "num" : ""}
                  onClick={() => clickSort(c.key)}
                >
                  {c.label}
                  {sortKey === c.key &&
                    (sortDir === "asc" ? (
                      <ArrowUp size={11} />
                    ) : (
                      <ArrowDown size={11} />
                    ))}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="rdfd-sheet-empty">
                  No entries match.
                </td>
              </tr>
            )}
            {rows.map(({ en, rd, fd, total }) =>
              editingId === en.id ? (
                <EditRow
                  key={en.id}
                  entry={en}
                  onSave={onUpdateEntry}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <tr key={en.id}>
                  <td>{en.date}</td>
                  <td>{en.name}</td>
                  <td className="num">{formatINR(en.renewal)}</td>
                  <td className="num">{rd ? formatINR(rd) : "—"}</td>
                  <td className="num">{fd ? formatINR(fd) : "—"}</td>
                  <td className="num total">{formatINR(total)}</td>
                  <td className="rdfd-sheet-actions">
                    {!canEdit ? null : confirmId === en.id ? (
                      <>
                        <button
                          type="button"
                          className="danger"
                          title="Confirm delete"
                          onClick={() => {
                            onRemoveEntry(en.id);
                            setConfirmId(null);
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          title="Cancel"
                          onClick={() => setConfirmId(null)}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setEditingId(en.id)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="danger"
                          title="Delete"
                          onClick={() => setConfirmId(en.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2}>Totals</td>
                <td className="num">{formatINR(totals.renewal)}</td>
                <td className="num">{formatINR(totals.rd)}</td>
                <td className="num">{formatINR(totals.fd)}</td>
                <td className="num total">{formatINR(totals.total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
