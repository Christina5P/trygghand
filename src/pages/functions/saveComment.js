import { createClient } from '@supabase/supabase-js';
import nodeFetch from 'node-fetch';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Använder service_role_key för att skapa en klient med högsta behörighet
const supabaseServiceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  global: { fetch: nodeFetch }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { caseId, newComment, authorId } = req.body;

  if (!caseId || !newComment || !authorId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabaseServiceRoleClient
      .from('case_comments')
      .insert({
        case_id: caseId,
        content: newComment,
        author_type: 'admin',
        author_id: authorId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving comment from function:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.status(200).json({ data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}