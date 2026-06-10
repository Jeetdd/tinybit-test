import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Streak flame color — only used for the flame icon/indicator
const FLAME = '#F97316';

// ── Rewards catalogue ─────────────────────────────────────────────────────────
const REWARDS = [
  { id: 'r1', icon: '🌱', title: 'First Step', desc: 'Open the app for the first time', threshold: 1 },
  { id: 'r2', icon: '🔥', title: '7-Day Warrior', desc: 'Maintain a 7-day streak', threshold: 7 },
  { id: 'r3', icon: '💪', title: '2-Week Champion', desc: 'Keep going for 14 consecutive days', threshold: 14 },
  { id: 'r4', icon: '🏅', title: 'Monthly Hero', desc: 'Reach a 30-day streak', threshold: 30 },
  { id: 'r5', icon: '⭐', title: 'Star Performer', desc: 'Hit a 50-day streak', threshold: 50 },
  { id: 'r6', icon: '🏆', title: 'Century Legend', desc: 'Achieve a 100-day streak', threshold: 100 },
  { id: 'r7', icon: '💎', title: 'Diamond Elite', desc: 'Sustain 200 days of healthy habits', threshold: 200 },
  { id: 'r8', icon: '🚀', title: 'Year Conqueror', desc: 'One full year of dedication', threshold: 365 },
];

// ── Streak rules ──────────────────────────────────────────────────────────────
const RULES = [
  { icon: '✅', color: '#4CAF50', label: '+1 point', desc: 'Open the app every day' },
  { icon: '⚠️', color: '#FF9800', label: '−5 points', desc: 'Miss 1 day' },
  { icon: '🔴', color: '#F44336', label: '−5 per day', desc: 'Each additional day missed' },
  { icon: '🛡️', color: '#4AA5D9', label: 'Freeze shield', desc: 'Coming soon — protect your streak' },
];

