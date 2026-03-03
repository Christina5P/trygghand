import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import Sitemap from "vite-plugin-sitemap";
import path from "path";
import fs from "fs";

export default defineConfig(({ command }) => {
  // When tests run with VITE_ENV=test, use test environment file
  const isTestMode = process.env.VITE_ENV === "test";
  const isCodespaces =
    process.env.CODESPACES === "true" || !!process.env.CODESPACE_NAME;
  const codespacesForwardingDomain =
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  const codespacesName = process.env.CODESPACE_NAME;

  const codespacesHmrHost =
    isCodespaces && codespacesName && codespacesForwardingDomain
      ? `${codespacesName}-5173.${codespacesForwardingDomain}`
      : undefined;

  if (isTestMode && command === "serve") {
    // Load .env.test values into process.env so they're available to Vite
    const envTestPath = path.resolve(__dirname, ".env.test");
    if (fs.existsSync(envTestPath)) {
      const content = fs.readFileSync(envTestPath, "utf-8");
      content.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          const cleanKey = key.trim();
          const cleanValue = valueParts.join("=").trim();
          process.env[cleanKey] = cleanValue;
        }
      });
    }
  }

  return {
    plugins: [
      react(),
      Sitemap({
        hostname: "https://www.trygghand.com",
        lastmod: new Date("2026-02-08"),
        priority: {
          "*": 0.6,
          "/": 1.0,
          "/handplockat": 0.9,
          "/services/dodsbohantering-sundsvall": 0.8,
          "/services/seniorforandring-sundsvall": 0.8,
          "/services/forsaljning": 0.7,
          "/services/vardering": 0.7,
        },
        dynamicRoutes: [
          "/about",
          "/services",

          "/services/dodsbohantering-sundsvall",
          "/services/seniorforandring-sundsvall",
          "/services/forsaljning",
          "/services/flyttstad",
          "/services/flytt",
          "/services/tomning-bohag",
          "/services/vardering",
          "/services/magasinering",
          "/services/radgivning-planering",
          "/services/Juridikguide",

          "/dodsbohantering-sundsvall",
          "/seniorforandring-sundsvall",
          "/tomning-av-bohag-sundsvall",
          "/forsaljning-av-bohag-sundsvall",

          "/checklista-vid-dodsfall-sundsvall",
          "/vad-ingar-i-dodsbohantering",
          "/fragor-tips",

          "/privacy",
          "/terms",

          "/handplockat",
          "/handplockat/terms",
        ],
      }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },

    server: {
      allowedHosts: isCodespaces ? true : ["localhost", "127.0.0.1"],
      headers: {
        "Cache-Control": "no-store",
      },
      hmr:
        isCodespaces && codespacesHmrHost
          ? {
              protocol: "wss",
              host: codespacesHmrHost,
              clientPort: 443,
            }
          : undefined,
      proxy: {
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
      outDir: "dist",
      assetsDir: "assets",
    },

    publicDir: "public",
    envPrefix: "VITE_",
  };
});