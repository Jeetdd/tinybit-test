import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Alert,
  TextInput,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { supabase } from "../../utils/supabase";
import { tr } from "../../constants/appTranslations";
import { broadcastElderUpdate, notifyGuardians } from "../../services/pushNotifications";
import { notifyGuardiansOf } from "../../services/notifications";

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  navy:    "#1A2E6A",
  navyDk:  "#111D44",
  white:   "#FFFFFF",
  bg:      "#EEF2F7",
  muted:   "#8A9BB0",
  accent:  "#37B1E6",
  border:  "#E4EBF2",
  green:   "#16A34A",
  red:     "#EF4444",
  yellow:  "#F59E0B",
};

const TODAY_KEY = "daily_checkin_done_date_v2";

// ─── Mood data ─────────────────────────────────────────────────────────────────

const MOODS = [
  { key: "happy",    emoji: "😊", label: "Happy",    accent: "#F59E0B", bg: "#FEF9EE" },
  { key: "calm",     emoji: "😌", label: "Calm",     accent: "#10B981", bg: "#ECFDF5" },
  { key: "low",      emoji: "😔", label: "Low",      accent: "#7C3AED", bg: "#F5F3FF" },
  { key: "tired",    emoji: "😴", label: "Tired",    accent: "#DC2626", bg: "#FEF2F2" },
  { key: "anxious",  emoji: "😟", label: "Anxious",  accent: "#D97706", bg: "#FFFBEB" },
  { key: "stressed", emoji: "😣", label: "Stressed", accent: "#2563EB", bg: "#EFF6FF" },
] as const;

type MoodKey = typeof MOODS[number]["key"];

const MOOD_SCORE: Record<MoodKey, number> = {
  happy: 5, calm: 4, tired: 3, low: 2, anxious: 2, stressed: 1,
};

// ─── Health score logic ────────────────────────────────────────────────────────

function calcScore(
  mood: string | null,
  sleep: string | null,
  breakfast: string | null,
  water: string | null,
  pain: string | null,
  activity: string | null,
  meals: string | null,
): { score: number; color: string; message: string } {
  let total = 0;
  let max   = 0;

  if (mood      !== null) { total += ({ happy: 20, calm: 18, tired: 10, low: 8, anxious: 8, stressed: 6 } as any)[mood] ?? 0; max += 20; }
  if (sleep     !== null) { total += ({ excellent: 20, good: 14, poor: 6 } as any)[sleep] ?? 0;           max += 20; }
  if (water     !== null) { total += ({ "7+": 15, "4-6": 12, "1-3": 6, "0": 0 } as any)[water] ?? 0;     max += 15; }
  if (pain      !== null) { total += ({ none: 15, mild: 10, moderate: 5, severe: 0 } as any)[pain] ?? 0;  max += 15; }
  if (activity  !== null) { total += ({ active: 15, moderate: 10, low: 4 } as any)[activity] ?? 0;        max += 15; }
  if (breakfast !== null) { total += breakfast === "yes" ? 10 : 2;                                         max += 10; }
  if (meals     !== null) { total += ({ "4+": 5, "3": 5, "2": 3, "1": 1 } as any)[meals] ?? 0;           max +=  5; }

  const score   = max === 0 ? 0 : Math.round((total / max) * 100);
  const color   = score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444";
  const message =
    score >= 90 ? "Excellent day! Keep it up! 🌟" :
    score >= 80 ? "Feeling great today! 😊" :
    score >= 70 ? "Having a good day 👍" :
    score >= 60 ? "Take care of yourself 💙" :
    max  === 0  ? "Fill in your details below" :
                  "Rest and recover today 🌿";
  return { score, color, message };
}

// ─── SegmentedPicker ───────────────────────────────────────────────────────────

type SegOpt = { key: string; label: string };

