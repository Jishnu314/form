import { API_URL, ADMIN_TOKEN_KEY } from "../constants.js";

export function getToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch (e) {
    // ignore write failures
  }
}

async function request(path, { method = "GET", body, auth = false, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // Token missing/expired — drop it so the UI falls back to the login gate.
    setToken("");
  }

  if (raw) {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => request("/health"),

  login: (pin) => request("/auth/login", { method: "POST", body: { pin } }),
  changePin: (currentPin, newPin) =>
    request("/auth/change-pin", { method: "POST", body: { currentPin, newPin }, auth: true }),
  me: () => request("/auth/me", { auth: true }),

  getSettings: () => request("/settings"),
  updateSettings: (patch) => request("/settings", { method: "PATCH", body: patch, auth: true }),
  getAudit: (limit = 100) => request(`/settings/audit?limit=${limit}`, { auth: true }),

  listUsers: () => request("/auth/users", { auth: true }),
  addUser: (label, pin) => request("/auth/users", { method: "POST", body: { label, pin }, auth: true }),
  removeUser: (id) => request(`/auth/users/${id}`, { method: "DELETE", auth: true }),

  listEntries: () => request("/entries", { auth: true }),
  addEntry: (entry) => request("/entries", { method: "POST", body: entry }),
  updateEntry: (id, patch) => request(`/entries/${id}`, { method: "PATCH", body: patch, auth: true }),
  removeEntry: (id) => request(`/entries/${id}`, { method: "DELETE", auth: true }),
  summary: () => request("/entries/summary", { auth: true }),

  exportExcelUrl: () => `${API_URL}/export/excel`,
};
