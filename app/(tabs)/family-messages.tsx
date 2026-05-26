/**
 * Voice Memos — guardian records & sends voice messages to elder(s).
 * Elder receives from ALL connected guardians in one unified inbox.
 *
 * Multi-guardian: elder fetches receiver_id = elder.id (catches every guardian)
 * Multi-elder:    guardian uses chip selector → activeId
 */
import React, {
  useState, useCallback, useRef, useEffect, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, StatusBar,
  ActivityIndicator, Alert, Animated, ScrollView, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  useAudioRecorder, useAudioPlayer,
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync,
} from 'expo-audio';

import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import {
  useRealtimeColumn, useRealtimeBroadcast, broadcastSignal,
} from '../../services/realtimeSync';
import { notifyElder, notifyGuardians } from '../../services/pushNotifications';
import { notifyElderOf, notifyGuardiansOf } from '../../services/notifications';

// ─── Theme ──────────────────────────────────────────────────────────────────
const C = {
  bg:       '#F0F4F8',
  navy:     '#1A3050',
  teal:     '#5CB8B2',
  white:    '#FFFFFF',
  muted:    '#7A90A4',
  border:   '#E2E8F0',
  danger:   '#EF4444',
  success:  '#16A34A',
  card:     '#FFFFFF',
  unread:   '#EF4444',
};

const MEMBER_COLORS = ['#3A7BD5', '#E91E8C', '#5CB8B2', '#FF9800', '#8B5CF6', '#10B981'];

// ─── Types ────────────────────────────────────────────────────────────────────
type VoiceMemo = {
  id:          string;
  sender_id:   string;
  receiver_id: string;
  sender_name: string;
  created_at:  string;
  type:        'voice' | 'text';
  duration:    number | null;
  media_url:   string | null;
  content:     string | null;
  is_read:     boolean;
};

