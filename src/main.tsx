import React from "react";
import { createRoot } from "react-dom/client";
//import App from "./App.tsx";
//import "./index.css";
import ComingSoon from "./ComingSoon";

createRoot(document.getElementById("root")!).render(<App />);

const showComingSoon = true; // ⬅ byt till false när du är redo


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {showComingSoon ? <ComingSoon /> : <App />}
  </React.StrictMode>
);
