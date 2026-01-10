import type { CancellationStatus } from "@/types";

export type CancellationDocumentV2 = {
  path: string;
  display_name?: string | null;
  mime_type?: string | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
  uploaded_by_role?: "admin" | "customer" | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

export type CancellationDocuments = Array<string | CancellationDocumentV2>;

export type SubscriptionCancellationDraft = {
  provider?: string | null;
  service_type?: string | null;
  custom_service_name?: string | null;
  notice_period?: string | null;
  last_due_date?: string | null;
  provider_contact?: string | null;
  notes?: string | null;
  status: CancellationStatus;
};
