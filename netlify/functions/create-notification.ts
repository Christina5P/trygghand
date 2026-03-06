// netlify/functions/create-notification.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Skapa notis vid nytt meddelande eller statusändring (ärende/uppsägning)
 * Exempel-payload:
 * {
 *   type: 'case_message' | 'case_status' | 'cancellation_message' | 'cancellation_status',
 *   ref_id: string, // ärende- eller uppsägnings-id
 *   ref_type: 'case' | 'cancellation',
 *   actor_id: string, // den som utför händelsen
 *   recipient_id: string, // motparten
 *   payload?: object // teknisk metadata, valfri
 * }
 */
export async function handler(event: any) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const { type, ref_id, ref_type, actor_id, recipient_id, payload } = JSON.parse(event.body);
  if (!type || !ref_id || !ref_type || !actor_id || !recipient_id) {
    return { statusCode: 400, body: 'Missing required fields' };
  }
  if (actor_id === recipient_id) {
    return { statusCode: 204, body: '' };
  }

  // Archive old status notifications for same recipient + ref_id + type
  // by marking them as read (prevents notification spam)
  if (type === 'case_status' || type === 'cancellation_status') {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', recipient_id)
      .eq('ref_id', ref_id)
      .eq('ref_type', ref_type)
      .eq('type', type)
      .is('read_at', null);
  }

  const { error } = await supabase
    .from('notifications')
    .insert([{
      user_id: recipient_id,
      type,
      ref_id,
      ref_type,
      actor_id,
      payload: payload || null
    }]);
  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
  return { statusCode: 200, body: 'ok' };
}
