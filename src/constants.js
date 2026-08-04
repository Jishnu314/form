export const STORAGE_KEY = "rdfd_entries_v1"; // no longer used for entries; kept for reference only
export const SETTINGS_KEY = "rdfd_settings_v1"; // legacy localStorage key, unused now that settings live on the server

// Backend API base URL. In dev this defaults to the local backend on
// port 4000; set VITE_API_URL in a .env file to point at a deployed server.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Where the admin login token is cached in this browser between visits.
export const ADMIN_TOKEN_KEY = "rdfd_admin_token";
