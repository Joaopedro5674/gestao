"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Session } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signInWithEmail: (email: string) => Promise<{ error: Error | string | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signInWithEmail: async () => ({ error: null }),
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const signInWithEmail = async (_email: string) => {
        // Magic Link Login (Passwordless implies simplicity, but user might want password. 
        // Plan said Email/Password. Let's stick to Magic Link for "Premium/Modern" or Password? 
        // User request "autenticação com supabase". 
        // Usually Passwords are standard. Let's do Password login for now as it's more robust for "SaaS".
        // Actually, let's use Magic Link (OTP) as it's very mobile friendly? 
        // No, standard Email/Password is safer assumption unless specified. 
        // Wait, "Entregas V2" suggests strictly internal use.
        // Let's implement generic signInWithPassword.
        // BUT, I need a password field.

        // Wait, I will return the auth function to be used by the form.
        return { error: 'Not implemented in context directly' };
    };

    const value = {
        user,
        session,
        loading,
        signInWithEmail,
        // Better to expose database auth methods directly or wrap them? 
        // Let's expose a simple wrapper or just use supabase directly in the page for the action? 
        // Context is mainly for STATE (user/session). Actions can be direct.
        // I will expose signOut though.
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
