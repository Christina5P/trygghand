// Importera Supabase-klienten som har administratörsbehörighet
import { createClient } from '@supabase/supabase-js';

// Skapa Supabase-klienten med Service Role Key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { caseId, newComment, authorId } = req.body;

  if (!caseId || !newComment || !authorId) {
    res.status(400).json({ message: 'Missing required fields' });
    return;
  }

  try {
    const { data, error } = await supabase.from('case_comments').insert({
      case_id: caseId,
      content: newComment,
      author_id: authorId,
      author_type: 'admin', // Eftersom detta är admin-panelen
    }).maybeSingle();

    if (error) {
      console.error('Supabase insert error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ data });
  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).json({ error: 'Failed to save comment' });
  }
}