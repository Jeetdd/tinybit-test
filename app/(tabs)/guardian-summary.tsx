import { useState, useCallback } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { GuardianHeader } from '../../components/guardian/GuardianHeader';
import { CARD_SHADOW, G } from '../../components/guardian/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import {
  useGuardianElderSync, useGuardianCheckInSync, useElderBroadcastSync,
} from '../../services/realtimeSync';

const CHIP_COLORS = ['#FFE7D6', '#E9D5FF', '#D1FADF', '#D8F0FF', '#FFF3E0'];
const chipBg = (name: string) => CHIP_COLORS[name.charCodeAt(0) % CHIP_COLORS.length];

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', sad: '😢', anxious: '😰', tired: '😴',
  good: '😊', great: '🌟', neutral: '😐', bad: '😟',
};
const moodEmoji = (m: string) => MOOD_EMOJI[m?.toLowerCase()] ?? '😐';

type Elder = {
  elder_id: string;
  parent_name: string;
  relation: string;
  elder_email: string;
};

type ElderSummary = Elder & {
  checkedIn: boolean;
  mood: string;
  moodScore: number;
  medTotal: number;
  medTaken: number;
  lastActivity: string;
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const label = score >= 80 ? 'Great' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Low';
  return (
    <View style={[r.ring, { borderColor: color }]}>
      <Text style={[r.scoreNum, { color }]}>{score}</Text>
      <Text style={[r.scoreLabel, { color }]}>{label}</Text>
    </View>
  );
}

const r = StyleSheet.create({
  ring: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 18, fontWeight: '900' },
  scoreLabel: { fontSize: 10, fontWeight: '800', marginTop: -2 },
});

