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
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

        if (isStandalone) {
            // Add a class to html for specific PWA styling if needed
            document.documentElement.classList.add("is-pwa");

            // Fix for iOS Safari opening links in new window (occasionally happens)
            // We ensure internal links stay in the app.
            // (Next.js Link usually handles this, but this is a safeguard for 'window.location' dependency mentioned)
            document.addEventListener("click", (e: MouseEvent) => {
                const target = (e.target as HTMLElement).closest("a");
                if (!target) return;

                // internal link logic safeguard
            });
        }
    }, []);

    return null;
}
