"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Session } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // 1. Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            // Redirect logic
            if (!session && pathname !== '/auth') {
                router.replace('/auth');
            } else if (session && pathname === '/auth') {
                router.replace('/');
            }
        });

        return () => subscription.unsubscribe();
    }, [pathname, router]);

    const value = {
        user,
        session,
        loading,
        signOut: async () => {
            await supabase.auth.signOut();
            router.replace('/auth');
        }
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
                    background: 'var(--color-surface-1)', color: 'var(--color-primary)'
                }}>
                    <div className="spin-anim" style={{ width: '2rem', height: '2rem', border: '3px solid', borderRadius: '50%', borderTopColor: 'transparent' }}></div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
