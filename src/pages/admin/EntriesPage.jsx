import { useMemo, useState } from "react";
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatINR } from "../../utils/format.js";
import EntryEditModal from "./EntryEditModal.jsx";

const PAGE_SIZE = 20;

function parseTs(en) {
  const raw = en.createdAt || en.date;
  const d = raw ? new Date(String(raw).replace(" ", "T")) : null;
  return d && !isNaN(d) ? d.getTime() : 0;
}
function entryTotal(en) {
  let t = en.renewal || 0;
  (en.rdArray || []).forEach((r) => (t += r.rdAmount || 0));
  (en.fdArray || []).forEach((f) => (t += f.fdAmount || 0));
  return t;
}
function monthKeyOf(en) {
  const raw = en.createdAt || en.date;
  const d = raw ? new Date(String(raw).replace(" ", "T")) : null;
  if (!d || isNaN(d)) return null;
  return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }) };
}

// RD / FD cell: the column total on top, then each scheme + amount listed
// beneath (dimmed) so multiple schemes are visible at a glance. A lone
// unnamed deposit just shows the total to avoid repeating the same number.
function DepositCell({ items = [], amountKey, schemeKey }) {
  if (!items.length) return "—";
  const total = items.reduce((s, it) => s + (Number(it[amountKey]) || 0), 0);
  const showList = items.length > 1 || (items[0] && String(items[0][schemeKey] || "").trim());
  return (
    <>
      <div className="adm-deposit-total">₹{formatINR(total)}</div>
      {showList && (
        <div className="adm-deposit-list">
          {items.map((it, i) => (
            <div className="adm-deposit-item" key={i}>
              <span className="adm-deposit-scheme">{String(it[schemeKey] || "").trim() || "—"}</span>
              <span className="adm-deposit-amt">₹{formatINR(Number(it[amountKey]) || 0)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function EntriesPage({ entries, loading, canEdit, updateEntry, removeEntry, showToast }) {
  const [q, setQ] = useState("");
  const [month, setMonth] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null);

  const monthOptions = useMemo(() => {
    const seen = new Map();
    entries.forEach((en) => {
      const m = monthKeyOf(en);
      if (m && !seen.has(m.key)) seen.set(m.key, m.label);
    });
    return [...seen.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  const filtered = useMemo(() => {
    let list = entries;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((en) => (en.name || "").toLowerCase().includes(needle));
    }
    if (month !== "all") list = list.filter((en) => monthKeyOf(en)?.key === month);

    const [field, dir] = sort.split("-");
    const mul = dir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (field === "name") return mul * (a.name || "").localeCompare(b.name || "");
      if (field === "amount") return mul * (entryTotal(a) - entryTotal(b));
      return mul * (parseTs(a) - parseTs(b));
    });
    return list;
  }, [entries, q, month, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = pageRows.every((r) => next.has(r.id));
      pageRows.forEach((r) => (allSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  }

  async function del(id) {
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    const ok = await removeEntry(id);
    showToast(ok ? "Entry deleted" : "Could not delete");
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }

  async function bulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected entr${ids.length === 1 ? "y" : "ies"}? This can't be undone.`)) return;
    let done = 0;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      if (await removeEntry(id)) done += 1;
    }
    showToast(`Deleted ${done} entr${done === 1 ? "y" : "ies"}`);
    setSelected(new Set());
  }

  if (loading && entries.length === 0) return <div className="adm-empty">Loading entries…</div>;

  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <div className="adm-search">
          <Search size={15} />
          <input
            placeholder="Search by name…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Clear"><X size={14} /></button>}
        </div>

        <select value={month} onChange={(e) => { setMonth(e.target.value); setPage(0); }} className="adm-select">
          <option value="all">All months</option>
          {monthOptions.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)} className="adm-select">
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="amount-desc">Amount high–low</option>
          <option value="amount-asc">Amount low–high</option>
        </select>
      </div>

      {canEdit && selected.size > 0 && (
        <div className="adm-bulkbar">
          <span>{selected.size} selected</span>
          <div>
            <button type="button" className="adm-btn-ghost" onClick={() => setSelected(new Set())}>Clear</button>
            <button type="button" className="adm-btn-danger" onClick={bulkDelete}><Trash2 size={14} /> Delete selected</button>
          </div>
        </div>
      )}

      <div className="adm-card adm-tablewrap">
        {filtered.length === 0 ? (
          <div className="adm-empty">No entries match your filters.</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                {canEdit && (
                  <th className="adm-th-check">
                    <input
                      type="checkbox"
                      checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                      onChange={toggleAllOnPage}
                      aria-label="Select all on page"
                    />
                  </th>
                )}
                <th>Date</th>
                <th>Name</th>
                <th className="adm-num">Renewal</th>
                <th className="adm-num">RD</th>
                <th className="adm-num">FD</th>
                <th className="adm-num">Total</th>
                {canEdit && <th className="adm-th-actions"></th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((en) => {
                return (
                  <tr key={en.id} className={selected.has(en.id) ? "sel" : ""}>
                    {canEdit && (
                      <td className="adm-th-check">
                        <input type="checkbox" checked={selected.has(en.id)} onChange={() => toggle(en.id)} aria-label="Select" />
                      </td>
                    )}
                    <td className="adm-td-date">{en.date}</td>
                    <td className="adm-td-name">{en.name}</td>
                    <td className="adm-num">₹{formatINR(en.renewal || 0)}</td>
                    <td className="adm-num"><DepositCell items={en.rdArray} amountKey="rdAmount" schemeKey="rdScheme" /></td>
                    <td className="adm-num"><DepositCell items={en.fdArray} amountKey="fdAmount" schemeKey="fdScheme" /></td>
                    <td className="adm-num adm-td-total">₹{formatINR(entryTotal(en))}</td>
                    {canEdit && (
                      <td className="adm-td-actions">
                        <button type="button" onClick={() => setEditing(en)} aria-label="Edit"><Pencil size={15} /></button>
                        <button type="button" onClick={() => del(en.id)} aria-label="Delete" className="adm-del"><Trash2 size={15} /></button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="adm-pager">
        <span>{filtered.length} entr{filtered.length === 1 ? "y" : "ies"}</span>
        {pageCount > 1 && (
          <div className="adm-pager-controls">
            <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft size={16} /></button>
            <span>Page {safePage + 1} of {pageCount}</span>
            <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {editing && (
        <EntryEditModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={async (id, patch) => {
            const ok = await updateEntry(id, patch);
            showToast(ok ? "Entry updated" : "Could not update");
            return ok;
          }}
        />
      )}
    </div>
  );
}
