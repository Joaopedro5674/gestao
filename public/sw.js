// Minimal Service Worker for PWA installability
// Does NOT cache API calls or dynamic content.
// Only caches offline page fallback if we were to implement it (skipping for now to be safe).

const CACHE_NAME = 'gestao-pwa-v1';

self.addEventListener('install', (event) => {
    // Force waiting service worker to become active
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claim clients immediately
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass through all requests - Network Only strategy
    // This ensures NO caching interference with Supabase or App logic.
    // PWA installability mainly requires a fetch handler to be present.
    return;
});
