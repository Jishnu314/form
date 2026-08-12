import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { api } from "../../utils/api.js";

function timeAgo(raw) {
  const d = new Date(String(raw).replace(" ", "T") + "Z");
  if (isNaN(d)) return raw;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const ACTION_LABELS = {
  login: "Signed in",
  "settings": "Changed settings",
  "delete-entry": "Deleted entry",
  "edit-entry": "Edited entry",
  "add-staff": "Added staff",
  "remove-staff": "Removed staff",
  "change-pin": "Changed PIN",
  content: "Updated content",
  backup: "Downloaded backup",
  restore: "Restored backup",
  "import-entries": "Imported entries",
};

export default function AuditPage({ showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);

  async function load(n = limit) {
    setLoading(true);
    try {
      setRows(await api.getAudit(n));
    } catch (e) {
      showToast(e.message || "Could not load activity");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <select className="adm-select" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={250}>Last 250</option>
          <option value={500}>Last 500</option>
        </select>
        <button type="button" className="adm-btn-ghost" onClick={() => load(limit)}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="adm-card adm-tablewrap">
        {loading ? (
          <div className="adm-empty">Loading activity…</div>
        ) : rows.length === 0 ? (
          <div className="adm-empty">No activity recorded yet.</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="adm-td-date">{timeAgo(r.created_at)}</td>
                  <td>{r.actor}</td>
                  <td>{ACTION_LABELS[r.action] || r.action}</td>
                  <td className="adm-td-detail">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
