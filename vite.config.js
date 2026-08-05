import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset paths so the built dist/ works when opened from a
  // subfolder or a simple static server (fixes blank white screen on load).
  base: "./form",
  plugins: [react()],
});
