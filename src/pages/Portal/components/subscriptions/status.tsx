import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CancellationStatus } from "@/types";

export const cancellationStatusOptions: { value: CancellationStatus; label: string; className: string }[] = [
  { value: "pending", label: "Ny", className: "bg-yellow-100 text-yellow-900" },
  { value: "processing", label: "Pågående", className: "bg-blue-100 text-blue-900" },
  { value: "waiting_customer", label: "Avvaktar kund", className: "bg-indigo-100 text-indigo-900" },
  { value: "completed", label: "Klar", className: "bg-green-100 text-green-900" },
  { value: "cancelled", label: "Avslutad", className: "bg-red-100 text-red-900" },
];

export function CancellationStatusBadge({ status }: { status: CancellationStatus }) {
  const found = cancellationStatusOptions.find((s) => s.value === status);
  if (!found) return <Badge variant="outline">{status}</Badge>;
  return <Badge className={found.className}>{found.label}</Badge>;
}

export function CancellationStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: CancellationStatus;
  onChange: (next: CancellationStatus) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CancellationStatus)} disabled={disabled}>
      <SelectTrigger className="w-40 h-8" aria-label="Ändra status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {cancellationStatusOptions.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
