/**
 * MIREVA — service worker
 *
 * Strategy
 *   • Application shell (HTML, CSS, JS, fonts, icons, library artwork) is
 *     pre-cached on install so MIREVA opens with no network at all.
 *   • Navigations use network-first with a cache fallback, so a refreshed
 *     deploy is picked up quickly but offline still works.
 *   • Everything else is cache-first — the library artwork never changes.
 *
 * MIREVA stores nothing in the cloud. Uploaded images live in IndexedDB on
 * this device only; the service worker never uploads or synchronises anything.
 */

const VERSION = 'mireva-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE = [
  "./index.html",
  "./pages/collections.html",
  "./pages/favorites.html",
  "./pages/gallery.html",
  "./pages/presentation.html",
  "./pages/recently-viewed.html",
  "./pages/settings.html",
  "./pages/upload.html",
  "./css/animations.css",
  "./css/collections.css",
  "./css/command.css",
  "./css/dashboard.css",
  "./css/editor.css",
  "./css/fonts.css",
  "./css/gallery.css",
  "./css/global.css",
  "./css/layout.css",
  "./css/lightbox.css",
  "./css/onboarding.css",
  "./css/presentation.css",
  "./css/reset.css",
  "./css/responsive.css",
  "./css/settings.css",
  "./css/upload.css",
  "./css/variables.css",
  "./js/accessibility.js",
  "./js/app.js",
  "./js/collections.js",
  "./js/command-center.js",
  "./js/dialogs.js",
  "./js/editor.js",
  "./js/favorites.js",
  "./js/filters.js",
  "./js/gallery.js",
  "./js/icons.js",
  "./js/library.js",
  "./js/lightbox.js",
  "./js/notifications.js",
  "./js/onboarding.js",
  "./js/presentation.js",
  "./js/search.js",
  "./js/state.js",
  "./js/storage.js",
  "./js/theme.js",
  "./js/upload.js",
  "./js/utils.js",
  "./js/pages/collections-page.js",
  "./js/pages/dashboard.js",
  "./js/pages/favorites-page.js",
  "./js/pages/gallery-page.js",
  "./js/pages/presentation-page.js",
  "./js/pages/recent-page.js",
  "./js/pages/settings-page.js",
  "./js/pages/upload-page.js",
  "./manifest.json",
  "./assets/images/mireva-001.svg",
  "./assets/images/mireva-002.svg",
  "./assets/images/mireva-003.svg",
  "./assets/images/mireva-004.svg",
  "./assets/images/mireva-005.svg",
  "./assets/images/mireva-006.svg",
  "./assets/images/mireva-007.svg",
  "./assets/images/mireva-008.svg",
  "./assets/images/mireva-009.svg",
  "./assets/images/mireva-010.svg",
  "./assets/images/mireva-011.svg",
  "./assets/images/mireva-012.svg",
  "./assets/images/mireva-013.svg",
  "./assets/images/mireva-014.svg",
  "./assets/images/mireva-015.svg",
  "./assets/images/mireva-016.svg",
  "./assets/images/mireva-017.svg",
  "./assets/images/mireva-018.svg",
  "./assets/images/mireva-019.svg",
  "./assets/images/mireva-020.svg",
  "./assets/images/mireva-021.svg",
  "./assets/images/mireva-022.svg",
  "./assets/images/mireva-023.svg",
  "./assets/images/mireva-024.svg",
  "./assets/images/mireva-025.svg",
  "./assets/images/mireva-026.svg",
  "./assets/images/mireva-027.svg",
  "./assets/images/mireva-028.svg",
  "./assets/images/mireva-029.svg",
  "./assets/images/mireva-030.svg",
  "./assets/images/mireva-031.svg",
  "./assets/images/mireva-032.svg",
  "./assets/images/mireva-033.svg",
  "./assets/images/mireva-034.svg",
  "./assets/images/mireva-035.svg",
  "./assets/images/mireva-036.svg",
  "./assets/images/mireva-037.svg",
  "./assets/images/mireva-038.svg",
  "./assets/images/mireva-039.svg",
  "./assets/images/mireva-040.svg",
  "./assets/images/mireva-041.svg",
  "./assets/images/mireva-042.svg",
  "./assets/images/mireva-043.svg",
  "./assets/images/mireva-044.svg",
  "./assets/images/mireva-045.svg",
  "./assets/images/mireva-046.svg",
  "./assets/images/mireva-047.svg",
  "./assets/images/mireva-048.svg",
  "./assets/thumbnails/mireva-001.svg",
  "./assets/thumbnails/mireva-002.svg",
  "./assets/thumbnails/mireva-003.svg",
  "./assets/thumbnails/mireva-004.svg",
  "./assets/thumbnails/mireva-005.svg",
  "./assets/thumbnails/mireva-006.svg",
  "./assets/thumbnails/mireva-007.svg",
  "./assets/thumbnails/mireva-008.svg",
  "./assets/thumbnails/mireva-009.svg",
  "./assets/thumbnails/mireva-010.svg",
  "./assets/thumbnails/mireva-011.svg",
  "./assets/thumbnails/mireva-012.svg",
  "./assets/thumbnails/mireva-013.svg",
  "./assets/thumbnails/mireva-014.svg",
  "./assets/thumbnails/mireva-015.svg",
  "./assets/thumbnails/mireva-016.svg",
  "./assets/thumbnails/mireva-017.svg",
  "./assets/thumbnails/mireva-018.svg",
  "./assets/thumbnails/mireva-019.svg",
  "./assets/thumbnails/mireva-020.svg",
  "./assets/thumbnails/mireva-021.svg",
  "./assets/thumbnails/mireva-022.svg",
  "./assets/thumbnails/mireva-023.svg",
  "./assets/thumbnails/mireva-024.svg",
  "./assets/thumbnails/mireva-025.svg",
  "./assets/thumbnails/mireva-026.svg",
  "./assets/thumbnails/mireva-027.svg",
  "./assets/thumbnails/mireva-028.svg",
  "./assets/thumbnails/mireva-029.svg",
  "./assets/thumbnails/mireva-030.svg",
  "./assets/thumbnails/mireva-031.svg",
  "./assets/thumbnails/mireva-032.svg",
  "./assets/thumbnails/mireva-033.svg",
  "./assets/thumbnails/mireva-034.svg",
  "./assets/thumbnails/mireva-035.svg",
  "./assets/thumbnails/mireva-036.svg",
  "./assets/thumbnails/mireva-037.svg",
  "./assets/thumbnails/mireva-038.svg",
  "./assets/thumbnails/mireva-039.svg",
  "./assets/thumbnails/mireva-040.svg",
  "./assets/thumbnails/mireva-041.svg",
  "./assets/thumbnails/mireva-042.svg",
  "./assets/thumbnails/mireva-043.svg",
  "./assets/thumbnails/mireva-044.svg",
  "./assets/thumbnails/mireva-045.svg",
  "./assets/thumbnails/mireva-046.svg",
  "./assets/thumbnails/mireva-047.svg",
  "./assets/thumbnails/mireva-048.svg",
  "./assets/fonts/manrope-latin-400-normal.woff2",
  "./assets/fonts/manrope-latin-500-normal.woff2",
  "./assets/fonts/manrope-latin-600-normal.woff2",
  "./assets/fonts/manrope-latin-700-normal.woff2",
  "./assets/fonts/manrope-latin-800-normal.woff2",
  "./assets/fonts/playfair-display-latin-400-normal.woff2",
  "./assets/fonts/playfair-display-latin-500-normal.woff2",
  "./assets/fonts/playfair-display-latin-600-italic.woff2",
  "./assets/fonts/playfair-display-latin-600-normal.woff2",
  "./assets/fonts/playfair-display-latin-700-normal.woff2",
  "./assets/icons/icon-180.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon.svg"
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Add individually so a single failure never blocks the whole install.
    await Promise.all(PRECACHE.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(request) || await caches.match('./index.html');
        return cached || new Response('<h1>Offline</h1><p>MIREVA could not load this page from the cache.</p>', {
          status: 503, headers: { 'Content-Type': 'text/html' },
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const fresh = await fetch(request);
      if (fresh.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch (err) {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
