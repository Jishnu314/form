import { useEffect, useState } from "react";
import { Settings, FileSpreadsheet, LockKeyhole, Users, ScrollText, Trash2 } from "lucide-react";
import { api, getToken } from "../utils/api.js";
import { AdEditor, LeaderboardManager } from "./ContentManager.jsx";

function Toggle({ label, hint, checked, onChange }) {
  return (
    <div className="rdfd-toggle-row">
      <div>
        <div className="rdfd-toggle-label">{label}</div>
        {hint && <div className="rdfd-toggle-hint">{hint}</div>}
      </div>
      <button
        type="button"
        className={`rdfd-switch ${checked ? "on" : ""}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span className="rdfd-switch-knob" />
      </button>
    </div>
  );
}

// ---- Staff PIN manager ------------------------------------------------
function StaffManager({ onMsg }) {
  const [users, setUsers] = useState([]);
  const [label, setLabel] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setUsers(await api.listUsers());
    } catch (e) {
      /* panel just stays empty */
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function add() {
    if (!label.trim()) return onMsg("Give the staff PIN a name (e.g. 'Front desk')");
    if (pin.trim().length < 4) return onMsg("Staff PIN needs at least 4 digits");
    setBusy(true);
    try {
      await api.addUser(label.trim(), pin.trim());
      setLabel("");
      setPin("");
      onMsg("Staff PIN added");
      refresh();
    } catch (e) {
      onMsg(e.message || "Could not add staff PIN");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await api.removeUser(id);
      onMsg("Staff PIN removed");
      refresh();
    } catch (e) {
      onMsg(e.message || "Could not remove");
    }
  }

  return (
    <div className="rdfd-settings-block">
      <div className="rdfd-toggle-label">
        <Users size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
        Staff logins
      </div>
      <div className="rdfd-toggle-hint">
        Staff can log in with their own PIN to view the register — they can't edit, delete, change settings, or export.
      </div>

      {users
        .filter((u) => u.role === "staff")
        .map((u) => (
          <div key={u.id} className="rdfd-staff-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px dashed var(--line)" }}>
            <span style={{ fontSize: "13px" }}>{u.label}</span>
            <button type="button" className="danger" title="Remove" onClick={() => remove(u.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#b3453f" }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}

      <div className="rdfd-settings-pin-row" style={{ marginTop: "8px" }}>
        <input placeholder="Name (e.g. Front desk)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        <button type="button" onClick={add} disabled={busy}>Add</button>
      </div>
    </div>
  );
}

// ---- Audit log --------------------------------------------------------
function AuditLog() {
  const [rows, setRows] = useState(null);

  async function load() {
    try {
      setRows(await api.getAudit(50));
    } catch (e) {
      setRows([]);
    }
  }

  if (rows === null) {
    return (
      <button type="button" className="rdfd-settings-export" onClick={load}>
        Show recent activity
      </button>
    );
  }

  return (
    <div style={{ maxHeight: "220px", overflowY: "auto", fontSize: "12px" }}>
      {rows.length === 0 && <div className="rdfd-toggle-hint">No activity recorded yet.</div>}
      {rows.map((r, i) => (
        <div key={i} style={{ padding: "5px 0", borderBottom: "1px dashed var(--line)" }}>
          <strong>{r.actor}</strong> — {r.action}
          {r.detail ? `: ${r.detail}` : ""}
          <div style={{ color: "var(--muted)", fontSize: "11px" }}>{r.created_at} UTC</div>
        </div>
      ))}
    </div>
  );
}

// ---- Main panel -------------------------------------------------------
export default function AdminSettings({ settings, updateSetting, content, saveAd, saveLeaderboard }) {
  const [open, setOpen] = useState(false);
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinDraft, setPinDraft] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [exporting, setExporting] = useState(false);

  function flashMsg(m) {
    setPinMsg(m);
    setTimeout(() => setPinMsg(""), 2500);
  }

  async function savePin() {
    if (!pinCurrent.trim()) return flashMsg("Enter your current PIN first");
    if (pinDraft.trim().length < 4) return flashMsg("New PIN needs at least 4 digits");
    try {
      await api.changePin(pinCurrent.trim(), pinDraft.trim());
      setPinCurrent("");
      setPinDraft("");
      flashMsg("PIN updated");
    } catch (e) {
      flashMsg(e.message || "Could not update PIN");
    }
  }

  async function downloadExcel() {
    setExporting(true);
    try {
      const res = await fetch(api.exportExcelUrl(), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rd-fd-register-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      flashMsg("Export failed — try again");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="rdfd-admin-settings">
      <button type="button" className="rdfd-settings-toggle" onClick={() => setOpen((o) => !o)}>
        <Settings size={15} /> Admin controls {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="rdfd-settings-panel">
          <Toggle
            label="Accepting new entries"
            hint="Turn off to hide the entry form site-wide (view-only register)"
            checked={settings.acceptingEntries}
            onChange={(v) => updateSetting("acceptingEntries", v)}
          />
          <Toggle
            label="RD section on the form"
            hint="Hide the New RD section and reject RD data server-side"
            checked={settings.rdEnabled}
            onChange={(v) => updateSetting("rdEnabled", v)}
          />
          <Toggle
            label="FD section on the form"
            hint="Hide the New FD section and reject FD data server-side"
            checked={settings.fdEnabled}
            onChange={(v) => updateSetting("fdEnabled", v)}
          />
          <Toggle
            label="Sync new entries to Google Sheet"
            hint="Pauses the webhook push without losing saved data"
            checked={settings.sheetSyncEnabled}
            onChange={(v) => updateSetting("sheetSyncEnabled", v)}
          />
          <Toggle
            label="Show grand total banner"
            checked={settings.showGrandTotal}
            onChange={(v) => updateSetting("showGrandTotal", v)}
          />
          <Toggle
            label="Maintenance mode"
            hint="Everyone except you sees a 'temporarily closed' notice"
            checked={settings.maintenanceMode}
            onChange={(v) => updateSetting("maintenanceMode", v)}
          />
          <Toggle
            label="Pop-up ads"
            hint="Show the announcement popup to every visitor (once per visit)"
            checked={settings.adsEnabled}
            onChange={(v) => updateSetting("adsEnabled", v)}
          />
          <Toggle
            label="Game banner"
            hint="Show the leaderboard card below the top bar"
            checked={settings.gameBannerEnabled}
            onChange={(v) => updateSetting("gameBannerEnabled", v)}
          />

          <AdEditor ad={content?.ad} onSave={saveAd} onMsg={flashMsg} />
          <LeaderboardManager leaderboard={content?.leaderboard} onSave={saveLeaderboard} onMsg={flashMsg} />

          <StaffManager onMsg={flashMsg} />

          <div className="rdfd-settings-block">
            <div className="rdfd-toggle-label">
              <LockKeyhole size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
              Change admin PIN
            </div>
            <div className="rdfd-settings-pin-row">
              <input
                type="password"
                inputMode="numeric"
                placeholder="Current PIN"
                value={pinCurrent}
                onChange={(e) => setPinCurrent(e.target.value)}
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="New PIN"
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value)}
              />
              <button type="button" onClick={savePin}>Save</button>
            </div>
          </div>

          <div className="rdfd-settings-block">
            <div className="rdfd-toggle-label">
              <FileSpreadsheet size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
              Excel backup
            </div>
            <div className="rdfd-toggle-hint">
              One workbook, one sheet per month (e.g. "Aug 2026", "Jul 2026") — generated from the server
            </div>
            <button type="button" className="rdfd-settings-export" onClick={downloadExcel} disabled={exporting}>
              {exporting ? "Preparing…" : "Download .xlsx"}
            </button>
          </div>

          <div className="rdfd-settings-block">
            <div className="rdfd-toggle-label">
              <ScrollText size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
              Activity log
            </div>
            <div className="rdfd-toggle-hint">
              Logins, setting changes, edits and deletes — who did what, and when
            </div>
            <AuditLog />
          </div>

          {pinMsg && <div className="rdfd-settings-pinmsg">{pinMsg}</div>}
        </div>
      )}
    </div>
  );
}
