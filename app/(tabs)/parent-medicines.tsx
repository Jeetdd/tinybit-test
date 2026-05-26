import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddMedicineModal from '../../components/AddMedicineModal';
import EditMedicineModal, { type MedicineRow } from '../../components/EditMedicineModal';
import MedicineHistoryModal from '../../components/MedicineHistoryModal';
import { GuardianHeader } from '../../components/guardian/GuardianHeader';
import { CARD_SHADOW, G } from '../../components/guardian/theme';
import { useAuth } from '../../context/AuthContext';
import { broadcastGuardianUpdate, notifyElder } from '../../services/pushNotifications';
import { supabase } from '../../utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────
const CHIP_COLORS = ['#FFE7D6', '#E9D5FF', '#D1FADF', '#D8F0FF', '#FFF3E0'];
const chipBg = (name: string) => CHIP_COLORS[name.charCodeAt(0) % CHIP_COLORS.length];

type Section = 'Morning' | 'Afternoon' | 'Night';
type Elder   = { elder_id: string; parent_name: string; relation: string };
type MedUI   = MedicineRow & {
  takenToday: boolean;
  section: Section;
};

const SECTION_CONFIG: Record<Section, { icon: string; accentColor: string; bgColor: string; chipBg: string; chipText: string }> = {
  Morning:   { icon: '🌅', accentColor: '#FF8C42', bgColor: '#FFF9F4', chipBg: '#FFF0E0', chipText: '#D97706' },
  Afternoon: { icon: '☀️', accentColor: '#1F7BD7', bgColor: '#F4F9FF', chipBg: '#E0EEFF', chipText: '#1F7BD7' },
  Night:     { icon: '🌙', accentColor: '#6B5CD9', bgColor: '#F7F5FF', chipBg: '#EDE8FF', chipText: '#5B4FBD' },
};

function resolveSection(v: unknown): Section {
  if (v === 'Morning' || v === 'Afternoon' || v === 'Night') return v;
  return 'Morning';
}

