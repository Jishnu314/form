import { formatINR, getCurrentMonthLabel } from "../utils/format.js";

export default function Topbar({ isAdmin, entryCount, liveTotal }) {
  return (
    <div className="rdfd-topbar">
      <div className="rdfd-topbar-inner">
        <div className="rdfd-title">
          <span className="rule" />
          LIA report
          <span className="rdfd-title-month">{getCurrentMonthLabel()}</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "4px",
          }}
        >
          {isAdmin && <div className="rdfd-count">{entryCount} entries</div>}
          {isAdmin && liveTotal > 0 && (
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
                color: "#cdd6e8",
                fontWeight: 600,
              }}
            >
              ₹{formatINR(liveTotal)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
