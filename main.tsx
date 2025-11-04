import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./apps/frontend/src/hooks/useAuth";
import "./index.css";
import ComingSoon from "./apps/frontend/src/pages/ComingSoon";

const App: React.FC = () => {
  return <div>App placeholder</div>;
};

const root = createRoot(document.getElementById("root")!);

// Endast visa "ComingSoon" i produktion om miljövariabeln är satt
const isMaintenance = (import.meta as any).env?.VITE_MAINTENANCE === "true";

// Lokalt utvecklingsläge visar alltid appen
const isDev = (import.meta as any).env?.MODE === "development";

root.render(
  <React.StrictMode>
    <AuthProvider>
      {isMaintenance && !isDev ? <ComingSoon /> : <App />}
    </AuthProvider>
  </React.StrictMode>
);

