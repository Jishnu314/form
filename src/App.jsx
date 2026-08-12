import { usePath } from "./router.jsx";
import PublicPage from "./pages/PublicPage.jsx";
import AdminArea from "./pages/admin/AdminArea.jsx";

// Top-level route split. Everything under /admin is the dashboard; anything
// else is the public entry form. Routing is hash-based (see router.jsx).
export default function App() {
  const path = usePath();

  if (path === "/admin" || path.startsWith("/admin/")) {
    return <AdminArea path={path} />;
  }
  return <PublicPage />;
}
