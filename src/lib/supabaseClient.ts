import { createClient } from '@supabase/supabase-js';


// Använd Vite-miljövariabler för frontend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or anonymous key.');
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);