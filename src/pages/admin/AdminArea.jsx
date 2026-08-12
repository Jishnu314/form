import { useMemo } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { navigate } from "../../router.jsx";
import { useEntries } from "../../hooks/useEntries.js";
import { useSettings } from "../../hooks/useSettings.js";
import { useContent } from "../../hooks/useContent.js";
import { useToast } from "../../hooks/useToast.js";
import Toast from "../../components/Toast.jsx";

import AdminLogin from "./AdminLogin.jsx";
import AdminLayout from "./AdminLayout.jsx";
import OverviewPage from "./OverviewPage.jsx";
import EntriesPage from "./EntriesPage.jsx";
import ContentPage from "./ContentPage.jsx";
import SettingsPage from "./SettingsPage.jsx";
import StaffPage from "./StaffPage.jsx";
import AuditPage from "./AuditPage.jsx";
import DataPage from "./DataPage.jsx";

const TITLES = {
  overview: "Overview",
  entries: "Entries",
  content: "Content & ads",
  settings: "Settings",
  staff: "Staff & PINs",
  audit: "Activity log",
  data: "Data & backup",
};

export default function AdminArea({ path }) {
  const auth = useAuth();
  const { toast, showToast } = useToast();

  // Shared data for all dashboard pages, so an edit on one page is reflected
  // on the others (e.g. deleting an entry updates the overview stats).
  const entriesApi = useEntries(auth.isLoggedIn);
  const { settings, updateSetting } = useSettings();
  const { content, saveAd, saveLeaderboard, saveMaintenance } = useContent();

  const sub = useMemo(() => {
    const s = path.replace(/^\/admin\/?/, "").split("/")[0];
    return s || "overview";
  }, [path]);

  if (auth.checking) {
    return (
      <div className="adm-fullload">Loading…</div>
    );
  }

  if (!auth.isLoggedIn) return <AdminLogin />;

  // Staff can only see Overview + Entries (read-only). Anything admin-only
  // bounces them back to the overview.
  const adminOnly = ["content", "settings", "staff", "audit", "data"];
  const effectiveSub = !auth.isAdmin && adminOnly.includes(sub) ? "overview" : sub;

  let page = null;
  switch (effectiveSub) {
    case "entries":
      page = <EntriesPage {...entriesApi} canEdit={auth.isAdmin} showToast={showToast} />;
      break;
    case "content":
      page = (
        <ContentPage
          content={content}
          saveAd={saveAd}
          saveLeaderboard={saveLeaderboard}
          saveMaintenance={saveMaintenance}
          settings={settings}
          updateSetting={updateSetting}
          showToast={showToast}
        />
      );
      break;
    case "settings":
      page = <SettingsPage settings={settings} updateSetting={updateSetting} showToast={showToast} />;
      break;
    case "staff":
      page = <StaffPage showToast={showToast} />;
      break;
    case "audit":
      page = <AuditPage showToast={showToast} />;
      break;
    case "data":
      page = <DataPage entries={entriesApi.entries} refresh={entriesApi.refresh} showToast={showToast} />;
      break;
    case "overview":
    default:
      page = <OverviewPage entries={entriesApi.entries} loading={entriesApi.loading} settings={settings} />;
  }

  return (
    <>
      <AdminLayout active={effectiveSub} title={TITLES[effectiveSub] || "Overview"}>
        {page}
      </AdminLayout>
      <Toast message={toast} />
    </>
  );
}
