import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const providerPresets = [
  "Telia",
  "Telenor",
  "Tele2",
  "Comhem",
  "Bahnhof",
  "E.ON",
  "Vattenfall",
  "Comviq",
  "Tre",
  "Bredbandsbolaget",
] as const;

type ProviderPreset = (typeof providerPresets)[number];

export type ProviderValue =
  | { kind: "preset"; value: ProviderPreset }
  | { kind: "other"; value: string };

export function parseProviderValue(raw: string | null | undefined): ProviderValue {
  if (!raw) return { kind: "preset", value: "Telia" };
  const preset = providerPresets.find((p) => p.toLowerCase() === raw.toLowerCase());
  if (preset) return { kind: "preset", value: preset };
  return { kind: "other", value: raw };
}

export function formatProviderValue(v: ProviderValue): string {
  return v.kind === "preset" ? v.value : v.value;
}

export function ProviderField({
  label = "Leverantör",
  value,
  onChange,
  disabled,
}: {
  label?: string;
  value: ProviderValue;
  onChange: (next: ProviderValue) => void;
  disabled?: boolean;
}) {
  const selectValue = value.kind === "preset" ? value.value : "__other__";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === "__other__") onChange({ kind: "other", value: value.kind === "other" ? value.value : "" });
          else onChange({ kind: "preset", value: v as ProviderPreset });
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Välj leverantör" />
        </SelectTrigger>
        <SelectContent>
          {providerPresets.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
          <SelectItem value="__other__">Annan leverantör</SelectItem>
        </SelectContent>
      </Select>

      {value.kind === "other" && (
        <Input
          value={value.value}
          onChange={(e) => onChange({ kind: "other", value: e.target.value })}
          placeholder="Skriv leverantör (max 120 tecken)"
          disabled={disabled}
          maxLength={120}
        />
      )}
    </div>
  );
}
