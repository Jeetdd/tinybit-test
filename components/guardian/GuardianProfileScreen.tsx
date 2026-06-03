import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, View, ScrollView, Pressable, Switch } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { GuardianHeader } from './GuardianHeader';
import { CARD_SHADOW, G } from './theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

const CHIP_COLORS = ['#FFE7D6', '#E9D5FF', '#D1FADF', '#D8F0FF', '#FFF3E0'];
const chipBg = (name: string) => CHIP_COLORS[name.charCodeAt(0) % CHIP_COLORS.length];

type ParentRow = {
  id: string; elder_id: string; initial: string; bg: string;
  name: string; sub: string; score: number;
};

type AccountRow = { id: string; icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; onPress?: () => void };

function RowItem({ icon, title, sub, onPress }: AccountRow) {
  return (
    <Pressable onPress={onPress} style={s.rowItem}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={18} color="#0284C7" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C0C8D4" />
    </Pressable>
  );
}

export default function GuardianProfileScreen() {
  const { user, profile, streak, plan, logout } = useAuth();
  const router = useRouter();

  const [parents,  setParents]  = useState<ParentRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [prefs, setPrefs] = useState({
    sos: true, missedMed: true, morning: true, location: false, dailyReport: true,
  });

  const loadParents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: links, error } = await supabase
        .from('guardian_elder_links')
        .select('id, elder_id, parent_name, relation, elder_email')
        .eq('guardian_id', user.id)
        .eq('status', 'connected');
      if (error) throw error;
      if (!links || links.length === 0) { setParents([]); return; }

      const today = new Date().toISOString().split('T')[0];
      const rows = await Promise.all(
        links.map(async (link: any): Promise<ParentRow> => {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, location')
            .eq('id', link.elder_id)
            .maybeSingle();

          // Check-in share for health score proxy
          const { data: share } = await supabase
            .from('guardian_check_in_shares')
            .select('mood_score')
            .eq('elder_id', link.elder_id)
            .eq('date', today)
            .maybeSingle();

          // Medicine adherence
          const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
          const dayEnd   = new Date(); dayEnd.setHours(23, 59, 59, 999);
          const { data: meds } = await supabase
            .from('medicines')
            .select('id, medicine_logs(taken_at)')
            .eq('user_id', link.elder_id);

          const total  = (meds ?? []).length;
          const taken  = (meds ?? []).filter((m: any) =>
            (m.medicine_logs ?? []).some((l: any) => {
              if (!l?.taken_at) return false;
              const t = new Date(l.taken_at).getTime();
              return t >= dayStart.getTime() && t <= dayEnd.getTime();
            })
          ).length;
          const medPct = total > 0 ? Math.round((taken / total) * 100) : 0;

          // Score: 40% check-in, 40% medicine, 20% mood
          const checkedIn = !!share;
          const moodScore = share?.mood_score ?? 0;
          const score = Math.round(
            (checkedIn ? 40 : 0) + (medPct * 0.4) + (moodScore > 0 ? (moodScore / 5) * 20 : 0)
          );

          const name = prof?.full_name || link.parent_name;
          return {
            id:       link.id,
            elder_id: link.elder_id,
            initial:  name[0]?.toUpperCase() ?? '?',
            bg:       chipBg(link.parent_name),
            name,
            sub:      prof?.location || link.relation,
            score,
          };
        })
      );
      setParents(rows);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { loadParents(); }, [loadParents]));

  const account: AccountRow[] = [
    { id: 'a1', icon: 'person-outline',         title: 'Edit Profile',          sub: 'Name, Photo, Contact Info',   onPress: () => router.push('/edit-profile' as any) },
    { id: 'a2', icon: 'notifications-outline',  title: 'Notification Settings', sub: 'Alert types & Timing' },
    { id: 'a3', icon: 'globe-outline',           title: 'Language',              sub: 'App Interface language' },
    { id: 'a4', icon: 'shield-checkmark-outline',title: 'Privacy & Security',    sub: 'Data usage & Permission' },
    { id: 'a5', icon: 'help-circle-outline',     title: 'Help & Support',        sub: 'FAQs, Chat with team' },
    { id: 'a6', icon: 'lock-closed-outline',     title: 'Terms & Privacy Policy',sub: 'Read our policies' },
  ];

  const displayName  = profile?.fullName || profile?.firstName || user?.email?.split('@')[0] || 'Guardian';
  const displaySub   = [profile?.role ? 'Guardian' : '', profile?.location].filter(Boolean).join(' · ') || 'Guardian';
  const planLabel    = plan?.planType && plan.planType !== 'free' ? `${plan.planType} Plan` : 'Free Plan';
  const planActive   = !!plan?.planType && plan.planType !== 'free';

  const confirmLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <GuardianHeader title="Profile" />

      <View style={s.sheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* ── Profile card ── */}
          <View style={[s.profileCard, CARD_SHADOW]}>
            <Text style={s.proLine}>{planLabel} · Active</Text>

            <View style={s.profileTop}>
              <View style={s.avatar}>
                <Ionicons name="person" size={22} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>{displayName}</Text>
                <Text style={s.sub}>{displaySub}</Text>
                {profile?.email ? <Text style={s.email} numberOfLines={1}>{profile.email}</Text> : null}
              </View>
              <View style={s.activePill}>
                <View style={s.activeDot} />
                <Text style={s.activeText}>Active</Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statVal}>{loading ? '—' : parents.length}</Text>
                <Text style={s.statLabel}>Parents</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statVal}>
                  {loading ? '—' : parents.length > 0
                    ? Math.round(parents.reduce((a, p) => a + p.score, 0) / parents.length)
                    : '—'}
                </Text>
                <Text style={s.statLabel}>Avg Score</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statVal}>{streak}d</Text>
                <Text style={s.statLabel}>Streak</Text>
              </View>
            </View>
          </View>

          {/* ── Parents I am watching ── */}
          <View style={s.sectionRow}>
            <Text style={[s.h2, { marginTop: 0 }]}>Parents I am Watching</Text>
            <Pressable onPress={() => router.push('/add-parent' as any)}>
              <Text style={s.link}>+ Add</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={G.accent} style={{ marginVertical: 16 }} />
          ) : parents.length === 0 ? (
            <Pressable style={[s.listCard, CARD_SHADOW, { padding: 20, alignItems: 'center', gap: 8 }]} onPress={() => router.push('/add-parent' as any)}>
              <Ionicons name="person-add-outline" size={28} color={G.muted} />
              <Text style={{ color: G.muted, fontWeight: '700' }}>No connected parents yet. Tap to add one.</Text>
            </Pressable>
          ) : (
            <View style={[s.listCard, CARD_SHADOW]}>
              {parents.map((p, idx) => {
                const scoreColor = p.score >= 70 ? G.success : p.score >= 40 ? G.warning : G.danger;
                return (
                  <View key={p.id} style={[s.parentRow, idx !== 0 && s.divider]}>
                    <View style={[s.initialCircle, { backgroundColor: p.bg }]}>
                      <Text style={s.initialText}>{p.initial}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.parentName} numberOfLines={1}>{p.name}</Text>
                      <Text style={s.parentSub}>{p.sub}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[s.score, { color: scoreColor }]}>{p.score}</Text>
                      <Pressable
                        onPress={() => router.push({ pathname: '/(tabs)/doctors', params: { elderUserId: p.elder_id, elderName: p.name } } as any)}
                        style={s.editElderBtn}
                        hitSlop={8}
                      >
                        <Ionicons name="medkit-outline" size={16} color="#10B981" />
                      </Pressable>
                      <Pressable
                        onPress={() => router.push({ pathname: '/edit-profile', params: { targetUserId: p.elder_id, targetName: p.name } } as any)}
                        style={s.editElderBtn}
                        hitSlop={8}
                      >
                        <Ionicons name="create-outline" size={16} color={G.accent} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Notifications ── */}
          <Text style={[s.h2, { marginTop: 18 }]}>Notifications</Text>
          <View style={[s.listCard, CARD_SHADOW]}>
            {([
              { key: 'sos',        icon: 'call-outline'          as const, title: 'SOS & Emergency alerts',  sub: 'Immediate push notification + call' },
              { key: 'missedMed',  icon: 'medkit-outline'         as const, title: 'Medicine missed alerts',   sub: 'After 30 min delay'                 },
              { key: 'morning',    icon: 'sunny-outline'          as const, title: 'Morning check-in alerts',  sub: 'If not done by 9 AM'                },
              { key: 'location',   icon: 'location-outline'       as const, title: 'Location zone alerts',     sub: 'When parent leaves safe zone'       },
              { key: 'dailyReport',icon: 'document-text-outline'  as const, title: 'Daily report at 9 PM',    sub: 'Summary delivered every evening'     },
            ] as const).map((row, idx) => (
              <View key={row.key} style={[s.toggleRow, idx !== 0 && s.divider]}>
                <View style={s.toggleLeft}>
                  <View style={s.toggleIcon}>
                    <Ionicons name={row.icon} size={18} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.toggleTitle}>{row.title}</Text>
                    <Text style={s.toggleSub}>{row.sub}</Text>
                  </View>
                </View>
                <Switch
                  value={(prefs as any)[row.key]}
                  onValueChange={v => setPrefs(p => ({ ...p, [row.key]: v }))}
                  trackColor={{ false: '#D1D5DB', true: '#5BB5A2' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#D1D5DB"
                />
              </View>
            ))}
          </View>

          {/* ── Account ── */}
          <Text style={[s.h2, { marginTop: 18 }]}>Account</Text>
          <View style={[s.listCard, CARD_SHADOW]}>
            {account.map((a, idx) => (
              <View key={a.id} style={idx === 0 ? undefined : s.divider}>
                <RowItem {...a} />
              </View>
            ))}
          </View>

          {/* ── Plan ── */}
          <Text style={[s.h2, { marginTop: 18 }]}>Your Plan</Text>
          <View style={[s.planCard, CARD_SHADOW]}>
            {planActive && (
              <View style={s.planBadge}>
                <Text style={s.planBadgeText}>Active</Text>
              </View>
            )}
            <Text style={s.planKicker}>Current Subscription</Text>
            <Text style={s.planTitle}>{planLabel}</Text>
            <View style={s.planDivider} />
            {[
              'Monitor up to 4 parents',
              'All features for each parent',
              'AI Health Watch + Pattern Detection',
              'Unlimited Family members in circle',
              'Priority caregiver support',
            ].map(t => (
              <View key={t} style={s.featureRow}>
                <Ionicons name="checkmark" size={18} color="#16A34A" />
                <Text style={s.featureText}>{t}</Text>
              </View>
            ))}
          </View>

          {/* ── Logout ── */}
          <Pressable style={[s.logoutBtn, CARD_SHADOW]} onPress={confirmLogout}>
            <Ionicons name="log-out-outline" size={18} color={G.danger} />
            <Text style={s.logoutText}>Log Out</Text>
          </Pressable>

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
  link: { fontSize: 14, fontWeight: '800', color: '#0284C7' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 12 },

  profileCard: { backgroundColor: '#fff', borderRadius: 22, padding: 16 },
  proLine: { textAlign: 'center', fontSize: 12, fontWeight: '800', color: '#6B7280', marginBottom: 12 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#D8F0FF', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '900', color: '#111' },
  sub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#A3AAB6' },
  email: { marginTop: 2, fontSize: 11, fontWeight: '600', color: '#A3AAB6' },
  activePill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#D1FADF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },
  activeText: { fontSize: 11, fontWeight: '900', color: '#16A34A' },

  statsRow: { flexDirection: 'row', marginTop: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', color: '#1D93D8' },
  statLabel: { marginTop: 4, fontSize: 12, fontWeight: '800', color: '#A3AAB6' },

  listCard: { backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' },
  divider: { borderTopWidth: 1, borderTopColor: '#EEF2F7' },

  parentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  initialCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: 18, fontWeight: '900', color: '#7C3AED' },
  parentName: { fontSize: 16, fontWeight: '900', color: '#111' },
  parentSub: { marginTop: 3, fontSize: 12, fontWeight: '700', color: '#A3AAB6' },
  score: { fontSize: 22, fontWeight: '900', color: '#0284C7' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 10 },
  toggleIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { fontSize: 15, fontWeight: '900', color: '#111' },
  toggleSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#A3AAB6' },

  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '900', color: '#111' },
  rowSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#A3AAB6' },

  planCard: { backgroundColor: '#fff', borderRadius: 22, padding: 16, overflow: 'hidden' },
  planBadge: { position: 'absolute', right: 0, top: 0, backgroundColor: '#16A34A', paddingHorizontal: 16, paddingVertical: 8, borderBottomLeftRadius: 18 },
  planBadgeText: { color: '#fff', fontWeight: '900' },
  planKicker: { fontSize: 12, fontWeight: '800', color: '#6B7280', marginBottom: 8 },
  planTitle: { fontSize: 20, fontWeight: '900', color: '#2C3E8C' },
  planDivider: { height: 1, backgroundColor: '#EEF2F7', marginVertical: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  featureText: { fontSize: 13, fontWeight: '800', color: '#111' },

  logoutBtn: {
    marginTop: 20, height: 52, borderRadius: 26,
    backgroundColor: '#FEF2F2', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  logoutText: { color: G.danger, fontWeight: '900', fontSize: 15 },

  editElderBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
});
