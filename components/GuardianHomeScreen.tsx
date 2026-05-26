import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator, Dimensions, Modal, Platform, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARD_SHADOW, G } from './guardian/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { useUnreadNotifCount } from '../services/notifications';

const { width: SCREEN_W } = Dimensions.get('window');

const AVATAR_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', great: '😄', good: '🙂', neutral: '😐',
  sad: '😢', anxious: '😰', tired: '😴', calm: '😌', angry: '😠',
};

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const todayDowIndex = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();

const ELDER_PIN_COLORS = ['#4F46E5', '#059669', '#F59E0B', '#0284C7', '#DC2626', '#7C3AED'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

type Medicine = {
  id: string; name: string; time: string | null; dosage: string | null;
  medicine_logs: { taken_at: string }[];
};

type Elder = {
  id: string; elder_id: string; parent_name: string; relation: string; elder_email: string;
  profile?: { full_name: string | null; location: string | null; phone: string | null; emergency_phone: string | null };
  checkedInToday: boolean; medTaken: number; medTotal: number;
  todayMood: string | null; moodScore: number; moodNote: string | null;
};

type ElderLoc = {
  latitude: number; longitude: number; accuracy: number | null;
  address: string | null; is_sharing: boolean; updated_at: string;
};

function isTakenToday(logs: { taken_at: string }[]) {
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = new Date(); dayEnd.setHours(23, 59, 59, 999);
  return logs.some(l => {
    const t = new Date(l.taken_at).getTime();
    return t >= dayStart.getTime() && t <= dayEnd.getTime();
  });
}

function getMapRegion(locs: ElderLoc[]) {
  if (locs.length === 0) return null;
  if (locs.length === 1) return {
    latitude: locs[0].latitude, longitude: locs[0].longitude,
    latitudeDelta: 0.01, longitudeDelta: 0.01,
  };
  const lats = locs.map(l => l.latitude);
  const lngs = locs.map(l => l.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude:      (minLat + maxLat) / 2,
    longitude:     (minLng + maxLng) / 2,
    latitudeDelta:  Math.max((maxLat - minLat) * 1.6, 0.012),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.012),
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Avatar({ name, size = 48, color }: { name: string; size?: number; color?: string }) {
  const bg = color || avatarColor(name);
  return (
    <View style={[s.avatarBase, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.38 }]}>{name[0]?.toUpperCase()}</Text>
    </View>
  );
}

function StatPill({ icon, value, label, color }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; color: string }) {
  return (
    <View style={[s.statPill, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={14} color={color} />
      <View>
        <Text style={[s.statPillValue, { color }]}>{value}</Text>
        <Text style={s.statPillLabel}>{label}</Text>
      </View>
    </View>
  );
}

function FeatureCard({
  icon, iconBg, iconColor, title, subtitle, badge, badgeColor,
  onPress, fullWidth,
}: {
  icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string;
  title: string; subtitle: string; badge?: string; badgeColor?: string;
  onPress: () => void; fullWidth?: boolean;
}) {
  return (
    <Pressable
      style={[s.featureCard, CARD_SHADOW, fullWidth && { width: '100%' }]}
      onPress={onPress}
    >
      <View style={[s.featureIconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={s.featureTitle}>{title}</Text>
      <Text style={s.featureSub} numberOfLines={2}>{subtitle}</Text>
      {badge ? (
        <View style={[s.featureBadge, { backgroundColor: (badgeColor || iconColor) + '1A' }]}>
          <Text style={[s.featureBadgeText, { color: badgeColor || iconColor }]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function GuardianHomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user, profile } = useAuth();

  const unreadCount = useUnreadNotifCount(user?.id);

  const [elders,          setElders]          = useState<Elder[]>([]);
  const [activeIdx,       setActiveIdx]       = useState(0);
  const [loadingElders,   setLoadingElders]   = useState(true);
  const [meds,            setMeds]            = useState<Medicine[]>([]);
  const [loadingMeds,     setLoadingMeds]     = useState(false);
  const [elderLocations,  setElderLocations]  = useState<Record<string, ElderLoc>>({});
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const loadElders = useCallback(async () => {
    if (!user) return;
    try {
      const { data: links, error } = await supabase
        .from('guardian_elder_links')
        .select('id, elder_id, parent_name, relation, elder_email')
        .eq('guardian_id', user.id)
        .eq('status', 'connected')
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!links || links.length === 0) { setElders([]); return; }

      const enriched = await Promise.all(
        links.map(async (link: any): Promise<Elder> => {
          const [profRes, checkInRes, medsRes] = await Promise.all([
            supabase.from('profiles')
              .select('full_name, location, phone, emergency_phone')
              .eq('id', link.elder_id).maybeSingle(),
            supabase.from('guardian_check_in_shares')
              .select('mood, mood_score, note')
              .eq('elder_id', link.elder_id).eq('date', today).maybeSingle(),
            supabase.from('medicines')
              .select('id, medicine_logs(taken_at)')
              .eq('user_id', link.elder_id),
          ]);
          const medList  = medsRes.data ?? [];
          const medTaken = medList.filter((m: any) => isTakenToday(m.medicine_logs ?? [])).length;
          return {
            id: link.id, elder_id: link.elder_id, parent_name: link.parent_name,
            relation: link.relation, elder_email: link.elder_email,
            profile: profRes.data ?? undefined,
            checkedInToday: !!checkInRes.data,
            medTaken, medTotal: medList.length,
            todayMood: checkInRes.data?.mood ?? null,
            moodScore: checkInRes.data?.mood_score ?? 0,
            moodNote:  checkInRes.data?.note ?? null,
          };
        })
      );
      setElders(enriched);
    } catch (e) { console.error(e); }
    finally { setLoadingElders(false); }
  }, [user, today]);

  useFocusEffect(useCallback(() => { loadElders(); }, [loadElders]));

  const elderIdKey = elders.map(e => e.elder_id).join(',');
  useEffect(() => {
    if (!elderIdKey) return;
    const channels = elders.map(elder =>
      supabase.channel(`elder-${elder.elder_id}`)
        .on('broadcast', { event: 'medicine-update' }, () => loadElders())
        .on('broadcast', { event: 'checkin-update' }, () => loadElders())
        .subscribe()
    );
    const poll = setInterval(loadElders, 30_000);
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); clearInterval(poll); };
  }, [elderIdKey]);

  const active = elders[activeIdx];

  useEffect(() => {
    if (!active?.elder_id) { setMeds([]); return; }
    setLoadingMeds(true);
    (async () => {
      try {
        const { data } = await supabase.from('medicines')
          .select('id, name, time, dosage, medicine_logs(taken_at)')
          .eq('user_id', active.elder_id);
        setMeds((data as Medicine[]) ?? []);
      } catch (e) { console.error(e); }
      finally { setLoadingMeds(false); }
    })();
  }, [active?.elder_id]);

  useEffect(() => {
    if (elders.length === 0) { setElderLocations({}); return; }
    const ids = elders.map(e => e.elder_id);
    supabase.from('elder_locations')
      .select('elder_id,latitude,longitude,accuracy,address,is_sharing,updated_at')
      .in('elder_id', ids)
      .then(({ data }) => {
        const map: Record<string, ElderLoc> = {};
        (data ?? []).forEach((l: any) => { map[l.elder_id] = l; });
        setElderLocations(map);
      });
    const channels = ids.map(id =>
      supabase.channel(`home-loc-${id}`)
        .on('postgres_changes' as any,
          { event: '*', schema: 'public', table: 'elder_locations', filter: `elder_id=eq.${id}` },
          ({ new: row }: any) => {
            if (row?.elder_id) setElderLocations(prev => ({ ...prev, [row.elder_id]: row }));
          })
        .subscribe()
    );
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [elderIdKey]);

  const guardianName = profile?.firstName || profile?.fullName?.split(' ')[0] || 'Guardian';
  const todayMeds = meds.map(m => ({ ...m, taken: isTakenToday(m.medicine_logs) }));

  // Location data for the active elder
  const activeLoc = active ? elderLocations[active.elder_id] : null;
  const locsWithCoords = elders
    .map((e, i) => ({ elder: e, loc: elderLocations[e.elder_id], idx: i }))
    .filter(x => !!x.loc);
  const liveCount  = locsWithCoords.filter(x => x.loc!.is_sharing).length;
  const mapRegion  = getMapRegion(locsWithCoords.map(x => x.loc!));

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Gradient Header ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={[G.headerStart, G.headerEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 14 }]}
      >
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greetingLabel}>{getGreeting()},</Text>
            <Text style={s.greetingName}>{guardianName} 👋</Text>
            <Text style={s.greetingDate}>{formatDate()}</Text>
          </View>
          <View style={s.headerActions}>
            <Pressable
              style={s.headerIconBtn}
              onPress={() => router.push('/notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              {unreadCount > 0 && (
                <View style={s.notifBadge}>
                  <Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              style={s.guardianAvatarBtn}
              onPress={() => router.push('/profile' as any)}
            >
              <Avatar name={guardianName} size={40} color="rgba(255,255,255,0.3)" />
            </Pressable>
          </View>
        </View>

        {/* Parent selector pills */}
        {!loadingElders && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.parentPillScroll}
            contentContainerStyle={s.parentPillContent}
          >
            {elders.map((e, i) => {
              const name = (e.profile?.full_name || e.parent_name).split(' ')[0];
              const active = i === activeIdx;
              return (
                <Pressable
                  key={e.id}
                  style={[s.parentPill, active && s.parentPillActive]}
                  onPress={() => setActiveIdx(i)}
                >
                  <Avatar
                    name={name}
                    size={26}
                    color={active ? 'rgba(255,255,255,0.25)' : avatarColor(e.parent_name)}
                  />
                  <Text style={[s.parentPillText, active && s.parentPillTextActive]}>
                    {name}
                  </Text>
                  {active && (
                    <View style={s.parentPillDot} />
                  )}
                </Pressable>
              );
            })}
            <Pressable
              style={s.addParentPill}
              onPress={() => router.push('/add-parent' as any)}
            >
              <Ionicons name="add" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={s.addParentPillText}>Add Parent</Text>
            </Pressable>
          </ScrollView>
        )}
      </LinearGradient>

      {/* ── Scrollable Content ───────────────────────────────────────────── */}
      <View style={s.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >

          {/* Loading state */}
          {loadingElders && (
            <ActivityIndicator style={{ marginTop: 32 }} size="large" color={G.accent} />
          )}

          {/* Empty state — no parents connected */}
          {!loadingElders && elders.length === 0 && (
            <Pressable
              style={[s.emptyCard, CARD_SHADOW]}
              onPress={() => router.push('/add-parent' as any)}
            >
              <LinearGradient
                colors={['#EEF2FF', '#F0FDF4']}
                style={s.emptyGradient}
              >
                <View style={s.emptyIconRing}>
                  <Ionicons name="people" size={36} color={G.accent} />
                </View>
                <Text style={s.emptyTitle}>Connect Your First Parent</Text>
                <Text style={s.emptySub}>
                  Send an invitation to your parent's TinyBit account to start monitoring their health and wellbeing.
                </Text>
                <View style={s.emptyBtn}>
                  <Ionicons name="person-add" size={16} color="#fff" />
                  <Text style={s.emptyBtnText}>Add Parent / Elder</Text>
                </View>
              </LinearGradient>
            </Pressable>
          )}

          {active && (
            <>
              {/* ── Hero Parent Card ─────────────────────────────────────── */}
              <View style={[s.heroCard, CARD_SHADOW]}>
                <LinearGradient
                  colors={['#FAFBFF', '#F0F4FF']}
                  style={s.heroGradient}
                >
                  {/* Card header */}
                  <View style={s.heroTop}>
                    <Avatar
                      name={active.profile?.full_name || active.parent_name}
                      size={62}
                      color={avatarColor(active.parent_name)}
                    />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={s.heroName}>
                        {active.profile?.full_name || active.parent_name}
                      </Text>
                      <Text style={s.heroRelation}>
                        {active.relation}
                        {active.profile?.location ? ` · ${active.profile.location}` : ''}
                      </Text>
                      <View style={[
                        s.heroStatusBadge,
                        { backgroundColor: active.checkedInToday ? '#D1FADF' : '#FEF3C7' },
                      ]}>
                        <View style={[
                          s.heroStatusDot,
                          { backgroundColor: active.checkedInToday ? '#16A34A' : '#F59E0B' },
                        ]} />
                        <Text style={[
                          s.heroStatusText,
                          { color: active.checkedInToday ? '#16A34A' : '#92400E' },
                        ]}>
                          {active.checkedInToday ? 'Checked in today' : 'No check-in yet'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Quick stats row */}
                  <View style={s.heroStatsRow}>
                    <StatPill
                      icon="medkit"
                      value={`${active.medTaken}/${active.medTotal}`}
                      label="Medicines"
                      color="#2F8BC5"
                    />
                    <StatPill
                      icon="happy"
                      value={active.todayMood
                        ? active.todayMood.charAt(0).toUpperCase() + active.todayMood.slice(1)
                        : 'No data'}
                      label="Mood"
                      color="#8B5CF6"
                    />
                    <StatPill
                      icon="location"
                      value={activeLoc?.is_sharing ? 'Live' : 'Offline'}
                      label="Location"
                      color={activeLoc?.is_sharing ? '#16A34A' : '#94A3B8'}
                    />
                  </View>

                  {/* Medicine progress bar */}
                  {active.medTotal > 0 && (
                    <View style={s.heroProgressWrap}>
                      <View style={s.heroProgressRow}>
                        <Text style={s.heroProgressLabel}>Medicine progress today</Text>
                        <Text style={[
                          s.heroProgressPct,
                          { color: active.medTaken === active.medTotal ? G.success : G.accent },
                        ]}>
                          {Math.round((active.medTaken / active.medTotal) * 100)}%
                        </Text>
                      </View>
                      <View style={s.heroProgressBg}>
                        <View style={[
                          s.heroProgressFill,
                          {
                            width: `${(active.medTaken / active.medTotal) * 100}%` as any,
                            backgroundColor: active.medTaken === active.medTotal ? G.success : G.accent,
                          },
                        ]} />
                      </View>
                    </View>
                  )}

                  {/* Footer button */}
                  <Pressable
                    style={s.heroReportBtn}
                    onPress={() => router.push('/guardian-summary' as any)}
                  >
                    <Text style={s.heroReportText}>View Full Health Report</Text>
                    <Ionicons name="chevron-forward" size={16} color={G.accent} />
                  </Pressable>
                </LinearGradient>
              </View>

              {/* ── Feature Grid (2×2) ───────────────────────────────────── */}
              <Text style={s.sectionTitle}>Quick Access</Text>
              <View style={s.featureGrid}>
                <FeatureCard
                  icon="medkit"
                  iconBg="#EFF6FF"
                  iconColor="#2563EB"
                  title="Medicines"
                  subtitle={active.medTotal > 0
                    ? `${active.medTaken} of ${active.medTotal} taken today`
                    : 'No medicines added'}
                  badge={active.medTotal > 0 && active.medTaken < active.medTotal
                    ? `${active.medTotal - active.medTaken} pending`
                    : active.medTaken === active.medTotal && active.medTotal > 0
                      ? 'All done ✓'
                      : undefined}
                  badgeColor={active.medTaken === active.medTotal && active.medTotal > 0
                    ? G.success : '#F59E0B'}
                  onPress={() => router.push('/parent-medicines' as any)}
                />
                <FeatureCard
                  icon="happy"
                  iconBg="#FAF5FF"
                  iconColor="#7C3AED"
                  title="Mood & Check-in"
                  subtitle={active.todayMood
                    ? `Feeling ${active.todayMood} today`
                    : 'No check-in recorded yet'}
                  badge={active.todayMood ? MOOD_EMOJI[active.todayMood] : '🔔'}
                  badgeColor={active.todayMood ? '#7C3AED' : '#F59E0B'}
                  onPress={() => router.push('/guardian-summary' as any)}
                />
                <FeatureCard
                  icon="location"
                  iconBg="#F0FDF4"
                  iconColor="#16A34A"
                  title="Live Location"
                  subtitle={activeLoc?.address || activeLoc?.is_sharing
                    ? (activeLoc?.address || 'Location shared')
                    : 'Location not shared'}
                  badge={activeLoc?.is_sharing ? 'Live' : 'Offline'}
                  badgeColor={activeLoc?.is_sharing ? G.success : '#94A3B8'}
                  onPress={() => router.push('/location' as any)}
                />
                <FeatureCard
                  icon="notifications"
                  iconBg="#FFF7ED"
                  iconColor="#EA580C"
                  title="Alerts"
                  subtitle="Medicine, check-in & emergency alerts"
                  onPress={() => router.push('/alerts' as any)}
                />
                <FeatureCard
                  icon="folder-open"
                  iconBg="#EFF6FF"
                  iconColor="#1D4ED8"
                  title="Health Vault"
                  subtitle="View & upload medical reports, prescriptions, X-rays"
                  fullWidth
                  onPress={() => setVaultPickerOpen(true)}
                />
              </View>

              {/* ── Voice Message Card ───────────────────────────────────── */}
              <Text style={s.sectionTitle}>Voice Message</Text>
              <View style={[s.card, CARD_SHADOW]}>
                <View style={s.voiceTop}>
                  <Avatar
                    name={active.profile?.full_name || active.parent_name}
                    size={44}
                    color={avatarColor(active.parent_name)}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.voiceTo}>
                      To: {active.profile?.full_name || active.parent_name}
                    </Text>
                    <Text style={s.voiceSub}>Send a voice note directly to their app</Text>
                  </View>
                </View>
                <Pressable
                  style={s.micBtn}
                  onPress={() => router.push('/family-messages' as any)}
                >
                  <LinearGradient
                    colors={[G.headerStart, G.headerEnd]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.micBtnGrad}
                  >
                    <View style={s.micCircle}>
                      <Ionicons name="mic" size={24} color="#fff" />
                    </View>
                    <Text style={s.micBtnText}>Record & Send Voice Message</Text>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
                  </LinearGradient>
                </Pressable>
                <Pressable
                  style={s.historyRow}
                  onPress={() => router.push('/family-messages' as any)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color={G.accent} />
                  <Text style={s.historyText}>View Message History</Text>
                  <View style={{ flex: 1 }} />
                  <Ionicons name="chevron-forward" size={15} color={G.muted} />
                </Pressable>
              </View>

              {/* ── Medicine List Card ───────────────────────────────────── */}
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Today's Medicines</Text>
                <Pressable onPress={() => router.push('/parent-medicines' as any)}>
                  <Text style={s.sectionLink}>Manage All</Text>
                </Pressable>
              </View>
              <View style={[s.card, CARD_SHADOW]}>
                <View style={s.medSummaryRow}>
                  <View style={s.medCountWrap}>
                    <Text style={s.medCountBig}>{active.medTaken}</Text>
                    <Text style={s.medCountSlash}>/{active.medTotal}</Text>
                  </View>
                  <Text style={s.medCountLabel}>medicines taken today</Text>
                  <View style={[
                    s.medPctCircle,
                    { borderColor: active.medTaken === active.medTotal && active.medTotal > 0 ? G.success : G.accent },
                  ]}>
                    <Text style={[
                      s.medPctText,
                      { color: active.medTaken === active.medTotal && active.medTotal > 0 ? G.success : G.accent },
                    ]}>
                      {active.medTotal > 0
                        ? `${Math.round((active.medTaken / active.medTotal) * 100)}%`
                        : '—'}
                    </Text>
                  </View>
                </View>

                <View style={s.medProgressBg}>
                  <View style={[s.medProgressFill, {
                    width: `${active.medTotal > 0 ? (active.medTaken / active.medTotal) * 100 : 0}%` as any,
                    backgroundColor: active.medTaken === active.medTotal && active.medTotal > 0
                      ? G.success : G.accent,
                  }]} />
                </View>

                {loadingMeds ? (
                  <ActivityIndicator style={{ marginTop: 16 }} color={G.accent} />
                ) : todayMeds.length === 0 ? (
                  <View style={s.emptyMedWrap}>
                    <View style={s.emptyMedIcon}>
                      <Ionicons name="medkit-outline" size={22} color={G.muted} />
                    </View>
                    <Text style={s.emptyMedText}>No medicines added yet</Text>
                    <Pressable
                      style={s.addMedBtn}
                      onPress={() => router.push('/parent-medicines' as any)}
                    >
                      <Text style={s.addMedBtnText}>+ Add Medicine</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ marginTop: 14, gap: 10 }}>
                    {todayMeds.slice(0, 5).map(med => (
                      <View key={med.id} style={s.medRow}>
                        <View style={[
                          s.medCheckIcon,
                          { backgroundColor: med.taken ? '#DCFCE7' : '#FEF9C3' },
                        ]}>
                          <Ionicons
                            name={med.taken ? 'checkmark' : 'time-outline'}
                            size={15}
                            color={med.taken ? '#16A34A' : '#F59E0B'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.medName} numberOfLines={1}>{med.name}</Text>
                          {med.time ? <Text style={s.medTime}>{med.time}</Text> : null}
                        </View>
                        <View style={[
                          s.medBadge,
                          { backgroundColor: med.taken ? '#DCFCE7' : '#FEF9C3' },
                        ]}>
                          <Text style={[
                            s.medBadgeText,
                            { color: med.taken ? '#15803D' : '#92400E' },
                          ]}>
                            {med.taken ? 'Taken ✓' : 'Pending'}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {todayMeds.length > 5 && (
                      <Pressable
                        style={s.viewMoreRow}
                        onPress={() => router.push('/parent-medicines' as any)}
                      >
                        <Text style={s.viewMoreText}>
                          +{todayMeds.length - 5} more medicines · View all
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={G.accent} />
                      </Pressable>
                    )}
                  </View>
                )}
              </View>

              {/* ── Mood Card ────────────────────────────────────────────── */}
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Today's Mood</Text>
                <Pressable onPress={() => router.push('/guardian-summary' as any)}>
                  <Text style={s.sectionLink}>Full Report</Text>
                </Pressable>
              </View>
              <View style={[s.card, CARD_SHADOW]}>
                {active.todayMood ? (
                  <View style={s.moodContent}>
                    <View style={s.moodEmojiCircle}>
                      <Text style={s.moodEmoji}>{MOOD_EMOJI[active.todayMood] ?? '🙂'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.moodWho}>
                        {(active.profile?.full_name || active.parent_name).split(' ')[0]} is feeling
                      </Text>
                      <Text style={s.moodValue}>
                        {active.todayMood.charAt(0).toUpperCase() + active.todayMood.slice(1)}
                      </Text>
                      {active.moodNote ? (
                        <Text style={s.moodNote} numberOfLines={2}>"{active.moodNote}"</Text>
                      ) : null}
                    </View>
                    {active.moodScore > 0 && (
                      <View style={s.moodScoreWrap}>
                        <Text style={s.moodScore}>{active.moodScore}</Text>
                        <Text style={s.moodScoreOf}>/5</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={s.noMoodRow}>
                    <View style={s.noMoodIcon}>
                      <Ionicons name="moon-outline" size={26} color={G.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.noMoodTitle}>No check-in yet today</Text>
                      <Text style={s.noMoodSub}>
                        {(active.profile?.full_name || active.parent_name).split(' ')[0]} hasn't completed their daily check-in.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Weekly mood dots */}
                <View style={s.weekRow}>
                  {WEEK_LABELS.map((label, i) => {
                    const isToday = i === todayDowIndex;
                    const hasMood = isToday && !!active.todayMood;
                    return (
                      <View key={label + i} style={s.weekDay}>
                        <View style={[
                          s.weekDot,
                          hasMood      && s.weekDotDone,
                          isToday && !hasMood && s.weekDotPending,
                        ]} />
                        <Text style={[s.weekLabel, isToday && s.weekLabelToday]}>
                          {label[0]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ── Location Preview ─────────────────────────────────────── */}
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>Location Check</Text>
                  {elders.length > 1 && (
                    <Text style={s.sectionSub}>{liveCount}/{elders.length} sharing live</Text>
                  )}
                </View>
                <Pressable onPress={() => router.push('/location' as any)}>
                  <Text style={s.sectionLink}>Full Map</Text>
                </Pressable>
              </View>
              <View style={[s.locCard, CARD_SHADOW]}>
                <View style={s.locMapWrap}>
                  {mapRegion ? (
                    <MapView
                      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                      style={{ height: 180, width: '100%' }}
                      region={mapRegion}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                    >
                      {locsWithCoords.map(({ elder, loc, idx }) => (
                        <Marker
                          key={elder.elder_id}
                          coordinate={{ latitude: loc!.latitude, longitude: loc!.longitude }}
                          title={elder.profile?.full_name || elder.parent_name}
                          pinColor={ELDER_PIN_COLORS[idx % ELDER_PIN_COLORS.length]}
                        />
                      ))}
                    </MapView>
                  ) : (
                    <View style={s.locPlaceholder}>
                      <View style={s.locPlaceholderIcon}>
                        <Ionicons name="map-outline" size={32} color="#94A3B8" />
                      </View>
                      <Text style={s.locPlaceholderTitle}>No live locations yet</Text>
                      <Text style={s.locPlaceholderSub}>
                        Ask your elders to enable location sharing in their app
                      </Text>
                    </View>
                  )}
                  {/* Live badge */}
                  <View style={[s.liveBadge, {
                    backgroundColor: liveCount > 0
                      ? 'rgba(22,163,74,0.9)' : 'rgba(100,116,139,0.8)',
                  }]}>
                    <View style={s.liveDot} />
                    <Text style={s.liveBadgeText}>
                      {liveCount > 0
                        ? elders.length > 1 ? `${liveCount}/${elders.length} Live` : 'Live'
                        : 'Offline'}
                    </Text>
                  </View>
                </View>

                {/* Elder location cards (horizontal) */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.locElderScroll}
                >
                  {elders.map((elder, idx) => {
                    const loc     = elderLocations[elder.elder_id];
                    const isLive  = loc?.is_sharing ?? false;
                    const name    = (elder.profile?.full_name || elder.parent_name).split(' ')[0];
                    const color   = ELDER_PIN_COLORS[idx % ELDER_PIN_COLORS.length];
                    return (
                      <Pressable
                        key={elder.elder_id}
                        style={[s.locElderCard, isLive && s.locElderCardLive]}
                        onPress={() => router.push('/location' as any)}
                      >
                        <View style={s.locElderAvatarWrap}>
                          <Avatar name={name} size={40} color={color} />
                          <View style={[s.locOnlineDot, {
                            backgroundColor: isLive ? '#16A34A' : '#CBD5E1',
                          }]} />
                        </View>
                        <Text style={s.locElderName} numberOfLines={1}>{name}</Text>
                        <View style={[s.locStatusChip, {
                          backgroundColor: isLive ? '#DCFCE7' : '#F1F5F9',
                        }]}>
                          <Text style={[s.locStatusText, { color: isLive ? '#15803D' : '#94A3B8' }]}>
                            {isLive ? '● Live' : 'Offline'}
                          </Text>
                        </View>
                        {loc?.updated_at && (
                          <Text style={s.locUpdatedAt}>{timeAgo(loc.updated_at)}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Bottom action */}
                <View style={s.locActionRow}>
                  <View style={s.locActionLeft}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={G.muted} />
                    <Text style={s.locActionText}>
                      {liveCount > 0
                        ? `${liveCount} elder${liveCount > 1 ? 's' : ''} sharing live location`
                        : 'No elders sharing location'}
                    </Text>
                  </View>
                  <Pressable
                    style={s.locOpenBtn}
                    onPress={() => router.push('/location' as any)}
                  >
                    <Ionicons name="navigate" size={13} color="#fff" />
                    <Text style={s.locOpenBtnText}>Open Map</Text>
                  </Pressable>
                </View>
              </View>

              {/* ── Bottom spacer ────────────────────────────────────────── */}
              <View style={{ height: 32 }} />
            </>
          )}

        </ScrollView>
      </View>

      {/* ── Health Vault Picker Modal ────────────────────────────────── */}
      <Modal
        visible={vaultPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setVaultPickerOpen(false)}
      >
        <Pressable
          style={s.vaultOverlay}
          onPress={() => setVaultPickerOpen(false)}
        >
          <View style={s.vaultSheet}>
            <View style={s.vaultHandle} />
            <Text style={s.vaultTitle}>Health Vault</Text>
            <Text style={s.vaultSub}>Choose whose records to open</Text>

            {/* Guardian's own vault */}
            <Pressable
              style={s.vaultRow}
              onPress={() => {
                setVaultPickerOpen(false);
                router.push('/health-vault' as any);
              }}
            >
              <View style={[s.vaultIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="person" size={20} color="#1D4ED8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.vaultRowName}>My Health Vault</Text>
                <Text style={s.vaultRowSub}>Your own medical records</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={G.muted} />
            </Pressable>

            {/* One row per connected elder */}
            {elders.map((elder) => {
              const name = elder.profile?.full_name || elder.parent_name;
              return (
                <Pressable
                  key={elder.id}
                  style={s.vaultRow}
                  onPress={() => {
                    setVaultPickerOpen(false);
                    router.push({
                      pathname: '/health-vault' as any,
                      params: { elderId: elder.elder_id, elderName: name },
                    });
                  }}
                >
                  <View style={[s.vaultIconCircle, { backgroundColor: avatarColor(elder.parent_name) + '22' }]}>
                    <Avatar name={name} size={32} color={avatarColor(elder.parent_name)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.vaultRowName}>{name}</Text>
                    <Text style={s.vaultRowSub}>{elder.relation} · Medical records</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={G.muted} />
                </Pressable>
              );
            })}

            <Pressable
              style={s.vaultCancelBtn}
              onPress={() => setVaultPickerOpen(false)}
            >
              <Text style={s.vaultCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const CARD_W = (SCREEN_W - 48) / 2;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.bg },

  // ── Header ────────────────────────────────────────────────────────────────
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  greetingLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  greetingName:  { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 2 },
  greetingDate:  { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)',
  },
  notifBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff' },
  guardianAvatarBtn: {
    borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },

  // ── Parent pills ──────────────────────────────────────────────────────────
  parentPillScroll:   { marginBottom: 4 },
  parentPillContent:  { gap: 8, paddingBottom: 4 },
  parentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  parentPillActive: { backgroundColor: 'rgba(255,255,255,0.28)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  parentPillText:       { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  parentPillTextActive: { color: '#fff', fontWeight: '900' },
  parentPillDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  addParentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderStyle: 'dashed',
  },
  addParentPillText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },

  // ── Sheet ─────────────────────────────────────────────────────────────────
  sheet: {
    flex: 1, marginTop: -20,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: G.bg, overflow: 'hidden',
  },
  content: { padding: 16, paddingBottom: 130 },

  // ── Section headers ───────────────────────────────────────────────────────
  sectionTitle: { fontSize: 20, fontWeight: '900', color: G.text, marginTop: 24, marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, marginBottom: 12,
  },
  sectionLink:  { fontSize: 13, fontWeight: '800', color: G.accent },
  sectionSub:   { fontSize: 12, fontWeight: '600', color: G.muted, marginTop: 2 },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyCard:     { borderRadius: 24, overflow: 'hidden', marginTop: 8 },
  emptyGradient: { padding: 28, alignItems: 'center', gap: 12 },
  emptyIconRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: G.text, textAlign: 'center' },
  emptySub:   { fontSize: 14, fontWeight: '600', color: G.muted, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: G.accent, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 28, marginTop: 4,
  },
  emptyBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  // ── Avatar base ───────────────────────────────────────────────────────────
  avatarBase:  { alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontWeight: '900', color: '#fff' },

  // ── Stat pill ─────────────────────────────────────────────────────────────
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 14, flex: 1,
  },
  statPillValue: { fontSize: 13, fontWeight: '900' },
  statPillLabel: { fontSize: 10, fontWeight: '600', color: G.muted, marginTop: 1 },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard:     { borderRadius: 24, overflow: 'hidden' },
  heroGradient: { padding: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  heroName:     { fontSize: 19, fontWeight: '900', color: G.text },
  heroRelation: { fontSize: 13, fontWeight: '700', color: G.muted, marginTop: 3 },
  heroStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, marginTop: 8, alignSelf: 'flex-start',
  },
  heroStatusDot:  { width: 6, height: 6, borderRadius: 3 },
  heroStatusText: { fontSize: 11, fontWeight: '800' },
  heroStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  heroProgressWrap: { marginBottom: 14 },
  heroProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  heroProgressLabel: { fontSize: 12, fontWeight: '700', color: G.muted },
  heroProgressPct:   { fontSize: 12, fontWeight: '900' },
  heroProgressBg:    { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  heroProgressFill:  { height: '100%', borderRadius: 3 },
  heroReportBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: G.border,
  },
  heroReportText: { flex: 1, fontSize: 14, fontWeight: '800', color: G.accent },

  // ── Feature grid ─────────────────────────────────────────────────────────
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: {
    width: CARD_W, backgroundColor: '#fff', borderRadius: 22, padding: 16,
    gap: 6,
  },
  featureIconCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  featureTitle: { fontSize: 15, fontWeight: '900', color: G.text },
  featureSub:   { fontSize: 12, fontWeight: '600', color: G.muted, lineHeight: 17 },
  featureBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, alignSelf: 'flex-start', marginTop: 4,
  },
  featureBadgeText: { fontSize: 11, fontWeight: '900' },

  // ── Card base ─────────────────────────────────────────────────────────────
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 16 },

  // ── Voice ─────────────────────────────────────────────────────────────────
  voiceTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  voiceTo:   { fontSize: 15, fontWeight: '900', color: G.text },
  voiceSub:  { fontSize: 12, fontWeight: '600', color: G.muted, marginTop: 2 },
  micBtn:    { borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  micBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 16, paddingHorizontal: 20,
  },
  micCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnText:  { flex: 1, color: '#fff', fontWeight: '900', fontSize: 15 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: G.border,
  },
  historyText: { fontSize: 14, fontWeight: '800', color: G.accent },

  // ── Medicine ──────────────────────────────────────────────────────────────
  medSummaryRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  medCountWrap:   { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  medCountBig:    { fontSize: 32, fontWeight: '900', color: G.text },
  medCountSlash:  { fontSize: 22, fontWeight: '700', color: G.muted },
  medCountLabel:  { flex: 1, fontSize: 12, fontWeight: '700', color: G.muted },
  medPctCircle: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  medPctText:  { fontSize: 13, fontWeight: '900' },
  medProgressBg:   { height: 6, backgroundColor: '#EEF2F8', borderRadius: 3, overflow: 'hidden', marginBottom: 2 },
  medProgressFill: { height: '100%', borderRadius: 3 },
  emptyMedWrap: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  emptyMedIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center',
  },
  emptyMedText: { fontSize: 14, fontWeight: '700', color: G.muted },
  addMedBtn: {
    backgroundColor: G.accent + '18', paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 16, marginTop: 4,
  },
  addMedBtnText: { fontSize: 13, fontWeight: '800', color: G.accent },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medCheckIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  medName:  { fontSize: 15, fontWeight: '800', color: G.text },
  medTime:  { fontSize: 12, fontWeight: '600', color: G.muted, marginTop: 1 },
  medBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  medBadgeText: { fontSize: 12, fontWeight: '800' },
  viewMoreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: G.border, marginTop: 4,
  },
  viewMoreText: { flex: 1, fontSize: 13, fontWeight: '800', color: G.accent },

  // ── Mood ──────────────────────────────────────────────────────────────────
  moodContent:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  moodEmojiCircle: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center',
  },
  moodEmoji:    { fontSize: 34 },
  moodWho:      { fontSize: 12, fontWeight: '700', color: G.muted },
  moodValue:    { fontSize: 20, fontWeight: '900', color: G.text, marginTop: 2 },
  moodNote:     { fontSize: 12, fontWeight: '600', color: G.muted, marginTop: 4, lineHeight: 18 },
  moodScoreWrap: { alignItems: 'center' },
  moodScore:    { fontSize: 32, fontWeight: '900', color: '#7C3AED' },
  moodScoreOf:  { fontSize: 13, fontWeight: '700', color: G.muted },
  noMoodRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  noMoodIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center',
  },
  noMoodTitle: { fontSize: 15, fontWeight: '900', color: G.text },
  noMoodSub:   { fontSize: 12, fontWeight: '600', color: G.muted, marginTop: 4, lineHeight: 18 },
  weekRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: G.border,
  },
  weekDay:          { alignItems: 'center', gap: 5 },
  weekDot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E2E8F0' },
  weekDotDone:      { backgroundColor: G.success },
  weekDotPending:   { backgroundColor: G.warning, opacity: 0.75 },
  weekLabel:        { fontSize: 11, fontWeight: '700', color: G.muted },
  weekLabelToday:   { color: G.accent },

  // ── Location ──────────────────────────────────────────────────────────────
  locCard:     { backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' },
  locMapWrap:  { position: 'relative', backgroundColor: '#EEF2F8', overflow: 'hidden' },
  locPlaceholder: {
    height: 180, alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F8FAFC',
  },
  locPlaceholderIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
  },
  locPlaceholderTitle: { fontSize: 15, fontWeight: '900', color: '#94A3B8' },
  locPlaceholderSub:   { fontSize: 12, fontWeight: '600', color: '#B0BEC5', textAlign: 'center', paddingHorizontal: 32 },
  liveBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
  },
  liveDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.9)' },
  liveBadgeText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  locElderScroll: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  locElderCard: {
    width: 110, borderRadius: 18, padding: 12,
    backgroundColor: '#F8FAFC', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#EEF2F7',
  },
  locElderCardLive: {
    borderColor: '#86EFAC', backgroundColor: '#F0FDF4',
  },
  locElderAvatarWrap: { position: 'relative', marginBottom: 2 },
  locOnlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 2, borderColor: '#fff',
  },
  locElderName: { fontSize: 12, fontWeight: '900', color: G.text, textAlign: 'center' },
  locStatusChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  locStatusText: { fontSize: 10, fontWeight: '900' },
  locUpdatedAt: { fontSize: 10, fontWeight: '600', color: '#B0BEC5', marginTop: 2 },
  locActionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: G.border,
  },
  locActionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locActionText: { fontSize: 12, fontWeight: '700', color: G.muted },
  locOpenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: G.primary, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  locOpenBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  // ── Vault picker ──────────────────────────────────────────────────────────
  vaultOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  vaultSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 10,
  },
  vaultHandle: {
    width: 38, height: 5, backgroundColor: '#D8E4EC', borderRadius: 3,
    alignSelf: 'center', marginBottom: 8,
  },
  vaultTitle: { fontSize: 20, fontWeight: '900', color: G.text, textAlign: 'center' },
  vaultSub:   { fontSize: 13, fontWeight: '500', color: G.muted, textAlign: 'center', marginBottom: 4 },
  vaultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F8FAFC', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#EEF2F7',
  },
  vaultIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  vaultRowName: { fontSize: 15, fontWeight: '800', color: G.text },
  vaultRowSub:  { fontSize: 12, fontWeight: '500', color: G.muted, marginTop: 2 },
  vaultCancelBtn: {
    height: 50, borderRadius: 16, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  vaultCancelText: { fontSize: 15, fontWeight: '800', color: G.muted },
});