// ── Med Card ──────────────────────────────────────────────────────────────────
function MedCard({
  med, onEdit,
}: {
  med: MedUI;
  onEdit: () => void;
}) {
  const cfg = SECTION_CONFIG[med.section];
  const stock = (med.stock ?? 99) as number;
  return (
    <View style={[s.medCard, { borderLeftColor: cfg.accentColor, backgroundColor: cfg.bgColor }]}>
      <View style={[s.medAccentBar, { backgroundColor: cfg.accentColor }]} />
      <View style={s.medBody}>
        <View style={s.medTop}>
          <View style={[s.medIconWrap, { backgroundColor: cfg.chipBg }]}>
            <Ionicons name="medical" size={18} color={cfg.accentColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.medName} numberOfLines={1}>{med.name ?? 'Medicine'}</Text>
            <Text style={s.medDosage} numberOfLines={1}>
              {[med.dosage, med.instruction].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <TouchableOpacity onPress={onEdit} hitSlop={8} style={s.editBtn}>
            <Ionicons name="create-outline" size={18} color={G.muted} />
          </TouchableOpacity>
        </View>

        <View style={s.medMeta}>
          <Ionicons name="time-outline" size={13} color={G.muted} />
          <Text style={s.medMetaText}>{med.time ?? med.schedule_time ?? '—'}</Text>
          {stock < 99 && (
            <>
              <View style={s.metaDot} />
              <Ionicons name="cube-outline" size={12} color={stock <= 7 ? '#F59E0B' : G.accent} />
              <Text style={[s.medMetaText, { color: stock <= 7 ? '#F59E0B' : G.accent }]}>
                {stock} left
              </Text>
            </>
          )}
        </View>

        <View style={s.medFooter}>
          <View style={[s.sectionPill, { backgroundColor: cfg.chipBg }]}>
            <Text style={{ fontSize: 11 }}>{cfg.icon}</Text>
            <Text style={[s.sectionPillText, { color: cfg.chipText }]}>{med.schedule_time as string}</Text>
          </View>
          {med.takenToday ? (
            <View style={s.takenBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
              <Text style={s.takenText}>Taken</Text>
            </View>
          ) : (
            <View style={s.pendingBadge}>
              <Ionicons name="time-outline" size={13} color="#F97316" />
              <Text style={s.pendingText}>Pending</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Weekly adherence mini-strip ───────────────────────────────────────────────
function WeekStrip({ elderId }: { elderId: string }) {
  const [strip, setStrip] = useState<{ label: string; pct: number }[]>([]);

  useEffect(() => {
    if (!elderId) return;
    (async () => {
      try {
        const today = new Date();
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (6 - i));
          return d;
        });

        const s0 = new Date(days[0]); s0.setHours(0, 0, 0, 0);
        const e6 = new Date(days[6]); e6.setHours(23, 59, 59, 999);

        const { data: meds } = await supabase
          .from('medicines')
          .select('id, days_of_week')
          .eq('user_id', elderId);

        const { data: logs } = await supabase
          .from('medicine_logs')
          .select('medicine_id, taken_at')
          .eq('user_id', elderId)
          .gte('taken_at', s0.toISOString())
          .lte('taken_at', e6.toISOString());

        const takenSet = new Set<string>();
        (logs ?? []).forEach((l: any) => {
          const d = new Date(l.taken_at);
          const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          takenSet.add(`${ymd}:${l.medicine_id}`);
        });

        const result = days.map((d) => {
          const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const dow = d.getDay();
          const applicable = (meds ?? []).filter((m: any) =>
            (m.days_of_week ?? [0,1,2,3,4,5,6]).includes(dow)
          );
          const taken = applicable.filter((m: any) => takenSet.has(`${ymd}:${m.id}`)).length;
          const pct   = applicable.length > 0 ? taken / applicable.length : -1;
          return {
            label: ['S','M','T','W','T','F','S'][dow],
            pct,
          };
        });
        setStrip(result);
      } catch {}
    })();
  }, [elderId]);

  return (
    <View style={s.weekStrip}>
      {strip.map((d, i) => {
        const color = d.pct < 0 ? '#E6EBF2' : d.pct >= 0.8 ? '#16A34A' : d.pct >= 0.5 ? '#F59E0B' : '#DC2626';
        return (
          <View key={i} style={s.weekDay}>
            <View style={[s.weekBar, { height: Math.max(4, (d.pct >= 0 ? d.pct : 0) * 36), backgroundColor: color }]} />
            <Text style={s.weekLabel}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ParentMedicinesScreen() {
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();

  const [elders,      setElders]      = useState<Elder[]>([]);
  const [medicines,   setMedicines]   = useState<MedUI[]>([]);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [medLoading,  setMedLoading]  = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [editingMed,  setEditingMed]  = useState<MedicineRow | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [reminding,   setReminding]   = useState(false);

  const realtimeRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Load connected elders ──────────────────────────────────────────────────
  const loadElders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guardian_elder_links')
        .select('elder_id, parent_name, relation')
        .eq('guardian_id', user.id)
        .eq('status', 'connected');
      if (error) throw error;
      setElders((data ?? []) as Elder[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  // ── Load medicines for selected elder ─────────────────────────────────────
  const loadMedicines = useCallback(async (elderId: string) => {
    setMedLoading(true);
    try {
      const today    = new Date();
      const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(today); dayEnd.setHours(23, 59, 59, 999);

      const { data: meds, error } = await supabase
        .from('medicines')
        .select('*, medicine_logs(taken_at)')
        .eq('user_id', elderId)
        .order('schedule_time', { ascending: true });
      if (error) throw error;

      setMedicines(
        (meds ?? []).map((m: any): MedUI => ({
          ...m,
          section: resolveSection(m.schedule_time),
          takenToday: (m.medicine_logs ?? []).some((l: any) => {
            if (!l?.taken_at) return false;
            const t = new Date(l.taken_at).getTime();
            return t >= dayStart.getTime() && t <= dayEnd.getTime();
          }),
        }))
      );
    } catch (e) { console.error(e); }
    finally { setMedLoading(false); }
  }, []);

  // ── Real-time subscription for selected elder ──────────────────────────────
  const subscribeToElder = useCallback((elderId: string) => {
    // Tear down previous channels
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }
    if (broadcastRef.current) {
      supabase.removeChannel(broadcastRef.current);
      broadcastRef.current = null;
    }

    // Postgres changes (medicines table + medicine_logs table)
    const ch = supabase
      .channel(`guardian-view-elder-${elderId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'medicines',     filter: `user_id=eq.${elderId}` },
        () => { void loadMedicines(elderId); },
      )
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'medicine_logs', filter: `user_id=eq.${elderId}` },
        () => { void loadMedicines(elderId); },
      )
      .subscribe();
    realtimeRef.current = ch;

    // Separate broadcast channel — elder marks medicine taken on `elder-${elderId}`
    const bch = supabase
      .channel(`elder-${elderId}`)
      .on('broadcast', { event: 'medicine-update' }, () => { void loadMedicines(elderId); })
      .subscribe();
    broadcastRef.current = bch;
  }, [loadMedicines]);

  useFocusEffect(useCallback(() => {
    loadElders();
    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
      if (broadcastRef.current) {
        supabase.removeChannel(broadcastRef.current);
        broadcastRef.current = null;
      }
    };
  }, [loadElders]));

  // Reload medicines + subscribe when active elder changes
  useEffect(() => {
    const elder = elders[activeIdx];
    if (elder?.elder_id) {
      void loadMedicines(elder.elder_id);
      subscribeToElder(elder.elder_id);
    }
  }, [elders, activeIdx, loadMedicines, subscribeToElder]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const activeElder = elders[activeIdx];
  const taken  = medicines.filter(m => m.takenToday).length;
  const total  = medicines.length;
  const pct    = total > 0 ? Math.round((taken / total) * 100) : 0;
  const pending = medicines.filter(m => !m.takenToday);

  const sectionOrder: Section[] = ['Morning', 'Afternoon', 'Night'];
  const bySection: Record<Section, MedUI[]> = {
    Morning: medicines.filter(m => m.section === 'Morning'),
    Afternoon: medicines.filter(m => m.section === 'Afternoon'),
    Night: medicines.filter(m => m.section === 'Night'),
  };

  // ── Send reminder push ─────────────────────────────────────────────────────
  const sendReminder = async () => {
    if (!activeElder || pending.length === 0) return;
    setReminding(true);
    try {
      const names = pending.slice(0, 3).map(m => m.name).join(', ');
      const more  = pending.length > 3 ? ` +${pending.length - 3} more` : '';
      await notifyElder(
        activeElder.elder_id,
        '⏰ Medicine Reminder',
        `Time to take: ${names}${more}`,
        { screen: 'medicine' },
      );
      Alert.alert('Reminder Sent', `${activeElder.parent_name.split(' ')[0]} has been notified.`);
    } catch {
      Alert.alert('Error', 'Could not send reminder. Please try again.');
    } finally {
      setReminding(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <GuardianHeader title="Parent Medicines" />

      <View style={s.sheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {loading ? (
            <ActivityIndicator style={{ margin: 32 }} color={G.accent} />
          ) : elders.length === 0 ? (
            <View style={[s.emptyCard, CARD_SHADOW]}>
              <View style={s.emptyIcon}>
                <Ionicons name="medkit-outline" size={36} color="#B0BEC5" />
              </View>
              <Text style={s.emptyTitle}>No Connected Parents</Text>
              <Text style={s.emptySub}>
                Connect with a parent first using the "Add Parent" screen. Once connected, their medicines will appear here.
              </Text>
            </View>
          ) : (
            <>
              {/* ── Elder selector ── */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.pillRow}>
                  {elders.map((e, i) => (
                    <Pressable
                      key={e.elder_id}
                      style={[s.pill, i === activeIdx && s.pillActive]}
                      onPress={() => setActiveIdx(i)}
                    >
                      <View style={[s.pillAvatar, { backgroundColor: chipBg(e.parent_name) }]}>
                        <Text style={s.pillInitial}>{e.parent_name[0]?.toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={[s.pillName, i === activeIdx && s.pillNameActive]}>
                          {e.parent_name.split(' ')[0]}
                        </Text>
                        <Text style={s.pillRel}>{e.relation}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* ── Progress card ── */}
              {activeElder && (
                <LinearGradient
                  colors={[G.primary, G.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.progressCard, CARD_SHADOW]}
                >
                  <View style={s.progressTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.progressName}>
                        {activeElder.parent_name.split(' ')[0]}'s Medicines
                      </Text>
                      <Text style={s.progressToday}>Today's Adherence</Text>
                    </View>
                    <View style={[s.progressRing, { borderColor: 'rgba(255,255,255,0.5)' }]}>
                      <Text style={s.progressRingNum}>{pct}%</Text>
                    </View>
                  </View>
                  <View style={s.progressBarBg}>
                    <View style={[s.progressBarFg, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={s.progressCount}>{taken} of {total} taken</Text>

                  {/* Action buttons */}
                  <View style={s.actionRow}>
                    <Pressable style={s.actionBtn} onPress={() => setShowHistory(true)}>
                      <Ionicons name="bar-chart-outline" size={15} color="#fff" />
                      <Text style={s.actionBtnText}>History</Text>
                    </Pressable>
                    {pending.length > 0 && (
                      <Pressable
                        style={[s.actionBtn, s.actionBtnRemind]}
                        onPress={sendReminder}
                        disabled={reminding}
                      >
                        <Ionicons name="notifications-outline" size={15} color={G.primary} />
                        <Text style={[s.actionBtnText, { color: G.primary }]}>
                          {reminding ? 'Sending…' : `Remind (${pending.length})`}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </LinearGradient>
              )}

              {/* ── Weekly adherence strip ── */}
              {activeElder && (
                <View style={[s.weekCard, CARD_SHADOW]}>
                  <Text style={s.weekTitle}>7-Day Adherence</Text>
                  <WeekStrip elderId={activeElder.elder_id} />
                  <View style={s.weekLegend}>
                    {[['#16A34A', '≥80%'], ['#F59E0B', '50–79%'], ['#DC2626', '<50%']].map(([c, l]) => (
                      <View key={l} style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: c }]} />
                        <Text style={s.legendText}>{l}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Medicine list by section ── */}
              <View style={s.sectionHeaderRow}>
                <Text style={s.h2}>Medicine Schedule</Text>
                <Pressable onPress={() => activeElder && loadMedicines(activeElder.elder_id)}>
                  <Ionicons name="refresh" size={18} color={G.accent} />
                </Pressable>
              </View>

              {medLoading ? (
                <ActivityIndicator style={{ margin: 24 }} color={G.accent} />
              ) : total === 0 ? (
                <View style={[s.emptyCard, CARD_SHADOW]}>
                  <Ionicons name="medkit-outline" size={32} color="#B0BEC5" />
                  <Text style={s.emptySub}>
                    No medicines added for {activeElder?.parent_name ?? 'this parent'} yet.
                  </Text>
                  <Text style={s.emptySub}>Tap the + button below to add one.</Text>
                </View>
              ) : (
                sectionOrder.map((section) => {
                  const items = bySection[section];
                  if (items.length === 0) return null;
                  const cfg = SECTION_CONFIG[section];
                  return (
                    <View key={section} style={{ marginBottom: 8 }}>
                      <View style={s.sectionLabelRow}>
                        <Text style={{ fontSize: 15 }}>{cfg.icon}</Text>
                        <Text style={[s.sectionLabel, { color: cfg.accentColor }]}>{section}</Text>
                        <Text style={s.sectionCount}>{items.length} medicine{items.length > 1 ? 's' : ''}</Text>
                      </View>
                      <View style={{ gap: 10 }}>
                        {items.map(m => (
                          <MedCard
                            key={m.id}
                            med={m}
                            onEdit={() => setEditingMed(m)}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })
              )}

              {/* ── Reminder card ── */}
              {pending.length > 0 && activeElder && (
                <View style={[s.reminderCard, CARD_SHADOW]}>
                  <View style={s.reminderIconWrap}>
                    <Ionicons name="notifications" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.reminderTitle}>
                      {pending.length} medicine{pending.length > 1 ? 's' : ''} still pending
                    </Text>
                    <Text style={s.reminderSub} numberOfLines={2}>
                      {pending.map(m => m.name).join(', ')}
                    </Text>
                  </View>
                  <Pressable
                    style={[s.reminderBtn, reminding && { opacity: 0.6 }]}
                    onPress={sendReminder}
                    disabled={reminding}
                  >
                    <Text style={s.reminderBtnText}>{reminding ? '…' : 'Remind'}</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* ── FAB: Add medicine for elder ── */}
        {activeElder && (
          <TouchableOpacity
            style={[s.fab, { bottom: insets.bottom + 24 }]}
            onPress={() => setShowAdd(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[G.primary, G.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.fabGradient}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Modals ── */}
      <AddMedicineModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={() => {
          if (!activeElder) return;
          void loadMedicines(activeElder.elder_id);
          broadcastGuardianUpdate(activeElder.elder_id, 'medicine-add');
        }}
        targetUserId={activeElder?.elder_id}
        targetName={activeElder?.parent_name.split(' ')[0]}
      />

      <EditMedicineModal
        visible={!!editingMed}
        medicine={editingMed}
        onClose={() => setEditingMed(null)}
        onUpdated={() => {
          if (!activeElder) return;
          void loadMedicines(activeElder.elder_id);
          broadcastGuardianUpdate(activeElder.elder_id, 'medicine-update');
        }}
        targetUserId={activeElder?.elder_id}
      />

      <MedicineHistoryModal
        visible={showHistory}
        elderId={activeElder?.elder_id ?? ''}
        elderName={activeElder?.parent_name}
        onClose={() => setShowHistory(false)}
      />
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

  // Elder pills
  pillRow:        { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  pill:           { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, padding: 12, minWidth: 130 },
  pillActive:     { borderWidth: 2, borderColor: G.accent, ...CARD_SHADOW },
  pillAvatar:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pillInitial:    { fontSize: 16, fontWeight: '900', color: '#7C3AED' },
  pillName:       { fontSize: 14, fontWeight: '900', color: G.text },
  pillNameActive: { color: G.accent },
  pillRel:        { fontSize: 11, fontWeight: '700', color: G.muted, marginTop: 1 },

  // Progress card
  progressCard:    { borderRadius: 22, padding: 18, marginTop: 14 },
  progressTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressName:    { fontSize: 17, fontWeight: '900', color: '#fff' },
  progressToday:   { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  progressRing:    { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  progressRingNum: { fontSize: 18, fontWeight: '900', color: '#fff' },
  progressBarBg:   { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFg:   { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  progressCount:   { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  actionRow:       { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 10,
  },
  actionBtnRemind: { backgroundColor: '#fff' },
  actionBtnText:   { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Weekly strip card
  weekCard:    { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 14 },
  weekTitle:   { fontSize: 14, fontWeight: '800', color: G.text, marginBottom: 12 },
  weekStrip:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 44 },
  weekDay:     { alignItems: 'center', gap: 4, flex: 1 },
  weekBar:     { width: 20, borderRadius: 4, minHeight: 4 },
  weekLabel:   { fontSize: 10, fontWeight: '700', color: G.muted },
  weekLegend:  { flexDirection: 'row', gap: 14, marginTop: 12 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendText:  { fontSize: 11, fontWeight: '600', color: G.muted },

  // Section
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  h2:               { fontSize: 20, fontWeight: '900', color: G.text },
  sectionLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 16 },
  sectionLabel:     { fontSize: 14, fontWeight: '800' },
  sectionCount:     { fontSize: 12, fontWeight: '600', color: G.muted, marginLeft: 4 },

  // Med card
  medCard: {
    flexDirection: 'row', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: G.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  medAccentBar: { width: 4 },
  medBody:      { flex: 1, padding: 14 },
  medTop:       { flexDirection: 'row', alignItems: 'flex-start' },
  medIconWrap:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  medName:      { fontSize: 15, fontWeight: '800', color: G.text },
  medDosage:    { marginTop: 2, fontSize: 12, fontWeight: '600', color: G.muted },
  editBtn:      { padding: 4, marginLeft: 4 },
  medMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  medMetaText:  { fontSize: 12, fontWeight: '700', color: G.muted },
  metaDot:      { width: 3, height: 3, borderRadius: 2, backgroundColor: G.muted, marginHorizontal: 2 },
  medFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  sectionPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sectionPillText: { fontSize: 11, fontWeight: '700' },
  takenBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FADF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  takenText:    { fontSize: 12, fontWeight: '900', color: '#16A34A' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  pendingText:  { fontSize: 12, fontWeight: '900', color: '#F97316' },

  // Reminder card
  reminderCard: {
    backgroundColor: '#EFF8FF', borderRadius: 18, padding: 14, marginTop: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#BAE6FD',
  },
  reminderIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  reminderTitle:    { fontSize: 14, fontWeight: '900', color: G.text },
  reminderSub:      { marginTop: 2, fontSize: 12, fontWeight: '600', color: G.muted },
  reminderBtn:      { backgroundColor: '#0284C7', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  reminderBtnText:  { color: '#fff', fontWeight: '900', fontSize: 13 },

  // Empty
  emptyCard:  { backgroundColor: '#fff', borderRadius: 22, padding: 32, marginTop: 24, alignItems: 'center', gap: 14 },
  emptyIcon:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F4F6FA', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: G.text },
  emptySub:   { fontSize: 14, fontWeight: '600', color: G.muted, textAlign: 'center', lineHeight: 20 },

  // FAB
  fab:        { position: 'absolute', right: 20, borderRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 8 },
  fabGradient: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
