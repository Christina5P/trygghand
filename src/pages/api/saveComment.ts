// Importera Supabase-klienten som har administratörsbehörighet
import { createClient } from '@supabase/supabase-js';

// Skapa Supabase-klienten med Service Role Key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

/**
 * Save a comment for a case using Supabase service role key.
 * Call this from server-side code only.
 */
export async function saveComment(caseId: string, newComment: string, authorId: string) {
  if (!caseId || !newComment || !authorId) {
    throw new Error('Missing required fields');
  }

  const { data, error } = await supabase.from('case_comments').insert({
    case_id: caseId,
    content: newComment,
    author_id: authorId,
    author_type: 'admin',
  }).maybeSingle();

  if (error) {
    console.error('Supabase insert error:', error);
    throw error;
  }

  return data;
}

// If you still need an HTTP endpoint, either:
// - run a real server (Express/Fastify) that calls saveComment, or
// - migrate the project to Next.js and restore NextApiRequest/NextApiResponse imports.