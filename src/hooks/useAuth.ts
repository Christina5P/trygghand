import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import type { Customer } from "../types";

interface AuthContextType {
  user: User | null;
  customer: Customer | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string, phone?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initiera session
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) await fetchCustomer(session.user.email);
      setLoading(false);
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) fetchCustomer(session.user.email);
      else setCustomer(null);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const fetchCustomer = async (email?: string) => {
    if (!email) {
      setCustomer(null);
      return;
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!error) setCustomer(data);
    else setCustomer(null);
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      setUser(data.user);
      await fetchCustomer(data.user.email);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, name?: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, phone } },
    });

    if (!error && data.user) {
      await supabase.from('customers').insert([{ id: data.user.id, email, name, phone, is_admin: false }]);
    }

    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("supabase signOut error:", err);
    }

    // Ta bort kvarvarande Supabase/session-nycklar i localStorage/sessionStorage
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.includes("supabase") || key.includes("sb-") || key.includes("sb:")) {
          localStorage.removeItem(key);
        }
      }
      for (const key of Object.keys(sessionStorage)) {
        if (key.includes("supabase") || key.includes("sb-") || key.includes("sb:")) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (err) {
      // ignore
    }

    setUser(null);
    setCustomer(null);
    setSession(null);
    setLoading(false);

    // säkerställ att alla komponenter läser nytt auth-state
    // gör en navigering eller reload som sista utväg
    try {
      window.requestAnimationFrame(() => window.location.reload());
    } catch {}
   };

  const value: AuthContextType = { user, customer, session, loading, signIn, signUp, signOut };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
