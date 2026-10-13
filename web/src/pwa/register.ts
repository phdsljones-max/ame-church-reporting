/* Register the hand-rolled service worker — production only.
 * In dev (vite) this is a no-op so we never cache half-built assets.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline-capable install is optional; don't block the app */
    });
  });
}
