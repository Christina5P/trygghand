import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Comment as CaseComment } from "@/types";

function bubbleClass(kind: "mine" | "other") {
  if (kind === "mine") return "bg-trust-blue text-white ml-auto";
  return "bg-muted text-foreground";
}

function roleLabel(authorType: string | null | undefined) {
  return authorType === "admin" ? "Admin" : "Kund";
}

export function CaseCommentsThread({
  caseId,
  currentUserId,
  isAdmin,
  comments,
  onRefresh,
  canComment,
}: {
  caseId: string;
  currentUserId: string | null | undefined;
  isAdmin: boolean;
  comments: CaseComment[];
  onRefresh: () => Promise<void>;
  canComment: boolean;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const normalized = useMemo(() => {
    return comments
      .filter((c) => !(c as any)?.deleted_at)
      .map((c) => {
        const mine = !!currentUserId && c.author_id === currentUserId;
        return {
          ...c,
          mine,
        };
      });
  }, [comments, currentUserId]);

  const lastReadAtMs = useMemo(() => {
    if (!isAdmin || !currentUserId) return 0;
    try {
      const key = `adminPortal:lastReadAt:${currentUserId}:${caseId}`;
      const value = window.localStorage.getItem(key);
      const parsed = value ? Date.parse(value) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }, [caseId, currentUserId, isAdmin]);

  const send = async () => {
    if (!canComment) return;
    const message = text.trim();
    if (!message) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("add-case-comment", {
        body: { case_id: caseId, message },
      });
      if (error) throw error;
      if ((data as any)?.ok !== true) throw new Error((data as any)?.error || "Kunde inte skicka");
      setText("");
      await onRefresh();
    } catch (err: any) {
      toast({ title: "Kunde inte skicka", description: err?.message || "Något gick fel", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const canDelete = (c: { mine: boolean }) => {
    if (isAdmin) return true;
    return c.mine;
  };

  const softDelete = async (commentId: string) => {
    const ok = window.confirm("Ta bort kommentaren? Den kommer inte att visas längre.");
    if (!ok) return;

    setDeletingId(commentId);
    try {
      const { data, error } = await supabase.functions.invoke("case-soft-delete-comment", {
        body: { comment_id: commentId },
      });
      if (error) throw error;
      if ((data as any)?.ok !== true) throw new Error((data as any)?.error || "Kunde inte ta bort");
      await onRefresh();
    } catch (err: any) {
      toast({ title: "Kunde inte ta bort", description: err?.message || "Något gick fel", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="font-medium">Kommentarer</div>

      <div className="max-h-72 overflow-y-auto rounded border p-3 space-y-3 bg-muted/30">
        {normalized.length === 0 ? (
          <div className="text-sm text-muted-foreground">Inga kommentarer ännu.</div>
        ) : (
          normalized.map((c) => (
            <div key={c.id} className="flex flex-col gap-1">
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${bubbleClass(c.mine ? "mine" : "other")}`}>
                <div className="flex items-center justify-between gap-2 text-xs opacity-90 mb-1">
                  <div>
                    {roleLabel(c.author_type)}
                    <span className="opacity-70"> · </span>
                    <span className="opacity-70">{c.created_at ? format(new Date(c.created_at), "yyyy-MM-dd HH:mm") : ""}</span>
                    {isAdmin && c.author_type === "customer" && (
                      <span className="ml-2 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium opacity-100">
                        {c.created_at && Date.parse(c.created_at) > lastReadAtMs ? "Oläst" : "Läst"}
                      </span>
                    )}
                  </div>

                  {canDelete(c) && (
                    <Button
                      type="button"
                      size="sm"
                      variant={c.mine ? "secondary" : "outline"}
                      className="h-6 px-2 text-xs"
                      disabled={!!deletingId}
                      onClick={() => softDelete(c.id)}
                    >
                      {deletingId === c.id ? "Tar bort…" : "Ta bort"}
                    </Button>
                  )}
                </div>

                <div className="whitespace-pre-wrap">{c.content ?? ""}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {canComment ? (
        <div className="flex items-start gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Skriv en kommentar..."
            className="min-h-[80px]"
            maxLength={2000}
          />
          <Button type="button" onClick={send} disabled={sending || !text.trim()}>
            Skicka
          </Button>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Du kan inte kommentera i detta ärende.</div>
      )}
    </div>
  );
}
