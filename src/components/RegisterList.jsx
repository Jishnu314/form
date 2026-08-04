import { useState } from "react";
import { Download, Lock, Search, X } from "lucide-react";
import EntryCard from "./EntryCard.jsx";
import { exportEntriesToCSV } from "../utils/csv.js";

export default function RegisterList({ entries, loading, onRemoveEntry, onLock }) {
  const [query, setQuery] = useState("");

  const filtered = entries.filter((en) => en.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <div className="rdfd-listhead">
        <h2>Register</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="rdfd-export" onClick={() => exportEntriesToCSV(entries)} type="button">
            <Download size={13} /> Export CSV
          </button>
          <button className="rdfd-export" onClick={onLock} type="button">
            <Lock size={13} /> Lock
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="rdfd-search">
          <Search size={16} />
          <input placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <X size={15} color="var(--muted)" />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="rdfd-empty">Loading register…</div>
      ) : filtered.length === 0 ? (
        <div className="rdfd-empty">
          {entries.length === 0 ? "No entries yet. Add your first one above." : "No entries match that search."}
        </div>
      ) : (
        filtered.map((en) => <EntryCard key={en.id} entry={en} onRemove={onRemoveEntry} />)
      )}
    </>
  );
}
