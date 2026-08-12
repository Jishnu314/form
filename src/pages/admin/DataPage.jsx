import { useRef, useState } from "react";
import { FileSpreadsheet, FileDown, Upload, Database, RotateCcw } from "lucide-react";

import { api } from "../../utils/api.js";
import { exportEntriesToCSV } from "../../utils/csv.js";
import { parseEntriesCsv } from "../../utils/importParse.js";

export default function DataPage({ entries = [], refresh, showToast }) {
  const [busy, setBusy] = useState("");
  const csvRef = useRef(null);
  const backupRef = useRef(null);

  async function withBusy(key, fn) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      showToast(e.message || "Something went wrong");
    } finally {
      setBusy("");
    }
  }

  function exportExcel() {
    withBusy("excel", () => api.downloadExcel());
  }

  function exportCsv() {
    if (!entries.length) return showToast("No entries to export yet");
    exportEntriesToCSV(entries);
    showToast("CSV downloaded");
  }

  function pickCsv() {
    csvRef.current?.click();
  }

  async function onCsvChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await withBusy("import", async () => {
      const text = await file.text();
      const parsed = parseEntriesCsv(text);
      if (!parsed.length) {
        showToast("Couldn't find any rows in that file");
        return;
      }
      if (parsed.length > 5000) {
        showToast("That's over the 5,000-row limit — please split the file");
        return;
      }
      if (!window.confirm(`Import ${parsed.length} entr${parsed.length === 1 ? "y" : "ies"}? They'll be added to the register.`)) {
        return;
      }
      const res = await api.importEntries(parsed);
      const added = res?.imported ?? parsed.length;
      await refresh?.();
      showToast(`Imported ${added} entr${added === 1 ? "y" : "ies"}`);
    });
  }

  function exportBackup() {
    withBusy("backup", async () => {
      await api.downloadBackup();
      showToast("Backup downloaded");
    });
  }

  function pickBackup() {
    backupRef.current?.click();
  }

  async function onBackupChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await withBusy("restore", async () => {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        showToast("That file isn't valid backup JSON");
        return;
      }
      if (!data || typeof data !== "object" || (!data.entries && !data.settings && !data.content && !data.users)) {
        showToast("That doesn't look like a backup file");
        return;
      }
      const count = Array.isArray(data.entries) ? data.entries.length : 0;
      if (
        !window.confirm(
          `Restore this backup? This REPLACES everything currently stored${count ? ` with ${count} entr${count === 1 ? "y" : "ies"}` : ""}. This can't be undone.`
        )
      ) {
        return;
      }
      await api.restore(data);
      await refresh?.();
      showToast("Backup restored");
    });
  }

  return (
    <div className="adm-stack">
      <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={onCsvChosen} />
      <input ref={backupRef} type="file" accept=".json,application/json" hidden onChange={onBackupChosen} />

      <div className="adm-card">
        <div className="adm-card-title">Export</div>
        <div className="rdfd-toggle-hint" style={{ marginBottom: 14 }}>
          Download the register to work with it elsewhere or keep an offline copy.
        </div>
        <div className="adm-data-grid">
          <div className="adm-data-tile">
            <div className="adm-data-icon"><FileSpreadsheet size={20} /></div>
            <div className="adm-data-body">
              <div className="adm-data-name">Excel workbook</div>
              <div className="adm-data-sub">Formatted .xlsx with every entry and totals.</div>
            </div>
            <button type="button" className="reg-submit adm-btn-inline" onClick={exportExcel} disabled={busy === "excel"}>
              {busy === "excel" ? "Preparing…" : "Download"}
            </button>
          </div>

          <div className="adm-data-tile">
            <div className="adm-data-icon"><FileDown size={20} /></div>
            <div className="adm-data-body">
              <div className="adm-data-name">CSV file</div>
              <div className="adm-data-sub">Plain spreadsheet — {entries.length} entr{entries.length === 1 ? "y" : "ies"} loaded.</div>
            </div>
            <button type="button" className="adm-btn-ghost adm-btn-inline" onClick={exportCsv}>
              Download
            </button>
          </div>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-title">Import</div>
        <div className="rdfd-toggle-hint" style={{ marginBottom: 14 }}>
          Add entries in bulk from a CSV. Columns: Date, Name, Renewal, RD Amount, RD Scheme, FD Amount, FD Scheme.
          A file exported from here will import back cleanly.
        </div>
        <div className="adm-data-tile">
          <div className="adm-data-icon"><Upload size={20} /></div>
          <div className="adm-data-body">
            <div className="adm-data-name">Import from CSV</div>
            <div className="adm-data-sub">Rows are added to the register — existing entries are kept.</div>
          </div>
          <button type="button" className="reg-submit adm-btn-inline" onClick={pickCsv} disabled={busy === "import"}>
            {busy === "import" ? "Importing…" : "Choose file"}
          </button>
        </div>
      </div>

      <div className="adm-card adm-card-danger">
        <div className="adm-card-title">Backup &amp; restore</div>
        <div className="rdfd-toggle-hint" style={{ marginBottom: 14 }}>
          A backup is a full snapshot — entries, settings, content and staff PINs. Keep it somewhere safe;
          it contains sensitive data. Restoring replaces everything currently stored.
        </div>
        <div className="adm-data-grid">
          <div className="adm-data-tile">
            <div className="adm-data-icon"><Database size={20} /></div>
            <div className="adm-data-body">
              <div className="adm-data-name">Download backup</div>
              <div className="adm-data-sub">Full .json snapshot of everything.</div>
            </div>
            <button type="button" className="reg-submit adm-btn-inline" onClick={exportBackup} disabled={busy === "backup"}>
              {busy === "backup" ? "Preparing…" : "Download"}
            </button>
          </div>

          <div className="adm-data-tile">
            <div className="adm-data-icon adm-data-icon-danger"><RotateCcw size={20} /></div>
            <div className="adm-data-body">
              <div className="adm-data-name">Restore backup</div>
              <div className="adm-data-sub">Replaces all current data. Can't be undone.</div>
            </div>
            <button type="button" className="adm-btn-danger adm-btn-inline" onClick={pickBackup} disabled={busy === "restore"}>
              {busy === "restore" ? "Restoring…" : "Choose file"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
