export interface Customer {
  id: string;
  name?: string;
  email?: string;
  personal_number?: string;
  phone?: string; // <-- add this optional field
}

export interface ServiceType {
  id: string;
  name: string;
}

export interface Case {
  id: string;
  title: string;
  description?: string; // optional to match DB / Supabase rows
  status: string;
  customer_id?: string;
  service_type?: ServiceType | null;
  created_at: string;
  deadline?: string | null;
}

export interface ContactRequest {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  status?: 'new' | 'handled' | string;
  created_at?: string | null;
}

export interface Subscription {
  id: string;
  customer_id?: string;
  plan?: string;
  status?: 'active' | 'in_progress' | 'cancelled' | 'paused' | string;
  started_at?: string | null;
  ends_at?: string | null;
  metadata?: Record<string, any>;
  category?: string; // <-- add this (optional to avoid breaking existing callers)
  provider?: string; // <-- add this optional field
}

export interface Valuation {
  id: string;
  customer_id?: string;
  property_address?: string;
  estimated_value?: number;
  currency?: string;
  status?: 'draft' | 'final' | 'cancelled' | string;
  created_at?: string | null;
  updated_at?: string | null;
  comments?: string;
  name?: string;
  customer_name?: string;
  image_urls?: string[] | null;
  analysis?: string; // <-- add this optional field
}