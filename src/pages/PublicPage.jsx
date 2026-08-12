import { useRef, useState } from "react";
import {
  Landmark,
  PiggyBank,
  Banknote,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  Lock,
} from "lucide-react";
import { api } from "../utils/api.js";
import { useSettings } from "../hooks/useSettings.js";
import { useContent } from "../hooks/useContent.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, navigate } from "../router.jsx";
import { formatINR, formatDate, getCurrentMonthLabel, formatAmountInput, unformatAmountInput } from "../utils/format.js";
import GameBanner from "../components/GameBanner.jsx";
import AdPopup from "../components/AdPopup.jsx";
import MaintenanceNotice from "../components/MaintenanceNotice.jsx";

function AmountField({ value, onChange, placeholder = "0", autoFocus = false }) {
  return (
    <div className="reg-amount">
      <span className="reg-rupee">₹</span>
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={formatAmountInput(value)}
        onChange={(e) => onChange(unformatAmountInput(e.target.value).replace(/[^\d.]/g, ""))}
      />
    </div>
  );
}

// One editable RD/FD block: a list of {scheme, amount} rows with add/remove.
function DepositSection({ icon, label, rows, setRows, schemeword }) {
  function update(i, patch) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="reg-section">
      <div className="reg-section-head">
        <span className="reg-section-title">{icon}{label}</span>
        {total > 0 && <span className="reg-section-total">₹{formatINR(total)}</span>}
      </div>

      {rows.map((r, i) => (
        <div key={i} className="reg-deposit-row">
          <input
            className="reg-scheme"
            placeholder={`${schemeword} name`}
            value={r.scheme}
            maxLength={80}
            onChange={(e) => update(i, { scheme: e.target.value })}
          />
          <AmountField value={r.amount} onChange={(v) => update(i, { amount: v })} />
          <button type="button" className="reg-row-del" aria-label="Remove" onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <button type="button" className="reg-add" onClick={() => setRows((p) => [...p, { scheme: "", amount: "" }])}>
        <Plus size={15} /> Add {label.toLowerCase()}
      </button>
    </div>
  );
}

export default function PublicPage() {
  const { settings } = useSettings();
  const { content } = useContent();
  const { isAdmin } = useAuth();

  const [name, setName] = useState("");
  const [renewal, setRenewal] = useState("");
  const [rds, setRds] = useState([]);
  const [fds, setFds] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null); // saved entry, shown after submit

  const rdEnabled = settings.rdEnabled;
  const fdEnabled = settings.fdEnabled;

  const renewalNum = Number(renewal) || 0;
  const rdTotal = rds.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const fdTotal = fds.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const total = renewalNum + rdTotal + fdTotal;

  function resetForm() {
    setName("");
    setRenewal("");
    setRds([]);
    setFds([]);
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please enter the customer's name.");
    if (renewalNum <= 0) return setError("Please enter a renewal amount.");

    const cleanRows = (rows, amountKey, schemeKey) =>
      rows
        .filter((r) => Number(r.amount) > 0)
        .map((r) => ({ [amountKey]: Number(r.amount), [schemeKey]: (r.scheme || "").trim() }));

    const entry = {
      name: name.trim(),
      renewal: renewalNum,
      date: formatDate(new Date()),
      rdArray: rdEnabled ? cleanRows(rds, "rdAmount", "rdScheme") : [],
      fdArray: fdEnabled ? cleanRows(fds, "fdAmount", "fdScheme") : [],
    };

    setBusy(true);
    try {
      const saved = await api.addEntry(entry);
      setReceipt({ ...entry, total });
      resetForm();
    } catch (err) {
      setError(err.message || "Could not save — please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Maintenance mode: non-admins see a closed sign instead of the form.
  if (settings.maintenanceMode && !isAdmin) {
    return (
      <div className="reg">
        <RegHeader />
        <main className="reg-main">
          <MaintenanceNotice custom={content.maintenance} />
          <AdminEntry />
          <SecretWatermark />
        </main>
      </div>
    );
  }

  const acceptingClosed = !settings.acceptingEntries;

  return (
    <div className="reg">
      <RegHeader />

      <main className="reg-main">
        {settings.gameBannerEnabled && (
          <div className="reg-banner-wrap">
            <GameBanner leaderboard={content.leaderboard} />
          </div>
        )}

        {receipt ? (
          <Receipt receipt={receipt} onAnother={() => setReceipt(null)} />
        ) : acceptingClosed ? (
          <div className="reg-card reg-closed">
            <Lock size={22} />
            <h2>Entries are paused</h2>
            <p>New entries are temporarily turned off. Please check back shortly.</p>
          </div>
        ) : (
          <form className="reg-card" onSubmit={submit} noValidate>
            <h1 className="reg-formtitle">New deposit entry</h1>
            <p className="reg-formsub">Fill in the details below and submit.</p>

            <label className="reg-label">
              Customer name <span className="reg-req">*</span>
            </label>
            <input
              className="reg-input"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />

            <label className="reg-label" style={{ marginTop: 16 }}>
              Renewal amount <span className="reg-req">*</span>
            </label>
            <AmountField value={renewal} onChange={setRenewal} />

            {rdEnabled && (
              <DepositSection
                icon={<PiggyBank size={15} />}
                label="RD"
                schemeword="Scheme"
                rows={rds}
                setRows={setRds}
              />
            )}
            {fdEnabled && (
              <DepositSection
                icon={<Banknote size={15} />}
                label="FD"
                schemeword="Scheme"
                rows={fds}
                setRows={setFds}
              />
            )}

            <div className="reg-total">
              <span>Total</span>
              <strong>₹{formatINR(total)}</strong>
            </div>

            {error && <div className="reg-error">{error}</div>}

            <button type="submit" className="reg-submit" disabled={busy}>
              {busy ? "Saving…" : (<> <Check size={18} /> Submit entry </>)}
            </button>
          </form>
        )}

        <AdminEntry />
        <SecretWatermark />
      </main>

      {settings.adsEnabled && <AdPopup ad={content.ad} />}
    </div>
  );
}

function RegHeader() {
  return (
    <header className="reg-header">
      <div className="reg-header-inner">
        <div className="reg-brand">
          <Landmark size={20} />
          <span>LIA Register</span>
        </div>
        <span className="reg-monthtag">{getCurrentMonthLabel()}</span>
      </div>
    </header>
  );
}

// Only ever shown to a logged-in admin (as a convenient shortcut back to the
// dashboard). Anonymous visitors see nothing here — the login is reached by
// holding the "JISHNU SLIA" credit at the foot of the page, or by bookmarking
// the site URL ending in #/admin.
function AdminEntry() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return null;
  return (
    <div className="reg-adminlink">
      <Link to="/admin">
        Go to dashboard <ArrowRight size={14} />
      </Link>
    </div>
  );
}

// Hidden admin entrance disguised as a maker's credit. It looks like an
// ordinary signature at the foot of the form, so visitors pay it no mind —
// but pressing and holding it for 3 seconds opens the admin login. The same
// login can also be reached by bookmarking the site URL ending in #/admin.
function SecretWatermark() {
  const timer = useRef(null);

  function startHold() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      navigate("/admin");
    }, 3000);
  }
  function cancelHold() {
    clearTimeout(timer.current);
  }

  return (
    <div
      className="reg-watermark"
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
    >
      JISHNU SLIA
    </div>
  );
}

