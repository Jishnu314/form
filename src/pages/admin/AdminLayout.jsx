import { useState } from "react";
import {
  LayoutDashboard,
  Table2,
  Megaphone,
  SlidersHorizontal,
  Users,
  ScrollText,
  Database,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Landmark,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { Link, navigate } from "../../router.jsx";

const NAV = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, adminOnly: false },
  { key: "entries", label: "Entries", icon: Table2, adminOnly: false },
  { key: "content", label: "Content & ads", icon: Megaphone, adminOnly: true },
  { key: "settings", label: "Settings", icon: SlidersHorizontal, adminOnly: true },
  { key: "staff", label: "Staff & PINs", icon: Users, adminOnly: true },
  { key: "audit", label: "Activity log", icon: ScrollText, adminOnly: true },
  { key: "data", label: "Data & backup", icon: Database, adminOnly: true },
];

export default function AdminLayout({ active, title, children }) {
  const { label, role, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => !n.adminOnly || isAdmin);

  function doLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="adm">
      {open && <div className="adm-scrim" onClick={() => setOpen(false)} />}

      <aside className={"adm-sidebar" + (open ? " open" : "")}>
        <div className="adm-brand">
          <Landmark size={20} />
          <span>LIA Register</span>
        </div>

        <nav className="adm-nav">
          {items.map((n) => {
            const Icon = n.icon;
            return (
              <Link
                key={n.key}
                to={"/admin/" + n.key}
                className={"adm-navitem" + (active === n.key ? " active" : "")}
                onClick={() => setOpen(false)}
              >
                <Icon size={17} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="adm-sidefoot">
          <Link to="/" className="adm-navitem">
            <ExternalLink size={17} /> View public form
          </Link>
          <button type="button" className="adm-navitem adm-logout" onClick={doLogout}>
            <LogOut size={17} /> Sign out
          </button>
          <div className="adm-whoami">
            <span className="adm-who-label">{label || "Admin"}</span>
            <span className={"adm-role adm-role-" + role}>{role}</span>
          </div>
        </div>
      </aside>

      <div className="adm-content">
        <header className="adm-topbar">
          <button type="button" className="adm-hamburger" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={20} />
          </button>
          <h1 className="adm-pagetitle">{title}</h1>
          <button type="button" className="adm-close-mobile" onClick={() => setOpen(false)} aria-label="Close" hidden>
            <X size={20} />
          </button>
        </header>
        <div className="adm-page">{children}</div>
      </div>
    </div>
  );
}
