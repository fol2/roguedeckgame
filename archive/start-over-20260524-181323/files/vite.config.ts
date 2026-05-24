import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const allowedNetworkHosts = [
  ".local",
  ".ts.net",
];

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: allowedNetworkHosts,
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: allowedNetworkHosts,
  },
});
