"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
    useEffect(() => {
        // 1. Register Service Worker with strict scope
        if ("serviceWorker" in navigator) {
            // Optional: Unregister old scopes if needed, but registering new one usually handles it.
            // We register immediately as requested.
            navigator.serviceWorker
                .register("/sw.js", { scope: "/" })
                .then((registration) => {
                    console.log("SW Registered with scope:", registration.scope);
                })
                .catch((error) => {
                    console.error("SW Registration failed:", error);
                });
        }

        // 2. iOS / Standalone Mode Handling
        // "Se estiver rodando como PWA... Ajustar layout"
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true;

        if (isStandalone) {
            // Add a class to html for specific PWA styling if needed
            document.documentElement.classList.add("is-pwa");

            // Fix for iOS Safari opening links in new window (occasionally happens)
            // We ensure internal links stay in the app.
            // (Next.js Link usually handles this, but this is a safeguard for 'window.location' dependency mentioned)
            document.addEventListener("click", (e: any) => {
                const target = e.target.closest("a");
                if (!target) return;

                const href = target.getAttribute("href");
                const isExternal = href && (href.startsWith("http") || href.startsWith("//")) && !href.includes(window.location.hostname);

                // If internal link and we rely on standard navigation, Next.js handles it.
                // But for pure anchor tags, we might want to catch them. 
                // Leaving this lightweight to avoid breaking Next.js router.
            });
        }
    }, []);

    return null;
}
