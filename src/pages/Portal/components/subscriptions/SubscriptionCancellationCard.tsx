import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CancellationStatus, Customer, SubscriptionCancellation } from "@/types";
import { CancellationStatusSelect } from "./status";
import { formatYmd } from "./utils";

export function SubscriptionCancellationCard({
  item,
  customer,
  caseTypeLabel = "Uppsägning",
  canEditStatus,
  onOpen,
  onStatusChange,
}: {
  item: SubscriptionCancellation;
  customer: Customer | undefined;
  caseTypeLabel?: string;
  canEditStatus: boolean;
  onOpen: () => void;
  onStatusChange: (next: CancellationStatus) => void;
}) {
  const customerName = customer?.name || customer?.email || "Okänd";

  return (
    <Card className="hover:bg-muted/40 transition cursor-pointer" onClick={onOpen}>
      <CardHeader className="pb-3 flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base truncate">{customerName}</CardTitle>
          <CardDescription className="truncate">
            {caseTypeLabel} · {item.custom_service_name || item.service_type || "Abonnemang"}
          </CardDescription>
        </div>
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <CancellationStatusSelect value={item.status} onChange={onStatusChange} disabled={!canEditStatus} />
        </div>
      </CardHeader>

      <CardContent className="space-y-1 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Leverantör</span>
          <span className="truncate">{item.provider || "-"}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Startdatum</span>
          <span>{formatYmd(item.created_at)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Sista förfallodatum</span>
          <span>{formatYmd(item.last_due_date)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
