import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export type NotifType =
  | 'medicine_taken'
  | 'medicine_added'
  | 'medicine_updated'
  | 'medicine_deleted'
  | 'health_record_uploaded'
  | 'check_in_done'
  | 'care_event_added'
  | 'voice_message'
  | 'sos_triggered'
  | 'doctor_added'
  | 'doctor_updated'
  | 'doctor_deleted'
  | 'profile_updated'
  | 'guardian_connected'
  // ── Health-log types ─────────────────────────────────────────
  | 'medicine_missed'
  | 'health_log_bp'
  | 'health_log_sugar'
  | 'health_log_mood'
  | 'health_log_sleep'
  | 'health_log_exercise'
  | 'health_log_symptom'
  | 'health_log_emergency'
  | 'health_log_water'
  | 'health_log_checkin'
  | 'health_log_doctor'
  | 'health_log_voice'
  | 'health_log_meal'
  | 'health_log';

async function insert(
  recipientId: string,
  senderId: string,
  type: NotifType,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id:   recipientId,
      sender_id: senderId,
      type,
      title,
      body,
      data,
    });
    if (error) console.warn('[notifications]', error.message);
  } catch (e) {
    console.warn('[notifications]', e);
  }
}

/** Notify every guardian connected to an elder. */
export async function notifyGuardiansOf(
  elderId: string,
  senderId: string,
  type: NotifType,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: links } = await supabase
      .from('guardian_elder_links')
      .select('guardian_id')
      .eq('elder_id', elderId)
      .eq('status', 'connected');
    if (!links || links.length === 0) return;
    await Promise.all(
      links.map((l: any) => insert(l.guardian_id, senderId, type, title, body, data)),
    );
  } catch (e) {
    console.warn('[notifications]', e);
  }
}

/** Notify a specific elder. */
export function notifyElderOf(
  elderId: string,
  senderId: string,
  type: NotifType,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  return insert(elderId, senderId, type, title, body, data);
}

/** React hook — live unread notification count for the current user. */
export function useUnreadNotifCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { count: c } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      setCount(c ?? 0);
    };

    void load();

    const ch = supabase
      .channel(`notif-badge-${userId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => void load(),
      )
      .subscribe();

    return () => { void supabase.removeChannel(ch); };
  }, [userId]);

  return count;
}
