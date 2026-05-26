/**
 * Shared real-time sync utilities.
 * Each hook/function subscribes to Supabase postgres_changes for a given
 * table + user filter, and calls the provided `onUpdate` callback on any change.
 */
import { useEffect, useId, useRef } from 'react';
import { supabase } from '../utils/supabase';

type TableName =
  | 'medicines' | 'medicine_logs'
  | 'family_messages'
  | 'daily_check_ins' | 'moods'
  | 'journal_entries'
  | 'care_events'
  | 'guardian_elder_links'
  | 'guardian_check_in_shares'
  | 'profiles'
  | 'elder_locations';

/**
 * Subscribe to all INSERT / UPDATE / DELETE events on a Supabase table
 * filtered by `user_id = userId`. Calls `onUpdate` on every change.
 * Automatically unsubscribes when the component unmounts.
 */
export function useRealtimeTable(
  table: TableName,
  userId: string | undefined,
  onUpdate: () => void,
  enabled = true,
) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;
  const id = useId();

  useEffect(() => {
    if (!userId || !enabled) return;
    const channel = supabase
      .channel(`rt-${table}-${userId}-${id}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        () => cbRef.current(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [table, userId, enabled]);
}

/**
 * Subscribe to changes on a column OTHER than user_id.
 * E.g. family_messages where receiver_id = userId.
 */
export function useRealtimeColumn(
  table: TableName,
  column: string,
  value: string | undefined,
  onUpdate: () => void,
  enabled = true,
) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;
  const id = useId();

  useEffect(() => {
    if (!value || !enabled) return;
    const channel = supabase
      .channel(`rt-${table}-${column}-${value}-${id}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table, filter: `${column}=eq.${value}` },
        () => cbRef.current(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [table, column, value, enabled]);
}

/**
 * Subscribe to broadcast events on a named channel.
 * Used for instant signals (e.g. guardian → elder, elder → guardian).
 */
export function useRealtimeBroadcast(
  channelName: string,
  events: string[],
  onUpdate: () => void,
  enabled = true,
) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;
  const id = useId();

  useEffect(() => {
    if (!channelName || !enabled) return;
    let ch = supabase.channel(`${channelName}-${id}`);
    events.forEach((event) => {
      ch = ch.on('broadcast', { event }, () => cbRef.current());
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelName, enabled]);
}

/**
 * Guardian: subscribe to all elders' data changes in one channel group.
 * Calls onUpdate when any elder's medicine/log/checkin/location changes.
 */
export function useGuardianElderSync(
  elderIds: string[],
  tables: TableName[],
  onUpdate: () => void,
) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;
  const id = useId();

  useEffect(() => {
    if (elderIds.length === 0) return;
    const channels = elderIds.flatMap((elderId) =>
      tables.map((table) =>
        supabase
          .channel(`guardian-${table}-${elderId}-${id}`)
          .on(
            'postgres_changes' as any,
            { event: '*', schema: 'public', table, filter: `user_id=eq.${elderId}` },
            () => cbRef.current(),
          )
          .subscribe()
      )
    );
    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [JSON.stringify(elderIds), JSON.stringify(tables)]);
}

/**
 * Guardian: subscribe to guardian_check_in_shares filtered by elder_id
 * (NOT user_id — this table uses elder_id as the FK column).
 */
export function useGuardianCheckInSync(
  elderIds: string[],
  onUpdate: () => void,
) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;
  const id = useId();

  useEffect(() => {
    if (elderIds.length === 0) return;
    const channels = elderIds.map((elderId) =>
      supabase
        .channel(`guardian-checkin-${elderId}-${id}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*', schema: 'public',
            table: 'guardian_check_in_shares',
            filter: `elder_id=eq.${elderId}`,
          },
          () => cbRef.current(),
        )
        .subscribe()
    );
    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [JSON.stringify(elderIds)]);
}

/**
 * Guardian: subscribe to broadcast events emitted by elder screens.
 * Mirrors what GuardianHomeScreen does manually. Use in any guardian
 * screen that needs instant push when elder takes medicine or checks in.
 */
export function useElderBroadcastSync(
  elderIds: string[],
  events: ('medicine-update' | 'checkin-update')[],
  onUpdate: () => void,
) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;
  const id = useId();

  useEffect(() => {
    if (elderIds.length === 0) return;
    const channels = elderIds.map((elderId) => {
      let ch = supabase.channel(`elder-${elderId}-${id}`);
      events.forEach((ev) => {
        ch = ch.on('broadcast', { event: ev }, () => cbRef.current());
      });
      return ch.subscribe();
    });
    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [JSON.stringify(elderIds), JSON.stringify(events)]);
}

/**
 * Broadcast a signal on a named channel.
 * Fire-and-forget; automatically tears down the channel after sending.
 */
export function broadcastSignal(channelName: string, event: string): void {
  try {
    const ch = supabase.channel(channelName);
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
  } catch {}
}
