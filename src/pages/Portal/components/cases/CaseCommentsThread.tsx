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
function roleLabel(
  authorType: string | null | undefined,
  authorId: string | null | undefined,
  currentUserId: string | null | undefined,
  isAdmin: boolean
) {
  if (authorType === "admin") return "Admin";
  if (authorType === "customer") return "Kund";

  if (authorId && currentUserId) {
    if (authorId === currentUserId) return isAdmin ? "Admin" : "Kund";
    return isAdmin ? "Kund" : "Admin";
  }

  return "Admin";
}

export function CaseCommentsThread({
  caseId,
  currentUserId,
  isAdmin,
  comments,
  onRefresh,
  canComment,
  caseCustomerId,
  otherPartyLastReadAt,
}: {
  caseId: string;
  currentUserId: string | null | undefined;
  isAdmin: boolean;
  comments: CaseComment[];
  onRefresh: () => Promise<void>;
  canComment: boolean;
  caseCustomerId?: string | null;
  otherPartyLastReadAt?: string | null;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const normalized = useMemo(() => {
    return comments
      .filter((c) => !(c as any)?.deleted_at)
      .map((c) => ({
        ...c,
        mine: !!currentUserId && c.author_id === currentUserId,
      }));
  }, [comments, currentUserId]);

  const otherPartyLastReadMs = useMemo(() => {
    const parsed = otherPartyLastReadAt ? Date.parse(otherPartyLastReadAt) : NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  }, [otherPartyLastReadAt]);

  const send = async () => {
  if (!canComment) return;
  const message = text.trim();
  if (!message) return;

  setSending(true);
  try {
    const fn = isAdmin ? "admin-add-case-comment" : "add-case-comment";

    const { data, error } = await supabase.functions.invoke(fn, {
      body: { case_id: caseId, message },
    });

    if (error) throw error;
    if ((data as any)?.ok !== true) {
      throw new Error((data as any)?.error || "Kunde inte skicka");
    }

    setText("");
    await onRefresh();
  } catch (err: any) {
    toast({
      title: "Kunde inte skicka",
      description: err?.message || "Något gick fel",
      variant: "destructive",
    });
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
                  
                    <span className="opacity-70"> · </span>
                    <span className="opacity-70">{c.created_at ? format(new Date(c.created_at), "yyyy-MM-dd HH:mm") : ""}</span>
                    {c.mine && (
                      <span className="ml-2 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium opacity-100">
                        {(() => {
                          const messageMs = c.created_at ? Date.parse(c.created_at) : NaN;
                          const statusText = !Number.isFinite(messageMs) ? "Skickat" : messageMs <= otherPartyLastReadMs ? "Läst" : "Skickat";
                          return statusText;
                        })()}
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
