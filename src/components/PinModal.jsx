import { X, ShieldCheck, Check } from "lucide-react";

export default function PinModal({ open, value, error, busy, onChange, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <div className="rdfd-modal-backdrop" onClick={onClose}>
      <div className="rdfd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rdfd-modal-handle" />
        <div className="rdfd-modal-head">
          <h3>
            <ShieldCheck size={17} style={{ verticalAlign: "-3px", marginRight: "6px" }} />
            Admin access
          </h3>
          <button className="rdfd-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="rdfd-field" style={{ marginBottom: error ? "4px" : "16px" }}>
          <label>Enter PIN</label>
          <input
            type="password"
            inputMode="numeric"
            placeholder="••••"
            value={value}
            autoFocus
            onChange={(e) => onChange(e.target.value)}
            className={error ? "err" : ""}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            enterKeyHint="done"
          />
          {error && <div className="errmsg">{error}</div>}
        </div>

        <div className="rdfd-modal-actions">
          <button type="button" className="rdfd-modal-save" onClick={onSubmit} disabled={busy}>
            <Check size={17} /> {busy ? "Checking…" : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
