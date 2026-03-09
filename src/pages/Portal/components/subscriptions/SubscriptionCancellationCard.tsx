import type { CancellationStatus, Customer, SubscriptionCancellation } from "@/types";
import { CancellationStatusSelect } from "./status";
import { formatYmd } from "./utils";
import { ConversationCard } from "@/pages/Portal/components/shared/ConversationCard";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export function SubscriptionCancellationCard({
  item,
  customer,
  customerNameOverride,
  caseTypeLabel = "Uppsägning",
  commentCount,
  canEditStatus,
  canDelete = false,
  isDeleting = false,
  unread = false,
  readStatusLabel,
  onOpen,
  onStatusChange,
  onDelete,
}: {
  item: SubscriptionCancellation;
  customer: Customer | undefined;
  customerNameOverride?: string;
  caseTypeLabel?: string;
  commentCount?: number;
  canEditStatus: boolean;
  canDelete?: boolean;
  isDeleting?: boolean;
  unread?: boolean;
  readStatusLabel?: string;
  onOpen: () => void;
  onStatusChange: (next: CancellationStatus) => void;
  onDelete?: () => void;
}) {
  const customerName = customerNameOverride || customer?.name || customer?.email || "Okänd";
  const count = commentCount ?? item.comment_count ?? 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-900";
      case "processing": return "bg-blue-100 text-blue-900";
      case "waiting_customer": return "bg-indigo-100 text-indigo-900";
      case "completed": return "bg-green-100 text-green-900";
      case "cancelled": return "bg-red-100 text-red-900";
      default: return "bg-gray-200 text-gray-700";
    }
  };

  const statusSlot = (
    <div className={`rounded transition-colors ${getStatusColor(item.status)}`} style={{ minWidth: 110, minHeight: 28, display: "flex", alignItems: "center" }}>
      <CancellationStatusSelect
        value={item.status}
        onChange={onStatusChange}
        disabled={!canEditStatus}
        triggerClassName="w-28 h-7 bg-transparent border-none shadow-none focus:ring-0 focus:outline-none text-xs px-1"
      />
    </div>
  );

  const actionsSlot = canDelete ? (
    <button
      type="button"
      title="Ta bort abonnemang"
      className="p-1 h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded disabled:opacity-60"
      style={{ minWidth: 28, minHeight: 28 }}
      disabled={isDeleting}
      onClick={(e) => {
        e.stopPropagation();
        if (isDeleting) return;
        if (!window.confirm("Är du säker på att du vill ta bort detta abonnemang?")) return;
        onDelete?.();
      }}
    >
      <span className="sr-only">Ta bort</span>
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      )}
    </button>
  ) : null;

  return (
    <ConversationCard
      title={customerName}
      subtitle={`${caseTypeLabel} · ${item.custom_service_name || item.service_type || "Abonnemang"}`}
      unread={unread}
      readStatusLabel={readStatusLabel}
      commentCount={count}
      statusSlot={statusSlot}
      actionsSlot={actionsSlot}
      onClick={onOpen}
    />
  );
}
