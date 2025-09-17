import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Customer {
  id: string
  email: string
  name: string
  phone?: string
  address?: string
  created_at: string
  is_admin: boolean
}

export interface ServiceType {
  id: string
  name: string
  description: string
  base_price?: number
  created_at: string
}

export interface Subscription {
  id: string
  name: string
  provider: string
  category: string
  created_at: string
}

export interface Case {
  id: string
  customer_id: string
  service_type_id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  scheduled_date?: string
  completion_date?: string
  total_price?: number
  address?: string
  notes?: string
  created_at: string
  updated_at: string
  // Relations
  customer?: Customer
  service_type?: ServiceType
}

export interface CaseSubscription {
  id: string
  case_id: string
  subscription_id: string
  status: 'active' | 'cancelled' | 'completed'
  cancellation_date?: string
  notes?: string
  created_at: string
  // Relations
  subscription?: Subscription
}

export interface ContactRequest {
  id: string
  name: string
  email: string
  phone?: string
  service_interest?: string
  message: string
  status: 'new' | 'contacted' | 'quoted' | 'converted' | 'closed'
  admin_notes?: string
  created_at: string
  updated_at: string
}

export interface CaseComment {
  id: string
  case_id: string
  author_id: string
  author_type: 'customer' | 'admin'
  content: string
  created_at: string
  // Relations
  author?: Customer
}

export interface StorageItem {
  id: string
  case_id: string
  item_name: string
  description?: string
  quantity: number
  storage_location?: string
  status: 'stored' | 'retrieved' | 'disposed'
  stored_date: string
  retrieved_date?: string
  monthly_cost?: number
  created_at: string
}