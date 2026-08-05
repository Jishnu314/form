import { useState } from "react";
import Topbar from "./components/Topbar.jsx";
import GrandTotalBanner from "./components/GrandTotalBanner.jsx";
import EntryForm from "./components/EntryForm.jsx";
import RegisterList from "./components/RegisterList.jsx";
import SheetView from "./components/SheetView.jsx";
import AdminLink from "./components/AdminLink.jsx";
import AdminSettings from "./components/AdminSettings.jsx";
import PinModal from "./components/PinModal.jsx";
import EntryModal from "./components/EntryModal.jsx";
import Toast from "./components/Toast.jsx";
import AdPopup from "./components/AdPopup.jsx";
import GameBanner from "./components/GameBanner.jsx";

import { useEntries } from "./hooks/useEntries.js";
import { useEntryDraft } from "./hooks/useEntryDraft.js";
import { useAdminGate } from "./hooks/useAdminGate.js";
import { useSettings } from "./hooks/useSettings.js";
import { useToast } from "./hooks/useToast.js";
import { useContent } from "./hooks/useContent.js";

export default function App() {
  const admin = useAdminGate();
  const { entries, loading, error: entriesError, addEntry, removeEntry, updateEntry, refresh } = useEntries(admin.isLoggedIn);
  const draftState = useEntryDraft();
  const { settings, updateSetting } = useSettings();
  const { content, saveAd, saveLeaderboard } = useContent();
  const { toast, showToast } = useToast();
  const [view, setView] = useState("cards"); // "cards" | "sheet"

  const totals = entries.reduce(
    (acc, en) => {
      acc.renewal += en.renewal || 0;
      en.rdArray.forEach((rd) => (acc.rd += rd.rdAmount || 0));
      en.fdArray.forEach((fd) => (acc.fd += fd.fdAmount || 0));
      return acc;
    },
    { renewal: 0, rd: 0, fd: 0 }
  );
  const grandTotal = totals.renewal + totals.rd + totals.fd;
  const liveTotal = grandTotal + draftState.draftTotal;

  const formVisible = settings.acceptingEntries && !settings.maintenanceMode;

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = draftState.validate();
    if (!ok) {
      if (!draftState.draft.renewal || Number(draftState.draft.renewal) <= 0) {
        showToast("Add a renewal amount first");
      }
      return;
    }

    const entry = draftState.buildEntry();
    const saved = await addEntry(entry);
    draftState.reset();
    showToast(saved ? "Entry saved" : "Could not save — try again");
  }

  if (admin.checkingSession)
    return (
      <div className="rdfd-app">
        <div className="rdfd-shell" style={{ paddingTop: "40px", textAlign: "center", color: "var(--muted)" }}>
          Loading…
        </div>
      </div>
    );

  // Maintenance mode: everyone except the admin sees a closed sign.
  if (settings.maintenanceMode && !admin.isAdmin) {
    return (
      <div className="rdfd-app">
        <Topbar isAdmin={false} entryCount={0} liveTotal={0} />
        <div className="rdfd-shell">
          <div className="rdfd-entries-paused" style={{ marginTop: "24px" }}>
            The register is temporarily closed for maintenance. Please check back soon.
          </div>
          {!admin.isLoggedIn && <AdminLink onClick={admin.openGate} />}
        </div>
        <PinModal
          open={admin.pinModalOpen}
          value={admin.pinValue}
          error={admin.pinError}
          busy={admin.busy}
          onChange={admin.setPinValue}
          onClose={admin.closeGate}
          onSubmit={admin.checkPin}
        />
      </div>
    );
  }

  return (
    <div className="rdfd-app">
      <Topbar isAdmin={admin.isLoggedIn} entryCount={entries.length} liveTotal={liveTotal} />

      <div className="rdfd-shell">
        {settings.gameBannerEnabled && <GameBanner leaderboard={content.leaderboard} />}

        {admin.isAdmin && settings.maintenanceMode && (
          <div className="rdfd-entries-paused">
            Maintenance mode is ON — visitors currently see a "closed" notice.
          </div>
        )}

        {admin.isLoggedIn && settings.showGrandTotal && entries.length > 0 && (
          <GrandTotalBanner total={grandTotal} />
        )}

        {admin.isAdmin && (
          <AdminSettings
            settings={settings}
            updateSetting={updateSetting}
            content={content}
            saveAd={saveAd}
            saveLeaderboard={saveLeaderboard}
          />
        )}

        {entriesError && admin.isLoggedIn && <div className="rdfd-entries-paused">{entriesError}</div>}

        {formVisible ? (
          <EntryForm
            draftState={draftState}
            onSubmit={handleSubmit}
            rdEnabled={settings.rdEnabled}
            fdEnabled={settings.fdEnabled}
          />
        ) : (
          admin.isLoggedIn && (
            <div className="rdfd-entries-paused">New entries are turned off — register is view-only.</div>
          )
        )}

        {admin.isLoggedIn ? (
          <>
            <div className="rdfd-viewswitch">
              <button
                type="button"
                className={view === "cards" ? "on" : ""}
                onClick={() => setView("cards")}
              >
                Cards
              </button>
              <button
                type="button"
                className={view === "sheet" ? "on" : ""}
                onClick={() => setView("sheet")}
              >
                Sheet
              </button>
            </div>
            {view === "sheet" ? (
              <SheetView
                entries={entries}
                canEdit={admin.isAdmin}
                onUpdateEntry={async (id, patch) => {
                  const ok = await updateEntry(id, patch);
                  showToast(ok ? "Entry updated" : "Could not update entry");
                  return ok;
                }}
                onRemoveEntry={async (id) => {
                  const ok = await removeEntry(id);
                  showToast(ok ? "Entry removed" : "Could not remove entry");
                }}
              />
            ) : (
              <RegisterList
                entries={entries}
                loading={loading}
                canEdit={admin.isAdmin}
                onRemoveEntry={async (id) => {
                  const ok = await removeEntry(id);
                  showToast(ok ? "Entry removed" : "Could not remove entry");
                }}
                onLock={admin.lock}
              />
            )}
          </>
        ) : (
          <AdminLink onClick={admin.openGate} />
        )}
      </div>

      <Toast message={toast} />

      {settings.adsEnabled && <AdPopup ad={content.ad} />}

      <PinModal
        open={admin.pinModalOpen}
        value={admin.pinValue}
        error={admin.pinError}
        busy={admin.busy}
        onChange={admin.setPinValue}
        onClose={admin.closeGate}
        onSubmit={admin.checkPin}
      />

      <EntryModal
        modal={draftState.modal}
        onClose={draftState.closeModal}
        onAmountChange={draftState.setModalAmount}
        onSchemeChange={draftState.setModalScheme}
        onSave={draftState.saveModal}
        onDelete={draftState.deleteModalItem}
      />
    </div>
  );
}
