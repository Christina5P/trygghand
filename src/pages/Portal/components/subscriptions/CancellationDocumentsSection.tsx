import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { CancellationDocuments, CancellationDocumentV2 } from "./types";
import { fileExt, safeDisplayNameFromFilename } from "./utils";

function getDocPath(doc: string | CancellationDocumentV2): string {
  return typeof doc === "string" ? doc : doc.path;
}

function getDocLabel(doc: string | CancellationDocumentV2): string {
  if (typeof doc === "string") return doc.split("/").pop() || doc;
  return doc.display_name || (doc.path.split("/").pop() || doc.path);
}

function isDeleted(doc: string | CancellationDocumentV2): boolean {
  return typeof doc === "string" ? false : !!doc.deleted_at;
}

export function CancellationDocumentsSection({
  cancellationId,
  customerId,
  documents,
  canUpload,
  onDocumentsChanged,
}: {
  cancellationId: string;
  customerId: string;
  documents: CancellationDocuments;
  canUpload: boolean;
  onDocumentsChanged: (next: CancellationDocuments) => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const visibleDocs = useMemo(() => {
    if (showDeleted) return documents;
    return documents.filter((d) => !isDeleted(d));
  }, [documents, showDeleted]);

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("abonnemang").createSignedUrl(path, 3600);
    if (error) throw error;
    const url = (data as any)?.signedUrl;
    if (!url) throw new Error("Kunde inte skapa länk");
    window.open(url, "_blank");
  };

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    try {
      const added: CancellationDocumentV2[] = [];

      for (const file of Array.from(files)) {
        const ext = fileExt(file.name) || "bin";
        const displayName = `${safeDisplayNameFromFilename(file.name)}.${ext}`;

        // 1) Ask Edge Function for signed upload token + path (enforces permissions)
        const { data, error } = await supabase.functions.invoke("cancellation-create-document-upload", {
          body: {
            cancellation_id: cancellationId,
            file_ext: ext,
            mime_type: file.type || null,
          },
        });
        if (error) throw error;
        if (!(data as any)?.ok) throw new Error((data as any)?.error || "Kunde inte initiera uppladdning");

        const path = (data as any).path as string;
        const token = (data as any).token as string;

        // 2) Upload to signed URL
        const { error: upErr } = await supabase.storage.from("abonnemang").uploadToSignedUrl(path, token, file);
        if (upErr) throw upErr;

        // 3) Attach document metadata to the cancellation row
        const { data: attachData, error: attachErr } = await supabase.functions.invoke("cancellation-attach-document", {
          body: {
            cancellation_id: cancellationId,
            path,
            display_name: displayName,
            mime_type: file.type || null,
          },
        });
        if (attachErr) throw attachErr;
        if ((attachData as any)?.ok !== true) throw new Error((attachData as any)?.error || "Kunde inte spara dokument");

        added.push({ path, display_name: displayName, mime_type: file.type || null });
      }

      toast({ title: "Uppladdat", description: "Dokumentet är uppladdat." });
      // Refresh from server would be ideal, but keep optimistic local append.
      onDocumentsChanged([...documents, ...added]);
    } catch (err: any) {
      toast({ title: "Kunde inte ladda upp", description: err?.message || "Något gick fel", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const softDelete = async (path: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("cancellation-soft-delete-document", {
        body: { cancellation_id: cancellationId, path },
      });
      if (error) throw error;
      if ((data as any)?.ok !== true) throw new Error((data as any)?.error || "Kunde inte ta bort");

      const next = documents.map((d) => {
        if (typeof d === "string") return d;
        if (d.path !== path) return d;
        return { ...d, deleted_at: new Date().toISOString() };
      });
      onDocumentsChanged(next);
      toast({ title: "Borttaget", description: "Dokumentet är markerat som borttaget." });
    } catch (err: any) {
      toast({ title: "Kunde inte ta bort", description: err?.message || "Något gick fel", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">Dokument</div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowDeleted((v) => !v)}>
            {showDeleted ? "Dölj borttagna" : "Visa borttagna"}
          </Button>
        </div>
      </div>

      {canUpload && (
        <div
          className="rounded border p-3 space-y-2 bg-muted/30"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;
            void uploadFiles(e.dataTransfer.files);
          }}
        >
          <Label>Ladda upp</Label>
          <div className="text-xs text-muted-foreground">Dra och släpp filer här, eller välj via knappen.</div>
          <Input
            type="file"
            multiple
            disabled={uploading}
            onChange={(e) => {
              const files = e.target.files;
              if (!files || files.length === 0) return;
              void uploadFiles(files);
              e.currentTarget.value = "";
            }}
          />
          <div className="text-xs text-muted-foreground">Filer sparas utan kundnamn i sökvägen.</div>
        </div>
      )}

      <div className="space-y-2">
        {visibleDocs.length === 0 ? (
          <div className="text-sm text-muted-foreground">Inga dokument ännu.</div>
        ) : (
          visibleDocs.map((doc) => {
            const path = getDocPath(doc);
            const label = getDocLabel(doc);
            const deleted = isDeleted(doc);
            return (
              <div key={path} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <button
                  type="button"
                  className="text-trust-blue underline hover:opacity-70 disabled:opacity-50"
                  disabled={deleted}
                  onClick={() => openFile(path)}
                >
                  {label}
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">{fileExt(path).toUpperCase()}</div>
                  {!deleted && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => softDelete(path)}>
                      Ta bort
                    </Button>
                  )}
                  {deleted && <div className="text-xs text-muted-foreground">Borttaget</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
