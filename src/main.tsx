import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "@/App";
import "@/index.css";
import { setupServiceWorker } from "@/registerServiceWorker";
import ErrorBoundary from "@/components/ErrorBoundary";

setupServiceWorker();

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

