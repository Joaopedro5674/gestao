"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export default function AuthPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login/Register
    const router = useRouter();
    const { showToast } = useToast();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                showToast("Conta criada! Verifique seu email.", "success");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                showToast("Login realizado com sucesso!", "success");
                router.push("/");
            }
        } catch (error: any) {
            showToast(error.message || "Erro na autenticação", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px',
            background: 'linear-gradient(135deg, var(--color-background) 0%, var(--color-surface-2) 100%)'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '32px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--color-border)',
                background: 'white'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px', height: '64px', background: 'var(--color-primary)', borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                        boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.3)'
                    }}>
                        <Lock color="white" size={32} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                        {isSignUp ? "Criar Conta" : "Bem-vindo"}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                        {isSignUp ? "Registre-se para começar" : "Faça login para acessar suas finanças"}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleAuth}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="label" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Mail size={14} /> Email
                        </label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="seu@email.com"
                            style={{ paddingLeft: '12px' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label className="label" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Lock size={14} /> Senha
                        </label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••"
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                        style={{
                            height: '48px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            justifyContent: 'center'
                        }}
                    >
                        {loading ? <Loader2 className="spin-anim" /> : (
                            <>
                                {isSignUp ? "Registrar" : "Entrar"} <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer / Toggle */}
                <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border-subtle)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        {isSignUp ? "Já tem uma conta?" : "Não tem conta?"}
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            style={{
                                background: 'none', border: 'none', color: 'var(--color-primary)',
                                fontWeight: '700', cursor: 'pointer', marginLeft: '6px',
                                textDecoration: 'underline'
                            }}
                        >
                            {isSignUp ? "Fazer Login" : "Criar agora"}
                        </button>
                    </p>
                </div>
            </div>

            {/* Safe badge */}
            <div style={{ marginTop: '24px', display: 'flex', gap: '8px', alignItems: 'center', opacity: 0.6 }}>
                <CheckCircle size={12} color="var(--color-success)" />
                <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Ambiente Seguro</span>
            </div>
        </div>
    );
}
