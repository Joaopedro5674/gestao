"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Banknote, } from "lucide-react";
import styles from "./BottomNav.module.css";

export default function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        {
            label: "Início",
            href: "/",
            icon: Home,
        },
        {
            label: "Imóveis",
            href: "/properties",
            icon: Building2,
        },
        {
            label: "Empréstimos",
            href: "/loans",
            icon: Banknote,
        },
    ];

    return (
        <nav className={styles.nav}>
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
                    >
                        <Icon className={styles.icon} strokeWidth={isActive ? 2.5 : 2} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
