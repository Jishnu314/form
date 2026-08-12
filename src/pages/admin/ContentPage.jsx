import Toggle from "../../components/Toggle.jsx";
import { AdEditor, LeaderboardManager, MaintenanceEditor } from "../../components/ContentManager.jsx";

// Ads, game banner and maintenance page — the toggles that show each one,
// plus the editors for their content.
export default function ContentPage({ content, saveAd, saveLeaderboard, saveMaintenance, settings, updateSetting, showToast }) {
  return (
    <div className="adm-stack">
      <div className="adm-card">
        <div className="adm-card-title">Visibility</div>
        <div className="rdfd-settings-toggle">
          <Toggle
            label="Show announcement popup"
            hint="Displays the ad/announcement below once per visit."
            on={!!settings.adsEnabled}
            onChange={(v) => updateSetting("adsEnabled", v)}
          />
          <Toggle
            label="Show game banner"
            hint="Displays the leaderboard banner on the public form."
            on={!!settings.gameBannerEnabled}
            onChange={(v) => updateSetting("gameBannerEnabled", v)}
          />
          <Toggle
            label="Maintenance mode"
            hint="Visitors see a closed notice instead of the form. You still have full access."
            on={!!settings.maintenanceMode}
            onChange={(v) => updateSetting("maintenanceMode", v)}
          />
        </div>
      </div>

      <div className="adm-card">
        <AdEditor ad={content?.ad} onSave={saveAd} onMsg={showToast} />
      </div>

      <div className="adm-card">
        <LeaderboardManager leaderboard={content?.leaderboard} onSave={saveLeaderboard} onMsg={showToast} />
      </div>

      <div className="adm-card">
        <MaintenanceEditor maintenance={content?.maintenance} onSave={saveMaintenance} onMsg={showToast} />
      </div>
    </div>
  );
}
