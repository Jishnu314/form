// Small dependency-free SVG/CSS charts, styled via admin.css.

export function BarChart({ data, format }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="chart-bars">
      {data.map((d, i) => (
        <div className="chart-bar-col" key={i}>
          <div className="chart-bar-value">{d.value ? (format ? format(d.value) : d.value) : ""}</div>
          <div className="chart-bar-track">
            <div className="chart-bar-fill" style={{ height: Math.max(2, (d.value / max) * 100) + "%" }} />
          </div>
          <span className="chart-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ data, format }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="chart-donut-wrap">
      <svg viewBox="0 0 140 140" className="chart-donut" role="img">
        <circle cx="70" cy="70" r={R} fill="none" className="chart-donut-bg" strokeWidth="16" />
        {data.map((d, i) => {
          const len = (d.value / total) * C;
          const seg = (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={d.color}
              strokeWidth="16"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="chart-legend">
        {data.map((d, i) => (
          <div className="chart-legend-item" key={i}>
            <span className="chart-dot" style={{ background: d.color }} />
            <span className="chart-legend-label">{d.label}</span>
            {format && <strong className="chart-legend-amt">{format(d.value)}</strong>}
            <span className="chart-legend-pct">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
