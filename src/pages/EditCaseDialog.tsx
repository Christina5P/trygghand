import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface Case {
  id: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  scheduled_date?: string | null;
  address?: string | null;
  total_price?: number | null;
  notes?: string | null;
  customer_id?: string;
  service_type_id?: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author_type: "admin" | "customer";
  case_id: string;
  author_name?: string;
}

interface EditCaseDialogProps {
  caseId: string;
  onClose: () => void;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "pending":
      return "secondary";
    case "in_progress":
      return "default";
    case "completed":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
};

const EditCaseDialog: React.FC<EditCaseDialogProps> = ({ caseId, onClose }) => {
  const { customer, loading } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // === FETCH CASE ===
  const fetchCase = async () => {
    if (!caseId) return;
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();
    if (error) console.error("Error fetching case:", error);
    else setCaseData(data);
  };

  // === FETCH COMMENTS + JOIN CUSTOMER NAME ===
  const fetchComments = async () => {
    if (!caseId) return;
    const { data, error } = await supabase
      .from("case_comments")
      .select("*, customers:author_id ( name )")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    // Map comments with author_name
    const enriched = data.map((c: any) => ({
      ...c,
      author_name:
        c.author_type === "admin"
          ? "Admin"
          : c.customers?.name || "Okänd kund",
    }));

    setComments(enriched);
  };

  // === SAVE COMMENT ===
  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSaving || !caseId || !customer?.id) {
      toast({
        title: "Fel",
        description: "Du måste vara inloggad för att skicka en kommentar.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);

    const { data, error } = await supabase
      .from("case_comments")
      .insert([
        {
          case_id: caseId,
          content: newComment,
          author_id: customer.id,
          author_type: customer.is_admin ? "admin" : "customer",
        },
      ])
      .select("*, customers:author_id ( name )")
      .single();

    if (error) {
      console.error("Error saving comment:", error);
      toast({
        title: "Fel",
        description: "Kunde inte spara kommentar.",
        variant: "destructive",
      });
    } else {
      const enriched = {
        ...data,
        author_name:
          data.author_type === "admin"
            ? "Admin"
            : data.customers?.name || "Okänd kund",
      };
      setComments((prev) => [...prev, enriched]);
      setNewComment("");
      toast({
        title: "Kommentar sparad",
        description: "Kommentaren har lagts till i ärendet.",
      });
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    setIsSaving(false);
  };

  // === UPDATE CASE STATUS / FIELDS ===
  const handleUpdateCase = async (updates: Partial<Case>) => {
    if (!caseId) return;
    const { error } = await supabase
      .from("cases")
      .update(updates)
      .eq("id", caseId);
    if (error) {
      console.error("Update error:", error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera ärendet.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Uppdaterat", description: "Ärendet uppdaterades." });
      fetchCase();
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchCase();
      fetchComments();

      const channel = supabase
        .channel(`case_comments:${caseId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "case_comments",
            filter: `case_id=eq.${caseId}`,
          },
          (payload) => {
            const newComment = payload.new as Comment;
            setComments((prev) => [...prev, newComment]);
            commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [caseId, loading]);

  if (loading) return <div>Laddar...</div>;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ärendehantering</DialogTitle>
          {caseData && (
            <div className="text-lg font-bold flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {caseData.title}
                <Badge variant={getStatusVariant(caseData.status)}>
                  {caseData.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label>Status:</Label>
                <Select
                  value={caseData.status}
                  onValueChange={(val) => handleUpdateCase({ status: val })}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                 <SelectContent className="z-[9999]">
                <SelectItem value="pending">Väntar</SelectItem>
                <SelectItem value="in_progress">Pågår</SelectItem>
                <SelectItem value="completed">Klar</SelectItem>
                <SelectItem value="cancelled">Avbruten</SelectItem>
                </SelectContent>

                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Anteckningar</Label>

                <Textarea
                  value={caseData.notes ?? ""}
                  onChange={(e) =>
                    setCaseData({ ...caseData, notes: e.target.value })
                  }
                  onBlur={() => handleUpdateCase({ notes: caseData.notes })}
                />
              </div>
              <div>
                <Label>Pris</Label>
                <Input
                  type="number"
                  value={caseData.total_price ?? ""}
                  onChange={(e) =>
                    setCaseData({
                      ...caseData,
                      total_price: parseFloat(e.target.value) || null,
                    })
                  }
                  onBlur={() =>
                    handleUpdateCase({ total_price: caseData.total_price })
                  }
                />
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="mt-4 max-h-[400px] overflow-y-auto rounded-lg border p-4 bg-gray-50">
          <h3 className="mb-2 font-semibold">Kommentarer</h3>
          <div className="flex flex-col space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-lg p-3 ${
                  comment.author_type === "admin"
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "bg-gray-100 dark:bg-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {comment.author_type === "admin"
                      ? "Du (Admin)"
                      : comment.author_name || "Okänd kund"}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(comment.created_at).toLocaleString("sv-SE")}
                  </span>
                </div>
                <p className="mt-1">{comment.content}</p>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        </div>

        <form onSubmit={handleSaveComment}>
          <div className="grid gap-2">
            <Label htmlFor="newComment">Ny kommentar</Label>
            <Textarea
              id="newComment"
              placeholder="Skriv din kommentar här..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
          </div>
          <Button type="submit" className="mt-4" disabled={isSaving}>
            {isSaving ? "Sparar..." : "Skicka kommentar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCaseDialog;
