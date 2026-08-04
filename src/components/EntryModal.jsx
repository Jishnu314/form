import { X, Trash2, Check } from "lucide-react";
import { formatAmountInput, unformatAmountInput } from "../utils/format.js";
const TITLES = {
  renewal: "Renewal amount",
  rd: { new: "New RD", edit: "Edit RD" },
  fd: { new: "New FD", edit: "Edit FD" },
};

function getTitle(modal) {
  if (modal.kind === "renewal") return TITLES.renewal;
  if (modal.kind === "rd") return modal.editId ? TITLES.rd.edit : TITLES.rd.new;
  if (modal.kind === "fd") return modal.editId ? TITLES.fd.edit : TITLES.fd.new;
  return "";
}

export default function EntryModal({
  modal,
  onClose,
  onAmountChange,
  onSchemeChange,
  onSave,
  onDelete,
}) {
  if (!modal.open) return null;

  const amountInvalid =
    modal.error && (!modal.amount || Number(modal.amount) <= 0);
  const schemeInvalid = modal.error && !modal.scheme.trim();

  return (
    <div className="rdfd-modal-backdrop" onClick={onClose}>
      <div className="rdfd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rdfd-modal-handle" />
        <div className="rdfd-modal-head">
          <h3>{getTitle(modal)}</h3>
          <button className="rdfd-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="rdfd-field">
          <label>
            Amount (₹)<span className="req">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={formatAmountInput(modal.amount)}
            autoFocus
            onChange={(e) =>
              onAmountChange(unformatAmountInput(e.target.value))
            }
            className={amountInvalid ? "err" : ""}
            enterKeyHint={modal.kind === "renewal" ? "done" : "next"}
          />
        </div>

        {modal.kind !== "renewal" && (
          <div
            className="rdfd-field"
            style={{ marginBottom: modal.error ? "4px" : "0" }}
          >
            <label>
              Scheme name<span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder="Scheme name"
              value={modal.scheme}
              onChange={(e) => onSchemeChange(e.target.value)}
              className={schemeInvalid ? "err" : ""}
              enterKeyHint="done"
            />
          </div>
        )}

        {modal.error && (
          <div className="errmsg" style={{ marginBottom: "8px" }}>
            {modal.error}
          </div>
        )}

        <div className="rdfd-modal-actions">
          {modal.editId && (
            <button
              type="button"
              className="rdfd-modal-delete"
              onClick={onDelete}
            >
              <Trash2 size={15} /> Remove
            </button>
          )}
          <button type="button" className="rdfd-modal-save" onClick={onSave}>
            <Check size={17} /> {modal.editId ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
