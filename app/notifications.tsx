import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  data: Record<string, unknown>;
};

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  medicine_taken:         { icon: 'checkmark-circle',  color: '#16A34A', bg: '#DCFCE7' },
  medicine_added:         { icon: 'add-circle',        color: '#2563EB', bg: '#DBEAFE' },
  medicine_updated:       { icon: 'create',            color: '#D97706', bg: '#FEF3C7' },
  medicine_deleted:       { icon: 'trash',             color: '#DC2626', bg: '#FEE2E2' },
  health_record_uploaded: { icon: 'folder-open',       color: '#7C3AED', bg: '#EDE9FE' },
  check_in_done:          { icon: 'clipboard',         color: '#0891B2', bg: '#CFFAFE' },
  care_event_added:       { icon: 'calendar',          color: '#F59E0B', bg: '#FEF3C7' },
  voice_message:          { icon: 'mic',               color: '#DB2777', bg: '#FCE7F3' },
  sos_triggered:          { icon: 'warning',           color: '#DC2626', bg: '#FEE2E2' },
  doctor_added:           { icon: 'medkit',            color: '#0891B2', bg: '#CFFAFE' },
  doctor_updated:         { icon: 'medkit-outline',    color: '#D97706', bg: '#FEF3C7' },
  doctor_deleted:         { icon: 'trash-outline',     color: '#DC2626', bg: '#FEE2E2' },
  profile_updated:        { icon: 'person',            color: '#7C3AED', bg: '#EDE9FE' },
  guardian_connected:     { icon: 'shield-checkmark',  color: '#16A34A', bg: '#DCFCE7' },
  // ── Health-log types ──────────────────────────────────────────────────────
  medicine_missed:        { icon: 'close-circle',      color: '#DC2626', bg: '#FEE2E2' },
  health_log_bp:          { icon: 'heart',             color: '#EF4444', bg: '#FEE2E2' },
  health_log_sugar:       { icon: 'flask',             color: '#F97316', bg: '#FFF7ED' },
  health_log_mood:        { icon: 'happy',             color: '#A78BFA', bg: '#F3E8FF' },
  health_log_sleep:       { icon: 'moon',              color: '#6D28D9', bg: '#EDE9FE' },
  health_log_exercise:    { icon: 'walk',              color: '#10B981', bg: '#D1FAE5' },
  health_log_symptom:     { icon: 'alert-circle',      color: '#F59E0B', bg: '#FEF3C7' },
  health_log_emergency:   { icon: 'warning',           color: '#fff',    bg: '#DC2626' },
  health_log_water:       { icon: 'water',             color: '#3B82F6', bg: '#DBEAFE' },
  health_log_checkin:     { icon: 'star',              color: '#F59E0B', bg: '#FEF9C3' },
  health_log_doctor:      { icon: 'person-circle',     color: '#0EA5E9', bg: '#E0F2FE' },
  health_log_voice:       { icon: 'mic-circle',        color: '#D97706', bg: '#FEF3C7' },
  health_log_meal:        { icon: 'restaurant',        color: '#F59E0B', bg: '#FFF7ED' },
  health_log:             { icon: 'fitness',           color: '#64748B', bg: '#F1F5F9' },
};

const DEFAULT_META = { icon: 'notifications' as const, color: '#64748B', bg: '#F1F5F9' };

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const t = new Date();
  return (
    d.getDate()     === t.getDate()     &&
    d.getMonth()    === t.getMonth()    &&
    d.getFullYear() === t.getFullYear()
  );
}

