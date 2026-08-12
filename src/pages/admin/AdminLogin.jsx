import { useState } from "react";
import { Landmark, ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { navigate, Link } from "../../router.jsx";

// Standalone admin sign-in screen (its own page, not a modal on the form).
export default function AdminLogin() {
  const { login } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!pin.trim()) return setError("Enter your PIN");
    setBusy(true);
    setError("");
    try {
      await login(pin.trim());
      navigate("/admin/overview");
    } catch (err) {
      setError(err.message || "Incorrect PIN");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-login">
      <form className="adm-login-card" onSubmit={submit}>
        <div className="adm-login-badge">
          <Landmark size={26} />
        </div>
        <h1>Admin sign in</h1>
        <p>Enter your PIN to manage the register.</p>

        <input
          className="reg-input"
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          value={pin}
          autoFocus
          onChange={(e) => setPin(e.target.value)}
        />
        {error && <div className="reg-error">{error}</div>}

        <button type="submit" className="reg-submit" disabled={busy}>
          {busy ? "Checking…" : "Sign in"}
        </button>

        <Link to="/" className="adm-login-back">
          <ArrowLeft size={14} /> Back to the form
        </Link>
      </form>
    </div>
  );
}