function Receipt({ receipt, onAnother }) {
  return (
    <div className="reg-card reg-receipt">
      <div className="reg-receipt-check">
        <Check size={30} />
      </div>
      <h2>Entry saved</h2>
      <p className="reg-receipt-name">{receipt.name}</p>

      <div className="reg-receipt-lines">
        <div className="reg-receipt-line">
          <span>Renewal</span>
          <span>₹{formatINR(receipt.renewal)}</span>
        </div>
        {receipt.rdArray.map((rd, i) => (
          <div className="reg-receipt-line" key={"rd" + i}>
            <span>RD · {rd.rdScheme || "—"}</span>
            <span>₹{formatINR(rd.rdAmount)}</span>
          </div>
        ))}
        {receipt.fdArray.map((fd, i) => (
          <div className="reg-receipt-line" key={"fd" + i}>
            <span>FD · {fd.fdScheme || "—"}</span>
            <span>₹{formatINR(fd.fdAmount)}</span>
          </div>
        ))}
        <div className="reg-receipt-line reg-receipt-total">
          <span>Total</span>
          <span>₹{formatINR(receipt.total)}</span>
        </div>
      </div>

      <button type="button" className="reg-submit" onClick={onAnother}>
        <Plus size={18} /> Add another entry
      </button>
    </div>
  );
}