type Contact = {
  id:    string;
  name:  string;
  rel:   string;
  color: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function uploadAudio(uri: string, userId: string): Promise<string> {
  const buf  = await (await fetch(uri)).arrayBuffer();
  const path = `${userId}/${Date.now()}.m4a`;
  const { error } = await supabase.storage
    .from('voice-messages')
    .upload(path, buf, { contentType: 'audio/m4a' });
  if (error) throw error;
  return supabase.storage.from('voice-messages').getPublicUrl(path).data.publicUrl;
}

function fmtDuration(secs: number | null) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function daysUntilExpiry(iso: string): number {
  const expiresAt = new Date(iso).getTime() + 7 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

function expiryLabel(iso: string): { text: string; urgent: boolean } {
  const days = daysUntilExpiry(iso);
  if (days === 0) return { text: 'Expires today', urgent: true };
  if (days === 1) return { text: 'Expires tomorrow', urgent: true };
  return { text: `Expires in ${days} days`, urgent: false };
}

function dayLabel(iso: string) {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const t = new Date();    t.setHours(0, 0, 0, 0);
  const y = new Date(t);   y.setDate(t.getDate() - 1);
  if (d.getTime() === t.getTime()) return 'Today';
  if (d.getTime() === y.getTime()) return 'Yesterday';
  return new Date(iso).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
}

type ListItem =
  | { kind: 'date';  label: string }
  | { kind: 'memo';  memo: VoiceMemo; contactColor: string };

function buildList(memos: VoiceMemo[], contactMap: Record<string, Contact>): ListItem[] {
  const items: ListItem[] = [];
  let lastDay = '';
  for (const memo of memos) {
    const day = new Date(memo.created_at).toDateString();
    if (day !== lastDay) {
      items.push({ kind: 'date', label: dayLabel(memo.created_at) });
      lastDay = day;
    }
    const color = contactMap[memo.sender_id]?.color ?? C.teal;
    items.push({ kind: 'memo', memo, contactColor: color });
  }
  return items;
}

// ─── MemoCard ─────────────────────────────────────────────────────────────────
// Each card manages its own player but defers to parent playingId for coordination.
function MemoCard({
  memo,
  contactColor,
  isOwn,
  playingId,
  onPlay,
  onStop,
  onDelete,
}: {
  memo:         VoiceMemo;
  contactColor: string;
  isOwn:        boolean;
  playingId:    string | null;
  onPlay:       (id: string) => void;
  onStop:       () => void;
  onDelete:     (memo: VoiceMemo) => void;
}) {
  const isPlaying = playingId === memo.id;
  const src       = useMemo(
    () => (memo.media_url ? { uri: memo.media_url } : { uri: '' }),
    [memo.media_url],
  );
  const player = useAudioPlayer(src);

  // Sync play/pause with parent's playingId
  useEffect(() => {
    if (!memo.media_url) return;
    try {
      if (isPlaying) player.play();
      else           player.pause();
    } catch {}
  }, [isPlaying]);

  const toggle = async () => {
    if (!memo.media_url) return;
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (isPlaying) onStop();
      else           onPlay(memo.id);
    } catch (e: any) {
      Alert.alert('Playback error', e.message ?? 'Could not play this message.');
    }
  };

  const initial = memo.sender_name?.[0]?.toUpperCase() ?? '?';

  return (
    <Pressable
      style={[s.memoCard, !memo.is_read && !isOwn && s.memoCardUnread]}
      onLongPress={() => isOwn && onDelete(memo)}
    >
      {/* Unread indicator */}
      {!memo.is_read && !isOwn && (
        <View style={s.unreadBadge}>
          <Text style={s.unreadBadgeTxt}>NEW</Text>
        </View>
      )}

      <View style={s.memoTop}>
        {/* Sender avatar */}
        <View style={[s.memoAvatar, { backgroundColor: isOwn ? '#E8F0FE' : contactColor }]}>
          <Text style={[s.memoAvatarTxt, { color: isOwn ? C.navy : '#fff' }]}>
            {isOwn ? '✦' : initial}
          </Text>
        </View>

        {/* Sender name + time */}
        <View style={{ flex: 1 }}>
          <Text style={s.memoSender}>
            {isOwn ? 'You' : memo.sender_name}
          </Text>
          <Text style={s.memoTime}>{timeAgo(memo.created_at)}</Text>
        </View>

        {/* Duration pill */}
        <View style={[s.durPill, { backgroundColor: isOwn ? '#E8F0FE' : `${contactColor}22` }]}>
          <Ionicons name="mic-outline" size={12} color={isOwn ? C.navy : contactColor} />
          <Text style={[s.durTxt, { color: isOwn ? C.navy : contactColor }]}>
            {fmtDuration(memo.duration)}
          </Text>
        </View>
      </View>

      {/* Waveform + play button */}
      <Pressable style={s.playerRow} onPress={toggle} disabled={!memo.media_url}>
        <LinearGradient
          colors={isPlaying ? [C.teal, '#3A8BC0'] : ['#E8EDF3', '#DDE3EC']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.playBtn}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={22}
            color={isPlaying ? '#fff' : C.navy}
          />
        </LinearGradient>

        <View style={s.waveWrap}>
          {[5, 12, 8, 18, 10, 16, 6, 20, 14, 9, 17, 7, 13, 11, 15].map((h, i) => (
            <Animated.View
              key={i}
              style={[s.waveBar, {
                height: isPlaying ? h * 1.2 : h,
                backgroundColor: isPlaying ? C.teal : '#C8D5E3',
                opacity: isPlaying ? 1 : 0.6,
              }]}
            />
          ))}
        </View>

        <Text style={[s.playLabel, { color: isPlaying ? C.teal : C.muted }]}>
          {isPlaying ? 'Playing…' : !memo.is_read && !isOwn ? 'Tap to listen' : 'Play'}
        </Text>
      </Pressable>

      {/* Footer: read status (own) + expiry countdown */}
      <View style={s.memoFooter}>
        {isOwn ? (
          <View style={s.memoStatus}>
            <Ionicons
              name={memo.is_read ? 'checkmark-done' : 'checkmark'}
              size={13}
              color={memo.is_read ? C.success : C.muted}
            />
            <Text style={[s.memoStatusTxt, { color: memo.is_read ? C.success : C.muted }]}>
              {memo.is_read ? 'Played' : 'Delivered'}
            </Text>
          </View>
        ) : <View />}

        {(() => {
          const { text, urgent } = expiryLabel(memo.created_at);
          return (
            <View style={[s.expiryPill, urgent && s.expiryPillUrgent]}>
              <Ionicons
                name="time-outline"
                size={11}
                color={urgent ? '#B45309' : C.muted}
              />
              <Text style={[s.expiryPillTxt, urgent && { color: '#B45309' }]}>
                {text}
              </Text>
            </View>
          );
        })()}
      </View>
    </Pressable>
  );
}

// ─── NoteCard ─────────────────────────────────────────────────────────────────
function NoteCard({
  memo,
  contactColor,
  isOwn,
  onDelete,
}: {
  memo:         VoiceMemo;
  contactColor: string;
  isOwn:        boolean;
  onDelete:     (memo: VoiceMemo) => void;
}) {
  const initial = memo.sender_name?.[0]?.toUpperCase() ?? '?';
  const { text: expiryText, urgent } = expiryLabel(memo.created_at);

  return (
    <Pressable
      style={[s.noteCard, !memo.is_read && !isOwn && s.noteCardUnread]}
      onLongPress={() => isOwn && onDelete(memo)}
    >
      {!memo.is_read && !isOwn && (
        <View style={s.unreadBadge}>
          <Text style={s.unreadBadgeTxt}>NEW</Text>
        </View>
      )}

      <View style={s.memoTop}>
        <View style={[s.memoAvatar, { backgroundColor: isOwn ? '#FFF9E6' : contactColor }]}>
          <Text style={[s.memoAvatarTxt, { color: isOwn ? '#D97706' : '#fff' }]}>
            {isOwn ? '✏' : initial}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.memoSender}>{isOwn ? 'You' : memo.sender_name}</Text>
          <Text style={s.memoTime}>{timeAgo(memo.created_at)}</Text>
        </View>
        <View style={[s.notePill, { backgroundColor: isOwn ? '#FFF9E6' : `${contactColor}22` }]}>
          <Ionicons name="document-text-outline" size={12} color={isOwn ? '#D97706' : contactColor} />
          <Text style={[s.notePillTxt, { color: isOwn ? '#D97706' : contactColor }]}>Note</Text>
        </View>
      </View>

      <View style={s.noteBody}>
        <Text style={s.noteContent}>{memo.content}</Text>
      </View>

      <View style={s.memoFooter}>
        {isOwn ? (
          <View style={s.memoStatus}>
            <Ionicons
              name={memo.is_read ? 'checkmark-done' : 'checkmark'}
              size={13}
              color={memo.is_read ? C.success : C.muted}
            />
            <Text style={[s.memoStatusTxt, { color: memo.is_read ? C.success : C.muted }]}>
              {memo.is_read ? 'Read' : 'Delivered'}
            </Text>
          </View>
        ) : <View />}

        <View style={[s.expiryPill, urgent && s.expiryPillUrgent]}>
          <Ionicons name="time-outline" size={11} color={urgent ? '#B45309' : C.muted} />
          <Text style={[s.expiryPillTxt, urgent && { color: '#B45309' }]}>{expiryText}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Recording overlay ────────────────────────────────────────────────────────
function RecordingPanel({
  secs, sending, bottomPad, onCancel, onSend,
}: {
  secs: number; sending: boolean; bottomPad: number;
  onCancel: () => void; onSend: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1.6, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const m  = Math.floor(secs / 60);
  const ss = (secs % 60).toString().padStart(2, '0');

  return (
    <View style={[s.recPanel, { paddingBottom: bottomPad }]}>
      {/* Pulsing mic */}
      <View style={s.recMicWrap}>
        <Animated.View
          style={[s.recRing, { transform: [{ scale: pulse }], opacity: 0.25 }]}
        />
        <Animated.View style={[s.recMicBg, { transform: [{ scale }] }]}>
          <Ionicons name="mic" size={34} color="#fff" />
        </Animated.View>
      </View>

      <Text style={s.recTimer}>{m}:{ss}</Text>
      <Text style={s.recHint}>Recording… release to send</Text>

      <View style={s.recBtnRow}>
        <Pressable style={s.recCancelBtn} onPress={onCancel} disabled={sending}>
          <Ionicons name="trash-outline" size={20} color={C.danger} />
          <Text style={s.recCancelTxt}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[s.recSendBtn, sending && { opacity: 0.7 }]}
          onPress={onSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={s.recSendTxt}>Send</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FamilyMessagesScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user, profile } = useAuth();

  const isGuardian = profile?.role === 'guardian';

  // Contacts: guardian sees their elders; elder sees their guardians
  const [contacts,   setContacts]   = useState<Contact[]>([]);
  const [activeId,   setActiveId]   = useState<string | null>(null); // only used by guardian
  const [filterGid,  setFilterGid]  = useState<string | null>(null); // only used by elder

  const [memos,      setMemos]      = useState<VoiceMemo[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [isRec,      setIsRec]      = useState(false);
  const [recSecs,    setRecSecs]    = useState(0);
  const [playingId,  setPlayingId]  = useState<string | null>(null);
  const [noteText,   setNoteText]   = useState('');
  const [showNote,   setShowNote]   = useState(false);

  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef     = useRef<FlatList>(null);
  const recorder    = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Map contactId → Contact (for colour lookup in elder view)
  const contactMap = useMemo(
    () => Object.fromEntries(contacts.map(c => [c.id, c])),
    [contacts],
  );

  // ── Fetch contacts ──────────────────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    if (!user) return;
    try {
      if (isGuardian) {
        // Guardian fetches their connected elders
        const { data } = await supabase
          .from('guardian_elder_links')
          .select('elder_id, parent_name, relation')
          .eq('guardian_id', user.id)
          .eq('status', 'connected');
        if (data?.length) {
          // Deduplicate by elder_id — guard against duplicate rows
          const seen = new Set<string>();
          const list: Contact[] = data
            .filter((l: any) => {
              if (seen.has(l.elder_id)) return false;
              seen.add(l.elder_id);
              return true;
            })
            .map((l: any, i: number) => ({
              id:    l.elder_id,
              name:  l.parent_name || 'Elder',
              rel:   l.relation    || 'Elder',
              color: MEMBER_COLORS[i % MEMBER_COLORS.length],
            }));
          setContacts(list);
          setActiveId(prev => prev ?? list[0].id);
        }
      } else {
        // Elder fetches ALL connected guardians
        const { data: links } = await supabase
          .from('guardian_elder_links')
          .select('guardian_id, relation')
          .eq('elder_id', user.id)
          .eq('status', 'connected');
        if (links?.length) {
          // Deduplicate — same guardian can appear in multiple rows if re-invited
          const uniqueIds = [...new Set(links.map((l: any) => l.guardian_id as string))];
          const { data: profs } = await supabase
            .from('profiles').select('id, full_name, role').in('id', uniqueIds);
          const list: Contact[] = uniqueIds
            .map((id, i) => {
              // Only show guardians with a valid profile that is actually a guardian
              const p = profs?.find((x: any) => x.id === id && x.role === 'guardian');
              if (!p) return null;
              const l = links.find((x: any) => x.guardian_id === id);
              return {
                id,
                name:  p.full_name || 'Guardian',
                rel:   l?.relation || 'Guardian',
                color: MEMBER_COLORS[i % MEMBER_COLORS.length],
              };
            })
            .filter((c): c is Contact => c !== null);
          setContacts(list);
        }
      }
    } catch (e) { console.error('fetchContacts', e); }
  }, [user, isGuardian]);

  // ── Fetch voice memos ───────────────────────────────────────────────────────
  const fetchMemos = useCallback(async () => {
    if (!user) return;
    // Only fetch memos from the last 7 days (mirrors server-side expiry)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    try {
      let q = supabase
        .from('family_messages')
        .select('*, sender:profiles!sender_id (full_name)')
        .in('type', ['voice', 'text'])
        .gte('created_at', cutoff)
        .order('created_at', { ascending: true });

      if (isGuardian && activeId) {
        // Guardian: only memos between me and the selected elder
        q = q.or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${activeId}),` +
          `and(sender_id.eq.${activeId},receiver_id.eq.${user.id})`,
        );
      } else if (!isGuardian) {
        // Elder: ALL voice memos where I am sender or receiver (covers all guardians)
        q = q.or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`);
      }

      const { data, error } = await q;
      if (error) throw error;

      const list = (data ?? []).map((m: any) => ({
        ...m,
        sender_name: m.sender?.full_name ?? 'Unknown',
      })) as VoiceMemo[];
      setMemos(list);

      // Mark received memos as read
      const unread = list
        .filter(m => m.receiver_id === user.id && !m.is_read)
        .map(m => m.id);
      if (unread.length > 0) {
        await supabase
          .from('family_messages')
          .update({ is_read: true })
          .in('id', unread);
      }
    } catch (e) { console.error('fetchMemos', e); }
    finally { setLoading(false); }
  }, [user, isGuardian, activeId]);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => { fetchContacts(); }, [fetchContacts]));
  useFocusEffect(useCallback(() => {
    setLoading(true);
    void fetchMemos();
  }, [fetchMemos]));

  // Realtime — elder: receiver_id = elder.id catches ALL guardians automatically
  useRealtimeColumn('family_messages', 'receiver_id', user?.id, fetchMemos);
  useRealtimeBroadcast(`voicememo-${user?.id}`, ['new-memo'], fetchMemos);

  // Poll fallback every 10 s
  useEffect(() => {
    const t = setInterval(() => void fetchMemos(), 10_000);
    return () => clearInterval(t);
  }, [fetchMemos]);

  // Auto-scroll to latest
  useEffect(() => {
    if (memos.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [memos.length]);

  // ── Record & send ────────────────────────────────────────────────────────────
  const startRec = async () => {
    const receiverId = isGuardian ? activeId : null;
    if (isGuardian && !receiverId) {
      Alert.alert('Select an elder first');
      return;
    }
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) { Alert.alert('Permission', 'Microphone access is required.'); return; }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRec(true);
      setRecSecs(0);
      recTimerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } catch (e: any) {
      Alert.alert('Recording error', e.message ?? 'Could not start recording.');
    }
  };

  const cancelRec = async () => {
    clearInterval(recTimerRef.current!);
    setIsRec(false); setRecSecs(0);
    try { await recorder.stop(); } catch {}
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });
  };

  const sendNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    const receiverId = isGuardian ? activeId : null;
    if (isGuardian && !receiverId) { Alert.alert('Select an elder first'); return; }
    setSending(true);
    setNoteText('');
    setShowNote(false);
    try {
      if (isGuardian && receiverId) {
        await supabase.from('family_messages').insert({
          sender_id: user!.id, receiver_id: receiverId,
          type: 'text', content: text, is_read: false,
        });
        broadcastSignal(`voicememo-${receiverId}`, 'new-memo');
        const senderName = profile?.firstName || 'Your guardian';
        await notifyElder(receiverId, '📝 Note', `${senderName} sent you a note`);
        notifyElderOf(receiverId, user!.id, 'voice_message', '📝 Note from Guardian', `${senderName} sent you a text note`);
      } else if (!isGuardian) {
        await Promise.all(contacts.map(async (c) => {
          await supabase.from('family_messages').insert({
            sender_id: user!.id, receiver_id: c.id,
            type: 'text', content: text, is_read: false,
          });
          broadcastSignal(`voicememo-${c.id}`, 'new-memo');
        }));
        const elderName = profile?.firstName || 'Your elder';
        await notifyGuardians(user!.id, '📝 Note', `${elderName} sent a note`);
        notifyGuardiansOf(user!.id, user!.id, 'voice_message', '📝 Note from Elder', `${elderName} sent you a text note`);
      }
      void fetchMemos();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to send note.');
    } finally { setSending(false); }
  };

  const sendRec = async () => {
    const receiverId = isGuardian ? activeId : null;
    if (!receiverId && isGuardian) return;
    clearInterval(recTimerRef.current!);
    const duration = recSecs;
    setIsRec(false); setRecSecs(0);
    setSending(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording URI');
      const url = await uploadAudio(uri, user!.id);

      if (isGuardian && receiverId) {
        // Guardian → selected elder
        await supabase.from('family_messages').insert({
          sender_id: user!.id, receiver_id: receiverId,
          type: 'voice', media_url: url, duration, is_read: false,
        });
        broadcastSignal(`voicememo-${receiverId}`, 'new-memo');
        const senderName = profile?.firstName || 'Your guardian';
        await notifyElder(receiverId, '🎙️ Voice Memo', `${senderName} sent you a voice message`);
        notifyElderOf(receiverId, user!.id, 'voice_message', '🎙️ Voice Message', `${senderName} sent you a voice message`);
      } else if (!isGuardian) {
        // Elder → ALL connected guardians
        const targets = contacts;
        await Promise.all(targets.map(async (c) => {
          await supabase.from('family_messages').insert({
            sender_id: user!.id, receiver_id: c.id,
            type: 'voice', media_url: url, duration, is_read: false,
          });
          broadcastSignal(`voicememo-${c.id}`, 'new-memo');
        }));
        const elderName = profile?.firstName || 'Your elder';
        await notifyGuardians(user!.id, '🎙️ Voice Memo', `${elderName} sent a voice message`);
        notifyGuardiansOf(user!.id, user!.id, 'voice_message', '🎙️ Voice Message', `${elderName} sent you a voice message`);
      }

      void fetchMemos();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to send voice memo.');
    } finally { setSending(false); }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteMemo = useCallback((memo: VoiceMemo) => {
    Alert.alert('Delete', 'Remove this voice memo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await supabase.from('family_messages').delete().eq('id', memo.id);
            if (memo.media_url) {
              const path = memo.media_url.split('/voice-messages/')[1];
              if (path) await supabase.storage.from('voice-messages').remove([decodeURIComponent(path)]);
            }
            setPlayingId(null);
            void fetchMemos();
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }, [fetchMemos]);

  // ── Elder: unlink a guardian ────────────────────────────────────────────────
  const unlinkGuardian = useCallback((contact: Contact) => {
    Alert.alert(
      'Remove Guardian',
      `Remove ${contact.name} from your guardians? They will no longer be able to send you voice memos.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            try {
              await supabase
                .from('guardian_elder_links')
                .delete()
                .eq('guardian_id', contact.id)
                .eq('elder_id', user!.id);
              if (filterGid === contact.id) setFilterGid(null);
              await fetchContacts();
              void fetchMemos();
            } catch (e: any) { Alert.alert('Error', e.message); }
          },
        },
      ],
    );
  }, [user, filterGid, fetchContacts, fetchMemos]);

  // ── Elder: filter displayed memos by guardian chip ───────────────────────────
  const displayedMemos = useMemo(() => {
    if (isGuardian) return memos; // guardian already filtered by activeId in query
    if (!filterGid)  return memos;
    return memos.filter(m =>
      m.sender_id === filterGid || m.receiver_id === filterGid,
    );
  }, [memos, filterGid, isGuardian]);

  const unreadCount = useMemo(
    () => memos.filter(m => m.receiver_id === user?.id && !m.is_read).length,
    [memos, user?.id],
  );

  // ── List items ───────────────────────────────────────────────────────────────
  const listItems = useMemo(
    () => buildList(displayedMemos, contactMap),
    [displayedMemos, contactMap],
  );

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.kind === 'date') {
      return (
        <View style={s.dateRow}>
          <View style={s.dateLine} />
          <Text style={s.dateLbl}>{item.label}</Text>
          <View style={s.dateLine} />
        </View>
      );
    }
    const isOwn = item.memo.sender_id === user?.id;
    if (item.memo.type === 'text') {
      return (
        <NoteCard
          memo={item.memo}
          contactColor={item.contactColor}
          isOwn={isOwn}
          onDelete={deleteMemo}
        />
      );
    }
    return (
      <MemoCard
        memo={item.memo}
        contactColor={item.contactColor}
        isOwn={isOwn}
        playingId={playingId}
        onPlay={id  => setPlayingId(id)}
        onStop={() => setPlayingId(null)}
        onDelete={deleteMemo}
      />
    );
  }, [user?.id, playingId, deleteMemo]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const activeContact = contacts.find(c => c.id === activeId);

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#1A3050', '#243D6A']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>
            {isGuardian ? 'Voice Memos' : 'Voice Memos from Family'}
          </Text>
          {unreadCount > 0 && (
            <Text style={s.headerSub}>
              {unreadCount} new memo{unreadCount > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <View style={s.headerMic}>
          <Ionicons name="mic" size={20} color="rgba(255,255,255,0.6)" />
        </View>
      </LinearGradient>

      {/* ── Expiry notice ── */}
      <View style={s.expiryBanner}>
        <Ionicons name="time-outline" size={13} color="#7A90A4" />
        <Text style={s.expiryTxt}>Voice memos and notes are automatically deleted after 7 days</Text>
      </View>

      {/* ── Guardian: elder selector chips ── */}
      {isGuardian && contacts.length > 1 && (
        <View style={s.chipStrip}>
          <Text style={s.chipStripLabel}>Send to:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {contacts.map(c => (
              <Pressable
                key={c.id}
                style={[s.chip, activeId === c.id && { backgroundColor: c.color }]}
                onPress={() => setActiveId(c.id)}
              >
                <View style={[s.chipDot, { backgroundColor: activeId === c.id ? '#fff' : c.color }]} />
                <Text style={[s.chipTxt, activeId === c.id && { color: '#fff' }]}>
                  {c.name.split(' ')[0]}
                </Text>
                {activeId === c.id && (
                  <Ionicons name="checkmark" size={13} color="#fff" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Elder: guardian filter chips (show only when multiple guardians) ── */}
      {!isGuardian && contacts.length > 1 && (
        <View style={s.chipStrip}>
          <Text style={s.chipStripLabel}>From:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Pressable
              style={[s.chip, !filterGid && s.chipAll]}
              onPress={() => setFilterGid(null)}
            >
              <Text style={[s.chipTxt, !filterGid && { color: C.navy, fontWeight: '900' }]}>
                All
              </Text>
            </Pressable>
            {contacts.map(c => (
              <Pressable
                key={c.id}
                style={[s.chip, filterGid === c.id && { backgroundColor: c.color }]}
                onPress={() => setFilterGid(c.id === filterGid ? null : c.id)}
                onLongPress={() => unlinkGuardian(c)}
              >
                <View style={[s.chipDot, { backgroundColor: filterGid === c.id ? '#fff' : c.color }]} />
                <Text style={[s.chipTxt, filterGid === c.id && { color: '#fff' }]}>
                  {c.name.split(' ')[0]}
                </Text>
                <Ionicons
                  name="close-circle"
                  size={13}
                  color={filterGid === c.id ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Memos list OR Recording panel ── */}
      {isRec ? (
        <RecordingPanel
          secs={recSecs}
          sending={sending}
          bottomPad={isGuardian ? Math.max(insets.bottom, 16) : 80 + insets.bottom}
          onCancel={cancelRec}
          onSend={sendRec}
        />
      ) : (
        <>
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={C.teal} />
              <Text style={s.centerTxt}>Loading voice memos…</Text>
            </View>
          ) : contacts.length === 0 ? (
            <View style={s.center}>
              <View style={s.emptyIcon}>
                <Ionicons name="people-outline" size={44} color={C.teal} />
              </View>
              <Text style={s.emptyTitle}>No family connected</Text>
              <Text style={s.emptySub}>
                {isGuardian
                  ? 'Add an elder from the Home screen to start sending voice memos.'
                  : 'Ask your guardian to send you an invitation to get started.'}
              </Text>
            </View>
          ) : listItems.length === 0 ? (
            <View style={s.center}>
              <View style={s.emptyIcon}>
                <Ionicons name="mic-outline" size={44} color={C.teal} />
              </View>
              <Text style={s.emptyTitle}>No voice memos yet</Text>
              <Text style={s.emptySub}>
                {isGuardian
                  ? `Tap the mic button below to record\nand send a voice memo to ${activeContact?.name ?? 'your elder'}`
                  : 'Your guardian will send you a voice\nmemo soon. You can also reply below.'}
              </Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={listItems}
              keyExtractor={(item, i) =>
                item.kind === 'date' ? `date-${i}` : item.memo.id
              }
              renderItem={renderItem}
              contentContainerStyle={[s.list, !isGuardian && { paddingBottom: 16 }]}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: false })
              }
            />
          )}

          {/* ── Footer: note input + action buttons ── */}
          {contacts.length > 0 && (
            <View style={[s.recFooter, {
              paddingBottom: isGuardian
                ? Math.max(insets.bottom, 16)
                : 80 + insets.bottom,   // BAR_HEIGHT(60) + ORB_LIFT(20) — notched bar is absolute-positioned
            }]}>
              {/* Note input panel */}
              {showNote && (
                <View style={s.noteInputPanel}>
                  <TextInput
                    style={s.noteTextInput}
                    value={noteText}
                    onChangeText={setNoteText}
                    placeholder="Write a note…"
                    placeholderTextColor={C.muted}
                    multiline
                    maxLength={500}
                    autoFocus
                  />
                  <View style={s.noteInputActions}>
                    <Pressable
                      style={s.noteDiscardBtn}
                      onPress={() => { setShowNote(false); setNoteText(''); }}
                    >
                      <Ionicons name="close" size={20} color={C.muted} />
                    </Pressable>
                    <Pressable
                      style={[s.noteSendBtn, (!noteText.trim() || sending) && { opacity: 0.45 }]}
                      onPress={sendNote}
                      disabled={!noteText.trim() || sending}
                    >
                      {sending
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <><Ionicons name="send" size={15} color="#fff" /><Text style={s.noteSendTxt}>Send</Text></>
                      }
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Label */}
              {isGuardian && activeContact && (
                <Text style={s.recFooterLabel}>
                  Sending to: <Text style={{ color: activeContact.color, fontWeight: '900' }}>
                    {activeContact.name}
                  </Text>
                </Text>
              )}
              {!isGuardian && contacts.length > 0 && (
                <Text style={s.recFooterLabel}>
                  Reply to {contacts.length > 1
                    ? `all ${contacts.length} guardians`
                    : contacts[0].name}
                </Text>
              )}

              {/* Button row */}
              <View style={s.footerBtnRow}>
                {/* Note toggle */}
                <Pressable
                  style={[s.noteToggleBtn, showNote && s.noteToggleBtnActive]}
                  onPress={() => { setShowNote(!showNote); if (showNote) setNoteText(''); }}
                >
                  <Ionicons
                    name="create-outline"
                    size={22}
                    color={showNote ? '#D97706' : C.navy}
                  />
                  <Text style={[s.noteToggleTxt, showNote && { color: '#D97706' }]}>Note</Text>
                </Pressable>

                {/* Mic */}
                <Pressable
                  style={[s.bigMicBtn, sending && { opacity: 0.6 }]}
                  onPress={startRec}
                  disabled={sending}
                >
                  <LinearGradient
                    colors={[C.teal, '#3A8BC0']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.bigMicGradient}
                  >
                    <Ionicons name="mic" size={28} color="#fff" />
                  </LinearGradient>
                  <Text style={s.bigMicTxt}>
                    {isGuardian ? 'Tap to Record' : 'Reply with Voice'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  backBtn:      { padding: 6 },
  headerTitle:  { fontSize: 18, fontWeight: '900', color: '#fff' },
  headerSub:    { fontSize: 12, fontWeight: '700', color: '#F87171', marginTop: 2 },
  headerMic:    { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Expiry banner
  expiryBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  expiryTxt: { fontSize: 12, fontWeight: '600', color: C.muted },

  // Chips
  chipStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#162740',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  chipStripLabel: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chipAll: { backgroundColor: 'rgba(255,255,255,0.22)' },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipTxt: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.75)' },

  // List
  list: { padding: 14, gap: 10, paddingBottom: 8 },

  // Date separator
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  dateLine: { flex: 1, height: 1, backgroundColor: C.border },
  dateLbl:  { fontSize: 12, fontWeight: '800', color: C.muted },

  // Memo card
  memoCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  memoCardUnread: {
    borderColor: `${C.teal}60`,
    backgroundColor: '#F4FBFB',
  },
  unreadBadge: {
    position: 'absolute', top: -1, right: 14,
    backgroundColor: C.unread, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  unreadBadgeTxt: { fontSize: 10, fontWeight: '900', color: '#fff' },

  memoTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  memoAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  memoAvatarTxt: { fontSize: 18, fontWeight: '900' },
  memoSender: { fontSize: 15, fontWeight: '900', color: C.navy },
  memoTime:   { fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 2 },
  durPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  durTxt: { fontSize: 12, fontWeight: '800' },

  // Player
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F4F8FC', borderRadius: 16, padding: 12,
  },
  playBtn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  waveWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  waveBar:  { width: 3, borderRadius: 2 },
  playLabel: { fontSize: 12, fontWeight: '700' },

  memoFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10,
  },
  memoStatus:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memoStatusTxt: { fontSize: 12, fontWeight: '700' },

  expiryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F1F5F9', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  expiryPillUrgent: { backgroundColor: '#FEF3C7' },
  expiryPillTxt: { fontSize: 11, fontWeight: '700', color: C.muted },

  // Recording panel
  recPanel: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 16, backgroundColor: C.bg,
  },
  recMicWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  recRing: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: C.danger,
  },
  recMicBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.danger, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  recTimer: { fontSize: 48, fontWeight: '900', color: C.navy, fontVariant: ['tabular-nums'] },
  recHint:  { fontSize: 14, fontWeight: '600', color: C.muted },
  recBtnRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  recCancelBtn: {
    alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 22, backgroundColor: '#FEE2E2',
  },
  recCancelTxt: { fontSize: 13, fontWeight: '900', color: C.danger },
  recSendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 22,
    backgroundColor: C.teal,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  recSendTxt: { fontSize: 15, fontWeight: '900', color: '#fff' },

  // Empty / loading
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  centerTxt:  { fontSize: 14, fontWeight: '700', color: C.muted },
  emptyIcon:  { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E4F3F2', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: C.navy },
  emptySub:   { fontSize: 14, fontWeight: '600', color: C.muted, textAlign: 'center', lineHeight: 22 },

  // Record footer
  recFooter: {
    paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border,
    alignItems: 'center', gap: 10,
  },
  recFooterLabel: { fontSize: 13, fontWeight: '700', color: C.muted },

  // Footer button row (Note + Mic side-by-side)
  footerBtnRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'center', gap: 24, width: '100%',
  },
  noteToggleBtn: {
    alignItems: 'center', gap: 5,
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: '#F4F8FC',
  },
  noteToggleBtnActive: {
    borderColor: '#F59E0B', backgroundColor: '#FFF9E6',
  },
  noteToggleTxt: { fontSize: 12, fontWeight: '800', color: C.navy },

  bigMicBtn: { alignItems: 'center' },
  bigMicGradient: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
    marginBottom: 6,
  },
  bigMicTxt: { fontSize: 13, fontWeight: '900', color: C.navy },

  // Note input panel
  noteInputPanel: {
    width: '100%', backgroundColor: '#FFFBF0',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#F59E0B22',
    padding: 12, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  noteTextInput: {
    fontSize: 15, fontWeight: '600', color: C.navy,
    minHeight: 72, maxHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  noteInputActions: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteDiscardBtn: {
    padding: 8, borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  noteSendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 14, backgroundColor: '#D97706',
  },
  noteSendTxt: { fontSize: 14, fontWeight: '900', color: '#fff' },

  // Note card
  noteCard: {
    backgroundColor: '#FFFDF0', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    borderWidth: 1.5, borderColor: '#FDE68A55',
  },
  noteCardUnread: {
    borderColor: '#F59E0B88',
    backgroundColor: '#FFFBEB',
  },
  notePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  notePillTxt: { fontSize: 12, fontWeight: '800' },
  noteBody: {
    backgroundColor: '#FFFFF8', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#FDE68A44',
    marginBottom: 4,
  },
  noteContent: {
    fontSize: 15, fontWeight: '600', color: C.navy,
    lineHeight: 22,
  },
});
