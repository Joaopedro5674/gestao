
// CACHE_NAME_REMOVED_DUE_TO_NO_CACHE_STRATEGY

self.addEventListener('install', () => {
    // Force waiting service worker to become active immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claim clients immediately to control the page as soon as possible
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
    // NETWORK ONLY STRATEGY
    // We intentionally do NOT cache anything to avoid issues with Supabase/API.
    // The mere presence of this fetch handler satisfies PWA installability criteria.
    return;
});
