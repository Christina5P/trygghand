import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CustomerFileRow = {
  id: string;
  customer_id: string;
  bucket: string;
  path: string;
  file_type: string | null;
  size: number | null;
  created_at: string | null;
};

type CustomerFilesListProps = {
  customerId: string;
  limit?: number;
};

const DEFAULT_LIMIT = 50;

export default function CustomerFilesList({ customerId, limit = DEFAULT_LIMIT }: CustomerFilesListProps) {
  const [rows, setRows] = useState<CustomerFileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filteredRows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.path.toLowerCase().includes(needle) || row.bucket.toLowerCase().includes(needle));
  }, [rows, filter]);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("customer_files")
        .select("id, customer_id, bucket, path, file_type, size, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setRows((data ?? []) as CustomerFileRow[]);
    } catch (err) {
      console.error("customer_files list failed", err);
      setError("Kunde inte hämta filer.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!customerId) return;
    void fetchFiles();
  }, [customerId, limit]);

  const handleOpen = async (row: CustomerFileRow) => {
    try {
      const { data, error: urlErr } = await supabase.storage
        .from(row.bucket)
        .createSignedUrl(row.path, 600);
      if (urlErr || !data?.signedUrl) throw urlErr || new Error("Kunde inte skapa länk");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("signed url failed", err);
      setError("Kunde inte skapa en signerad länk.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrera på path eller bucket"
          className="max-w-xs"
        />
        <Button type="button" variant="outline" onClick={fetchFiles} disabled={loading}>
          Uppdatera
        </Button>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Laddar filer...</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}

      {!loading && filteredRows.length === 0 && (
        <div className="text-sm text-muted-foreground">Inga filer hittades.</div>
      )}

      <div className="space-y-2">
        {filteredRows.map((row) => (
          <div key={row.id} className="flex flex-col gap-1 rounded border px-3 py-2 text-sm">
            <div className="font-medium break-all">{row.path}</div>
            <div className="text-xs text-muted-foreground">
              {row.bucket} · {row.file_type || "okand"}
              {typeof row.size === "number" ? ` · ${row.size} bytes` : ""}
            </div>
            <div>
              <Button type="button" size="sm" variant="secondary" onClick={() => handleOpen(row)}>
                Oppna
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
