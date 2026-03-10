export async function setupServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  // DEV: do not unregister service workers here.
  // Push testing depends on the browser keeping the existing registration
  // and subscription across reloads.
  if (import.meta.env.DEV) {
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
