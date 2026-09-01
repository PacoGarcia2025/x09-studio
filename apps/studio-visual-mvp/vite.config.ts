import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
