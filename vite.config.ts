import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

export default defineConfig(({ command }) => {
  // When tests run with VITE_ENV=test, use test environment file
  const isTestMode = process.env.VITE_ENV === 'test';
  
  if (isTestMode && command === 'serve') {
    // Load .env.test values into process.env so they're available to Vite
    const envTestPath = path.resolve(__dirname, '.env.test');
    if (fs.existsSync(envTestPath)) {
      const content = fs.readFileSync(envTestPath, 'utf-8');
      content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const cleanKey = key.trim();
          const cleanValue = valueParts.join('=').trim();
          process.env[cleanKey] = cleanValue;
        }
      });
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      proxy: {
        // forward /api/* requests to local proxy server
        "/api": {
          target: "http://localhost:5174",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
          },
        },
      },
    },
    envPrefix: 'VITE_',
  };
});