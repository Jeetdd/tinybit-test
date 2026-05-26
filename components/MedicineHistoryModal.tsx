import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';

type LogEntry = {
  date: string;       // YYYY-MM-DD
  dayLabel: string;   // Mon, Tue …
  taken: string[];    // medicine names taken
  missed: string[];   // medicine names missed
};

type MedicineStat = {
  id: string;
  name: string;
  takenDays: number;
  totalDays: number;
};

interface Props {
  visible: boolean;
  elderId: string;
  elderName?: string;
  onClose: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MedicineHistoryModal({ visible, elderId, elderName, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<MedicineStat[]>([]);
  const [adherencePct, setAdherencePct] = useState(0);

  const load = useCallback(async () => {
    if (!elderId) return;
    setLoading(true);
    try {
      // Build last-7-days range
      const today = new Date();
      const days: Date[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        return d;
      });

      const rangeStart = new Date(days[0]); rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd   = new Date(days[6]); rangeEnd.setHours(23, 59, 59, 999);

      // Fetch all medicines for elder
      const { data: meds, error: medsErr } = await supabase
        .from('medicines')
        .select('id, name, days_of_week, start_date, end_date')
        .eq('user_id', elderId);
      if (medsErr) throw medsErr;

      // Fetch logs in range
      const { data: rawLogs, error: logsErr } = await supabase
        .from('medicine_logs')
        .select('medicine_id, taken_at')
        .eq('user_id', elderId)
        .gte('taken_at', rangeStart.toISOString())
        .lte('taken_at', rangeEnd.toISOString());
      if (logsErr) throw logsErr;

      // Build set: "YYYY-MM-DD:medicine_id" => taken
      const takenSet = new Set<string>();
      (rawLogs ?? []).forEach((l: any) => {
        if (!l?.taken_at || !l?.medicine_id) return;
        const d = toYMD(new Date(l.taken_at));
        takenSet.add(`${d}:${l.medicine_id}`);
      });

      // Build per-day log entries
      const entries: LogEntry[] = days.map((d) => {
        const ymd = toYMD(d);
        const dow = d.getDay();
        const applicable = (meds ?? []).filter((m: any) => {
          const dowArr: number[] = m.days_of_week ?? [0,1,2,3,4,5,6];
          if (!dowArr.includes(dow)) return false;
          if (m.start_date && ymd < m.start_date) return false;
          if (m.end_date   && ymd > m.end_date)   return false;
          return true;
        });
        const taken  = applicable.filter((m: any) => takenSet.has(`${ymd}:${m.id}`)).map((m: any) => m.name);
        const missed = applicable.filter((m: any) => !takenSet.has(`${ymd}:${m.id}`)).map((m: any) => m.name);
        return { date: ymd, dayLabel: DAY_LABELS[dow], taken, missed };
      });

      // Per-medicine 7-day stats
      const medStats: MedicineStat[] = (meds ?? []).map((m: any) => {
        const dowArr: number[] = m.days_of_week ?? [0,1,2,3,4,5,6];
        let totalDays = 0;
        let takenDays = 0;
        days.forEach((d) => {
          const ymd = toYMD(d);
          const dow = d.getDay();
          if (!dowArr.includes(dow)) return;
          if (m.start_date && ymd < m.start_date) return;
          if (m.end_date   && ymd > m.end_date)   return;
          totalDays++;
          if (takenSet.has(`${ymd}:${m.id}`)) takenDays++;
        });
        return { id: m.id, name: m.name, takenDays, totalDays };
      }).filter((s: MedicineStat) => s.totalDays > 0);

      // Overall adherence
      const totalSlots = medStats.reduce((a, s) => a + s.totalDays, 0);
      const takenSlots = medStats.reduce((a, s) => a + s.takenDays, 0);
      const pct = totalSlots > 0 ? Math.round((takenSlots / totalSlots) * 100) : 0;

      setLogs(entries);
      setStats(medStats);
      setAdherencePct(pct);
    } catch (e) {
      console.error('MedicineHistoryModal load error', e);
    } finally {
      setLoading(false);
    }
  }, [elderId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const adherenceColor = adherencePct >= 80 ? '#16A34A' : adherencePct >= 50 ? '#F59E0B' : '#DC2626';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#2B3C86', '#2E9CD6']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Medicine History</Text>
            {elderName ? <Text style={styles.headerSub}>{elderName} · Last 7 Days</Text> : null}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.sheet}>
        {loading ? (
          <ActivityIndicator style={{ margin: 40 }} color="#2B3C86" size="large" />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

            {/* ── Overall adherence banner ── */}
            <View style={styles.adherenceBanner}>
              <View style={styles.adherenceLeft}>
                <Text style={styles.adherenceTitle}>7-Day Adherence</Text>
                <Text style={[styles.adherencePct, { color: adherenceColor }]}>{adherencePct}%</Text>
                <Text style={styles.adherenceSub}>
                  {adherencePct >= 80 ? 'Excellent — keep it up!' : adherencePct >= 50 ? 'Good — room to improve' : 'Needs attention'}
                </Text>
              </View>
              <View style={[styles.adherenceRing, { borderColor: adherenceColor }]}>
                <Text style={[styles.adherenceRingNum, { color: adherenceColor }]}>{adherencePct}</Text>
                <Text style={[styles.adherenceRingLabel, { color: adherenceColor }]}>%</Text>
              </View>
            </View>

            {/* ── Day-by-day log ── */}
            <Text style={styles.sectionTitle}>Daily Breakdown</Text>
            {logs.map((entry) => {
              const total = entry.taken.length + entry.missed.length;
              const isToday = entry.date === toYMD(new Date());
              return (
                <View key={entry.date} style={[styles.dayCard, isToday && styles.dayCardToday]}>
                  <View style={styles.dayCardHeader}>
                    <View style={styles.dayLabelWrap}>
                      <Text style={[styles.dayLabel, isToday && { color: '#2B3C86' }]}>{entry.dayLabel}</Text>
                      <Text style={styles.dayDate}>{entry.date.slice(5).replace('-', '/')}</Text>
                    </View>
                    {total === 0 ? (
                      <View style={styles.badgeGray}>
                        <Text style={styles.badgeGrayText}>No medicines</Text>
                      </View>
                    ) : entry.missed.length === 0 ? (
                      <View style={styles.badgeGreen}>
                        <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                        <Text style={styles.badgeGreenText}>All taken</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeOrange}>
                        <Ionicons name="alert-circle" size={13} color="#F97316" />
                        <Text style={styles.badgeOrangeText}>{entry.taken.length}/{total} taken</Text>
                      </View>
                    )}
                  </View>

                  {entry.taken.length > 0 && (
                    <View style={styles.pillList}>
                      {entry.taken.map((name) => (
                        <View key={name} style={styles.pillTaken}>
                          <Ionicons name="checkmark" size={11} color="#16A34A" />
                          <Text style={styles.pillTakenText}>{name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {entry.missed.length > 0 && (
                    <View style={[styles.pillList, { marginTop: entry.taken.length > 0 ? 6 : 0 }]}>
                      {entry.missed.map((name) => (
                        <View key={name} style={styles.pillMissed}>
                          <Ionicons name="close" size={11} color="#DC2626" />
                          <Text style={styles.pillMissedText}>{name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            {/* ── Per-medicine stats ── */}
            {stats.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Medicine Adherence</Text>
                {stats.map((s) => {
                  const pct = s.totalDays > 0 ? Math.round((s.takenDays / s.totalDays) * 100) : 0;
                  const color = pct >= 80 ? '#16A34A' : pct >= 50 ? '#F59E0B' : '#DC2626';
                  return (
                    <View key={s.id} style={styles.statCard}>
                      <View style={styles.statTop}>
                        <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>
                          <Ionicons name="medical" size={18} color={color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.statName} numberOfLines={1}>{s.name}</Text>
                          <Text style={styles.statSub}>{s.takenDays} of {s.totalDays} days taken</Text>
                        </View>
                        <Text style={[styles.statPct, { color }]}>{pct}%</Text>
                      </View>
                      <View style={styles.statBarBg}>
                        <View style={[styles.statBarFg, { width: `${pct}%` as any, backgroundColor: color }]} />
                      </View>
                    </View>
                  );
                })}
              </>
            )}

          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header:    { paddingHorizontal: 18, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 2 },

  sheet:   { flex: 1, backgroundColor: '#F2F4F8' },
  content: { padding: 16, paddingBottom: 60 },

  adherenceBanner: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  adherenceLeft:    { flex: 1 },
  adherenceTitle:   { fontSize: 13, fontWeight: '700', color: '#7B8AA0', marginBottom: 4 },
  adherencePct:     { fontSize: 40, fontWeight: '900' },
  adherenceSub:     { fontSize: 12, fontWeight: '600', color: '#7B8AA0', marginTop: 4 },
  adherenceRing: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  adherenceRingNum:   { fontSize: 20, fontWeight: '900' },
  adherenceRingLabel: { fontSize: 11, fontWeight: '800', marginTop: -4 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#15253E', marginBottom: 12 },

  dayCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  dayCardToday: { borderWidth: 2, borderColor: '#2B3C86' },
  dayCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabelWrap:  { gap: 2 },
  dayLabel:      { fontSize: 15, fontWeight: '800', color: '#15253E' },
  dayDate:       { fontSize: 11, fontWeight: '600', color: '#7B8AA0' },

  badgeGreen:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FADF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeGreenText: { fontSize: 12, fontWeight: '800', color: '#16A34A' },
  badgeOrange: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeOrangeText: { fontSize: 12, fontWeight: '800', color: '#F97316' },
  badgeGray:   { backgroundColor: '#F0F2F5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeGrayText: { fontSize: 12, fontWeight: '700', color: '#7B8AA0' },

  pillList:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  pillTaken:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FADF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillTakenText: { fontSize: 11, fontWeight: '700', color: '#15803D' },
  pillMissed: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillMissedText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },

  statCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statName:    { fontSize: 15, fontWeight: '800', color: '#15253E' },
  statSub:     { fontSize: 12, fontWeight: '600', color: '#7B8AA0', marginTop: 2 },
  statPct:     { fontSize: 18, fontWeight: '900' },
  statBarBg:   { height: 6, backgroundColor: '#E6EBF2', borderRadius: 4, overflow: 'hidden' },
  statBarFg:   { height: '100%', borderRadius: 4 },
});
