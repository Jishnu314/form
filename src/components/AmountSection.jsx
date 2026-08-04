import { Plus, Pencil } from "lucide-react";
import { formatINR } from "../utils/format.js";

export default function AmountSection({
  icon,
  label,
  kind, // "RD" | "FD"
  items,
  amountKey, // "rdAmount" | "fdAmount"
  schemeKey, // "rdScheme" | "fdScheme"
  total,
  onAdd,
  onEditItem,
}) {
  return (
    <div className="rdfd-section-block">
      <div className="rdfd-section-heading">
        <span className="lbl">
          {icon} {label}
        </span>
        {items.length > 0 && <span className="sum">₹{formatINR(total)}</span>}
      </div>

      {items.map((item, idx) => (
        <button type="button" key={item.id} className="rdfd-mini" onClick={() => onEditItem(item)}>
          <span className="mini-left">
            <span className="mini-idx">
              {kind} #{idx + 1}
            </span>
            <span className="mini-scheme">{item[schemeKey]}</span>
          </span>
          <span className="mini-right">
            <span className="mini-amount">₹{formatINR(item[amountKey])}</span>
            <Pencil size={13} color="var(--muted)" />
          </span>
        </button>
      ))}

      <button type="button" className="rdfd-add-btn" onClick={onAdd}>
        <Plus size={14} /> {items.length === 0 ? `Add new ${kind}` : `Add another ${kind}`}
      </button>
    </div>
  );
}
