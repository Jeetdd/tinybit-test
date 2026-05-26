import { useState, useCallback } from 'react';
import { StatusBar, StyleSheet, Text, View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { GuardianHeader } from '../../components/guardian/GuardianHeader';
import { CARD_SHADOW, G } from '../../components/guardian/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { useGuardianElderSync } from '../../services/realtimeSync';

const CHIP_COLORS = ['#FFE7D6', '#E9D5FF', '#D1FADF', '#D8F0FF', '#FFF3E0'];
const chipBg = (name: string) => CHIP_COLORS[name.charCodeAt(0) % CHIP_COLORS.length];

type Elder = {
  elder_id:       string;
  parent_name:    string;
  relation:       string;
  elder_email:    string;
  fullName:       string | null;
  age:            number | null;
  location:       string | null;
  checkedInToday: boolean;
  medicineCount:  number;
  medicinesDone:  number;
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Action({ icon, label, bg, fg }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string; bg: string; fg: string;
}) {
  return (
    <View style={s.action}>
      <View style={[s.actionIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={fg} />
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </View>
  );
}

export default function CaregiversScreen() {
  const { user }    = useAuth();
  const router      = useRouter();
  const [elders,    setElders]    = useState<Elder[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [elderIds,  setElderIds]  = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Connected elders
      const { data: links, error: linksErr } = await supabase
        .from('guardian_elder_links')
        .select('elder_id, parent_name, relation, elder_email')
        .eq('guardian_id', user.id)
        .eq('status', 'connected');
      if (linksErr) throw linksErr;
      if (!links || links.length === 0) { setElders([]); return; }

      const elderIds = links.map((l: any) => l.elder_id).filter(Boolean);
      setElderIds(elderIds);
      const today    = new Date().toISOString().split('T')[0];
      const dayStart = `${today}T00:00:00.000Z`;
      const dayEnd   = `${today}T23:59:59.999Z`;

      // 2. Parallel fetch: profiles, check-ins, medicines, medicine logs
      const [profilesRes, checkinsRes, medsRes, logsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, age, location')
          .in('id', elderIds),
        supabase
          .from('daily_check_ins')
          .select('user_id')
          .eq('date', today)
          .in('user_id', elderIds),
        supabase
          .from('medicines')
          .select('id, user_id')
          .in('user_id', elderIds),
        supabase
          .from('medicine_logs')
          .select('medicine_id, user_id')
          .gte('taken_at', dayStart)
          .lte('taken_at', dayEnd)
          .in('user_id', elderIds),
      ]);

      // Build lookup maps
      const pMap: Record<string, any> = {};
      (profilesRes.data ?? []).forEach((p: any) => { pMap[p.id] = p; });

      const checkinSet = new Set((checkinsRes.data ?? []).map((c: any) => c.user_id));

      const medsByUser: Record<string, string[]> = {};
      (medsRes.data ?? []).forEach((m: any) => {
        if (!medsByUser[m.user_id]) medsByUser[m.user_id] = [];
        medsByUser[m.user_id].push(m.id);
      });

      const loggedMeds = new Set((logsRes.data ?? []).map((l: any) => l.medicine_id));

      const result: Elder[] = links.map((link: any) => {
        const profile       = pMap[link.elder_id] ?? null;
        const meds          = medsByUser[link.elder_id] ?? [];
        const medicinesDone = meds.filter((id) => loggedMeds.has(id)).length;
        return {
          elder_id:       link.elder_id,
          parent_name:    link.parent_name,
          relation:       link.relation,
          elder_email:    link.elder_email,
          fullName:       profile?.full_name ?? null,
          age:            profile?.age       ?? null,
          location:       profile?.location  ?? null,
          checkedInToday: checkinSet.has(link.elder_id),
          medicineCount:  meds.length,
          medicinesDone,
        };
      });

      setElders(result);
    } catch (e) {
      console.error('Caregivers load error', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useGuardianElderSync(elderIds, ['daily_check_ins', 'medicine_logs', 'profiles'], loadData);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <GuardianHeader title="Caregivers" />

      <View style={s.sheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View style={s.sectionRow}>
            <Text style={s.h2}>Parents I'm Watching</Text>
            <Pressable style={s.addBtn} onPress={() => router.push('/add-parent' as any)}>
              <Ionicons name="person-add-outline" size={15} color="#fff" />
              <Text style={s.addBtnText}>Add Parent</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator style={{ margin: 24 }} color={G.accent} />
          ) : elders.length === 0 ? (
            <View style={[s.card, CARD_SHADOW, { alignItems: 'center', paddingVertical: 32 }]}>
              <Ionicons name="people-outline" size={40} color="#B0BEC5" />
              <Text style={{ marginTop: 12, color: G.muted, fontWeight: '700', fontSize: 15 }}>
                No connected elders yet
              </Text>
              <Pressable style={[s.addBtn, { marginTop: 16 }]} onPress={() => router.push('/add-parent' as any)}>
                <Ionicons name="person-add-outline" size={15} color="#fff" />
                <Text style={s.addBtnText}>Add a Parent</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {elders.map((e) => {
                const displayName = e.fullName || e.parent_name;
                const initial     = displayName[0]?.toUpperCase() ?? '?';
                const bg          = chipBg(e.parent_name);
                const medPct      = e.medicineCount > 0
                  ? Math.round((e.medicinesDone / e.medicineCount) * 100)
                  : 0;
                const medColor    = medPct >= 80 ? G.success : medPct >= 50 ? G.warning : G.danger;

                return (
                  <View key={e.elder_id} style={[s.card, CARD_SHADOW]}>
                    {/* Header row */}
                    <View style={s.topRow}>
                      <View style={[s.avatar, { backgroundColor: bg }]}>
                        <Text style={s.avatarText}>{initial}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.name} numberOfLines={1}>{displayName}</Text>
                        <Text style={s.sub}>
                          {e.relation}{e.age ? ` · ${e.age} yrs` : ''}
                        </Text>
                        <View style={s.tagRow}>
                          <View style={[s.tag, { backgroundColor: e.checkedInToday ? '#D1FADF' : '#FFE7D6' }]}>
                            <Ionicons
                              name={e.checkedInToday ? 'checkmark-circle' : 'close-circle'}
                              size={12}
                              color={e.checkedInToday ? G.success : '#F97316'}
                            />
                            <Text style={[s.tagText, { color: e.checkedInToday ? G.success : '#F97316' }]}>
                              {e.checkedInToday ? 'Checked In' : 'No Check-in'}
                            </Text>
                          </View>
                          {e.location ? (
                            <View style={[s.tag, { backgroundColor: '#E0F2FE' }]}>
                              <Ionicons name="location-outline" size={11} color="#0284C7" />
                              <Text style={[s.tagText, { color: '#0284C7' }]} numberOfLines={1}>
                                {e.location}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    {/* Stats row */}
                    <View style={s.statsRow}>
                      <Stat value={`${medPct}%`}           label="Med Rate"   />
                      <Stat value={`${e.medicinesDone}`}   label="Taken"      />
                      <Stat value={`${e.medicineCount}`}   label="Total Meds" />
                      <Stat value={e.checkedInToday ? '✓' : '—'} label="Check-in" />
                    </View>

                    {/* Medicine progress bar */}
                    {e.medicineCount > 0 && (
                      <View style={{ marginTop: 14 }}>
                        <View style={s.taskHeader}>
                          <Text style={s.taskTitle}>Today's Medicines</Text>
                          <Text style={[s.taskDone, { color: medColor }]}>
                            {e.medicinesDone}/{e.medicineCount} taken
                          </Text>
                        </View>
                        <View style={s.progressBg}>
                          <View style={[s.progressFill, { width: `${medPct}%` as any, backgroundColor: medColor }]} />
                        </View>
                      </View>
                    )}

                    {/* Quick actions */}
                    <View style={s.actionsRow}>
                      <Action icon="call-outline"                label="Call"       bg="#CDEFD0" fg={G.success} />
                      <Action icon="mic-outline"                 label="Voice Note" bg="#CFEAF8" fg="#0284C7"   />
                      <Action icon="chatbubble-ellipses-outline" label="Message"    bg="#FFE2D2" fg="#F97316"   />
                      <Action icon="medkit-outline"              label="Medicines"  bg="#E7E4F8" fg="#6366F1"   />
                    </View>
                  </View>
                );
              })}
            </View>
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

  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h2:          { fontSize: 22, fontWeight: '900', color: G.text },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: G.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  addBtnText:  { color: '#fff', fontWeight: '900', fontSize: 13 },

  card:        { backgroundColor: '#fff', borderRadius: 22, padding: 16 },
  topRow:      { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar:      { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 18, fontWeight: '900', color: '#0284C7' },
  name:        { fontSize: 18, fontWeight: '900', color: G.text },
  sub:         { marginTop: 2, fontSize: 12, fontWeight: '700', color: G.muted },
  tagRow:      { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  tag:         { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  tagText:     { fontWeight: '800', fontSize: 12 },

  statsRow:    { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: G.border, paddingTop: 14 },
  stat:        { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 20, fontWeight: '900', color: G.accent },
  statLabel:   { marginTop: 4, fontSize: 11, fontWeight: '800', color: G.muted },

  taskHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskTitle:   { fontSize: 14, fontWeight: '900', color: G.text },
  taskDone:    { fontSize: 13, fontWeight: '900' },
  progressBg:  { height: 8, backgroundColor: G.border, borderRadius: 8, overflow: 'hidden' },
  progressFill:{ height: '100%', borderRadius: 8 },

  actionsRow:  { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between' },
  action:      { width: '24%', alignItems: 'center', gap: 8, paddingVertical: 8 },
  actionIcon:  { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '900', color: G.text },
});
