import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Customer } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hämta initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchCustomerData(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Lyssna på auth-ändringar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchCustomerData(session.user.id)
      } else {
        setCustomer(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line
  }, [])

  const fetchCustomerData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', userId)
        .single() // Viktigt: krävs för att undvika 406-felet!

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching customer:', error)
        setCustomer(null)
      } else if (data) {
        setCustomer(data)
      } else {
        setCustomer(null)
      }
    } catch (error) {
      console.error('Error:', error)
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (data.user && !error) {
      // Skapa kundprofil
      const { error: profileError } = await supabase
        .from('customers')
        .insert({
          id: data.user.id,
          email,
          name,
          phone,
          is_admin: false
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
      }
    }

    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const isAdmin = customer?.is_admin || false

  return {
    user,
    customer,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin
  }
}