
const CACHE_NAME = 'gestao-pwa-v1';

self.addEventListener('install', (event) => {
    // Force waiting service worker to become active immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claim clients immediately to control the page as soon as possible
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // NETWORK ONLY STRATEGY
    // We intentionally do NOT cache anything to avoid issues with Supabase/API.
    // The mere presence of this fetch handler satisfies PWA installability criteria.
    return;
});
