import Constants from 'expo-constants';
import { supabase } from '../utils/supabase';

// expo-notifications is required lazily inside each function so that importing
// this module in Expo Go (which removed remote push support in SDK 53) does not
// crash the entire module and break all screens that depend on it.

async function getNotifications() {
  if (Constants.executionEnvironment === 'storeClient') return null;
  try {
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

export async function registerPushToken(userId: string): Promise<void> {
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const existingPerms = await Notifications.getPermissionsAsync() as any;
    const existing: string = existingPerms.status ?? 'denied';
    const finalPerms: any = existing === 'granted'
      ? existingPerms
      : await Notifications.requestPermissionsAsync();
    const status: string = finalPerms.status ?? 'denied';

    if (status !== 'granted') return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  } catch {
    // Non-critical — app works without push tokens
  }
}

async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data, sound: 'default' }),
    });
  } catch {
    // Ignore — non-critical
  }
}

// Notify all guardians connected to an elder
export async function notifyGuardians(
  elderId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: links } = await supabase
      .from('guardian_elder_links')
      .select('guardian_id')
      .eq('elder_id', elderId)
      .eq('status', 'connected');

    if (!links || links.length === 0) return;

    const guardianIds = links.map((l: any) => l.guardian_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('push_token')
      .in('id', guardianIds)
      .not('push_token', 'is', null);

    await Promise.all(
      (profiles ?? []).map((p: any) =>
        p.push_token ? sendPush(p.push_token, title, body, data) : Promise.resolve()
      )
    );
  } catch {
    // Non-critical
  }
}

// Broadcast a realtime event from elder to all subscribed guardian screens.
// Subscribes to the channel first (required by Supabase before calling send),
// sends the event, then tears down the channel.
export function broadcastElderUpdate(
  elderId: string,
  event: 'medicine-update' | 'checkin-update',
): void {
  try {
    const ch = supabase.channel(`elder-${elderId}`);
    let sent = false;
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED' && !sent) {
        sent = true;
        ch.send({ type: 'broadcast', event, payload: {} }).finally(() => {
          supabase.removeChannel(ch);
        });
      }
    });
    setTimeout(() => supabase.removeChannel(ch), 5000);
  } catch {
    // Non-critical
  }
}

// Broadcast from guardian to elder's screen (e.g. guardian added/edited/deleted a medicine).
export function broadcastGuardianUpdate(
  elderId: string,
  event: 'medicine-update' | 'medicine-delete' | 'medicine-add',
): void {
  try {
    const ch = supabase.channel(`guardian-${elderId}`);
    let sent = false;
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED' && !sent) {
        sent = true;
        ch.send({ type: 'broadcast', event, payload: {} }).finally(() => {
          supabase.removeChannel(ch);
        });
      }
    });
    setTimeout(() => supabase.removeChannel(ch), 5000);
  } catch {
    // Non-critical
  }
}

// Notify a specific elder (e.g. when guardian sends a voice message)
export async function notifyElder(
  elderId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', elderId)
      .maybeSingle();

    if (prof?.push_token) {
      await sendPush(prof.push_token, title, body, data);
    }
  } catch {
    // Non-critical
  }
}
