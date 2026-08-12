import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

// Edit an existing entry: name, renewal, and the RD/FD lists.
export default function EntryEditModal({ entry, onClose, onSave }) {
  const [name, setName] = useState(entry.name || "");
  const [renewal, setRenewal] = useState(String(entry.renewal ?? ""));
  const [rds, setRds] = useState((entry.rdArray || []).map((r) => ({ scheme: r.rdScheme, amount: String(r.rdAmount) })));
  const [fds, setFds] = useState((entry.fdArray || []).map((f) => ({ scheme: f.fdScheme, amount: String(f.fdAmount) })));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function rowSetter(setter) {
    return {
      update: (i, patch) => setter((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r))),
      remove: (i) => setter((p) => p.filter((_, idx) => idx !== i)),
      add: () => setter((p) => [...p, { scheme: "", amount: "" }]),
    };
  }
  const rd = rowSetter(setRds);
  const fd = rowSetter(setFds);

  async function save() {
    if (!name.trim()) return setError("Name is required");
    if (!(Number(renewal) >= 0)) return setError("Renewal must be a number");

    const patch = {
      name: name.trim(),
      renewal: Number(renewal) || 0,
      rdArray: rds.filter((r) => Number(r.amount) > 0).map((r) => ({ rdAmount: Number(r.amount), rdScheme: r.scheme.trim() })),
      fdArray: fds.filter((f) => Number(f.amount) > 0).map((f) => ({ fdAmount: Number(f.amount), fdScheme: f.scheme.trim() })),
    };
    setBusy(true);
    const ok = await onSave(entry.id, patch);
    setBusy(false);
    if (ok) onClose();
    else setError("Could not save — try again");
  }

  const Section = ({ label, rows, ctrl }) => (
    <div className="adm-editsection">
      <div className="adm-editsection-head">
        <span>{label}</span>
        <button type="button" onClick={ctrl.add}><Plus size={13} /> Add</button>
      </div>
      {rows.length === 0 && <div className="adm-editsection-empty">None</div>}
      {rows.map((r, i) => (
        <div className="adm-editrow" key={i}>
          <input placeholder="Scheme" value={r.scheme} maxLength={80} onChange={(e) => ctrl.update(i, { scheme: e.target.value })} />
          <input placeholder="Amount" inputMode="numeric" value={r.amount} onChange={(e) => ctrl.update(i, { amount: e.target.value.replace(/[^\d.]/g, "") })} />
          <button type="button" className="reg-row-del" onClick={() => ctrl.remove(i)} aria-label="Remove"><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal-head">
          <h3>Edit entry</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <label className="reg-label">Name</label>
        <input className="reg-input" value={name} onChange={(e) => setName(e.target.value)} />

        <label className="reg-label" style={{ marginTop: 12 }}>Renewal amount</label>
        <input className="reg-input" inputMode="numeric" value={renewal} onChange={(e) => setRenewal(e.target.value.replace(/[^\d.]/g, ""))} />

        <Section label="RD" rows={rds} ctrl={rd} />
        <Section label="FD" rows={fds} ctrl={fd} />

        {error && <div className="reg-error">{error}</div>}

        <div className="adm-modal-actions">
          <button type="button" className="adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="reg-submit adm-btn-inline" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
