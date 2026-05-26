import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, Alert, useWindowDimensions, Image,
  TouchableOpacity
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestRecordingPermissionsAsync, setAudioModeAsync, RecordingPresets, useAudioRecorder } from "expo-audio";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { supabase } from "../../utils/supabase";
import { tr } from "../../constants/appTranslations";
import { broadcastElderUpdate, notifyGuardians } from "../../services/pushNotifications";
import { notifyGuardiansOf } from "../../services/notifications";

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

const MOOD_SCORE: Record<string, number> = { Happy: 5, calm: 4, Okay: 3, Tired: 2, Low: 1 };

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

const TODAY_KEY = "daily_checkin_done_date";

export default function DailyCheckInScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { colors: themeColors, language } = useLanguage();
  const t = tr(language);
  const { width } = useWindowDimensions();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording,   setIsRecording]  = useState(false);
  const [voiceUri,      setVoiceUri]     = useState<string | null>(null);
  const [selectedMood,  setSelectedMood] = useState<string | null>(null);
  const [saving,        setSaving]       = useState(false);
  const [alreadyDone,   setAlreadyDone]  = useState(false);
  const [questions, setQuestions] = useState([
    { id: 1, text: t.q1Text, sub: t.q1Sub, value: null as 'yes' | 'no' | null },
    { id: 2, text: t.q2Text, sub: t.q2Sub, value: null as 'yes' | 'no' | null },
    { id: 3, text: t.q3Text, sub: t.q3Sub, value: null as 'yes' | 'no' | null },
    { id: 4, text: t.q4Text, sub: t.q4Sub, value: null as 'yes' | 'no' | null },
  ]);

  const cardW = (width - 16 * 2 - 10 * 3) / 4;
  const doneCount = questions.filter(q => q.value !== null).length;
  const today = new Date().toISOString().split("T")[0];

  // ── Once-per-day gate ──────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(TODAY_KEY).then(val => {
      if (val === today) setAlreadyDone(true);
    });
  }, []);

  const setAnswer = (id: number, val: 'yes' | 'no') =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, value: val } : q));

  // ── Voice recording toggle ────────────────────────────────
  const toggleVoice = async () => {
    if (isRecording) {
      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });
        setIsRecording(false);
        const uri = recorder.uri;
        if (uri) setVoiceUri(uri);
      } catch (e) { setIsRecording(false); }
    } else {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return Alert.alert("Permission denied", "Microphone access is required.");
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);
      } catch (e: any) { Alert.alert("Error", e.message); }
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!selectedMood) return Alert.alert("Wait", "Please select how you are feeling.");
    setSaving(true);
    try {
      const mood = selectedMood;
      await supabase.from("daily_check_ins").upsert(
        {
          user_id: user.id,
          date: today,
          mood,
          mood_score: MOOD_SCORE[mood] ?? 3,
          questions,
          voice_note_url: voiceUri,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" },
      );

      // Share with guardian — insert a lightweight notification row
      // Guardians read from guardian_check_in_shares keyed by elder_id + date
      await supabase.from("guardian_check_in_shares").upsert(
        {
          elder_id: user.id,
          date: today,
          mood,
          mood_score: MOOD_SCORE[mood] ?? 3,
          questions_summary: questions.map(q => `${q.text}: ${q.value ?? 'not answered'}`).join(' | '),
          shared_at: new Date().toISOString(),
        },
        { onConflict: "elder_id,date" },
      ).then(() => {}); // non-blocking — ignore if table doesn't exist yet

      // Broadcast to guardian home screen so it refreshes immediately
      broadcastElderUpdate(user.id, 'checkin-update');

      // Push + DB notify connected guardians (non-blocking)
      const elderName = profile?.firstName || 'Your elder';
      const wellnessDone = questions.filter((q: any) => q.value === 'yes').length;
      notifyGuardians(
        user.id,
        `${elderName} completed their check-in`,
        `Mood: ${mood} · ${wellnessDone}/${questions.length} wellness checks done`,
        { screen: 'guardian-summary' },
      );
      notifyGuardiansOf(
        user.id, user.id,
        'check_in_done',
        '✅ Daily Check-in Done',
        `${elderName} completed their check-in — Mood: ${mood}`,
      );

      // Mark today as done in local storage
      await AsyncStorage.setItem(TODAY_KEY, today);

      Alert.alert("Done! 🎉", "Your check-in has been saved and shared with your family.", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Already-done banner ───────────────────────────────────
  if (alreadyDone) {
    return (
      <View style={[s.root, { backgroundColor: themeColors.bg }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={["#1B3A5C", "#2B7FC0"]}
          style={[s.header, { paddingTop: insets.top + 12 }]}
        >
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.navyDark} />
          </Pressable>
          <Text style={s.headerTitle}>{t.dailyCheckIn}</Text>
        </LinearGradient>
        <View style={s.doneBanner}>
          <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          <Text style={s.doneTitle}>{t.allDoneToday}</Text>
          <Text style={s.doneSub}>{t.alreadyCheckedIn}</Text>
          <Pressable style={s.doneBtn} onPress={() => router.replace("/(tabs)")}>
            <Text style={s.doneBtnText}>{t.backToHome}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={["#1B3A5C", "#2B7FC0"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.navyDark} />
        </Pressable>
        <Text style={s.headerTitle}>{t.dailyCheckIn}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Sathi AI Card */}
        <Animated.View entering={FadeInDown.delay(80)} style={[s.sathiCard, { backgroundColor: themeColors.card }]}>
          <View style={s.sathiTop}>
            <View style={s.sathiLeft}>
              <Image source={require("../../assets/images/Group 427320054.png")} style={s.sathiMascot} resizeMode="contain" />
            </View>
            <View style={s.sathiMid}>
              <Text style={[s.sathiTitle, { color: themeColors.text }]}>{t.sathiTitle}</Text>
              <Text style={[s.sathiSub, { color: themeColors.muted }]}>{t.sathiSub}</Text>
            </View>
            <Ionicons name="pulse" size={22} color={C.accent} />
          </View>
          <Text style={s.sathiMsg}>
            {t.sathiGreeting.replace('{name}', profile?.fullName?.split(' ')[0] || 'there')}
          </Text>
          <LinearGradient
            colors={["#2B7FC0", "#1B5A90"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.talkBtn}
          >
            <Ionicons name="mic-outline" size={18} color={C.white} />
            <Text style={s.talkBtnText}>{t.talkToSathi}</Text>
          </LinearGradient>
        </Animated.View>

        {/* How are you feeling? */}
        <View style={s.secHeader}>
          <Text style={[s.secTitle, { color: themeColors.text }]}>{t.howAreYouFeeling}</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(160)} style={s.moodRow}>
          {MOODS.map(m => (
            <Pressable
              key={m.label}
              onPress={() => setSelectedMood(m.label)}
              style={[s.moodCard, { width: cardW, backgroundColor: themeColors.card }, selectedMood === m.label && s.moodCardSel]}
            >
              <View style={[s.moodBadge, { backgroundColor: m.badge }]}>
                <Text style={s.moodBadgeText}>{m.label}</Text>
              </View>
              <Image source={m.image} style={s.moodImg} resizeMode="contain" />
            </Pressable>
          ))}
        </Animated.View>

        {/* Quick Health Check */}
        <View style={s.secHeader}>
          <Text style={[s.secTitle, { color: themeColors.text }]}>{t.quickHealthCheck}</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(240)} style={[s.checkCard, { backgroundColor: themeColors.card }]}>
          <View style={s.checkCardHeader}>
            <View style={s.greenBadge}>
              <Text style={s.greenBadgeText}>{t.quickHealthCheck}</Text>
            </View>
            <View style={s.doneBadge}>
              <Text style={s.doneBadgeText}>{doneCount} {t.ofDone}</Text>
            </View>
          </View>

          {questions.map((q, i) => (
            <View key={q.id} style={[s.checkRow, i < questions.length - 1 && s.checkRowBorder]}>
              <View style={s.checkIcon}>
                <Ionicons name={CHECK_ICONS[i]} size={20} color={C.accent} />
              </View>
              <View style={s.checkInfo}>
                <Text style={s.checkTitle}>{q.text}</Text>
                <Text style={s.checkSub}>{q.sub}</Text>
              </View>
              <View style={s.yesNoContainer}>
                <TouchableOpacity
                  onPress={() => setAnswer(q.id, 'yes')}
                  style={[s.yesNoBtn, q.value === 'yes' && s.yesBtnActive]}
                >
                  <Text style={[s.yesNoText, q.value === 'yes' && s.yesNoTextActive]}>{t.yes}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAnswer(q.id, 'no')}
                  style={[s.yesNoBtn, q.value === 'no' && s.noBtnActive]}
                >
                  <Text style={[s.yesNoText, q.value === 'no' && s.yesNoTextActive]}>{t.no}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Voice Message */}
        <Animated.View entering={FadeInDown.delay(320)} style={s.voiceCard}>
          <Text style={s.voiceOptLabel}>{t.voiceOptionalLabel}</Text>
          <Text style={s.voiceTitle}>{t.anythingToShare}</Text>

          <Pressable
            onPress={toggleVoice}
            style={[s.micOuter, isRecording && { borderColor: '#E84545' }]}
          >
            <View style={[s.micInner, isRecording && { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name={isRecording ? "stop-circle" : "mic"} size={30} color={isRecording ? "#E84545" : C.accent} />
            </View>
          </Pressable>

          <Text style={s.voiceTap}>{isRecording ? t.recording : voiceUri ? t.voiceRecorded : t.tapToRecord}</Text>
          <Text style={s.voiceFamily}>{isRecording ? t.tapToStop : t.recordForFamily}</Text>
        </Animated.View>

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          style={[s.submitBtn, (saving || !selectedMood) && { opacity: 0.7 }]}
        >
          <Ionicons name="checkmark-done" size={22} color={C.white} />
          <Text style={s.submitText}>{saving ? t.saving : t.completeCheckIn}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 18, gap: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.white, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: C.white },
  scroll: { paddingTop: 16 },

  // Already done
  doneBanner: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  doneTitle:  { fontSize: 26, fontWeight: "900", color: C.navyDark, marginTop: 20, marginBottom: 10 },
  doneSub:    { fontSize: 15, fontWeight: "500", color: C.muted, textAlign: "center", lineHeight: 22, marginBottom: 30 },
  doneBtn:    { backgroundColor: C.accent, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30 },
  doneBtnText:{ color: C.white, fontSize: 16, fontWeight: "800" },

  secHeader: { paddingHorizontal: 16, marginBottom: 12, marginTop: 4 },
  secTitle:  { fontSize: 18, fontWeight: "900", color: C.navyDark },

  sathiCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 20,
    borderRadius: 22, padding: 18, elevation: 3,
  },
  sathiTop:    { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  sathiLeft:   {},
  sathiMascot: { width: 44, height: 44 },
  sathiMid:    { flex: 1 },
  sathiTitle:  { fontSize: 16, fontWeight: "900", color: C.navyDark },
  sathiSub:    { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 1 },
  sathiMsg:    { fontSize: 13, fontWeight: "500", color: C.muted, lineHeight: 19, marginBottom: 16 },
  talkBtn:     { borderRadius: 30, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  talkBtnText: { color: C.white, fontSize: 15, fontWeight: "800" },

  moodRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  moodCard: {
    backgroundColor: C.white, borderRadius: 18,
    paddingTop: 8, paddingBottom: 14, alignItems: "center",
    elevation: 2, borderWidth: 2, borderColor: "transparent",
  },
  moodCardSel: { borderColor: C.accent },
  moodBadge: { alignSelf: "flex-start", marginLeft: 6, marginBottom: 10, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  moodBadgeText: { color: C.white, fontSize: 10, fontWeight: "800" },
  moodImg: { width: 54, height: 54 },

  checkCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 20,
    borderRadius: 22, overflow: "hidden", elevation: 3,
  },
  checkCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14 },
  greenBadge:      { backgroundColor: C.green, borderRadius: 30, paddingHorizontal: 14, paddingVertical: 7 },
  greenBadgeText:  { color: C.white, fontSize: 13, fontWeight: "800" },
  doneBadge:       { backgroundColor: C.navy, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  doneBadgeText:   { color: C.white, fontSize: 12, fontWeight: "800" },
  checkRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 16, gap: 12 },
  checkRowBorder:  { borderTopWidth: 1, borderTopColor: C.border },
  checkIcon:       { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E8F5FD", justifyContent: "center", alignItems: "center" },
  checkInfo:       { flex: 1 },
  checkTitle:      { fontSize: 14, fontWeight: "700", color: C.navyDark },
  checkSub:        { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 2 },
  yesNoContainer:  { flexDirection: 'row', gap: 8 },
  yesNoBtn:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, minWidth: 48, alignItems: 'center' },
  yesBtnActive:    { backgroundColor: C.green, borderColor: C.green },
  noBtnActive:     { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  yesNoText:       { fontSize: 12, fontWeight: '700', color: C.muted },
  yesNoTextActive: { color: C.white },

  voiceCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 20,
    borderRadius: 22, paddingVertical: 24, paddingHorizontal: 20,
    alignItems: "center", elevation: 3,
  },
  voiceOptLabel: { fontSize: 13, fontWeight: "600", color: C.muted, marginBottom: 4 },
  voiceTitle:    { fontSize: 26, fontWeight: "900", color: C.accent, textAlign: "center", marginBottom: 24, lineHeight: 34 },
  micOuter:      { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: "#CADDEE", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  micInner:      { width: 68, height: 68, borderRadius: 34, backgroundColor: "#EEF6FB", justifyContent: "center", alignItems: "center" },
  voiceTap:      { fontSize: 13, fontWeight: "600", color: C.muted, marginBottom: 6 },
  voiceFamily:   { fontSize: 13, fontWeight: "600", color: C.navyDark, textAlign: "center" },

  submitBtn: {
    backgroundColor: C.navy, marginHorizontal: 16,
    borderRadius: 20, height: 60,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
  },
  submitText: { color: C.white, fontSize: 15, fontWeight: "800" },
});
