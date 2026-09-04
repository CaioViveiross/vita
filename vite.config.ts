import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: { port: 5173, open: false },
  build: {
    rollupOptions: {
      output: {
        // Recharts e os primitivos Radix mudam pouco: em chunks próprios,
        // continuam em cache entre deploys da aplicação.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
        },
      },
    },
  },
});
