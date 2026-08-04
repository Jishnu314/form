import { useState } from "react";
import { Settings, FileSpreadsheet, LockKeyhole } from "lucide-react";
import { exportEntriesToExcel } from "../utils/excel.js";

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

export default function AdminSettings({ settings, updateSetting, entries }) {
  const [open, setOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  function savePin() {
    if (pinDraft.trim().length < 4) {
      setPinMsg("PIN needs at least 4 digits");
      return;
    }
    updateSetting("adminPin", pinDraft.trim());
    setPinDraft("");
    setPinMsg("PIN updated");
    setTimeout(() => setPinMsg(""), 2500);
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
            label="Sync new entries to Google Sheet"
            hint="Pauses the webhook push without losing local data"
            checked={settings.sheetSyncEnabled}
            onChange={(v) => updateSetting("sheetSyncEnabled", v)}
          />
          <Toggle
            label="Show grand total banner"
            checked={settings.showGrandTotal}
            onChange={(v) => updateSetting("showGrandTotal", v)}
          />

          <div className="rdfd-settings-block">
            <div className="rdfd-toggle-label">
              <LockKeyhole size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
              Change admin PIN
            </div>
            <div className="rdfd-settings-pin-row">
              <input
                type="password"
                inputMode="numeric"
                placeholder="New PIN"
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value)}
              />
              <button type="button" onClick={savePin}>Save</button>
            </div>
            {pinMsg && <div className="rdfd-settings-pinmsg">{pinMsg}</div>}
          </div>

          <div className="rdfd-settings-block">
            <div className="rdfd-toggle-label">
              <FileSpreadsheet size={13} style={{ verticalAlign: "-2px", marginRight: "4px" }} />
              Excel backup
            </div>
            <div className="rdfd-toggle-hint">
              One workbook, one sheet per month (e.g. "Aug 2026", "Jul 2026")
            </div>
            <button
              type="button"
              className="rdfd-settings-export"
              onClick={() => exportEntriesToExcel(entries)}
            >
              Download .xlsx
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
