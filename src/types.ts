// --------------------------------------------------------
// CUSTOMERS
// --------------------------------------------------------

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at?: string;
  personal_number?: string;
  is_admin?: boolean;
  is_customer?: boolean; // NYTT: true om användaren är aktiv kund
}export type CustomerMap = Record<string, Customer>;


// --------------------------------------------------------
// SERVICE TYPES
// --------------------------------------------------------

export interface ServiceType {
  id: string;
  name: string;
  description?: string;
}


// --------------------------------------------------------
// CASES
// --------------------------------------------------------

export interface Case {
  id: string;
  title: string | null;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";

  customer_id: string;

  created_at?: string;
  updated_at?: string;
  scheduled_date?: string | null;
  address?: string | null;

  // JOIN: service_type(*)
  service_type?: ServiceType | null;
}

/**
 * CustomerCase används för adminportalen när du JOIN:ar customers + service types.
 * Den utökar egentligen bara Case.
 */
export interface CustomerCase extends Case {
  scheduled_date?: string | null;
  deadline?: string | null;
  address?: string | null;
  // andra fält som komponenterna använder
}


// --------------------------------------------------------
// FULLMAKTER
// --------------------------------------------------------
export interface FullmaktDocument {
  id: string;
  customer_id: string | null;
  file_name: string;
  storage_path: string;
  created_at: string;
  fullmaktstyp?: string;
  status?: string;
}



// --------------------------------------------------------
// CASE COMMENTS
// --------------------------------------------------------
export interface Comment {
    // 🛑 KRITISK ÄNDRING 1: Supabase UUID är sträng
    id: string; 
    
    // UUID (strängar)
    case_id: string; 
    author_id: string | null; 
    customer_id: string | null;
    created_at?: string;

    // Textfält
     author_type?: "admin" | "customer" | string | null;
    content: string | null; 

    // Relation (från SELECT *, author:customers(name))
    author: {
        name: string | null;
    } | null;
}

export interface AdminCase extends Case {
  service_type?: ServiceType | null;

  scheduled_date?: string | null;
  deadline?: string | null;
  address?: string | null;
}


// --------------------------------------------------------
// VALUATIONS
// --------------------------------------------------------

export interface Valuation {
  id: string;
  customer_id: string;
  analysis?: string | null;
  analysis_result?: any;
  image_urls?: string[] | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

// --------------------------------------------------------
// SUBSCRIPTIONS
// --------------------------------------------------------

export interface Subscription {
  id: string;
  customer_id: string;
  plan?: string;
  name?: string;
  provider?: string;
  category?: string;
  status?: string;
  created_at?: string;
}


// --------------------------------------------------------
// CONTACT REQUESTS
// --------------------------------------------------------


export interface ContactRequest {
  id: string;
  name?: string; // Kan vara kombinerat namn eller tomt
  firstname?: string; // Från kontaktformuläret
  lastname?: string; // Från kontaktformuläret
  email: string;
  phone?: string;
  message?: string;
  status?: "new" | "in_progress" | "contacted" | "converted" | "completed" | "cancelled";
  created_at?: string;
  company?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  service_type?: string;
  admin_notes?: string | null;
}
