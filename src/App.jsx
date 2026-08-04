import Topbar from "./components/Topbar.jsx";
import GrandTotalBanner from "./components/GrandTotalBanner.jsx";
import EntryForm from "./components/EntryForm.jsx";
import RegisterList from "./components/RegisterList.jsx";
import AdminLink from "./components/AdminLink.jsx";
import AdminSettings from "./components/AdminSettings.jsx";
import PinModal from "./components/PinModal.jsx";
import EntryModal from "./components/EntryModal.jsx";
import Toast from "./components/Toast.jsx";

import { useEntries } from "./hooks/useEntries.js";
import { useEntryDraft } from "./hooks/useEntryDraft.js";
import { useAdminGate } from "./hooks/useAdminGate.js";
import { useSettings } from "./hooks/useSettings.js";
import { useToast } from "./hooks/useToast.js";

export default function App() {
  const admin = useAdminGate();
  const { entries, loading, error: entriesError, addEntry, removeEntry, refresh } = useEntries(admin.isAdmin);
  const draftState = useEntryDraft();
  const { settings, updateSetting } = useSettings();
  const { toast, showToast } = useToast();

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

  if (admin.checkingSession) return null; // avoid a flash of the logged-out view on reload

  return (
    <div className="rdfd-app">
      <Topbar isAdmin={admin.isAdmin} entryCount={entries.length} liveTotal={liveTotal} />

      <div className="rdfd-shell">
        {admin.isAdmin && settings.showGrandTotal && entries.length > 0 && (
          <GrandTotalBanner total={grandTotal} />
        )}

        {admin.isAdmin && <AdminSettings settings={settings} updateSetting={updateSetting} />}

        {entriesError && admin.isAdmin && <div className="rdfd-entries-paused">{entriesError}</div>}

        {settings.acceptingEntries ? (
          <EntryForm draftState={draftState} onSubmit={handleSubmit} />
        ) : (
          admin.isAdmin && (
            <div className="rdfd-entries-paused">New entries are turned off — register is view-only.</div>
          )
        )}

        {admin.isAdmin ? (
          <RegisterList
            entries={entries}
            loading={loading}
            onRemoveEntry={async (id) => {
              const ok = await removeEntry(id);
              showToast(ok ? "Entry removed" : "Could not remove entry");
            }}
            onLock={admin.lock}
          />
        ) : (
          <AdminLink onClick={admin.openGate} />
        )}
      </div>

      <Toast message={toast} />

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
