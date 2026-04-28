import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, Alert, useWindowDimensions, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../utils/supabase";

const C = {
  navy:    "#1A2E6A",
  navyDark:"#111D44",
  white:   "#FFFFFF",
  bg:      "#EEF2F7",
  muted:   "#8A9BB0",
  accent:  "#37B1E6",
  border:  "#E4EBF2",
  green:   "#16A34A",
};

const MOOD_SCORE: Record<string, number> = { Great: 5, Good: 4, Okay: 3, Low: 2, Unwell: 1 };

const MOODS = [
  { label: "Happy", image: require("../../assets/images/happy.png"),  badge: "#F59E0B" },
  { label: "Tired", image: require("../../assets/images/tired.png"),  badge: "#DC2626" },
  { label: "Low",   image: require("../../assets/images/low.png"),    badge: "#7C3AED" },
  { label: "calm",  image: require("../../assets/images/calm.png"),   badge: "#16A34A" },
];

const CHECK_ICONS = [
  "person-outline",
  "fast-food-outline",
  "water-outline",
  "body-outline",
] as const;

const SUMMARY = [
  { label: "Mood",            value: "Good",       color: "#37B1E6", dot: "#37B1E6" },
  { label: "Medicines",       value: "3/3 Taken",  color: "#16A34A", dot: "#16A34A" },
  { label: "Sleep",           value: "6.5 Hrs",    color: "#F59E0B", dot: "#F59E0B" },
  { label: "Family Messages", value: "2 Received", color: "#F59E0B", dot: "#F59E0B" },
];

