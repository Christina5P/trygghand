import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { CancellationComment } from "@/types";

function bubbleClass(isMine: boolean) {
  return isMine
    ? "bg-blue-600 text-white ml-auto"
    : "bg-muted text-foreground";
}

export function CancellationCommentsThread({
  cancellationId,
  customerId,
  currentUserId,
  isAdmin,
  comments,
  onRefresh,
  canComment,
}: {
  cancellationId: string;
  customerId: string;
  currentUserId: string | null | undefined;
  isAdmin: boolean;
  comments: CancellationComment[];
  onRefresh: () => Promise<void>;
  canComment: boolean;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const normalized = useMemo(() => {
    return comments.map((c) => {
      const isCustomer = c.user_id === customerId;
      return {
        ...c,
        role: isCustomer ? ("customer" as const) : ("admin" as const),
        isMine: !!currentUserId && c.user_id === currentUserId,
        isDeleted: !!c.deleted_at,
      };
    });
  }, [comments, customerId, currentUserId]);

  const send = async () => {
    if (!canComment) return;
    const message = text.trim();
    if (!message) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("add-cancellation-comment", {
        body: { cancellation_id: cancellationId, message },
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

  const canDelete = (c: { isMine: boolean; role: "admin" | "customer"; isDeleted: boolean }) => {
    if (c.isDeleted) return false;
    if (isAdmin) return true;
    return c.isMine;
  };

  const softDelete = async (commentId: string) => {
    if (!commentId) return;
    const ok = window.confirm("Ta bort kommentaren? Den kommer inte att visas längre.");
    if (!ok) return;

    setDeletingId(commentId);
    try {
      const { data, error } = await supabase.functions.invoke("cancellation-soft-delete-comment", {
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
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${bubbleClass(c.isMine)}`}>
                <div className="flex items-center justify-between gap-2 text-xs opacity-90 mb-1">
                  <div>
                    {c.role === "admin" ? "Admin" : "Kund"}
                    <span className="opacity-70"> · </span>
                    <span className="opacity-70">{c.created_at ? format(new Date(c.created_at), "yyyy-MM-dd HH:mm") : ""}</span>
                  </div>

                  {canDelete(c) && (
                    <Button
                      type="button"
                      size="sm"
                      variant={c.isMine ? "secondary" : "outline"}
                      className="h-6 px-2 text-xs"
                      disabled={!!deletingId}
                      onClick={() => softDelete(c.id)}
                    >
                      {deletingId === c.id ? "Tar bort…" : "Ta bort"}
                    </Button>
                  )}
                </div>
                {c.isDeleted ? (
                  <div className="whitespace-pre-wrap italic opacity-80">Kommentar borttagen</div>
                ) : (
                  <div className="whitespace-pre-wrap">{c.message}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {canComment && (
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
      )}

      {!canComment && <div className="text-sm text-muted-foreground">Du kan inte kommentera i detta ärende.</div>}
    </div>
  );
}
