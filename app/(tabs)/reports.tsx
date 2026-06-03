import { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, View, Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { GuardianHeader } from '../../components/guardian/GuardianHeader';
import { CARD_SHADOW, G } from '../../components/guardian/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { useGuardianElderSync, useElderBroadcastSync } from '../../services/realtimeSync';

// ── Types ─────────────────────────────────────────────────────────────────────
type Period = 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';
type ReportType = 'All' | 'Medicine' | 'Mood' | 'Check-ins' | 'Wellness';
type Elder = { elder_id: string; parent_name: string; relation: string };
type SortOrder = 'newest' | 'oldest';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CHIP_COLORS = ['#FFE7D6', '#E9D5FF', '#D1FADF', '#D8F0FF', '#FFF3E0'];
const chipBg = (name: string) => CHIP_COLORS[name.charCodeAt(0) % CHIP_COLORS.length];

const REPORT_TYPES: ReportType[] = ['All', 'Medicine', 'Mood', 'Check-ins', 'Wellness'];

function datesBefore(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().split('T')[0];
  });
}

function computeStreak(shareDates: Set<string>): number {
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().split('T')[0];
    if (!shareDates.has(ds)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function fmt(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Segmented({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  const items: Period[] = ['Weekly', 'Monthly', 'Yearly', 'Custom'];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
      <View style={s.segmentWrap}>
        {items.map(it => {
          const active = value === it;
          return (
            <Pressable key={it} onPress={() => onChange(it)} style={[s.segmentItem, active && s.segmentActive]}>
              <Text style={[s.segmentText, active && s.segmentTextActive]}>{it}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function TypeChips({ value, onChange }: { value: ReportType; onChange: (v: ReportType) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
      <View style={s.chipsRow}>
        {REPORT_TYPES.map(t => {
          const active = value === t;
          return (
            <Pressable
              key={t}
              onPress={() => onChange(t)}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function MetricCard({ tag, tagRight, icon, value, label, tagColor }: {
  tag: string; tagRight: string; icon: keyof typeof Ionicons.glyphMap;
  value: string; label: string; tagColor?: string;
}) {
  const bg = tagColor ?? '#0EA5E9';
  return (
    <View style={[s.metricCard, CARD_SHADOW]}>
      <View style={s.metricTagRow}>
        <View style={[s.metricTag, { backgroundColor: bg }]}>
          <Text style={s.metricTagText}>{tag}</Text>
        </View>
        <Text style={s.metricRight}>{tagRight}</Text>
      </View>
      <View style={s.metricIconWrap}>
        <Ionicons name={icon} size={34} color={bg} />
      </View>
      <Text style={[s.metricValue, { color: bg }]}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function SummaryRow({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  return (
    <View style={s.summaryRow}>
      <View style={[s.summaryIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function GuardianReportsScreen() {
  const { user } = useAuth();

  const [period, setPeriod] = useState<Period>('Weekly');
  const [reportType, setReportType] = useState<ReportType>('All');
  const [elders, setElders] = useState<Elder[]>([]);
  const [elderIdx, setElderIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bars, setBars] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);
  const [dateFrom, setDateFrom] = useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; });
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [exporting, setExporting] = useState(false);

  const [metrics, setMetrics] = useState({
    medAdherence: '--', medTrend: '--',
    avgMood: '--', moodTrend: '--',
    checkinStreak: '--', avgSleep: '--',
    totalCheckins: '--', medTaken: '--',
  });

  const [moodHistory, setMoodHistory] = useState<{ date: string; score: number }[]>([]);

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const loadElders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('guardian_elder_links')
      .select('elder_id, parent_name, relation')
      .eq('guardian_id', user.id)
      .eq('status', 'connected');
    setElders((data ?? []) as Elder[]);
  }, [user]);

  const periodDaysMap: Record<Period, number> = { Weekly: 7, Monthly: 30, Yearly: 365, Custom: 0 };

  const loadData = useCallback(async (elder: Elder | undefined) => {
    if (!elder) { setLoading(false); return; }
    setLoading(true);

    try {
      let sinceStr: string;
      let untilStr: string = new Date().toISOString().split('T')[0];

      if (period === 'Custom') {
        sinceStr = dateFrom.toISOString().split('T')[0];
        untilStr = dateTo.toISOString().split('T')[0];
      } else {
        const since = new Date();
        since.setDate(since.getDate() - periodDaysMap[period]);
        sinceStr = since.toISOString().split('T')[0];
      }

      // ── Mood / check-in data ──────────────────────────────────────────────
      const { data: shares } = await supabase
        .from('guardian_check_in_shares')
        .select('date, mood_score')
        .eq('elder_id', elder.elder_id)
        .gte('date', sinceStr)
        .lte('date', untilStr)
        .order('date', { ascending: sortOrder === 'oldest' });

      const shareList = shares ?? [];
      const last7 = datesBefore(7);
      const shareMap: Record<string, number> = {};
      shareList.forEach((r: any) => { shareMap[r.date] = r.mood_score; });
      const newBars = last7.map(d => {
        const score = shareMap[d];
        return score != null ? Math.round((score / 5) * 100) : 0;
      });
      setBars(newBars);

      const validScores = shareList.map((r: any) => r.mood_score).filter((v: any) => v != null);
      const avgMoodNum = validScores.length > 0
        ? (validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length).toFixed(1)
        : '--';

      const shareDates = new Set(shareList.map((r: any) => r.date as string));
      const streak = computeStreak(shareDates);
      const moodTrend = validScores.length >= 2
        ? (validScores[validScores.length - 1] >= validScores[0] ? '↑ Up' : '↓ Down')
        : '--';

      // Mood history for list view
      setMoodHistory(shareList.map((r: any) => ({ date: r.date, score: r.mood_score ?? 0 })));

      // ── Medicine adherence ────────────────────────────────────────────────
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
      const { data: meds } = await supabase
        .from('medicines')
        .select('id, medicine_logs(taken_at)')
        .eq('user_id', elder.elder_id);

      const medTotal = (meds ?? []).length;
      const medTakenCount = (meds ?? []).filter((m: any) =>
        (m.medicine_logs ?? []).some((l: any) => {
          if (!l?.taken_at) return false;
          const t = new Date(l.taken_at).getTime();
          return t >= dayStart.getTime() && t <= dayEnd.getTime();
        })
      ).length;
      const adherencePct = medTotal > 0 ? `${Math.round((medTakenCount / medTotal) * 100)}%` : '--';
      const medTrendLabel = medTotal > 0
        ? (medTakenCount === medTotal ? '✓ All taken' : `${medTakenCount}/${medTotal} today`)
        : 'No meds';

      setMetrics({
        medAdherence: adherencePct,
        medTrend: medTrendLabel,
        avgMood: avgMoodNum !== '--' ? `${avgMoodNum}/5` : '--',
        moodTrend,
        checkinStreak: streak > 0 ? `${streak}d` : '0d',
        avgSleep: '--',
        totalCheckins: shareList.length.toString(),
        medTaken: medTakenCount.toString(),
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [period, sortOrder, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => { loadElders(); }, [loadElders]));
  useEffect(() => { if (elders.length > 0) loadData(elders[elderIdx]); }, [elders, elderIdx, loadData]);

  useGuardianElderSync(
    elders.map(e => e.elder_id),
    ['medicines', 'medicine_logs'],
    () => { if (elders[elderIdx]) loadData(elders[elderIdx]); },
  );
  useElderBroadcastSync(
    elders.map(e => e.elder_id),
    ['checkin-update', 'medicine-update'],
    () => { if (elders[elderIdx]) loadData(elders[elderIdx]); },
  );

  // ── Filtered elders by search ──────────────────────────────────────────────
  const filteredElders = searchQuery.trim()
    ? elders.filter(e => e.parent_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : elders;

  // ── Export to PDF ──────────────────────────────────────────────────────────
  const exportReport = async () => {
    setExporting(true);
    const elderName = elders[elderIdx]?.parent_name ?? 'Elder';
    const html = `
<!DOCTYPE html><html>
<head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; padding: 32px; color: #1a2e6a; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .sub { color: #8a9bb0; font-size: 13px; margin-bottom: 28px; }
  .section { margin-bottom: 24px; }
  h2 { font-size: 16px; border-bottom: 2px solid #e5eaf1; padding-bottom: 8px; margin-bottom: 16px; }
  .metric { display: inline-block; width: 48%; margin-bottom: 12px; background: #f8fafc; border-radius: 10px; padding: 14px; box-sizing: border-box; }
  .metric-label { font-size: 11px; color: #8a9bb0; text-transform: uppercase; letter-spacing: 0.5px; }
  .metric-value { font-size: 26px; font-weight: bold; color: #0ea5e9; margin: 4px 0; }
  .metric-trend { font-size: 12px; color: #16a34a; }
  .mood-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f4f8; }
  .mood-date { font-size: 13px; color: #4a5568; }
  .mood-val { font-weight: bold; color: #0ea5e9; }
  footer { margin-top: 40px; font-size: 11px; color: #8a9bb0; text-align: center; }
</style></head>
<body>
<h1>TinyBit Health Report</h1>
<p class="sub">Elder: ${elderName} · Period: ${period === 'Custom' ? `${fmt(dateFrom)} – ${fmt(dateTo)}` : period} · Generated: ${today}</p>

<div class="section">
<h2>Key Health Metrics</h2>
<div class="metric">
  <div class="metric-label">Medicine Adherence</div>
  <div class="metric-value">${metrics.medAdherence}</div>
  <div class="metric-trend">${metrics.medTrend}</div>
</div>
<div class="metric">
  <div class="metric-label">Avg Mood Score</div>
  <div class="metric-value">${metrics.avgMood}</div>
  <div class="metric-trend">${metrics.moodTrend}</div>
</div>
<div class="metric">
  <div class="metric-label">Check-in Streak</div>
  <div class="metric-value">${metrics.checkinStreak}</div>
  <div class="metric-trend">Consecutive days</div>
</div>
<div class="metric">
  <div class="metric-label">Total Check-ins</div>
  <div class="metric-value">${metrics.totalCheckins}</div>
  <div class="metric-trend">This period</div>
</div>
</div>

<div class="section">
<h2>Mood History</h2>
${moodHistory.slice(0, 20).map(m => `
<div class="mood-row">
  <span class="mood-date">${m.date}</span>
  <span class="mood-val">${m.score}/5</span>
</div>`).join('')}
${moodHistory.length === 0 ? '<p style="color:#8a9bb0">No mood check-ins recorded for this period.</p>' : ''}
</div>

<footer>Generated by TinyBit — Elderly Health Companion App · ${new Date().toLocaleDateString()}</footer>
</body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Health Report' });
      } else {
        Alert.alert('PDF Created', `Report saved to: ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const maxBar = Math.max(...bars, 1);
  const elderName = elders[elderIdx]?.parent_name ?? 'Elder';

  const showMood = reportType === 'All' || reportType === 'Mood';

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <GuardianHeader title="Reports & Analytics" />

      <View style={s.sheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* ── Search Bar ── */}
          <View style={[s.searchWrap, CARD_SHADOW]}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={s.searchInput}
              placeholder="Search by elder name..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {/* ── Elder selector ── */}
          {filteredElders.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={s.elderRow}>
                {filteredElders.map((e, i) => {
                  const origIdx = elders.findIndex(el => el.elder_id === e.elder_id);
                  return (
                    <Pressable
                      key={e.elder_id}
                      onPress={() => setElderIdx(origIdx)}
                      style={[s.elderPill, origIdx === elderIdx && s.elderPillActive]}
                    >
                      <View style={[s.elderAvatar, { backgroundColor: chipBg(e.parent_name) }]}>
                        <Text style={s.elderInitial}>{e.parent_name[0]?.toUpperCase()}</Text>
                      </View>
                      <Text style={[s.elderPillText, origIdx === elderIdx && { color: G.accent }]}>
                        {e.parent_name.split(' ')[0]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* ── Period selector ── */}
          <Text style={s.h2}>Time Period</Text>
          <Segmented value={period} onChange={setPeriod} />

          {/* ── Custom date range ── */}
          {period === 'Custom' && (
            <View style={[s.dateRangeCard, CARD_SHADOW]}>
              <Text style={s.dateRangeLabel}>Custom Date Range</Text>
              <View style={s.dateRangeRow}>
                <Pressable style={s.datePill} onPress={() => setShowDatePicker('from')}>
                  <Ionicons name="calendar-outline" size={16} color={G.accent} />
                  <Text style={s.datePillText}>{fmt(dateFrom)}</Text>
                </Pressable>
                <Text style={s.dateRangeSep}>→</Text>
                <Pressable style={s.datePill} onPress={() => setShowDatePicker('to')}>
                  <Ionicons name="calendar-outline" size={16} color={G.accent} />
                  <Text style={s.datePillText}>{fmt(dateTo)}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Report Type Filter ── */}
          <View style={s.filterRow}>
            <Text style={s.h2}>Report Type</Text>
            <View style={s.sortBtn}>
              <Pressable onPress={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')} style={s.sortPress}>
                <Ionicons name={sortOrder === 'newest' ? 'arrow-down' : 'arrow-up'} size={14} color={G.accent} />
                <Text style={s.sortText}>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
              </Pressable>
            </View>
          </View>
          <TypeChips value={reportType} onChange={setReportType} />

          {/* ── Export button ── */}
          <Pressable
            onPress={exportReport}
            disabled={exporting || loading}
            style={[s.exportBtn, CARD_SHADOW, (exporting || loading) && { opacity: 0.6 }]}
          >
            {exporting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="download-outline" size={18} color="#fff" />
            }
            <Text style={s.exportBtnText}>{exporting ? 'Generating...' : 'Export PDF Report'}</Text>
          </Pressable>

          {/* ── Mood Bar Chart ── */}
          {showMood && (
            <>
              <View style={s.sectionRow}>
                <Text style={s.h2}>Mood Score</Text>
                <Pressable onPress={() => loadData(elders[elderIdx])}>
                  <Ionicons name="refresh" size={18} color={G.accent} />
                </Pressable>
              </View>
              <View style={[s.card, CARD_SHADOW]}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle}>Daily Mood – {elderName}</Text>
                  <Text style={s.cardSub}>{period === 'Custom' ? `${fmt(dateFrom)} – ${fmt(dateTo)}` : `Last ${period}`}</Text>
                </View>
                {loading ? <ActivityIndicator style={{ margin: 20 }} color={G.accent} /> : (
                  <View style={s.chart}>
                    <View style={s.grid}>
                      {[100, 80, 60, 40, 20].map(t => <View key={t} style={s.gridLine} />)}
                    </View>
                    <View style={s.barRow}>
                      {bars.map((v, idx) => {
                        const dayOfWeek = new Date(Date.now() - (6 - idx) * 86400000).getDay();
                        const isToday = idx === 6;
                        return (
                          <View key={idx} style={s.barCol}>
                            <View style={[
                              s.bar,
                              { height: `${Math.max(4, Math.round((v / maxBar) * 100))}%` as any },
                              isToday && { backgroundColor: G.accent },
                            ]} />
                            <Text style={[s.day, isToday && { color: G.accent, fontWeight: '900' }]}>
                              {DAY_LABELS[dayOfWeek === 0 ? 6 : dayOfWeek - 1]}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    {bars.every(b => b === 0) && (
                      <View style={s.noDataOverlay}>
                        <Ionicons name="bar-chart-outline" size={32} color="#CBD5E1" />
                        <Text style={s.noDataText}>No check-in data for this period</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </>
          )}

          {/* ── Date + Period summary ── */}
          <View style={[s.datePillCard, CARD_SHADOW]}>
            <View>
              <Text style={s.dateTextMain}>{today}</Text>
              <Text style={s.dateTextSub}>{period === 'Custom' ? `${fmt(dateFrom)} – ${fmt(dateTo)}` : `${period} Overview`}</Text>
            </View>
            <Ionicons name="calendar" size={20} color="#64748B" />
          </View>

          {/* ── Key Metrics Grid ── */}
          {(reportType === 'All' || reportType === 'Medicine' || reportType === 'Mood' || reportType === 'Check-ins') && (
            <>
              <View style={s.sectionRow}>
                <Text style={s.h2}>Key Metrics</Text>
                <Text style={s.periodLabel}>{elderName} · {period}</Text>
              </View>

              {loading ? <ActivityIndicator style={{ margin: 20 }} color={G.accent} /> : (
                <View style={s.metricGrid}>
                  {(reportType === 'All' || reportType === 'Medicine') && (
                    <MetricCard tag="Med" tagRight={metrics.medTrend} icon="medkit-outline" value={metrics.medAdherence} label="Today's Adherence" tagColor="#0EA5E9" />
                  )}
                  {(reportType === 'All' || reportType === 'Mood') && (
                    <MetricCard tag="Mood" tagRight={metrics.moodTrend} icon="happy-outline" value={metrics.avgMood} label="Avg Mood Score" tagColor="#16A34A" />
                  )}
                  {(reportType === 'All' || reportType === 'Check-ins') && (
                    <MetricCard tag="Streak" tagRight="days" icon="flame-outline" value={metrics.checkinStreak} label="Check-in Streak" tagColor="#F59E0B" />
                  )}
                  {reportType === 'All' && (
                    <MetricCard tag="Total" tagRight="check-ins" icon="checkmark-circle-outline" value={metrics.totalCheckins} label="Period Check-ins" tagColor="#7C3AED" />
                  )}
                </View>
              )}
            </>
          )}

          {/* ── Health Summary Panel ── */}
          {!loading && reportType === 'All' && (
            <View style={[s.card, CARD_SHADOW, { marginTop: 18 }]}>
              <Text style={[s.cardTitle, { marginBottom: 14 }]}>Health Summary</Text>
              <SummaryRow icon="medkit-outline" label="Medicine Adherence" value={metrics.medAdherence} color="#0EA5E9" />
              <SummaryRow icon="happy-outline" label="Average Mood" value={metrics.avgMood} color="#16A34A" />
              <SummaryRow icon="flame-outline" label="Check-in Streak" value={metrics.checkinStreak} color="#F59E0B" />
              <SummaryRow icon="clipboard-outline" label="Total Check-ins" value={metrics.totalCheckins} color="#7C3AED" />
              <SummaryRow icon="alarm-outline" label="Avg Sleep" value={metrics.avgSleep} color="#EC4899" />
            </View>
          )}

          {/* ── Mood Log List ── */}
          {showMood && moodHistory.length > 0 && !loading && (
            <View style={[s.card, CARD_SHADOW, { marginTop: 18 }]}>
              <Text style={[s.cardTitle, { marginBottom: 14 }]}>Mood Log</Text>
              {moodHistory.slice(0, 10).map((m, i) => (
                <View key={i} style={s.moodLogRow}>
                  <Text style={s.moodLogDate}>{m.date}</Text>
                  <View style={s.moodDots}>
                    {[1, 2, 3, 4, 5].map(d => (
                      <View key={d} style={[s.moodDot, d <= m.score && { backgroundColor: G.accent }]} />
                    ))}
                  </View>
                  <Text style={[s.moodLogScore, { color: m.score >= 4 ? '#16A34A' : m.score >= 3 ? '#F59E0B' : '#EF4444' }]}>
                    {m.score}/5
                  </Text>
                </View>
              ))}
              {moodHistory.length > 10 && (
                <Text style={s.moreText}>+{moodHistory.length - 10} more entries</Text>
              )}
            </View>
          )}

        </ScrollView>
      </View>

      {/* ── Date Picker Modal ── */}
      {showDatePicker && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(null)}>
          <Pressable style={s.pickerOverlay} onPress={() => setShowDatePicker(null)}>
            <View style={s.pickerCard}>
              <Text style={s.pickerTitle}>{showDatePicker === 'from' ? 'Select Start Date' : 'Select End Date'}</Text>
              <DateTimePicker
                value={showDatePicker === 'from' ? dateFrom : dateTo}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={showDatePicker === 'to' ? new Date() : dateTo}
                onChange={(_, date) => {
                  if (!date) return;
                  if (showDatePicker === 'from') setDateFrom(date);
                  else setDateTo(date);
                  if (Platform.OS === 'android') setShowDatePicker(null);
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable style={s.pickerDone} onPress={() => setShowDatePicker(null)}>
                  <Text style={s.pickerDoneText}>Done</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: G.bg },
  sheet:        { flex: 1, marginTop: -42, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: G.bg, overflow: 'hidden' },
  content:      { padding: 16, paddingBottom: 120 },
  h2:           { fontSize: 20, fontWeight: '900', color: G.text, marginBottom: 10 },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 12 },
  filterRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 8 },
  periodLabel:  { fontSize: 13, fontWeight: '800', color: G.accent },

  // Search
  searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 16 },
  searchInput:  { flex: 1, fontSize: 15, color: G.text, fontWeight: '600' },

  // Elder pills
  elderRow:       { flexDirection: 'row', gap: 10, paddingBottom: 2 },
  elderPill:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  elderPillActive:{ borderWidth: 2, borderColor: G.accent, ...CARD_SHADOW },
  elderAvatar:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  elderInitial:   { fontSize: 12, fontWeight: '900', color: '#7C3AED' },
  elderPillText:  { fontSize: 13, fontWeight: '900', color: G.text },

  // Segment
  segmentWrap:       { flexDirection: 'row', backgroundColor: '#D9EAF7', borderRadius: 18, padding: 6 },
  segmentItem:       { paddingHorizontal: 20, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  segmentActive:     { backgroundColor: '#fff', ...CARD_SHADOW },
  segmentText:       { fontSize: 14, fontWeight: '900', color: '#2B3A4B' },
  segmentTextActive: { color: '#111' },

  // Type chips
  chipsRow:      { flexDirection: 'row', gap: 8 },
  chip:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0' },
  chipActive:    { backgroundColor: G.accent, borderColor: G.accent },
  chipText:      { fontSize: 13, fontWeight: '800', color: G.text },
  chipTextActive:{ color: '#fff' },

  // Sort
  sortBtn:  { },
  sortPress:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EBF4FC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  sortText: { fontSize: 12, fontWeight: '800', color: G.accent },

  // Date range
  dateRangeCard:  { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16 },
  dateRangeLabel: { fontSize: 13, fontWeight: '800', color: G.muted, marginBottom: 12 },
  dateRangeRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  datePill:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EBF4FC', borderRadius: 12, padding: 12 },
  datePillText:   { fontSize: 13, fontWeight: '700', color: G.text },
  dateRangeSep:   { fontSize: 16, fontWeight: '900', color: G.muted },

  // Export
  exportBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: G.accent, borderRadius: 16, paddingVertical: 14, marginBottom: 20 },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  // Card
  card:       { backgroundColor: '#fff', borderRadius: 22, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  cardTitle:  { fontSize: 16, fontWeight: '900', color: '#111' },
  cardSub:    { fontSize: 11, color: G.muted, fontWeight: '700' },

  // Chart
  chart:       { height: 260, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff' },
  grid:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingTop: 18, paddingBottom: 34, justifyContent: 'space-between' },
  gridLine:    { height: 2, backgroundColor: '#E5EAF1', borderRadius: 2 },
  barRow:      { flexDirection: 'row', height: '100%', alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 16, gap: 16 },
  barCol:      { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar:         { width: '70%', borderRadius: 10, backgroundColor: '#1D93D8' },
  day:         { marginTop: 10, fontSize: 14, fontWeight: '900', color: '#A3AAB6' },
  noDataOverlay:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noDataText:  { fontSize: 14, fontWeight: '700', color: G.muted },

  // Date pill
  datePillCard: { marginTop: 14, backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateTextMain: { fontSize: 18, fontWeight: '900', color: '#111' },
  dateTextSub:  { fontSize: 12, fontWeight: '700', color: G.muted, marginTop: 2 },

  // Metrics
  metricGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard:    { width: '47%', backgroundColor: '#fff', borderRadius: 22, padding: 14, overflow: 'hidden' },
  metricTagRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricTag:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  metricTagText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  metricRight:   { fontSize: 12, fontWeight: '800', color: '#16A34A' },
  metricIconWrap:{ marginTop: 14, alignItems: 'center' },
  metricValue:   { marginTop: 12, fontSize: 32, fontWeight: '900', textAlign: 'center' },
  metricLabel:   { marginTop: 4, fontSize: 14, fontWeight: '900', color: '#111', textAlign: 'center' },

  // Summary rows
  summaryRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F4F8' },
  summaryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryLabel:{ flex: 1, fontSize: 14, fontWeight: '700', color: G.text },
  summaryValue:{ fontSize: 16, fontWeight: '900' },

  // Mood log
  moodLogRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F4F8' },
  moodLogDate: { flex: 1, fontSize: 13, color: G.muted, fontWeight: '700' },
  moodDots:    { flexDirection: 'row', gap: 4, marginRight: 12 },
  moodDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0' },
  moodLogScore:{ fontSize: 14, fontWeight: '900', minWidth: 32, textAlign: 'right' },
  moreText:    { fontSize: 12, color: G.muted, textAlign: 'center', marginTop: 10, fontWeight: '700' },

  // Date picker modal
  pickerOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerCard:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  pickerTitle:  { fontSize: 18, fontWeight: '900', color: '#111', marginBottom: 16 },
  pickerDone:   { marginTop: 16, backgroundColor: G.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  pickerDoneText:{ color: '#fff', fontSize: 16, fontWeight: '900' },
});
