import { Trash2, Landmark, PiggyBank, Banknote } from "lucide-react";
import { formatINR } from "../utils/format.js";

function LineItems({ items, amountKey, schemeKey, label }) {
  return (
    <div style={{ borderTop: "1px dashed var(--line)", paddingTop: "8px" }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            marginBottom: idx !== items.length - 1 ? "8px" : 0,
            paddingBottom: idx !== items.length - 1 ? "8px" : 0,
            borderBottom: idx !== items.length - 1 ? "1px dashed var(--line)" : "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "3px" }}>
            <span style={{ color: "var(--muted)" }}>
              {label} #{idx + 1}
            </span>
            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, color: "var(--ink)" }}>
              ₹{formatINR(item[amountKey])}
            </span>
          </div>
          {item[schemeKey] && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", alignItems: "center" }}>
              <span style={{ color: "var(--muted)" }}>Scheme</span>
              <span className="rdfd-tag">{item[schemeKey]}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SubCard({ icon, title, total, children }) {
  return (
    <div style={{ marginTop: "12px", background: "#fbfbfa", border: "1px solid var(--line)", borderRadius: "10px", padding: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: children ? "10px" : 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.4px", display: "flex", alignItems: "center", gap: "5px" }}>
          {icon} {title}
        </div>
        <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "14px", fontWeight: 600, color: "var(--accent-deep)" }}>
          ₹{formatINR(total)}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function EntryCard({ entry, onRemove }) {
  const rdTotal = entry.rdArray.reduce((sum, rd) => sum + rd.rdAmount, 0);
  const fdTotal = entry.fdArray.reduce((sum, fd) => sum + fd.fdAmount, 0);

  return (
    <div className="rdfd-entry">
      <div className="rdfd-entry-top">
        <div>
          <div className="rdfd-entry-name">{entry.name}</div>
          <div className="rdfd-entry-date">{entry.date}</div>
        </div>
        <button className="rdfd-del" onClick={() => onRemove(entry.id)}>
          <Trash2 size={16} />
        </button>
      </div>

      <SubCard icon={<Landmark size={13} />} title="Renewal" total={entry.renewal} />

      {entry.rdArray.length > 0 && (
        <SubCard icon={<PiggyBank size={13} />} title="New RD" total={rdTotal}>
          <LineItems items={entry.rdArray} amountKey="rdAmount" schemeKey="rdScheme" label="RD" />
        </SubCard>
      )}

      {entry.fdArray.length > 0 && (
        <SubCard icon={<Banknote size={13} />} title="New FD" total={fdTotal}>
          <LineItems items={entry.fdArray} amountKey="fdAmount" schemeKey="fdScheme" label="FD" />
        </SubCard>
      )}
    </div>
  );
}
