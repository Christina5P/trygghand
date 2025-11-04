import { useState, useEffect, createContext, useContext, ReactNode, createElement } from 'react';
import { supabase, Customer } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Definiera typen för Auth-kontexten
interface AuthContextType {
  user: User | null;
  customer: Customer | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// Skapa Auth-kontexten
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Skapa AuthProvider-komponenten
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchCustomerProfile = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching customer profile:', error);
          setCustomer(null);
        } else {
          setCustomer(data);
        }
      } else {
        setCustomer(null);
      }
    };

    fetchCustomerProfile();
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCustomer(null);
  };

  const value = {
    session,
    user,
    customer,
    loading,
    signOut,
  };

  return createElement(AuthContext.Provider, { value }, children);
};

// Skapa useAuth-hooken
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};