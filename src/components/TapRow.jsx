import { ChevronRight } from "lucide-react";
import { formatINR } from "../utils/format.js";

export default function TapRow({ icon, label, required, value, onClick }) {
  return (
    <button type="button" className={`rdfd-tap-row ${value ? "filled" : ""}`} onClick={onClick}>
      <span className="tap-left">
        {icon}
        <span>
          <div className="tap-label">
            {label}
            {required && <span style={{ color: "var(--danger)" }}> *</span>}
          </div>
          {!value && <div className="tap-sub">Tap to enter</div>}
        </span>
      </span>
      <span className="tap-right">
        {value ? <span className="tap-value">₹{formatINR(value)}</span> : <span className="tap-placeholder">Add</span>}
        <ChevronRight size={16} color="var(--muted)" />
      </span>
    </button>
  );
}