export default function StreakScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { streak } = useAuth();
  const { nightMode, colors: themeColors } = useLanguage();

  const [bestStreak, setBestStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Mark the last `streak` consecutive days as active
  const activeDays = new Set<string>();
  for (let i = 0; i < streak; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    activeDays.add(d.toDateString());
  }

  // Calendar grid for the current month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('bestStreak');
      const best = stored ? parseInt(stored, 10) : streak;
      const newBest = Math.max(best, streak);
      setBestStreak(newBest);
      if (newBest > best) await AsyncStorage.setItem('bestStreak', newBest.toString());

      const firstOpen = await AsyncStorage.getItem('firstOpenDate');
      if (firstOpen) {
        const diff = Math.floor(
          (Date.now() - new Date(firstOpen).getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;
        setTotalDays(diff);
      } else {
        await AsyncStorage.setItem('firstOpenDate', new Date().toISOString());
        setTotalDays(1);
      }
    })();
  }, [streak]);

  const isActive = (day: number) =>
    activeDays.has(new Date(year, month, day).toDateString());
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Motivation text based on current streak
  const motivation =
    streak === 0 ? 'Open the app daily to start your streak!'
      : streak < 7 ? 'Great start — keep it going!'
        : streak < 30 ? "You're on fire! Don't break the chain."
          : "Incredible! You're a habit champion!";

  // Next reward milestone
  const nextReward = REWARDS.find(r => r.threshold > streak);
  const pointsToNext = nextReward ? nextReward.threshold - streak : 0;

  return (
    <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
      {/* Header */}
      <LinearGradient
        colors={['#2B3C86', '#2E9CD6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Your Streak</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={[styles.scrollSheet, { backgroundColor: themeColors.bg }]}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <View style={[styles.heroCard, { backgroundColor: themeColors.card }]}>
            <Text style={styles.heroEmoji}>🔥</Text>
            <Text style={[styles.heroCount, { color: FLAME }]}>{streak}</Text>
            <Text style={[styles.heroLabel, { color: themeColors.text }]}>Day Streak</Text>
            <Text style={[styles.heroSub, { color: themeColors.muted }]}>{motivation}</Text>
            {nextReward && (
              <View style={[styles.nextBadge, { backgroundColor: nightMode ? '#1C2A3A' : '#E8F3FF' }]}>
                <Text style={[styles.nextBadgeText, { color: '#2B3C86' }]}>
                  {nextReward.icon}  {pointsToNext} more day{pointsToNext !== 1 ? 's' : ''} to unlock "{nextReward.title}"
                </Text>
              </View>
            )}
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: 'Current', value: streak, color: FLAME },
              { label: 'Best', value: bestStreak, color: '#4AA5D9' },
              { label: 'Total Days', value: totalDays, color: '#4DB6AC' },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: themeColors.card }]}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: themeColors.muted }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Rules section */}
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <View style={styles.sectionRow}>
              <Ionicons name="information-circle-outline" size={20} color="#4AA5D9" />
              <Text style={[styles.sectionTitle, { color: themeColors.text, marginLeft: 6 }]}>How Streak Works</Text>
            </View>
            {RULES.map((rule, i) => (
              <View key={i} style={[styles.ruleRow, i > 0 && { borderTopWidth: 1, borderTopColor: themeColors.border }]}>
                <View style={[styles.ruleBadge, { backgroundColor: rule.color + '20' }]}>
                  <Text style={styles.ruleIcon}>{rule.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleLabel, { color: themeColors.text }]}>{rule.label}</Text>
                  <Text style={[styles.ruleDesc, { color: themeColors.muted }]}>{rule.desc}</Text>
                </View>
                <View style={[styles.ruleTag, { backgroundColor: rule.color + '20' }]}>
                  <Text style={[styles.ruleTagText, { color: rule.color }]}>{rule.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Weekly overview */}
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>This Week</Text>
            <View style={styles.weekRow}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                const active = activeDays.has(d.toDateString());
                const todayFlg = d.toDateString() === today.toDateString();
                return (
                  <View key={i} style={styles.weekCell}>
                    <Text style={[styles.weekDay, { color: themeColors.muted }]}>{DAYS[d.getDay()]}</Text>
                    <View style={[
                      styles.weekDot,
                      { backgroundColor: themeColors.bg },
                      active && { backgroundColor: '#2B3C86' },
                      todayFlg && !active && { borderWidth: 2, borderColor: '#4AA5D9' },
                    ]}>
                      {active
                        ? <Ionicons name="flame" size={16} color={FLAME} />
                        : <Text style={{ fontSize: 10, color: themeColors.muted }}>{d.getDate()}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Monthly calendar */}
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{MONTHS[month]} {year}</Text>
            <View style={styles.calHeader}>
              {DAYS.map(d => (
                <Text key={d} style={[styles.calHeaderText, { color: themeColors.muted }]}>{d}</Text>
              ))}
            </View>
            {Array.from({ length: calendarCells.length / 7 }, (_, row) => (
              <View key={row} style={styles.calRow}>
                {calendarCells.slice(row * 7, row * 7 + 7).map((day, col) => {
                  if (!day) return <View key={col} style={styles.calCell} />;
                  const active = isActive(day);
                  const todayFl = isToday(day);
                  return (
                    <View key={col} style={styles.calCell}>
                      <View style={[
                        styles.calDot,
                        active && { backgroundColor: '#2B3C86' },
                        todayFl && !active && { borderWidth: 2, borderColor: '#4AA5D9' },
                      ]}>
                        <Text style={[
                          styles.calDayText,
                          { color: active ? '#fff' : todayFl ? '#4AA5D9' : themeColors.text },
                          active && { fontWeight: '800' },
                        ]}>{day}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2B3C86' }]} />
                <Text style={[styles.legendText, { color: themeColors.muted }]}>Active day</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { borderWidth: 2, borderColor: '#4AA5D9', backgroundColor: 'transparent' }]} />
                <Text style={[styles.legendText, { color: themeColors.muted }]}>Today</Text>
              </View>
            </View>
          </View>

          {/* Rewards section */}
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <View style={styles.sectionRow}>
              <Ionicons name="trophy-outline" size={20} color="#FFB300" />
              <Text style={[styles.sectionTitle, { color: themeColors.text, marginLeft: 6 }]}>Rewards</Text>
            </View>
            <Text style={[styles.rewardsSub, { color: themeColors.muted }]}>
              Unlock badges by reaching streak milestones
            </Text>
            {REWARDS.map(reward => {
              const unlocked = streak >= reward.threshold;
              const progress = Math.min(1, streak / reward.threshold);
              return (
                <View
                  key={reward.id}
                  style={[
                    styles.rewardRow,
                    { borderColor: unlocked ? '#4AA5D9' : themeColors.border },
                    unlocked && { backgroundColor: nightMode ? '#1C2A3A' : '#E8F3FF' },
                  ]}
                >
                  <View style={[styles.rewardIcon, !unlocked && { opacity: 0.35 }, { backgroundColor: nightMode ? '#1E2D3D' : '#EBF5FF' }]}>
                    <Text style={styles.rewardEmoji}>{reward.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rewardTitleRow}>
                      <Text style={[styles.rewardTitle, { color: unlocked ? '#2B3C86' : themeColors.text }]}>
                        {reward.title}
                      </Text>
                      {unlocked && (
                        <View style={styles.unlockedBadge}>
                          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                          <Text style={styles.unlockedText}>Unlocked</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.rewardDesc, { color: themeColors.muted }]}>{reward.desc}</Text>
                    {/* Progress bar */}
                    <View style={[styles.progressBar, { backgroundColor: themeColors.bg }]}>
                      <View style={[styles.progressFill, {
                        width: `${progress * 100}%` as any,
                        backgroundColor: unlocked ? '#4AA5D9' : '#2B7FC0',
                      }]} />
                    </View>
                    <Text style={[styles.rewardThreshold, { color: themeColors.muted }]}>
                      {unlocked ? `Achieved at ${reward.threshold} days` : `${streak}/${reward.threshold} days`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Tip */}
          <View style={[styles.tipCard, { backgroundColor: nightMode ? '#1C2A3A' : '#E8F3FF' }]}>
            <Ionicons name="bulb-outline" size={20} color="#4AA5D9" style={{ marginRight: 10, marginTop: 1 }} />
            <Text style={[styles.tipText, { color: nightMode ? '#A8CAEB' : '#2B3C86' }]}>
              Open TinyBit every day to earn +1 point. Miss a day and you lose 5 points. Stay consistent to unlock all rewards!
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 40,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff', flex: 1, textAlign: 'center' },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  scrollSheet: {
    flex: 1, marginTop: -24,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  scroll: { paddingHorizontal: 16, paddingTop: 24, gap: 14 },

  // Hero
  heroEmoji: { fontSize: 64, lineHeight: 72, marginBottom: 4 },
  heroCard: {
    borderRadius: 24, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  heroCount: { fontSize: 64, fontWeight: '900', lineHeight: 72 },
  heroLabel: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  heroSub: { fontSize: 14, fontWeight: '500', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  nextBadge: {
    marginTop: 14, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  nextBadgeText: { fontSize: 13, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, borderRadius: 18, alignItems: 'center', paddingVertical: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statValue: { fontSize: 28, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  // Section
  section: {
    borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },

  // Rules
  ruleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  ruleBadge: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ruleIcon: { fontSize: 20 },
  ruleLabel: { fontSize: 14, fontWeight: '800' },
  ruleDesc: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  ruleTag: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  ruleTagText: { fontSize: 12, fontWeight: '800' },

  // Week
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCell: { alignItems: 'center', gap: 6 },
  weekDay: { fontSize: 11, fontWeight: '700' },
  weekDot: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },

  // Calendar
  calHeader: { flexDirection: 'row', marginBottom: 6 },
  calHeaderText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calRow: { flexDirection: 'row', marginBottom: 4 },
  calCell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  calDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  calDayText: { fontSize: 13, fontWeight: '600' },
  legend: { flexDirection: 'row', gap: 20, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontSize: 12, fontWeight: '600' },

  // Rewards
  rewardsSub: { fontSize: 13, fontWeight: '500', marginBottom: 14, marginTop: -6 },
  rewardRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1.5, borderRadius: 14, padding: 12, marginBottom: 10,
  },
  rewardIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rewardEmoji: { fontSize: 26 },
  rewardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  rewardTitle: { fontSize: 14, fontWeight: '800' },
  rewardDesc: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  unlockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  unlockedText: { fontSize: 11, fontWeight: '700', color: '#4CAF50' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  rewardThreshold: { fontSize: 11, fontWeight: '600', marginTop: 4 },

  // Tip
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 16, padding: 16,
  },
  tipText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 20 },
});
