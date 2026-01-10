import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * GitHub Codespaces Dev Tunnels sometimes bounce through `/auth/postback/tunnel` with `rd=/path`.
 * If we don't handle it, the user can end up on a blank/NotFound page.
 */
export default function AuthPostbackTunnel() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rdRaw = params.get("rd");

    // Default back to home.
    const target = rdRaw ? safeDecodeURIComponent(rdRaw) : "/";

    // Only allow same-origin relative redirects.
    const safeTarget = target.startsWith("/") ? target : "/";

    window.location.replace(safeTarget);
  }, [location.search]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm text-muted-foreground">Återgår…</div>
    </div>
  );
}
