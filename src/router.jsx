import { useSyncExternalStore } from "react";

// A tiny dependency-free hash router. Hash routing (#/admin) is used on
// purpose: the app is served from a GitHub Pages sub-path (/form), where
// real path routing would 404 on refresh. The hash never hits the server.

function currentPath() {
  const h = window.location.hash || "";
  const path = h.replace(/^#/, "");
  return path || "/";
}

function subscribe(callback) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export function usePath() {
  return useSyncExternalStore(subscribe, currentPath, () => "/");
}

export function navigate(to) {
  if (currentPath() === to) return;
  window.location.hash = to;
  // jump back to the top on navigation, like a real page change
  window.scrollTo(0, 0);
}

export function Link({ to, className, children, onClick, ...rest }) {
  return (
    <a
      href={"#" + to}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // allow open-in-new-tab
        e.preventDefault();
        navigate(to);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
