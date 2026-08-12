import { useEffect, useState } from "react";
import { UserPlus, Trash2, Shield, User } from "lucide-react";
import { api } from "../../utils/api.js";

export default function StaffPage({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setUsers(await api.listUsers());
    } catch (e) {
      showToast(e.message || "Could not load staff");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!label.trim()) return showToast("Give the PIN a name (e.g. 'Front desk')");
    if (pin.trim().length < 4) return showToast("PIN needs at least 4 digits");
    setBusy(true);
    try {
      await api.addUser(label.trim(), pin.trim());
      showToast("Staff PIN added");
      setLabel("");
      setPin("");
      load();
    } catch (err) {
      showToast(err.message || "Could not add staff PIN");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id, name) {
    if (!window.confirm(`Remove "${name}"?`)) return;
    try {
      await api.removeUser(id);
      showToast("Removed");
      load();
    } catch (err) {
      showToast(err.message || "Could not remove");
    }
  }

  return (
    <div className="adm-stack">
      <div className="adm-card">
        <div className="adm-card-title">Add a staff PIN</div>
        <div className="rdfd-toggle-hint" style={{ marginBottom: 12 }}>
          Staff can view the register and add entries, but can't change settings, edit, or delete.
        </div>
        <form className="adm-staff-form" onSubmit={add}>
          <input className="reg-input" placeholder="Name / label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
          <input className="reg-input" type="password" inputMode="numeric" placeholder="PIN (min 4 digits)" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button type="submit" className="reg-submit adm-btn-inline" disabled={busy}>
            <UserPlus size={16} /> {busy ? "Adding…" : "Add"}
          </button>
        </form>
      </div>

      <div className="adm-card">
        <div className="adm-card-title">People with access</div>
        {loading ? (
          <div className="adm-empty">Loading…</div>
        ) : (
          <div className="adm-userlist">
            {users.map((u) => (
              <div className="adm-userrow" key={u.id}>
                <div className="adm-user-main">
                  {u.role === "admin" ? <Shield size={16} /> : <User size={16} />}
                  <span className="adm-user-name">{u.label}</span>
                  <span className={"adm-role adm-role-" + u.role}>{u.role}</span>
                </div>
                {u.role !== "admin" && (
                  <button type="button" className="adm-del" onClick={() => remove(u.id, u.label)} aria-label="Remove">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
