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
  active?: boolean;
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

    // Soft delete
    deleted_at?: string | null;
    deleted_by?: string | null;

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
  disposition_code?: "sell" | "donate" | "keep" | "discard" | null;
  shared_with_admin?: boolean | null;
  analysis?: string | null;
  analysis_result?: any;
  image_urls?: string[] | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

// --------------------------------------------------------
// HANDPLOCKAT LISTINGS
// --------------------------------------------------------

export type HandplockatCtaType = "bud" | "direktkop";
export type HandplockatStatus = "draft" | "available" | "reserved" | "sold";
export type HandplockatSource = "valuation" | "manual";

export interface HandplockatListing {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  dimensions_mm?: {
    length?: number | null;
    width?: number | null;
    height?: number | null;
  } | null;
  price_sek: number;
  cta_typ: HandplockatCtaType;
  bid_start_sek?: number | null;
  current_bid_sek?: number | null;
  bid_count?: number | null;
  status: HandplockatStatus;
  skick?: string | null;
  pickup_area: string;
  pickup_window?: string | null;
  pickup_text?: string | null;
  pickup_deadline_at?: string | null;
  auction_end_at?: string | null;
  sms_phone: string;
  payment_method?: string | null;
  source: HandplockatSource;
  valuation_json?: any | null;
  images_original?: string[] | null;
  image_cutout?: string | null;
  published_at?: string | null;
  created_at?: string;
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
// SUBSCRIPTION CANCELLATIONS
// --------------------------------------------------------

export type CancellationStatus = "pending" | "processing" | "waiting_customer" | "cancelled" | "completed";

export interface SubscriptionCancellation {
  id: string;
  customer_id: string;
  subscription_id?: string | null;
  provider?: string | null;
  service_type?: string | null;
  custom_service_name?: string | null;
  notice_period?: string | null;
  last_due_date?: string | null;
  provider_contact?: string | null; // kontaktperson hos leverantör
  notes?: string | null;
  status: CancellationStatus;

  /**
   * Documents are stored in `subscription_cancellations.documents` (jsonb).
   * Backward compatible:
   * - older rows may be string paths
   * - newer rows may store objects with metadata
   */
  documents?: Array<
    | string
    | {
        path: string;
        display_name?: string | null;
        mime_type?: string | null;
        uploaded_at?: string | null;
        uploaded_by?: string | null;
        uploaded_by_role?: "admin" | "customer" | null;
        deleted_at?: string | null;
        deleted_by?: string | null;
      }
  > | null;
  admin_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  comment_count?: number;
}

export interface CancellationComment {
  id: string;
  cancellation_id: string;
  user_id: string;
  message: string;
  is_internal?: boolean;
  created_at?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  // author relation (auth.users) är inte joinad här; presenteras enkelt via user_id
}


// --------------------------------------------------------
// CONTACT REQUESTS
// --------------------------------------------------------


export interface ContactRequest {
  id: string;
  name?: string; // Kan vara kombinerat namn eller tomt
  firstname?: string; // Från kontaktformuläret
  lastname?: string; // Från kontaktformuläret
  email?: string; // Nu optional
  phone?: string;
  message?: string;
  status?: "new" | "contacted" | "closed" | "converted";
  created_at?: string;
  company?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  service_type?: string;
  admin_notes?: string | null;
  customer_id?: string | null; // Länkar till kund om konverterad
}
