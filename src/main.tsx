import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ComingSoon from "./pages/ComingSoon";

const root = createRoot(document.getElementById("root")!);

// Endast visa "ComingSoon" i produktion om miljövariabeln är satt
const isMaintenance = import.meta.env.VITE_MAINTENANCE === "true";

// Lokalt utvecklingsläge visar alltid appen
const isDev = import.meta.env.MODE === "development";

root.render(
  <React.StrictMode>
    {isMaintenance && !isDev ? <ComingSoon /> : <App />}
  </React.StrictMode>
);
