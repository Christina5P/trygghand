export interface Customer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  personal_number?: string;
  is_admin?: boolean;
  created_at?: string;
}

export interface ServiceType {
  id: string;
  name: string;
}

export interface Case {
  id: string;
  title: string;
  description?: string;
  status: string;
  customer_id?: string;
  service_type?: ServiceType | null;
  created_at?: string;
  deadline?: string | null;
}

// add other shared interfaces here...