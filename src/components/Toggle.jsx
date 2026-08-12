// Reuses the existing switch styling from app.css for visual consistency.
export default function Toggle({ on, onChange, label, hint, disabled = false }) {
  return (
    <div className="rdfd-toggle-row">
      <div className="adm-toggle-text">
        <div className="rdfd-toggle-label">{label}</div>
        {hint && <div className="rdfd-toggle-hint">{hint}</div>}
      </div>
      <button
        type="button"
        className={"rdfd-switch" + (on ? " on" : "")}
        onClick={() => !disabled && onChange(!on)}
        aria-pressed={on}
        disabled={disabled}
      >
        <span className="rdfd-switch-knob" />
      </button>
    </div>
  );
}