function SegmentedPicker({
  label, icon, options, value, onChange, accent = C.accent,
}: {
  label: string;
  icon: string;
  options: SegOpt[];
  value: string | null;
  onChange: (k: string) => void;
  accent?: string;
}) {
  return (
    <View style={sg.wrapper}>
      <View style={sg.labelRow}>
        <Ionicons name={icon as any} size={17} color={accent} />
        <Text style={sg.label}>{label}</Text>
      </View>
      <View style={sg.track}>
        {options.map(o => {
          const active = value === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              onPress={() => onChange(o.key)}
              style={[sg.seg, active && { backgroundColor: accent }]}
              activeOpacity={0.75}
            >
              <Text style={[sg.segTxt, active && sg.segTxtActive]} numberOfLines={1}>
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const sg = StyleSheet.create({
  wrapper:      { marginBottom: 2 },
  labelRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  label:        { fontSize: 15, fontWeight: "700", color: C.navyDk },
  track:        { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 14, padding: 3, gap: 2 },
  seg:          { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  segTxt:       { fontSize: 12, fontWeight: "600", color: C.muted, textAlign: "center" },
  segTxtActive: { color: C.white, fontWeight: "800" },
});

// ─── MetricInputRow ────────────────────────────────────────────────────────────

function MetricInputRow({
  emoji, label, value, value2, ph, ph2, unit, onChange, onChange2,
}: {
  emoji: string; label: string;
  value: string; value2?: string;
  ph: string; ph2?: string;
  unit: string;
  onChange: (v: string) => void;
  onChange2?: (v: string) => void;
}) {
  return (
    <View style={mi.row}>
      <View style={mi.iconBox}><Text style={{ fontSize: 22 }}>{emoji}</Text></View>
      <View style={mi.mid}>
        <Text style={mi.label}>{label}</Text>
        <View style={mi.inputs}>
          <TextInput
            style={mi.input}
            value={value}
            onChangeText={onChange}
            placeholder={ph}
            keyboardType="numeric"
            placeholderTextColor="#B0BEC5"
          />
          {value2 !== undefined && onChange2 && (
            <>
              <Text style={mi.slash}>/</Text>
              <TextInput
                style={mi.input}
                value={value2}
                onChangeText={onChange2}
                placeholder={ph2 ?? ""}
                keyboardType="numeric"
                placeholderTextColor="#B0BEC5"
              />
            </>
          )}
        </View>
      </View>
      <Text style={mi.unit}>{unit}</Text>
    </View>
  );
}

const mi = StyleSheet.create({
  row:    { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14 },
  iconBox:{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  mid:    { flex: 1 },
  label:  { fontSize: 14, fontWeight: "700", color: C.navyDk, marginBottom: 8 },
  inputs: { flexDirection: "row", alignItems: "center", gap: 8 },
  input:  {
    backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 18, fontWeight: "700", color: C.navy, minWidth: 72, textAlign: "center",
  },
  slash:  { fontSize: 22, fontWeight: "900", color: C.muted },
  unit:   { fontSize: 12, fontWeight: "600", color: C.muted, minWidth: 42, textAlign: "right" },
});

// ─── HealthScoreCard ───────────────────────────────────────────────────────────

function HealthScoreCard({
  score, color, message, filled,
}: {
  score: number; color: string; message: string; filled: number;
}) {
  return (
    <View style={hsc.card}>
      <View style={[hsc.ring, { borderColor: color }]}>
        <Text style={[hsc.scoreNum, { color }]}>{score}</Text>
        <Text style={hsc.scoreOf}>/ 100</Text>
      </View>
      <View style={hsc.right}>
        <Text style={hsc.title}>TODAY'S HEALTH SCORE</Text>
        <Text style={[hsc.msg, { color }]}>{message}</Text>
        <View style={hsc.dotsRow}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={[hsc.dot, { backgroundColor: i < filled ? color : "#E4EBF2" }]} />
          ))}
          <Text style={hsc.dotsTxt}>{filled}/7</Text>
        </View>
      </View>
    </View>
  );
}

const hsc = StyleSheet.create({
  card:     {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 20,
    borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center",
    elevation: 3, gap: 20,
  },
  ring:     { width: 90, height: 90, borderRadius: 45, borderWidth: 8, justifyContent: "center", alignItems: "center" },
  scoreNum: { fontSize: 30, fontWeight: "900" },
  scoreOf:  { fontSize: 11, fontWeight: "600", color: C.muted },
  right:    { flex: 1 },
  title:    { fontSize: 11, fontWeight: "700", color: C.muted, letterSpacing: 0.8, marginBottom: 6 },
  msg:      { fontSize: 15, fontWeight: "700", lineHeight: 20, marginBottom: 10 },
  dotsRow:  { flexDirection: "row", alignItems: "center", gap: 5 },
  dot:      { width: 9, height: 9, borderRadius: 5 },
  dotsTxt:  { fontSize: 11, fontWeight: "600", color: C.muted, marginLeft: 4 },
});

// ─── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={sh.wrapper}>
      <Text style={sh.title}>{title}</Text>
      {sub ? <Text style={sh.sub}>{sub}</Text> : null}
    </View>
  );
}

const sh = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, marginBottom: 12, marginTop: 6 },
  title:   { fontSize: 18, fontWeight: "900", color: C.navyDk },
  sub:     { fontSize: 13, fontWeight: "500", color: C.muted, marginTop: 3 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function DailyHealthCheckinScreen() {
  const router            = useRouter();
  const insets            = useSafeAreaInsets();
  const { width }         = useWindowDimensions();
  const { user, profile } = useAuth();
  const { colors: theme, language } = useLanguage();
  const t = tr(language);

  // Form
  const [mood,          setMood]         = useState<string | null>(null);
  const [sleepQuality,  setSleepQuality] = useState<string | null>(null);
  const [hadBreakfast,  setHadBreakfast] = useState<string | null>(null);
  const [waterIntake,   setWaterIntake]  = useState<string | null>(null);
  const [painLevel,     setPainLevel]    = useState<string | null>(null);
  const [bpSys,         setBpSys]        = useState("");
  const [bpDia,         setBpDia]        = useState("");
  const [bloodSugar,    setBloodSugar]   = useState("");
  const [weightKg,      setWeightKg]     = useState("");
  const [activityLevel, setActivity]     = useState<string | null>(null);
  const [mealsToday,    setMeals]        = useState<string | null>(null);
  const [metricsOpen,   setMetricsOpen]  = useState(false);

  // UI
  const [saving,      setSaving]      = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const filledCount = [mood, sleepQuality, hadBreakfast, waterIntake, painLevel, activityLevel, mealsToday]
    .filter(Boolean).length;

  const { score, color: scoreColor, message: scoreMsg } = useMemo(
    () => calcScore(mood, sleepQuality, hadBreakfast, waterIntake, painLevel, activityLevel, mealsToday),
    [mood, sleepQuality, hadBreakfast, waterIntake, painLevel, activityLevel, mealsToday],
  );

  useEffect(() => {
    AsyncStorage.getItem(TODAY_KEY).then(val => {
      if (val === today) setAlreadyDone(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user) return;
    if (!mood) return Alert.alert("Mood required", "Please select how you are feeling today.");
    setSaving(true);
    try {
      // 1. Upsert daily_check_ins (existing table)
      await supabase.from("daily_check_ins").upsert(
        {
          user_id:           user.id,
          date:              today,
          mood,
          mood_score:        MOOD_SCORE[mood as MoodKey] ?? 3,
          sleep_quality:     sleepQuality,
          pain_level:        painLevel,
          physical_activity: activityLevel,
          questions: [
            { id: 1, key: "breakfast", text: "Had Breakfast?",  value: hadBreakfast  },
            { id: 2, key: "water",     text: "Water Intake",    value: waterIntake   },
            { id: 3, key: "activity",  text: "Activity Level",  value: activityLevel },
            { id: 4, key: "meals",     text: "Meals Today",     value: mealsToday    },
          ],
          notes:       `score:${score}`,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" },
      );

      // 2. Log health metrics to health_logs (if entered)
      const metricLogs: any[] = [];
      if (bpSys && bpDia) {
        metricLogs.push({
          user_id: user.id, type: "bp",
          value:   { systolic: Number(bpSys), diastolic: Number(bpDia) },
          note:    `${bpSys}/${bpDia} mmHg`,
          logged_at: new Date().toISOString(),
        });
      }
      if (bloodSugar) {
        metricLogs.push({
          user_id: user.id, type: "sugar",
          value:   { level: Number(bloodSugar) },
          note:    `${bloodSugar} mg/dL`,
          logged_at: new Date().toISOString(),
        });
      }
      if (weightKg) {
        metricLogs.push({
          user_id: user.id, type: "weight",
          value:   { kg: Number(weightKg) },
          note:    `${weightKg} kg`,
          logged_at: new Date().toISOString(),
        });
      }
      if (metricLogs.length > 0) {
        await supabase.from("health_logs").insert(metricLogs);
      }

      // 3. Guardian check-in share
      await supabase.from("guardian_check_in_shares").upsert(
        {
          elder_id:          user.id,
          date:              today,
          mood,
          mood_score:        MOOD_SCORE[mood as MoodKey] ?? 3,
          questions_summary: `Sleep: ${sleepQuality ?? "—"} | Water: ${waterIntake ?? "—"} | Pain: ${painLevel ?? "—"} | Score: ${score}/100`,
          shared_at:         new Date().toISOString(),
        },
        { onConflict: "elder_id,date" },
      ).then(() => {}); // non-blocking

      broadcastElderUpdate(user.id, "checkin-update");

      const name = profile?.fullName?.split(" ")[0] ?? "Your elder";
      notifyGuardians(
        user.id,
        `${name} completed their daily check-in`,
        `Mood: ${mood} · Score: ${score}/100`,
        { screen: "guardian-summary" },
      );
      notifyGuardiansOf(
        user.id, user.id, "check_in_done",
        "✅ Daily Check-In Complete",
        `${name} — Mood: ${mood} · Health Score: ${score}/100`,
      );

      await AsyncStorage.setItem(TODAY_KEY, today);

      Alert.alert(
        "🎉 Check-In Complete!",
        `Your health score today: ${score}/100\n\n${scoreMsg}`,
        [{ text: "Great!", onPress: () => router.replace("/(tabs)") }],
      );
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived greeting ────────────────────────────────────────────────────────

  const firstName  = profile?.fullName?.split(" ")[0] ?? (profile as any)?.firstName ?? "there";
  const hourNow    = new Date().getHours();
  const greeting   = hourNow < 12 ? "Good Morning" : hourNow < 17 ? "Good Afternoon" : "Good Evening";

  // Mood card width: 3-per-row with gap
  const GUTTER = 32; // paddingHorizontal 16 × 2
  const GAP    = 10;
  const moodW  = Math.floor((width - GUTTER - GAP * 2) / 3);

  // ── Already-done view ───────────────────────────────────────────────────────

  if (alreadyDone) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={["#2B3C86", "#2E9CD6"]} style={[s.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.white} />
          </Pressable>
          <Text style={s.headerTitle}>Daily Health Check-In</Text>
        </LinearGradient>
        <View style={[s.sheet, { backgroundColor: theme.bg }]}>
          <View style={s.doneBanner}>
            <Ionicons name="checkmark-circle" size={76} color="#22C55E" />
            <Text style={[s.doneTitle, { color: theme.text }]}>All Done Today! 🎉</Text>
            <Text style={[s.doneSub, { color: theme.muted }]}>
              You've already completed your daily check-in.{"\n"}Come back tomorrow to keep your streak going!
            </Text>
            <Pressable style={s.doneBtn} onPress={() => router.replace("/(tabs)")}>
              <Text style={s.doneBtnTxt}>Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <LinearGradient
        colors={["#2B3C86", "#2E9CD6"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}
          style={s.backBtn}
        >
          <Ionicons name="chevron-back" size={20} color={C.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Daily Health Check-In</Text>
          <Text style={s.headerSub}>Takes less than 2 minutes</Text>
        </View>
        {filledCount >= 1 && (
          <View style={[s.scorePill, { borderColor: scoreColor }]}>
            <Text style={[s.scorePillNum, { color: scoreColor }]}>{score}</Text>
            <Text style={s.scorePillLbl}>score</Text>
          </View>
        )}
      </LinearGradient>

      <View style={[s.sheet, { backgroundColor: theme.bg }]}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── 1. Sathi AI Card ─────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(60).springify()} style={[s.sathiCard, { backgroundColor: theme.card }]}>
            <View style={s.sathiTop}>
              <Image
                source={require("../../assets/images/Group 427320054.png")}
                style={s.sathiImg}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.sathiName, { color: theme.text }]}>{greeting}, {firstName}! 👋</Text>
                <Text style={[s.sathiQ, { color: theme.muted }]}>How are you feeling today?</Text>
              </View>
            </View>
            <Text style={[s.sathiMsg, { color: theme.muted }]}>
              Remember to stay hydrated 💧 and take care of yourself today.
            </Text>
            <LinearGradient
              colors={["#2B7FC0", "#1B5A90"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.talkBtn}
            >
              <Ionicons name="mic-outline" size={18} color={C.white} />
              <Text style={s.talkBtnTxt}>{t.talkToSathi}</Text>
            </LinearGradient>
          </Animated.View>

          {/* ── 2. Mood Check-In ──────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <SectionHeader title="How's Your Mood?" sub="Select one that fits best" />
            {/* Row 1 */}
            <View style={[s.moodRow, { paddingHorizontal: 16 }]}>
              {MOODS.slice(0, 3).map(m => {
                const active = mood === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setMood(m.key)}
                    style={[
                      s.moodCard,
                      { width: moodW, backgroundColor: active ? m.bg : theme.card, borderColor: active ? m.accent : "transparent" },
                    ]}
                  >
                    <Text style={s.moodEmoji}>{m.emoji}</Text>
                    <Text style={[s.moodLbl, { color: active ? m.accent : theme.muted }]}>{m.label}</Text>
                    {active && <View style={[s.moodDot, { backgroundColor: m.accent }]} />}
                  </Pressable>
                );
              })}
            </View>
            {/* Row 2 */}
            <View style={[s.moodRow, { paddingHorizontal: 16, marginBottom: 8 }]}>
              {MOODS.slice(3, 6).map(m => {
                const active = mood === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setMood(m.key)}
                    style={[
                      s.moodCard,
                      { width: moodW, backgroundColor: active ? m.bg : theme.card, borderColor: active ? m.accent : "transparent" },
                    ]}
                  >
                    <Text style={s.moodEmoji}>{m.emoji}</Text>
                    <Text style={[s.moodLbl, { color: active ? m.accent : theme.muted }]}>{m.label}</Text>
                    {active && <View style={[s.moodDot, { backgroundColor: m.accent }]} />}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* ── 3. Daily Health Check ─────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <SectionHeader title="Daily Health Check" />
            <View style={[s.card, { backgroundColor: theme.card }]}>
              <SegmentedPicker
                label="Sleep Quality"
                icon="moon-outline"
                options={[
                  { key: "excellent", label: "Excellent" },
                  { key: "good",      label: "Good"      },
                  { key: "poor",      label: "Poor"      },
                ]}
                value={sleepQuality}
                onChange={setSleepQuality}
                accent="#6366F1"
              />
              <View style={s.div} />
              <SegmentedPicker
                label="Breakfast Today"
                icon="fast-food-outline"
                options={[
                  { key: "yes", label: "Yes ✓" },
                  { key: "no",  label: "No ✗"  },
                ]}
                value={hadBreakfast}
                onChange={setHadBreakfast}
                accent="#10B981"
              />
              <View style={s.div} />
              <SegmentedPicker
                label="Water Intake"
                icon="water-outline"
                options={[
                  { key: "0",   label: "0 🥤"   },
                  { key: "1-3", label: "1–3"    },
                  { key: "4-6", label: "4–6"    },
                  { key: "7+",  label: "7+ 🏆"  },
                ]}
                value={waterIntake}
                onChange={setWaterIntake}
                accent={C.accent}
              />
              <View style={s.div} />
              <SegmentedPicker
                label="Pain / Discomfort"
                icon="body-outline"
                options={[
                  { key: "none",     label: "None"     },
                  { key: "mild",     label: "Mild"     },
                  { key: "moderate", label: "Moderate" },
                  { key: "severe",   label: "Severe"   },
                ]}
                value={painLevel}
                onChange={setPainLevel}
                accent={
                  painLevel === "severe"   ? C.red    :
                  painLevel === "moderate" ? C.yellow :
                  C.green
                }
              />
              {painLevel === "severe" && (
                <View style={s.emergBanner}>
                  <Ionicons name="warning" size={18} color="#DC2626" />
                  <Text style={s.emergTxt}>
                    Severe pain selected — please notify your family or doctor if needed.
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* ── 4. Health Metrics (collapsible) ──────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(240).springify()}>
            <Pressable style={s.metricsHdr} onPress={() => setMetricsOpen(p => !p)}>
              <View style={{ flex: 1 }}>
                <Text style={s.metricsTitleTxt}>Health Metrics</Text>
                <Text style={s.metricsSubTxt}>Optional — blood pressure, sugar & weight</Text>
              </View>
              <View style={s.metricsChevron}>
                <Ionicons name={metricsOpen ? "chevron-up" : "add"} size={18} color={C.accent} />
              </View>
            </Pressable>

            {metricsOpen && (
              <View style={[s.card, { backgroundColor: theme.card }]}>
                <MetricInputRow
                  emoji="❤️"
                  label="Blood Pressure"
                  value={bpSys}  value2={bpDia}
                  ph="120"       ph2="80"
                  unit="mmHg"
                  onChange={setBpSys}
                  onChange2={setBpDia}
                />
                <View style={s.metDiv} />
                <MetricInputRow
                  emoji="🩸"
                  label="Blood Sugar"
                  value={bloodSugar}
                  ph="110"
                  unit="mg/dL"
                  onChange={setBloodSugar}
                />
                <View style={s.metDiv} />
                <MetricInputRow
                  emoji="⚖️"
                  label="Weight"
                  value={weightKg}
                  ph="72"
                  unit="kg"
                  onChange={setWeightKg}
                />
              </View>
            )}
          </Animated.View>

          {/* ── 5. Daily Activity Snapshot ────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <SectionHeader title="Daily Activity" />
            <View style={[s.card, { backgroundColor: theme.card }]}>
              <SegmentedPicker
                label="Activity Level"
                icon="walk-outline"
                options={[
                  { key: "low",      label: "Low"       },
                  { key: "moderate", label: "Moderate"  },
                  { key: "active",   label: "Active 🏃" },
                ]}
                value={activityLevel}
                onChange={setActivity}
                accent="#10B981"
              />
              <View style={s.div} />
              <SegmentedPicker
                label="Meals Today"
                icon="restaurant-outline"
                options={[
                  { key: "1",  label: "1 Meal"  },
                  { key: "2",  label: "2 Meals" },
                  { key: "3",  label: "3 Meals" },
                  { key: "4+", label: "4+ 🍽"   },
                ]}
                value={mealsToday}
                onChange={setMeals}
                accent="#F59E0B"
              />
            </View>
          </Animated.View>

          {/* ── 6. Health Score Card ──────────────────────────────────────────── */}
          {filledCount >= 2 && (
            <Animated.View entering={FadeInDown.delay(60).springify()}>
              <SectionHeader title="Today's Health Score" />
              <HealthScoreCard
                score={score}
                color={scoreColor}
                message={scoreMsg}
                filled={filledCount}
              />
            </Animated.View>
          )}

          {/* ── 7. Complete CTA ───────────────────────────────────────────────── */}
          <Pressable
            onPress={handleSubmit}
            disabled={saving || !mood}
            style={[s.cta, (saving || !mood) && s.ctaDim]}
          >
            <LinearGradient
              colors={saving || !mood ? ["#8A9BB0", "#8A9BB0"] : ["#1A2E6A", "#2563EB"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.ctaGrad}
            >
              <Ionicons
                name={saving ? "hourglass-outline" : "checkmark-done"}
                size={24}
                color={C.white}
              />
              <Text style={s.ctaTxt}>
                {saving ? "Saving…" : "Complete Daily Check-In"}
              </Text>
            </LinearGradient>
          </Pressable>

          {!mood && (
            <Text style={s.hintTxt}>Select your mood above to enable check-in</Text>
          )}

        </ScrollView>
      </View>
    </View>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 50, gap: 12 },
  backBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center" },
  headerTitle:  { fontSize: 19, fontWeight: "900", color: C.white },
  headerSub:    { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  scorePill:    { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6 },
  scorePillNum: { fontSize: 20, fontWeight: "900" },
  scorePillLbl: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.65)" },

  // Sheet
  sheet:  { flex: 1, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  scroll: { paddingTop: 16 },

  // Already-done
  doneBanner: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  doneTitle:  { fontSize: 26, fontWeight: "900", marginTop: 20, marginBottom: 10, textAlign: "center" },
  doneSub:    { fontSize: 15, fontWeight: "500", textAlign: "center", lineHeight: 23, marginBottom: 30 },
  doneBtn:    { backgroundColor: C.accent, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30 },
  doneBtnTxt: { color: C.white, fontSize: 16, fontWeight: "800" },

  // Sathi card
  sathiCard:  { marginHorizontal: 16, marginBottom: 20, borderRadius: 22, padding: 18, elevation: 3 },
  sathiTop:   { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  sathiImg:   { width: 52, height: 52 },
  sathiName:  { fontSize: 17, fontWeight: "900" },
  sathiQ:     { fontSize: 13, fontWeight: "500", marginTop: 3 },
  sathiMsg:   { fontSize: 14, fontWeight: "500", lineHeight: 20, marginBottom: 16 },
  talkBtn:    { borderRadius: 30, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  talkBtnTxt: { color: C.white, fontSize: 15, fontWeight: "800" },

  // Mood grid
  moodRow:  { flexDirection: "row", gap: 10, marginBottom: 10 },
  moodCard: { borderRadius: 18, paddingVertical: 16, alignItems: "center", borderWidth: 2, elevation: 2 },
  moodEmoji:{ fontSize: 36, marginBottom: 8 },
  moodLbl:  { fontSize: 13, fontWeight: "800" },
  moodDot:  { width: 7, height: 7, borderRadius: 4, marginTop: 7 },

  // Generic card
  card:   { marginHorizontal: 16, marginBottom: 20, borderRadius: 22, padding: 18, elevation: 3 },
  div:    { height: 1, backgroundColor: "#F1F5F9", marginVertical: 16 },
  metDiv: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 2 },

  // Emergency
  emergBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FEF2F2", borderRadius: 14, padding: 14, marginTop: 14 },
  emergTxt:    { flex: 1, fontSize: 13, fontWeight: "600", color: "#DC2626", lineHeight: 18 },

  // Metrics collapsible header
  metricsHdr:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, marginTop: 6 },
  metricsTitleTxt: { fontSize: 18, fontWeight: "900", color: C.navyDk },
  metricsSubTxt:   { fontSize: 13, fontWeight: "500", color: C.muted, marginTop: 3 },
  metricsChevron:  { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E8F5FD", justifyContent: "center", alignItems: "center" },

  // CTA
  cta:     { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, overflow: "hidden", elevation: 4 },
  ctaDim:  { opacity: 0.65 },
  ctaGrad: { height: 64, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  ctaTxt:  { color: C.white, fontSize: 17, fontWeight: "900" },
  hintTxt: { textAlign: "center", fontSize: 13, fontWeight: "500", color: C.muted, marginBottom: 10 },
});
