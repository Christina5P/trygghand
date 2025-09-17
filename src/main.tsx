import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ComingSoon from "./pages/ComingSoon";

createRoot(document.getElementById("root")!).render(<App />);

const showComingSoon = true; // ⬅ byt till false när du är redo

const isMaintenance = import.meta.env.VITE_MAINTENANCE === "true";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isMaintenance ? <ComingSoon /> : <App />}
  </React.StrictMode>
);