import { useCallback, useMemo, useState } from "react";
import { isUnauthorizedError, supabase, tryRefreshSession } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { fileExt, safeDisplayNameFromFilename } from "./caseDocumentUtils";

export type CaseDocument =
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
    };

type CaseDocumentView = {
  path: string;
  display_name: string | null;
  deleted_at: string | null;
  uploaded_at: string | null;
  uploaded_by_role: "admin" | "customer" | null;
};

export function CaseDocumentsSection({
  caseId,
  documents,
  canUpload,
  onRefresh,
}: {
  caseId: string;
  documents: CaseDocument[];
  canUpload: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const handleUnauthorized = useCallback(async () => {
    const refreshed = await tryRefreshSession();
    if (refreshed) return true;

    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    toast({
      title: "Sessionen har gått ut",
      description: "Logga in igen för att fortsätta.",
      variant: "destructive",
    });
    window.location.href = "/portal";
    return false;
  }, [toast]);

  const visibleDocs = useMemo<CaseDocumentView[]>(() => {
    const normalized: CaseDocumentView[] = (Array.isArray(documents) ? documents : [])
      .map((d) => {
        if (typeof d === "string") {
          const name = d.split("/").pop() || d;
          return { path: d, display_name: name, deleted_at: null, uploaded_at: null, uploaded_by_role: null };
        }
        if (!d || typeof d !== "object") return null;
        if (typeof (d as any).path !== "string") return null;
        return {
          path: (d as any).path,
          display_name: (d as any).display_name ?? null,
          deleted_at: (d as any).deleted_at ?? null,
          uploaded_at: (d as any).uploaded_at ?? null,
          uploaded_by_role: (d as any).uploaded_by_role ?? null,
        };
      })
      .filter(Boolean) as CaseDocumentView[];

    if (showDeleted) return normalized;
    return normalized.filter((d) => !d.deleted_at);
  }, [documents, showDeleted]);

  const openFile = async (path: string) => {
    const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
    const res = await fetch(`/api/templates/download?bucket=case-documents&path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`Kunde inte hämta filen (${res.status})`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    if (popup && !popup.closed) {
      popup.location.href = objectUrl;
    } else {
      window.open(objectUrl, "_blank", "noopener,noreferrer");
    }

    setTimeout(() => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    }, 60_000);
  };

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = fileExt(file.name) || "bin";
        const displayName = `${safeDisplayNameFromFilename(file.name)}.${ext}`;

        const runCreate = () =>
          supabase.functions.invoke("case-create-document-upload", {
            body: { case_id: caseId, file_ext: ext, mime_type: file.type || null },
          });

        let { data, error } = await runCreate();
        if (error && isUnauthorizedError(error)) {
          const ok = await handleUnauthorized();
          if (ok) ({ data, error } = await runCreate());
        }
        if (error) throw error;
        if (!(data as any)?.ok) throw new Error((data as any)?.error || "Kunde inte initiera uppladdning");

        const path = (data as any).path as string;
        const token = (data as any).token as string;

        const { error: upErr } = await supabase.storage.from("case-documents").uploadToSignedUrl(path, token, file);
        if (upErr && isUnauthorizedError(upErr)) {
          const ok = await handleUnauthorized();
          if (ok) {
            const { error: upErr2 } = await supabase.storage
              .from("case-documents")
              .uploadToSignedUrl(path, token, file);
            if (upErr2) throw upErr2;
          } else {
            throw upErr;
          }
        } else if (upErr) {
          throw upErr;
        }

        const runAttach = () =>
          supabase.functions.invoke("case-attach-document", {
            body: { case_id: caseId, path, display_name: displayName, mime_type: file.type || null },
          });

        let { data: attachData, error: attachErr } = await runAttach();
        if (attachErr && isUnauthorizedError(attachErr)) {
          const ok = await handleUnauthorized();
          if (ok) ({ data: attachData, error: attachErr } = await runAttach());
        }
        if (attachErr) throw attachErr;
        if ((attachData as any)?.ok !== true) throw new Error((attachData as any)?.error || "Kunde inte spara dokument");
      }

      toast({ title: "Uppladdat", description: "Dokumentet är uppladdat." });
      await onRefresh();
    } catch (err: any) {
      toast({ title: "Kunde inte ladda upp", description: err?.message || "Något gick fel", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const softDelete = async (path: string) => {
    const ok = window.confirm("Ta bort dokumentet? Det kommer inte att visas längre.");
    if (!ok) return;

    try {
      const run = () =>
        supabase.functions.invoke("case-soft-delete-document", {
          body: { case_id: caseId, path },
        });

      let { data, error } = await run();
      if (error && isUnauthorizedError(error)) {
        const ok = await handleUnauthorized();
        if (ok) ({ data, error } = await run());
      }
      if (error) throw error;
      if ((data as any)?.ok !== true) throw new Error((data as any)?.error || "Kunde inte ta bort");

      toast({ title: "Borttaget", description: "Dokumentet är markerat som borttaget." });
      await onRefresh();
    } catch (err: any) {
      toast({ title: "Kunde inte ta bort", description: err?.message || "Något gick fel", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">Dokument</div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowDeleted((v) => !v)}>
          {showDeleted ? "Dölj borttagna" : "Visa borttagna"}
        </Button>
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
            const label = doc.display_name || doc.path.split("/").pop() || doc.path;
            const deleted = !!doc.deleted_at;
            const roleLabel = doc.uploaded_by_role === "admin" ? "Admin" : doc.uploaded_by_role === "customer" ? "Kund" : null;
            const when = doc.uploaded_at ? new Date(doc.uploaded_at) : null;
            return (
              <div key={doc.path} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <button
                  type="button"
                  className="text-trust-blue underline hover:opacity-70 disabled:opacity-50"
                  disabled={deleted}
                  onClick={() => openFile(doc.path)}
                >
                  {label}
                </button>
                <div className="flex items-center gap-2">
                  {(roleLabel || when) && (
                    <div className="hidden sm:block text-xs text-muted-foreground">
                      {roleLabel ? roleLabel : ""}
                      {roleLabel && when ? " · " : ""}
                      {when ? when.toLocaleString() : ""}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">{fileExt(doc.path).toUpperCase()}</div>
                  {!deleted ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => softDelete(doc.path)}>
                      Ta bort
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground">Borttaget</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
