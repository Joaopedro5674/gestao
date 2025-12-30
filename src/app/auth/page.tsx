"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
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
        } catch (error) {
            showToast((error as { message?: string }).message || "Erro na autenticação", "error");
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
            background: '#F7F8FA'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '40px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                border: '1px solid #E5E7EB',
                background: '#FFFFFF',
                borderRadius: '16px'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px', height: '64px', background: '#2563EB', borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)'
                    }}>
                        <Lock color="white" size={32} />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1F2937', letterSpacing: '-0.025em' }}>
                        {isSignUp ? "Criar Conta" : "Bem-vindo"}
                    </h1>
                    <p style={{ color: '#6B7280', fontSize: '1rem', marginTop: '8px' }}>
                        {isSignUp ? "Registre-se para começar" : "Gerencie seu patrimônio com facilidade"}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleAuth}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label className="label" style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#4B5563', fontWeight: '600', marginBottom: '8px' }}>
                            <Mail size={16} color="#6B7280" /> Email
                        </label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="seu@email.com"
                            style={{
                                padding: '12px 16px',
                                background: '#F9FAFB',
                                border: '1px solid #D1D5DB',
                                borderRadius: '10px',
                                fontSize: '1rem',
                                color: '#1F2937'
                            }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '28px' }}>
                        <label className="label" style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#4B5563', fontWeight: '600', marginBottom: '8px' }}>
                            <Lock size={16} color="#6B7280" /> Senha
                        </label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••"
                            minLength={6}
                            style={{
                                padding: '12px 16px',
                                background: '#F9FAFB',
                                border: '1px solid #D1D5DB',
                                borderRadius: '10px',
                                fontSize: '1rem',
                                color: '#1F2937'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-full"
                        disabled={loading}
                        style={{
                            height: '52px',
                            fontSize: '1rem',
                            fontWeight: '700',
                            justifyContent: 'center',
                            background: '#2563EB',
                            color: 'white',
                            borderRadius: '10px',
                            transition: 'all 0.2s ease',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {loading ? <Loader2 className="spin-anim" /> : (
                            <>
                                {isSignUp ? "Registrar" : "Entrar"} <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer / Toggle */}
                <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #F3F4F6' }}>
                    <p style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                        {isSignUp ? "Já tem uma conta?" : "Não tem conta?"}
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            style={{
                                background: 'none', border: 'none', color: '#2563EB',
                                fontWeight: '700', cursor: 'pointer', marginLeft: '6px'
                            }}
                        >
                            {isSignUp ? "Fazer Login" : "Criar agora"}
                        </button>
                    </p>
                </div>
            </div>

            {/* Safe badge */}
            <div style={{ marginTop: '32px', display: 'flex', gap: '8px', alignItems: 'center', opacity: 0.8 }}>
                <CheckCircle size={14} color="#10B981" />
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6B7280' }}>Ambiente Criptografado e Seguro</span>
            </div>
        </div>
    );
}
