export async function setupServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  // DEV safety: stale SWs (from older iterations) can break Vite routing/HMR
  // and result in a white screen, especially on Codespaces/forwarded ports.
  if (import.meta.env.DEV) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // Best-effort only
    }

    return;
  }

  // PROD only: register SW for PWA.
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch((error) => console.log("Service Worker registration failed:", error));
    });
  }
}