export default function NotificationsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();

  const [notifs,  setNotifs]  = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60);
      if (!error && data) setNotifs(data as Notif[]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`notif-screen-${user.id}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user?.id]);

  const markRead = async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  };

  const deleteNotif = async (id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Remove all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          setNotifs([]);
          await supabase.from('notifications').delete().eq('user_id', user.id);
        },
      },
    ]);
  };

  const today   = notifs.filter(n =>  isToday(n.created_at));
  const earlier = notifs.filter(n => !isToday(n.created_at));
  const unread  = notifs.filter(n => !n.read).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={['#2B3C86', '#2E9CD6']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={s.backBtn}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Notifications</Text>
          {unread > 0 && (
            <Text style={s.headerSub}>{unread} unread</Text>
          )}
        </View>
        <View style={s.headerActions}>
          {unread > 0 && (
            <Pressable onPress={markAllRead} style={s.headerBtn}>
              <Text style={s.headerBtnText}>Mark all read</Text>
            </Pressable>
          )}
          {notifs.length > 0 && (
            <Pressable onPress={clearAll} style={s.headerBtn}>
              <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.8)" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <View style={s.scrollSheet}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 48 }} size="large" color="#2E9CD6" />
        ) : notifs.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={44} color="#94A3B8" />
            </View>
            <Text style={s.emptyTitle}>All caught up!</Text>
            <Text style={s.emptySub}>
              No notifications yet. Activity from you and your family will appear here in real time.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
          >
            {today.length > 0 && (
              <>
                <Text style={s.groupLabel}>Today</Text>
                {today.map(n => (
                  <NotifRow key={n.id} n={n} onRead={markRead} onDelete={deleteNotif} />
                ))}
              </>
            )}
            {earlier.length > 0 && (
              <>
                <Text style={s.groupLabel}>Earlier</Text>
                {earlier.map(n => (
                  <NotifRow key={n.id} n={n} onRead={markRead} onDelete={deleteNotif} />
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function NotifRow({
  n, onRead, onDelete,
}: {
  n: Notif;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const meta = TYPE_META[n.type] ?? DEFAULT_META;
  const isEmergency = n.type === 'health_log_emergency' || (n.data as any)?.priority === 'emergency';
  const isHighPriority = (n.data as any)?.priority === 'high';
  return (
    <Pressable
      style={[
        s.row,
        !n.read && s.rowUnread,
        isEmergency && s.rowEmergency,
        isHighPriority && !isEmergency && s.rowHighPriority,
      ]}
      onPress={() => { if (!n.read) onRead(n.id); }}
    >
      <View style={[s.iconCircle, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={22} color={meta.color} />
      </View>
      <View style={s.rowContent}>
        <View style={s.rowTop}>
          <Text style={[s.rowTitle, !n.read && s.rowTitleUnread]} numberOfLines={1}>
            {n.title}
          </Text>
          <Text style={s.rowTime}>{timeAgo(n.created_at)}</Text>
        </View>
        <Text style={s.rowBody} numberOfLines={2}>{n.body}</Text>
      </View>
      {!n.read && <View style={s.unreadDot} />}
      <Pressable hitSlop={10} onPress={() => onDelete(n.id)} style={s.deleteBtn}>
        <Ionicons name="close" size={16} color="#94A3B8" />
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EEF2F7' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingBottom: 50, gap: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle:   { fontSize: 22, fontWeight: '900', color: '#fff' },
  scrollSheet:   { flex: 1, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', backgroundColor: '#EEF2F7' },
  headerSub:     { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  headerBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  list:       { padding: 16, gap: 10 },
  groupLabel: {
    fontSize: 13, fontWeight: '800', color: '#8A9BB0',
    letterSpacing: 0.5, marginTop: 8, marginBottom: 4, marginLeft: 4,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  rowUnread:         { backgroundColor: '#F0F7FF', borderLeftWidth: 3, borderLeftColor: '#2B7FC0' },
  rowEmergency:      { backgroundColor: '#FFF1F1', borderLeftWidth: 4, borderLeftColor: '#DC2626' },
  rowHighPriority:   { backgroundColor: '#FFFBEB', borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  iconCircle:     { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowContent:     { flex: 1 },
  rowTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  rowTitle:       { fontSize: 14, fontWeight: '700', color: '#334155', flex: 1, marginRight: 8 },
  rowTitleUnread: { fontWeight: '900', color: '#1A2E6A' },
  rowBody:        { fontSize: 12, fontWeight: '500', color: '#64748B', lineHeight: 17 },
  rowTime:        { fontSize: 11, fontWeight: '600', color: '#94A3B8', flexShrink: 0 },
  unreadDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2B7FC0', flexShrink: 0 },
  deleteBtn:      { padding: 4, flexShrink: 0 },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon:  { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#1A2E6A' },
  emptySub:   { fontSize: 14, fontWeight: '500', color: '#64748B', textAlign: 'center', lineHeight: 22 },
});
