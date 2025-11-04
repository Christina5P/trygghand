import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Input } from "../components/ui/input";
import { supabase } from '../lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/useAuth";

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
  id: number;
  content: string;
  created_at: string;
  author_id: string;
  author_type: 'admin' | 'customer';
  case_id: string;
}

interface EditCaseDialogProps {
  caseId: string;
  onClose: () => void;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Öppen':
      return 'secondary';
    case 'Pågående':
    case 'in_progress':
      return 'default';
    case 'Avslutad':
    case 'completed':
      return 'outline';
    case 'Avbruten':
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const EditCaseDialog: React.FC<EditCaseDialogProps> = ({ caseId, onClose }) => {
  const { customer, loading } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const fetchCase = async () => {
    if (!caseId) return;
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single();
      if (error) {
        console.error('Error fetching case:', error);
      } else {
        setCaseData(data);
      }
    } catch (error) {
      console.error('Error fetching case:', error);
    }
  };

  const fetchComments = async () => {
    if (!caseId) return;
    try {
      const { data, error } = await supabase
        .from('case_comments')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Error fetching comments:', error);
      } else {
        setComments(data || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSaving || !caseId || !customer?.id) {
      toast({ title: "Fel", description: "Du måste vara inloggad för att skicka en kommentar.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const { data, error } = await supabase.from('case_comments').insert([
        {
          case_id: caseId,
          content: newComment,
          author_id: customer.id,
          author_type: customer.is_admin ? 'admin' : 'customer',
        }
      ]).select().single();
      if (error) throw error;
      setNewComment('');
      setComments((prev) => [...prev, data]);
      toast({ title: "Kommentar sparad", description: "Kommentaren har lagts till i ärendet." });
      if (commentsEndRef.current) {
        commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error saving comment:', error);
      toast({ title: "Fel", description: "Kunde inte spara kommentar.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
console.log('Customer ID:', customer?.id);
  useEffect(() => {
    if (loading === false) {
      const fetchData = async () => {
        await fetchCase();
        await fetchComments();
      };

      fetchData();
      
      const channel = supabase
        .channel(`case_comments:${caseId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'case_comments', filter: `case_id=eq.${caseId}` },
          (payload) => {
            const newComment = payload.new as Comment;
            setComments((prevComments) => [...prevComments, newComment]);
            if (commentsEndRef.current) {
              commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [caseId, loading]);

  if (loading) {
    return <div>Laddar...</div>;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ärendehantering</DialogTitle>
          {caseData && (
            <div className="text-lg font-bold">
              {caseData.title}
              <Badge variant={getStatusVariant(caseData.status)} className="ml-2">
                {caseData.status}
              </Badge>
            </div>
          )}
        </DialogHeader>
        <div className="mt-4 max-h-[400px] overflow-y-auto rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">Kommentarer</h3>
          <div className="flex flex-col space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-lg p-3 ${
                  comment.author_type === 'admin' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {comment.author_type === 'admin' ? 'Du' : `Kund (${comment.author_id})`}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(comment.created_at).toLocaleString('sv-SE')}
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
            {isSaving ? 'Sparar...' : 'Skicka kommentar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCaseDialog;