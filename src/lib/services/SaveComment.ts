// /src/services/caseCommentService.ts
import { supabase } from "@/lib/supabase"; // Din standardklient

interface CommentPayload {
  caseId: string;
  content: string;
  authorId: string;
}

/**
 * endast en serverfil fölr kommentarerna.
 * Sparar en kommentar i databasen för ett specifikt ärende (case).
 * Förlitar sig på RLS (Row Level Security) för behörighet.
 */
export async function saveCaseComment({ caseId, content, authorId }: CommentPayload) {
  if (!caseId || !content || !authorId) {
    throw new Error('Missing required fields for comment.');
  }

  // OBS: Error hantering hanteras av den anropande komponenten
  const { data, error } = await supabase
    .from('case_comments')
    .insert({
      case_id: caseId,
      content: content,
      author_id: authorId,
      author_type: 'admin',
    })
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}