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
  is_customer?: boolean;
}
export type CustomerMap = Record<string, Customer>;


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
  admin_last_read_at?: string | null;
  customer_last_read_at?: string | null;
  service_type?: ServiceType | null;
}

export interface CustomerCase extends Case {
  scheduled_date?: string | null;
  deadline?: string | null;
  address?: string | null;
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
  id: string;
  case_id: string;
  author_id: string | null;
  customer_id: string | null;
  created_at?: string;
  author_type?: "admin" | "customer" | string | null;
  content: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  author: { name: string | null } | null;
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

export type HandplockatStatus = "draft" | "available" | "reserved" | "sold";
export type HandplockatSource = "valuation" | "manual";

export interface HandplockatListing {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  /** DB column: clothingtype (lowercase) – Dam/Herr/Barn */
  clothingtype?: string | null;
  /** DB column: size – t.ex. M, 38, 29/34 */
  size?: string | null;
  /** DB column: brand – t.ex. Nudie, H&M */
  brand?: string | null;
  dimensions_mm?: {
    length?: number | null;
    width?: number | null;
    height?: number | null;
  } | null;
  price_sek: number;
  owner_id: string;
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
  images_cutout?: string[] | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
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
  provider_contact?: string | null;
  notes?: string | null;
  status: CancellationStatus;
  admin_last_read_at?: string | null;
  customer_last_read_at?: string | null;
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
}


// --------------------------------------------------------
// CONTACT REQUESTS
// --------------------------------------------------------

export interface ContactRequest {
  id: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
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
  customer_id?: string | null;
}