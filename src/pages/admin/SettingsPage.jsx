import { useState } from "react";
import { KeyRound } from "lucide-react";
import Toggle from "../../components/Toggle.jsx";
import { api } from "../../utils/api.js";

export default function SettingsPage({ settings, updateSetting, showToast }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePin(e) {
    e.preventDefault();
    if (newPin.trim().length < 4) return showToast("New PIN needs at least 4 digits");
    setBusy(true);
    try {
      await api.changePin(currentPin.trim(), newPin.trim());
      showToast("PIN changed");
      setCurrentPin("");
      setNewPin("");
    } catch (err) {
      showToast(err.message || "Could not change PIN");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-stack">
      <div className="adm-card">
        <div className="adm-card-title">Register controls</div>
        <div className="rdfd-settings-toggle">
          <Toggle
            label="Accepting new entries"
            hint="When off, the public form is paused (view-only for you)."
            on={!!settings.acceptingEntries}
            onChange={(v) => updateSetting("acceptingEntries", v)}
          />
          <Toggle
            label="Show grand total banner"
            hint="Shows the running total at the top of your register."
            on={!!settings.showGrandTotal}
            onChange={(v) => updateSetting("showGrandTotal", v)}
          />
          <Toggle
            label="RD section enabled"
            hint="Show the recurring-deposit section on the form."
            on={!!settings.rdEnabled}
            onChange={(v) => updateSetting("rdEnabled", v)}
          />
          <Toggle
            label="FD section enabled"
            hint="Show the fixed-deposit section on the form."
            on={!!settings.fdEnabled}
            onChange={(v) => updateSetting("fdEnabled", v)}
          />
          <Toggle
            label="Google Sheet sync"
            hint="Push each new entry to your connected Google Sheet."
            on={!!settings.sheetSyncEnabled}
            onChange={(v) => updateSetting("sheetSyncEnabled", v)}
          />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-title"><KeyRound size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Change your PIN</div>
        <form className="adm-pinform" onSubmit={changePin}>
          <input
            className="reg-input"
            type="password"
            inputMode="numeric"
            placeholder="Current PIN"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value)}
          />
          <input
            className="reg-input"
            type="password"
            inputMode="numeric"
            placeholder="New PIN (min 4 digits)"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
          />
          <button type="submit" className="reg-submit adm-btn-inline" disabled={busy}>
            {busy ? "Saving…" : "Update PIN"}
          </button>
        </form>
      </div>
    </div>
  );
}
