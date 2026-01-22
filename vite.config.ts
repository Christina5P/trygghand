import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

export default defineConfig(({ command }) => {
  // When tests run with VITE_ENV=test, use test environment file
  const isTestMode = process.env.VITE_ENV === 'test';
  const isCodespaces = process.env.CODESPACES === 'true' || !!process.env.CODESPACE_NAME;
  const codespacesForwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  const codespacesName = process.env.CODESPACE_NAME;
  const codespacesHmrHost =
    isCodespaces && codespacesName && codespacesForwardingDomain
      ? `${codespacesName}-5173.${codespacesForwardingDomain}`
      : undefined;
  
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
      // Codespaces/forwarded ports uses dynamic hostnames (e.g. *.app.github.dev / *.githubpreview.dev).
      // Vite's host-check can block module requests which then looks like 404/ERR_ABORTED in the browser.
      allowedHosts: isCodespaces ? true : ["localhost", "127.0.0.1"],
      // Avoid cached interstitials / stale HTML when developing behind tunnels.
      headers: {
        "Cache-Control": "no-store",
      },
      // Make HMR websocket work behind Codespaces port forwarding.
      hmr: isCodespaces && codespacesHmrHost
        ? {
            protocol: "wss",
            host: codespacesHmrHost,
            clientPort: 443,
          }
        : undefined,
      proxy: {
        // forward /api/* requests to local proxy server
        "/api": {
          target: "http://localhost:3001",
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
      outDir: 'dist',
      assetsDir: 'assets',
    },
    publicDir: 'public',
    envPrefix: 'VITE_',
  };
});