import { useMemo, useState } from "react";
import { IndianRupee, FileText, CalendarDays, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Donut } from "../../components/charts.jsx";
import { formatINR } from "../../utils/format.js";

// created_at from SQLite looks like "2026-08-13 09:41:22" (UTC). Make it a
// Date reliably across browsers.
function parseTs(row) {
  const raw = row.createdAt || row.date;
  if (!raw) return null;
  const d = new Date(String(raw).replace(" ", "T"));
  return isNaN(d) ? null : d;
}

function entryTotal(en) {
  let t = en.renewal || 0;
  (en.rdArray || []).forEach((r) => (t += r.rdAmount || 0));
  (en.fdArray || []).forEach((f) => (t += f.fdAmount || 0));
  return t;
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="adm-stat">
      <div className="adm-stat-icon">{icon}</div>
      <div className="adm-stat-body">
        <div className="adm-stat-value">{value}</div>
        <div className="adm-stat-label">{label}</div>
        {sub && <div className="adm-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function OverviewPage({ entries, loading, settings }) {
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const todayKey = now.toDateString();
    const currentIndex = now.getFullYear() * 12 + now.getMonth();

    let renewal = 0,
      rd = 0,
      fd = 0,
      monthTotal = 0,
      todayCount = 0;

    // Total per calendar month across all entries, so the bar chart can page
    // through any 6-month window without recomputing. Keyed "year-month".
    const monthTotals = {};
    let earliestIndex = currentIndex;

    entries.forEach((en) => {
      renewal += en.renewal || 0;
      (en.rdArray || []).forEach((r) => (rd += r.rdAmount || 0));
      (en.fdArray || []).forEach((f) => (fd += f.fdAmount || 0));

      const ts = parseTs(en);
      if (ts) {
        const key = `${ts.getFullYear()}-${ts.getMonth()}`;
        const idx = ts.getFullYear() * 12 + ts.getMonth();
        const tot = entryTotal(en);
        monthTotals[key] = (monthTotals[key] || 0) + tot;
        if (idx < earliestIndex) earliestIndex = idx;
        if (key === thisMonthKey) monthTotal += tot;
        if (ts.toDateString() === todayKey) todayCount += 1;
      }
    });

    return { grand: renewal + rd + fd, count: entries.length, renewal, rd, fd, monthTotal, todayCount, monthTotals, currentIndex, earliestIndex };
  }, [entries]);

  const donutData = [
    { label: "Renewal", value: stats.renewal, color: "#8f6a2c" },
    { label: "RD", value: stats.rd, color: "#2f6f4e" },
    { label: "FD", value: stats.fd, color: "#3a5a9f" },
  ].filter((d) => d.value > 0);

  // Bar chart shows a 6-month window ending `monthOffset` months before the
  // current month. Paging lets the admin look back at earlier months, bounded
  // by the current month (can't go into the future) and the earliest entry.
  const WINDOW = 6;
  const [monthOffset, setMonthOffset] = useState(0);
  const endIndex = stats.currentIndex - monthOffset;

  const windowMonths = [];
  for (let i = WINDOW - 1; i >= 0; i--) {
    const idx = endIndex - i;
    const y = Math.floor(idx / 12);
    const m = idx % 12;
    windowMonths.push({
      key: `${y}-${m}`,
      label: new Date(y, m, 1).toLocaleDateString("en-IN", { month: "short" }),
      value: stats.monthTotals[`${y}-${m}`] || 0,
    });
  }

  const canNewer = monthOffset > 0;
  const canOlder = endIndex - (WINDOW - 1) > stats.earliestIndex;

  function rangeLabel() {
    const [fy, fm] = windowMonths[0].key.split("-").map(Number);
    const [ly, lm] = windowMonths[windowMonths.length - 1].key.split("-").map(Number);
    const start = new Date(fy, fm, 1).toLocaleDateString("en-IN", { month: "short" }) + (fy !== ly ? ` ${fy}` : "");
    const end = new Date(ly, lm, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    return `${start} – ${end}`;
  }

  if (loading && entries.length === 0) return <div className="adm-empty">Loading register…</div>;

  return (
    <div className="adm-stack">
      <div className="adm-statgrid">
        <StatCard icon={<IndianRupee size={18} />} label="Total collected" value={`₹${formatINR(stats.grand)}`} />
        <StatCard icon={<FileText size={18} />} label="Total entries" value={stats.count} />
        <StatCard icon={<TrendingUp size={18} />} label="This month" value={`₹${formatINR(stats.monthTotal)}`} />
        <StatCard icon={<CalendarDays size={18} />} label="Today" value={stats.todayCount} sub="entries added today" />
      </div>

      <div className="adm-2col">
        <div className="adm-card">
          <div className="adm-cardhead">
            <div className="adm-card-title adm-card-title-inline">Collection</div>
            {stats.count > 0 && (
              <div className="adm-chart-nav">
                <button type="button" onClick={() => setMonthOffset((o) => o + WINDOW)} disabled={!canOlder} aria-label="Earlier months">
                  <ChevronLeft size={16} />
                </button>
                <span className="adm-chart-range">{rangeLabel()}</span>
                <button type="button" onClick={() => setMonthOffset((o) => Math.max(0, o - WINDOW))} disabled={!canNewer} aria-label="Later months">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
          {stats.count > 0 ? (
            <BarChart data={windowMonths} format={(v) => "₹" + formatINR(Math.round(v))} />
          ) : (
            <div className="adm-empty">No entries yet.</div>
          )}
        </div>

        <div className="adm-card">
          <div className="adm-card-title">Split by type</div>
          {donutData.length > 0 ? (
            <Donut data={donutData} format={(v) => "₹" + formatINR(v)} />
          ) : (
            <div className="adm-empty">No entries yet.</div>
          )}
        </div>
      </div>

      {settings && (settings.maintenanceMode || !settings.acceptingEntries) && (
        <div className="adm-note adm-note-warn">
          {settings.maintenanceMode
            ? "Maintenance mode is ON — visitors see a closed notice instead of the form."
            : "New entries are turned off — the public form is paused."}
        </div>
      )}
    </div>
  );
}
