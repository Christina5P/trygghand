// PWA setup - only runs in production
if (import.meta.env.PROD) {
  // Load manifest dynamically in production
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = '/manifest.json';
  document.head.appendChild(manifestLink);

  // Register service worker only in production
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => console.log('Service Worker registered'))
      .catch((error) => console.log('Service Worker registration failed:', error));
  }
} else {
  console.log('PWA disabled in dev mode (Vite)');
  // Unregister service worker in dev mode
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }
}
