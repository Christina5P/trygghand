import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ComingSoon from "./pages/ComingSoon";

const root = createRoot(document.getElementById("root")!);

const showComingSoon = true; // byt till false när sidan är redo

const isMaintenance = import.meta.env.VITE_MAINTENANCE === "true";

root.render(
  <React.StrictMode>
    {isMaintenance || showComingSoon ? <ComingSoon /> : <App />}
  </React.StrictMode>
);