export default function DailyCheckInScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isRecording,  setIsRecording]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [questions, setQuestions] = useState([
    { id: 1, text: "How did you sleep last Night ?",  sub: "Did you feel rested",           done: false },
    { id: 2, text: "Have you had breakfast ?",        sub: "Tea, Bread, or a light meal",   done: false },
    { id: 3, text: "Drank water this morning ?",      sub: "At least 1 glass after walking",done: false },
    { id: 4, text: "Any Pain or Discomfort today ?",  sub: "Leg, back, chest or Head",      done: false },
  ]);

  const cardW = (width - 16 * 2 - 10 * 3) / 4;
  const doneCount = questions.filter(q => q.done).length;

  const toggle = (id: number) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, done: !q.done } : q));

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const mood  = selectedMood ?? "Good";
      await supabase.from("moods").upsert(
        { user_id: user.id, mood, mood_score: MOOD_SCORE[mood] ?? 3, date: today, time: new Date().toTimeString().slice(0, 5) },
        { onConflict: "user_id,date" },
      );
      await supabase.from("daily_check_ins").upsert(
        { user_id: user.id, date: today, mood, mood_score: MOOD_SCORE[mood] ?? 3, questions, completed_at: new Date().toISOString() },
        { onConflict: "user_id,date" },
      );
      Alert.alert("Done! 🎉", "Your check-in has been saved.");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <LinearGradient
        colors={["#1B3A5C", "#2B7FC0"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.navyDark} />
        </Pressable>
        <Text style={s.headerTitle}>Daily Check-In</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Sathi AI Card */}
        <Animated.View entering={FadeInDown.delay(80)} style={s.sathiCard}>
          <View style={s.sathiTop}>
            <View style={s.sathiLeft}>
              <Image source={require("../../assets/images/Group 427320054.png")} style={s.sathiMascot} resizeMode="contain" />
            </View>
            <View style={s.sathiMid}>
              <Text style={s.sathiTitle}>Sathi Ai Say...</Text>
              <Text style={s.sathiSub}>Your Voice Ai companion</Text>
            </View>
            <Ionicons name="pulse" size={22} color={C.accent} />
          </View>
          <Text style={s.sathiMsg}>
            Good Morning Michael! Your Blood sugar yesterday was bit high. Let's focus on your walk today. You:re on Day 12 of Recovery
          </Text>
          <LinearGradient
            colors={["#2B7FC0", "#1B5A90"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.talkBtn}
          >
            <Ionicons name="mic-outline" size={18} color={C.white} />
            <Text style={s.talkBtnText}>Talk to Sathi</Text>
          </LinearGradient>
        </Animated.View>

        {/* How are you feeling? */}
        <View style={s.secHeader}>
          <Text style={s.secTitle}>How are you feeling ?</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(160)} style={s.moodRow}>
          {MOODS.map(m => (
            <Pressable
              key={m.label}
              onPress={() => setSelectedMood(m.label)}
              style={[s.moodCard, { width: cardW }, selectedMood === m.label && s.moodCardSel]}
            >
              <View style={[s.moodBadge, { backgroundColor: m.badge }]}>
                <Text style={s.moodBadgeText}>{m.label}</Text>
              </View>
              <Image source={m.image} style={s.moodImg} resizeMode="contain" />
            </Pressable>
          ))}
        </Animated.View>

        {/* Explore More — Health Check */}
        <View style={s.secHeader}>
          <Text style={s.secTitle}>Explore More</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(240)} style={s.checkCard}>
          <View style={s.checkCardHeader}>
            <View style={s.greenBadge}>
              <Text style={s.greenBadgeText}>Quick Health Check</Text>
            </View>
            <View style={s.doneBadge}>
              <Text style={s.doneBadgeText}>{doneCount} of 4 Done</Text>
            </View>
          </View>

          {questions.map((q, i) => (
            <Pressable
              key={q.id}
              onPress={() => toggle(q.id)}
              style={[s.checkRow, i < questions.length - 1 && s.checkRowBorder]}
            >
              <View style={s.checkIcon}>
                <Ionicons name={CHECK_ICONS[i]} size={20} color={C.accent} />
              </View>
              <View style={s.checkInfo}>
                <Text style={s.checkTitle}>{q.text}</Text>
                <Text style={s.checkSub}>{q.sub}</Text>
              </View>
              <View style={[s.radio, q.done && s.radioDone]}>
                {q.done && <View style={s.radioDot} />}
              </View>
            </Pressable>
          ))}
        </Animated.View>

        {/* Voice Message */}
        <Animated.View entering={FadeInDown.delay(320)} style={s.voiceCard}>
          <Text style={s.voiceOptLabel}>Optional . Voice Message</Text>
          <Text style={s.voiceTitle}>Anything else to{"\n"}Share</Text>

          <Pressable
            onPress={() => setIsRecording(!isRecording)}
            style={s.micOuter}
          >
            <View style={s.micInner}>
              <Ionicons name="mic" size={30} color={C.accent} />
            </View>
          </Pressable>

          <Text style={s.voiceTap}>Tap Mic to Record</Text>
          <Text style={s.voiceFamily}>Record a Voice Message for your Family</Text>
        </Animated.View>

        {/* Yesterday's Summary */}
        <Animated.View entering={FadeInDown.delay(400)} style={s.summaryCard}>
          <View style={s.summaryBadge}>
            <Text style={s.summaryBadgeText}>Yesterday's Summary</Text>
          </View>
          {SUMMARY.map((row, i) => (
            <View key={row.label} style={[s.summaryRow, i < SUMMARY.length - 1 && s.summaryRowBorder]}>
              <View style={s.summaryLeft}>
                <View style={[s.summaryDot, { backgroundColor: row.dot }]} />
                <Text style={s.summaryLabel}>{row.label}</Text>
              </View>
              <Text style={[s.summaryValue, { color: row.color }]}>{row.value}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          style={[s.submitBtn, saving && { opacity: 0.7 }]}
        >
          <Ionicons name="checkmark-done" size={22} color={C.white} />
          <Text style={s.submitText}>{saving ? "Saving..." : "Complete Check-In · Send to Family"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingBottom: 18, gap: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.white, justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: C.white },

  scroll: { paddingTop: 16 },

  /* Section header */
  secHeader: {
    paddingHorizontal: 16, marginBottom: 12, marginTop: 4,
  },
  secTitle: { fontSize: 18, fontWeight: "900", color: C.navyDark },

  /* Sathi AI Card */
  sathiCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 20,
    borderRadius: 22, padding: 18,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)", elevation: 3,
  },
  sathiTop: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  sathiLeft: {},
  sathiMascot: { width: 44, height: 44 },
  sathiMid: { flex: 1 },
  sathiTitle: { fontSize: 16, fontWeight: "900", color: C.navyDark },
  sathiSub:   { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 1 },
  sathiMsg: {
    fontSize: 13, fontWeight: "500", color: C.muted,
    lineHeight: 19, marginBottom: 16,
  },
  talkBtn: {
    borderRadius: 30, paddingVertical: 13,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
  },
  talkBtnText: { color: C.white, fontSize: 15, fontWeight: "800" },

  /* Mood cards */
  moodRow: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 16, marginBottom: 20,
  },
  moodCard: {
    backgroundColor: C.white, borderRadius: 18,
    paddingTop: 8, paddingBottom: 14, alignItems: "center",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.07)", elevation: 2,
    borderWidth: 2, borderColor: "transparent",
  },
  moodCardSel: { borderColor: C.accent },
  moodBadge: {
    alignSelf: "flex-start", marginLeft: 6, marginBottom: 10,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  moodBadgeText: { color: C.white, fontSize: 10, fontWeight: "800" },
  moodImg: { width: 54, height: 54 },

  /* Health Check Card */
  checkCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 20,
    borderRadius: 22, overflow: "hidden",
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)", elevation: 3,
  },
  checkCardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 18, paddingVertical: 14,
  },
  greenBadge: {
    backgroundColor: C.green, borderRadius: 30,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  greenBadgeText: { color: C.white, fontSize: 13, fontWeight: "800" },
  doneBadge: {
    backgroundColor: C.navy, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  doneBadgeText: { color: C.white, fontSize: 12, fontWeight: "800" },
  checkRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14, gap: 12,
  },
  checkRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  checkIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#E8F5FD",
    justifyContent: "center", alignItems: "center",
  },
  checkInfo: { flex: 1 },
  checkTitle: { fontSize: 14, fontWeight: "700", color: C.navyDark },
  checkSub:   { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: C.border,
    justifyContent: "center", alignItems: "center",
  },
  radioDone: { borderColor: C.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },

  /* Voice Message Card */
  voiceCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 20,
    borderRadius: 22, paddingVertical: 24, paddingHorizontal: 20,
    alignItems: "center",
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)", elevation: 3,
  },
  voiceOptLabel: { fontSize: 13, fontWeight: "600", color: C.muted, marginBottom: 4 },
  voiceTitle: {
    fontSize: 26, fontWeight: "900", color: C.accent,
    textAlign: "center", marginBottom: 24, lineHeight: 34,
  },
  micOuter: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: "#CADDEE",
    justifyContent: "center", alignItems: "center",
    marginBottom: 14,
  },
  micInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "#EEF6FB",
    justifyContent: "center", alignItems: "center",
  },
  voiceTap:    { fontSize: 13, fontWeight: "600", color: C.muted, marginBottom: 6 },
  voiceFamily: { fontSize: 13, fontWeight: "600", color: C.navyDark, textAlign: "center" },

  /* Yesterday's Summary */
  summaryCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 20,
    borderRadius: 22, padding: 20,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)", elevation: 3,
  },
  summaryBadge: {
    alignSelf: "flex-start", backgroundColor: C.green,
    borderRadius: 30, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 16,
  },
  summaryBadgeText: { color: C.white, fontSize: 13, fontWeight: "800" },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 12,
  },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  summaryLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryDot:  { width: 10, height: 10, borderRadius: 5 },
  summaryLabel:{ fontSize: 14, fontWeight: "600", color: C.muted },
  summaryValue:{ fontSize: 14, fontWeight: "800" },

  /* Submit */
  submitBtn: {
    backgroundColor: C.navy, marginHorizontal: 16,
    borderRadius: 20, height: 60,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
  },
  submitText: { color: C.white, fontSize: 15, fontWeight: "800" },
});
