'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

// AUTH BYPASSED — set to true to skip login during testing/deployment
const AUTH_DISABLED = true;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Mock user for dev/testing mode
const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'bill@oneillcontractors.com',
  user_metadata: { full_name: 'Bill Asmar' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(AUTH_DISABLED ? DEV_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!AUTH_DISABLED);

  useEffect(() => {
    if (AUTH_DISABLED) return;

    const supabase = getSupabase();

    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
      })
      .catch((err) => {
        console.error('Failed to get session:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (_email: string, _password: string) => {
    if (AUTH_DISABLED) return { error: null };
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({ email: _email, password: _password });
      return { error: error?.message ?? null };
    } catch (err) {
      console.error('signIn exception:', err);
      return { error: err instanceof Error ? err.message : 'Sign in failed' };
    }
  };

  const signUp = async (_email: string, _password: string, _fullName: string) => {
    if (AUTH_DISABLED) return { error: null };
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signUp({
        email: _email,
        password: _password,
        options: { data: { full_name: _fullName } },
      });
      return { error: error?.message ?? null };
    } catch (err) {
      console.error('signUp exception:', err);
      return { error: err instanceof Error ? err.message : 'Sign up failed' };
    }
  };

  const signOut = async () => {
    if (AUTH_DISABLED) return;
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('signOut exception:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