function SummaryCard({ summary, onPress }: { summary: ElderSummary; onPress: () => void }) {
  const medPct  = summary.medTotal > 0 ? Math.round((summary.medTaken / summary.medTotal) * 100) : 0;
  const score   = Math.round(
    ((summary.checkedIn ? 30 : 0) + (medPct * 0.5) + (summary.moodScore > 0 ? (summary.moodScore / 5) * 20 : 0))
  );
  const color   = score >= 70 ? G.success : score >= 40 ? G.warning : G.danger;

  return (
    <Pressable onPress={onPress} style={[s.summaryCard, CARD_SHADOW]}>
      <View style={s.cardTop}>
        <View style={[s.avatar, { backgroundColor: chipBg(summary.parent_name) }]}>
          <Text style={s.avatarText}>{summary.parent_name[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.parentName}>{summary.parent_name}</Text>
          <Text style={s.parentRel}>{summary.relation}</Text>
          <View style={s.tagRow}>
            <View style={[s.tag, { backgroundColor: summary.checkedIn ? '#D1FADF' : '#FEE2E2' }]}>
              <Ionicons
                name={summary.checkedIn ? 'checkmark-circle' : 'close-circle'}
                size={12}
                color={summary.checkedIn ? G.success : G.danger}
              />
              <Text style={[s.tagText, { color: summary.checkedIn ? G.success : G.danger }]}>
                {summary.checkedIn ? 'Checked In' : 'Not Checked In'}
              </Text>
            </View>
          </View>
        </View>
        <ScoreRing score={score} color={color} />
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statEmoji}>{moodEmoji(summary.mood)}</Text>
          <Text style={s.statLabel}>Mood</Text>
          <Text style={s.statVal}>{summary.mood || '—'}</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={[s.statNum, { color: medPct >= 70 ? G.success : medPct >= 40 ? G.warning : G.danger }]}>
            {medPct}%
          </Text>
          <Text style={s.statLabel}>Medicines</Text>
          <Text style={s.statVal}>{summary.medTaken}/{summary.medTotal} taken</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Ionicons name="time-outline" size={20} color={G.muted} />
          <Text style={s.statLabel}>Last Active</Text>
          <Text style={s.statVal} numberOfLines={1}>{summary.lastActivity || '—'}</Text>
        </View>
      </View>

      {/* Med progress bar */}
      {summary.medTotal > 0 && (
        <View style={{ marginTop: 12 }}>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${medPct}%` as any, backgroundColor: color }]} />
          </View>
        </View>
      )}

      <View style={s.cardFooter}>
        <Text style={s.footerText}>Tap to view full profile</Text>
        <Ionicons name="chevron-forward" size={14} color={G.muted} />
      </View>
    </Pressable>
  );
}

export default function GuardianSummaryScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const [summaries, setSummaries] = useState<ElderSummary[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [elderIds,  setElderIds]  = useState<string[]>([]);

  const today = new Date().toISOString().split('T')[0];

  const loadSummaries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Get connected elders
      const { data: links, error: linkErr } = await supabase
        .from('guardian_elder_links')
        .select('elder_id, parent_name, relation, elder_email')
        .eq('guardian_id', user.id)
        .eq('status', 'connected');
      if (linkErr) throw linkErr;
      if (!links || links.length === 0) { setSummaries([]); setElderIds([]); return; }
      setElderIds((links as Elder[]).map(e => e.elder_id));

      // 2. For each elder, fetch check-in share + medicine data in parallel
      const results = await Promise.all(
        (links as Elder[]).map(async (elder): Promise<ElderSummary> => {
          // Check-in share (guardian-visible summary)
          const { data: shareData } = await supabase
            .from('guardian_check_in_shares')
            .select('mood, mood_score, shared_at')
            .eq('elder_id', elder.elder_id)
            .eq('date', today)
            .maybeSingle();

          // Medicines
          const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
          const dayEnd   = new Date(); dayEnd.setHours(23, 59, 59, 999);
          const { data: meds } = await supabase
            .from('medicines')
            .select('id, medicine_logs(taken_at)')
            .eq('user_id', elder.elder_id);

          const medTotal = (meds ?? []).length;
          const medTaken = (meds ?? []).filter((m: any) =>
            (m.medicine_logs ?? []).some((l: any) => {
              if (!l?.taken_at) return false;
              const t = new Date(l.taken_at).getTime();
              return t >= dayStart.getTime() && t <= dayEnd.getTime();
            })
          ).length;

          // Last activity = profile updated_at or check-in time
          const lastActivity = shareData?.shared_at
            ? new Date(shareData.shared_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';

          return {
            ...elder,
            checkedIn:    !!shareData,
            mood:         shareData?.mood       ?? '',
            moodScore:    shareData?.mood_score ?? 0,
            medTotal,
            medTaken,
            lastActivity,
          };
        })
      );

      setSummaries(results);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, today]);

  useFocusEffect(useCallback(() => { loadSummaries(); }, [loadSummaries]));

  // Medicines/logs via postgres_changes (user_id column)
  useGuardianElderSync(elderIds, ['medicines', 'medicine_logs'], loadSummaries);
  // Check-in shares via postgres_changes (elder_id column — different from user_id)
  useGuardianCheckInSync(elderIds, loadSummaries);
  // Instant broadcast when elder checks in or takes medicine
  useElderBroadcastSync(elderIds, ['checkin-update', 'medicine-update'], loadSummaries);

  const overall = summaries.length > 0 ? {
    totalCheckedIn: summaries.filter(s => s.checkedIn).length,
    totalMedPct: summaries.length > 0
      ? Math.round(summaries.reduce((acc, s) => acc + (s.medTotal > 0 ? (s.medTaken / s.medTotal) : 0), 0) / summaries.length * 100)
      : 0,
  } : null;

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <GuardianHeader title="Daily Summary" />

      <View style={s.sheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* ── Date banner ── */}
          <LinearGradient colors={[G.primary, G.accent]} style={s.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View>
              <Text style={s.bannerDate}>{dateStr}</Text>
              <Text style={s.bannerSub}>Today's health overview</Text>
            </View>
            <Pressable onPress={loadSummaries} style={s.refreshBtn}>
              <Ionicons name="refresh" size={18} color="#fff" />
            </Pressable>
          </LinearGradient>

          {loading ? (
            <ActivityIndicator style={{ margin: 32 }} color={G.accent} />
          ) : summaries.length === 0 ? (
            <View style={[s.emptyCard, CARD_SHADOW]}>
              <View style={s.emptyIcon}>
                <Ionicons name="people-outline" size={36} color="#B0BEC5" />
              </View>
              <Text style={s.emptyTitle}>No Connected Parents</Text>
              <Text style={s.emptySub}>
                Use "Add Parent" to connect with your elders and see their daily health summary here.
              </Text>
              <Pressable style={s.addBtn} onPress={() => router.push('/add-parent' as any)}>
                <Text style={s.addBtnText}>Add a Parent</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* ── Overall stats ── */}
              {overall && (
                <View style={[s.overallCard, CARD_SHADOW]}>
                  <Text style={s.overallTitle}>Family Overview</Text>
                  <View style={s.overallRow}>
                    <View style={s.overallStat}>
                      <Text style={s.overallNum}>{summaries.length}</Text>
                      <Text style={s.overallLabel}>Parents</Text>
                    </View>
                    <View style={s.overallDivider} />
                    <View style={s.overallStat}>
                      <Text style={[s.overallNum, { color: overall.totalCheckedIn === summaries.length ? G.success : G.warning }]}>
                        {overall.totalCheckedIn}/{summaries.length}
                      </Text>
                      <Text style={s.overallLabel}>Checked In</Text>
                    </View>
                    <View style={s.overallDivider} />
                    <View style={s.overallStat}>
                      <Text style={[s.overallNum, { color: overall.totalMedPct >= 70 ? G.success : G.warning }]}>
                        {overall.totalMedPct}%
                      </Text>
                      <Text style={s.overallLabel}>Med Adherence</Text>
                    </View>
                  </View>
                </View>
              )}

              <Text style={[s.h2, { marginTop: 20 }]}>Individual Summaries</Text>
              <View style={{ gap: 16 }}>
                {summaries.map(sm => (
                  <SummaryCard
                    key={sm.elder_id}
                    summary={sm}
                    onPress={() => router.push('/caregivers' as any)}
                  />
                ))}
              </View>

              {/* ── Quick actions ── */}
              <Text style={[s.h2, { marginTop: 24 }]}>Quick Actions</Text>
              <View style={s.quickRow}>
                <Pressable style={[s.quickBtn, CARD_SHADOW]} onPress={() => router.push('/parent-medicines' as any)}>
                  <View style={[s.quickIcon, { backgroundColor: '#CDEFD0' }]}>
                    <Ionicons name="medkit-outline" size={22} color={G.success} />
                  </View>
                  <Text style={s.quickLabel}>Medicines</Text>
                </Pressable>
                <Pressable style={[s.quickBtn, CARD_SHADOW]} onPress={() => router.push('/guardian-calendar' as any)}>
                  <View style={[s.quickIcon, { backgroundColor: '#D8F0FF' }]}>
                    <Ionicons name="calendar-outline" size={22} color="#0284C7" />
                  </View>
                  <Text style={s.quickLabel}>Calendar</Text>
                </Pressable>
                <Pressable style={[s.quickBtn, CARD_SHADOW]} onPress={() => router.push('/alerts' as any)}>
                  <View style={[s.quickIcon, { backgroundColor: '#FFE7D6' }]}>
                    <Ionicons name="notifications-outline" size={22} color="#F97316" />
                  </View>
                  <Text style={s.quickLabel}>Alerts</Text>
                </Pressable>
                <Pressable style={[s.quickBtn, CARD_SHADOW]} onPress={() => router.push('/family-messages' as any)}>
                  <View style={[s.quickIcon, { backgroundColor: '#E9D5FF' }]}>
                    <Ionicons name="chatbubble-outline" size={22} color="#7C3AED" />
                  </View>
                  <Text style={s.quickLabel}>Messages</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg },
  sheet: {
    flex: 1, marginTop: -42,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: G.bg, overflow: 'hidden',
  },
  content: { padding: 16, paddingBottom: 120 },
  h2: { fontSize: 22, fontWeight: '900', color: G.text, marginBottom: 12 },

  banner: { borderRadius: 20, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerDate: { fontSize: 18, fontWeight: '900', color: '#fff' },
  bannerSub: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  refreshBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  overallCard: { backgroundColor: '#fff', borderRadius: 22, padding: 16, marginTop: 16 },
  overallTitle: { fontSize: 16, fontWeight: '800', color: G.muted, marginBottom: 14 },
  overallRow: { flexDirection: 'row', justifyContent: 'space-around' },
  overallStat: { alignItems: 'center', flex: 1 },
  overallNum: { fontSize: 28, fontWeight: '900', color: G.text },
  overallLabel: { fontSize: 12, fontWeight: '700', color: G.muted, marginTop: 4 },
  overallDivider: { width: 1, backgroundColor: G.border, alignSelf: 'stretch' },

  summaryCard: { backgroundColor: '#fff', borderRadius: 22, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#7C3AED' },
  parentName: { fontSize: 18, fontWeight: '900', color: '#111' },
  parentRel: { fontSize: 12, fontWeight: '700', color: G.muted, marginTop: 2 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  tagText: { fontSize: 11, fontWeight: '900' },

  statsRow: { flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderTopColor: G.border, paddingTop: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 22 },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '800', color: G.muted },
  statVal: { fontSize: 12, fontWeight: '700', color: G.text, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: G.border },

  progressBg: { height: 6, backgroundColor: '#EDF1F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, gap: 4 },
  footerText: { fontSize: 12, fontWeight: '700', color: G.muted },

  quickRow: { flexDirection: 'row', gap: 12 },
  quickBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center', gap: 10 },
  quickIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '900', color: G.text },

  emptyCard: { backgroundColor: '#fff', borderRadius: 22, padding: 32, marginTop: 24, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F4F6FA', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: G.text },
  emptySub: { fontSize: 14, fontWeight: '600', color: G.muted, textAlign: 'center', lineHeight: 20 },
  addBtn: { marginTop: 6, backgroundColor: G.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
