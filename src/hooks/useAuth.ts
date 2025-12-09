import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import type { Customer } from "../types";

interface AuthContextType {
  user: User | null;
  customer: Customer | null;
  session: Session | null;
  loading: boolean;
  isCustomer: boolean; // NYTT: convenience flag
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string, phone?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: any }>;
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

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (!error && data) {
        setCustomer(data);
      } else if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found
        console.error("Error fetching customer:", error);
        setCustomer(null);
      } else {
        // Kund existerar inte - skapa en
        const session = await supabase.auth.getSession();
        const userId = session?.data?.session?.user?.id;
        
        if (userId) {
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert([{
              id: userId,
              email,
              name: email.split('@')[0],
              is_admin: false,
              is_customer: true,
            }])
            .select('*')
            .maybeSingle();

          if (!createError && newCustomer) {
            setCustomer(newCustomer);
          } else {
            console.error("Error creating customer:", createError);
            setCustomer(null);
          }
        }
      }
    } catch (err) {
      console.error("fetchCustomer error:", err);
      setCustomer(null);
    }
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

    if (error) {
      console.error("SignUp error:", error);
      return { error };
    }

    if (data.user) {
      // Skapa customer-rad (använd upsert för att hantera duplicates)
      const { error: customerError } = await supabase.from('customers').upsert([
        { 
          id: data.user.id, 
          email, 
          name: name || email.split('@')[0], 
          phone, 
          is_admin: false 
        }
      ], { onConflict: 'id' });

      if (customerError) {
        console.error("Customer creation error:", customerError);
      }
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

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password?type=recovery`,
    });
    return { error };
  };

  const value: AuthContextType = { user, customer, session, loading, isCustomer: customer?.is_customer === true, signIn, signUp, signOut, sendPasswordReset };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
