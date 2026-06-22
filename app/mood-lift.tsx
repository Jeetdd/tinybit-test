import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../utils/supabase";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, useWindowDimensions, Image, Modal,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Alert, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { getTodaysInspiration, getTodaysMindChallenge } from "../utils/daily";
import { useLanguage } from "../context/LanguageContext";
import { tr } from "../constants/appTranslations";

const C = {
  navy:    "#1A2E6A",
  navyDark:"#111D44",
  white:   "#FFFFFF",
  bg:      "#EEF2F7",
  muted:   "#8A9BB0",
  accent:  "#37B1E6",
  border:  "#E4EBF2",
};

const MOODS = [
  { label: "Happy", image: require("../assets/images/happy.png"),     badge: "#F59E0B" },
  { label: "Tired", image: require("../assets/images/tired.png"),     badge: "#DC2626" },
  { label: "Low",   image: require("../assets/images/low.png"),       badge: "#7C3AED" },
  { label: "calm",  image: require("../assets/images/calm.png"),      badge: "#16A34A" },
];

const MOOD_DB: Record<string, { mood: string; score: number }> = {
  Happy: { mood: 'Great', score: 5 },
  calm:  { mood: 'Good',  score: 4 },
  Tired: { mood: 'Okay',  score: 3 },
  Low:   { mood: 'Low',   score: 2 },
};

const MOOD_SUGGESTIONS: Record<string, { icon: string; text: string }[]> = {
  Happy: [
    { icon: "share-social-outline", text: "Share this joy with family" },
    { icon: "journal-outline",      text: "Write it in your Memory Journal" },
    { icon: "musical-notes-outline",text: "Enjoy your favourite Entertainment" },
  ],
  Tired: [
    { icon: "bed-outline",          text: "Take a short 15-min nap" },
    { icon: "water-outline",        text: "Drink a glass of water now" },
    { icon: "body-outline",         text: "Try a 2-min breathing exercise" },
  ],
  Low: [
    { icon: "call-outline",         text: "Call a family member" },
    { icon: "sunny-outline",        text: "Step outside for 5 minutes" },
    { icon: "heart-outline",        text: "Listen to calming nature sounds" },
  ],
  calm: [
    { icon: "leaf-outline",         text: "Enjoy a nature sound session" },
    { icon: "book-outline",         text: "Read something positive" },
    { icon: "cafe-outline",         text: "Make yourself a warm cup of tea" },
  ],
};

const EXPLORE = [
  { id: "entertainment", title: "Entertainment", badge: "#F59E0B", image: require("../assets/images/Bhajans.png")     },
  { id: "meditation",    title: "Meditation",    badge: "#2B7FC0", image: require("../assets/images/Meditation.png")  },
  { id: "jokes",         title: "Joke & Fun",    badge: "#EAB308", image: require("../assets/images/Joke-Fun.png")    },
  { id: "nature",        title: "Nature Sound",  badge: "#16A34A", image: require("../assets/images/Naturesound.png") },
];

const RELAXATION_EXERCISES = [
  {
    id: "breathing",
    title: "2-Min Breathing",
    sub: "Calm your mind with slow breaths",
    icon: "arrow-up-circle" as const,
    color: C.accent,
    route: "/mood-breathe",
  },
  {
    id: "stretching",
    title: "3-Min Stretching",
    sub: "Gentle body stretches for energy",
    icon: "body-outline" as const,
    color: "#7C3AED",
    route: "/mood-breathe",
  },
  {
    id: "meditation",
    title: "5-Min Meditation",
    sub: "Guided quiet time for your mind",
    icon: "infinite-outline" as const,
    color: "#16A34A",
    route: "/mood-breathe",
  },
  {
    id: "gratitude",
    title: "Gratitude Moment",
    sub: "Think of 3 things you are thankful for",
    icon: "heart-outline" as const,
    color: "#E87C22",
    route: "/mood-breathe",
  },
];

export default function MoodLiftScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { user } = useAuth();
  const { language, colors: themeColors } = useLanguage();
  const t = tr(language);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [savedMood,    setSavedMood]    = useState<string | null>(null);
  const [savingMood,   setSavingMood]   = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [moodNote,    setMoodNote]    = useState("");
  const [savingNote,  setSavingNote]  = useState(false);

  // Mood-specific modal copy
  const MOOD_MODAL: Record<string, { emoji: string; title: string; placeholder: string }> = {
    Happy: { emoji: '😊', title: t.whatMakesYouHappy,    placeholder: t.typeHere },
    Tired: { emoji: '😴', title: "What's making you tired?",       placeholder: "Describe what drained you..." },
    Low:   { emoji: '💙', title: "Want to share what's on your mind?", placeholder: "It's okay to let it out..." },
    calm:  { emoji: '😌', title: "What's keeping you calm today?", placeholder: "Share your peaceful moment..." },
  };

  const handleMoodSelect = async (label: string) => {
    if (savingMood) return;
    setSelectedMood(label);
    setSavedMood(null);
    if (!user) return;
    const m = MOOD_DB[label];
    if (!m) return;

    setSavingMood(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('moods').upsert(
        { user_id: user.id, mood: m.mood, mood_score: m.score, date: today },
        { onConflict: 'user_id,date' }
      );
      if (error) throw error;
      setSavedMood(label);
      setMoodNote("");
      setShowNoteModal(true);
    } catch (e: any) {
      Alert.alert("Couldn't save mood", e.message);
    } finally {
      setSavingMood(false);
    }
  };

  const saveMoodNote = async () => {
    if (!moodNote.trim() || !user) return;
    setSavingNote(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('moods').upsert(
        { user_id: user.id, date: today, note: moodNote.trim() },
        { onConflict: 'user_id,date' }
      );
      setShowNoteModal(false);
      setMoodNote("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSavingNote(false);
    }
  };

  const ins = useMemo(() => getTodaysInspiration(), []);
  const challenge = useMemo(() => getTodaysMindChallenge(), []);

  const gap      = 10;
  const hPad     = 16;
  const moodW    = (width - hPad * 2 - gap * 3) / 4;
  const exploreW = (width - hPad * 2 - 12) / 2;

  const suggestions = selectedMood ? MOOD_SUGGESTIONS[selectedMood] ?? [] : [];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={["#2B3C86", "#2E9CD6"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.white} />
        </Pressable>
        <Text style={s.headerTitle}>{t.moodLift}</Text>
      </LinearGradient>

      <View style={[s.scrollSheet, { backgroundColor: themeColors.bg }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Daily Inspiration ── */}
        <Animated.View entering={FadeInDown.delay(60)} style={[s.insCard, { backgroundColor: themeColors.card }]}>
          <Text style={s.insLabel}>{t.dailyInspiration}</Text>
          <Text style={s.insQuote}>
            {"“"}{ins.text}{"”"}
          </Text>
          <Text style={s.insAuthor}>-{ins.author}</Text>
        </Animated.View>

        {/* ── Today's Challenge ── */}
        <View style={s.secRow}>
          <Text style={s.secTitle}>{t.todaysChallenge}</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(100)} style={s.challengeCard}>
           <Ionicons name="bulb-outline" size={24} color={C.accent} style={{ marginBottom: 8 }} />
           <Text style={s.challengeText}>{challenge}</Text>
        </Animated.View>

        {/* ── How are you feeling? ── */}
        <View style={[s.secRow, { marginTop: 10 }]}>
          <Text style={s.secTitle}>{t.howAreYouToday}</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(140)} style={[s.moodRow, { paddingHorizontal: hPad, gap }]}>
          {MOODS.map(m => {
            const isSelected = selectedMood === m.label;
            const isSaved    = savedMood === m.label;
            const isLoading  = savingMood && isSelected;
            return (
              <Pressable
                key={m.label}
                onPress={() => handleMoodSelect(m.label)}
                disabled={savingMood}
                style={[
                  s.moodCard, { width: moodW, backgroundColor: themeColors.card },
                  isSelected && s.moodCardActive,
                  isSaved    && { borderColor: '#16A34A' },
                ]}
              >
                {isSaved && (
                  <View style={s.savedTick}>
                    <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  </View>
                )}
                <View style={[s.moodBadge, { backgroundColor: isLoading ? '#ccc' : m.badge }]}>
                  <Text style={s.moodBadgeText}>
                    {isLoading ? '...' : m.label}
                  </Text>
                </View>
                <View style={[s.moodEmojiWrap, isLoading && { opacity: 0.4 }]}>
                  <Image source={m.image} style={s.moodImg} resizeMode="contain" />
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
        {savedMood && (
          <Text style={s.savedHint}>✓ Mood logged for today</Text>
        )}

        {/* ── Mood Suggestions ── */}
        {suggestions.length > 0 && (
          <Animated.View entering={FadeInDown.delay(60)} style={[s.suggestCard, { marginHorizontal: hPad, backgroundColor: themeColors.card }]}>
            <Text style={s.suggestTitle}>
              {selectedMood === 'Happy' ? '😊 You seem happy!' :
               selectedMood === 'Tired' ? '😴 Feeling tired?' :
               selectedMood === 'Low'   ? '💙 Feeling low?' : '😌 Feeling calm?'}
            </Text>
            <Text style={s.suggestSub}>Here are some things that might help:</Text>
            {suggestions.map((sg, i) => (
              <View key={i} style={s.suggestRow}>
                <View style={s.suggestIcon}>
                  <Ionicons name={sg.icon as any} size={18} color={C.accent} />
                </View>
                <Text style={s.suggestText}>{sg.text}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── Explore More ── */}
        <View style={[s.secRow, { marginTop: 20 }]}>
          <Text style={s.secTitle}>{t.exploreMore}</Text>
          <Pressable><Text style={s.viewAll}>{t.viewAll}</Text></Pressable>
        </View>

        <View style={[s.exploreGrid, { paddingHorizontal: hPad }]}>
          {EXPLORE.map((item, i) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(220 + i * 55)}>
              <Pressable
                style={[s.exploreCard, { width: exploreW, backgroundColor: themeColors.card }]}
                onPress={() => router.push({ pathname: "/mood-library", params: { type: item.id, title: item.title } })}
              >
                <View style={[s.exploreBadge, { backgroundColor: item.badge }]}>
                  <Text style={s.exploreBadgeText}>{item.title}</Text>
                </View>
                <View style={s.exploreIllus}>
                  <Image source={item.image} style={s.exploreImg} resizeMode="contain" />
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* ── Quick Relaxation ── */}
        <View style={[s.secRow, { marginTop: 20 }]}>
          <Text style={s.secTitle}>{t.relaxationExercises}</Text>
        </View>

        {RELAXATION_EXERCISES.map((ex, i) => (
          <Animated.View key={ex.id} entering={FadeInDown.delay(460 + i * 60)} style={[s.relaxCard, { marginHorizontal: hPad, marginBottom: 12, backgroundColor: themeColors.card }]}>
            <View style={[s.relaxIcon, { backgroundColor: ex.color }]}>
              <Ionicons name={ex.icon} size={26} color={C.white} />
            </View>
            <View style={s.relaxText}>
              <Text style={s.relaxTitle}>{ex.title}</Text>
              <Text style={s.relaxSub}>{ex.sub}</Text>
            </View>
            <Pressable style={s.playBtn} onPress={() => router.push(ex.route as any)}>
              <Ionicons name="play" size={13} color={C.white} />
              <Text style={s.playText}> Play</Text>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
      </View>

      {/* ── Mood note modal (all moods) ── */}
      <Modal visible={showNoteModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={[s.modalCard, { backgroundColor: themeColors.card }]}>
              {savedMood && MOOD_MODAL[savedMood] ? (
                <>
                  <Text style={s.modalTitle}>
                    {MOOD_MODAL[savedMood].emoji}  {MOOD_MODAL[savedMood].title}
                  </Text>
                  <Text style={s.modalSub}>{t.shareHappyThought}</Text>
                  <TextInput
                    style={s.modalInput}
                    placeholder={MOOD_MODAL[savedMood].placeholder}
                    placeholderTextColor={C.muted}
                    value={moodNote}
                    onChangeText={setMoodNote}
                    multiline
                    autoFocus
                  />
                  <View style={s.modalBtns}>
                    <TouchableOpacity
                      style={s.modalSkip}
                      onPress={() => { setShowNoteModal(false); setMoodNote(""); }}
                    >
                      <Text style={s.modalSkipText}>{t.skipForNow}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.modalSave, (!moodNote.trim() || savingNote) && { opacity: 0.5 }]}
                      onPress={saveMoodNote}
                      disabled={!moodNote.trim() || savingNote}
                    >
                      <Text style={s.modalSaveText}>{savingNote ? t.saving : t.save}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingBottom: 50, gap: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: C.white },

  scrollSheet: { flex: 1, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", backgroundColor: C.bg },
  scroll: { paddingTop: 16 },

  insCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 22,
    borderRadius: 22, padding: 20,
    elevation: 3,
  },
  insLabel: { fontSize: 15, fontWeight: "700", color: C.navyDark, marginBottom: 10 },
  insQuote: { fontSize: 17, fontWeight: "800", color: C.navyDark, lineHeight: 26, marginBottom: 10 },
  insAuthor: { fontSize: 14, fontWeight: "700", color: C.accent, textAlign: "right" },

  challengeCard: {
    backgroundColor: "#F0F9FF", marginHorizontal: 16, marginBottom: 20,
    borderRadius: 18, padding: 20, borderLeftWidth: 4, borderLeftColor: C.accent,
  },
  challengeText: { fontSize: 16, fontWeight: "700", color: C.navyDark, lineHeight: 22 },

  secRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 12,
  },
  secTitle: { fontSize: 19, fontWeight: "900", color: C.navyDark },
  viewAll:  { fontSize: 14, fontWeight: "700", color: C.accent },

  moodRow: { flexDirection: "row", marginBottom: 4 },
  moodCard: {
    backgroundColor: C.white, borderRadius: 18,
    paddingTop: 8, paddingBottom: 10, alignItems: "flex-start",
    elevation: 2,
    borderWidth: 2, borderColor: "transparent",
  },
  moodCardActive: { borderColor: C.accent },
  moodBadge: {
    marginLeft: 6, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 5, marginBottom: 8,
  },
  moodBadgeText: { color: C.white, fontSize: 10, fontWeight: "800" },
  moodEmojiWrap: { width: "100%", alignItems: "center", paddingBottom: 4 },
  moodImg: { width: 54, height: 54 },

  savedHint: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#16A34A', marginTop: 6, marginBottom: 4 },
  savedTick: { position: 'absolute', top: 6, right: 6, zIndex: 1 },

  // Suggestions
  suggestCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 18, marginTop: 14,
    elevation: 2,
  },
  suggestTitle: { fontSize: 17, fontWeight: "900", color: C.navyDark, marginBottom: 4 },
  suggestSub:   { fontSize: 13, fontWeight: "500", color: C.muted, marginBottom: 14 },
  suggestRow:   { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 12 },
  suggestIcon:  { width: 36, height: 36, borderRadius: 18, backgroundColor: "#E8F4FD", alignItems: "center", justifyContent: "center" },
  suggestText:  { flex: 1, fontSize: 14, fontWeight: "600", color: C.navyDark },

  exploreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 4 },
  exploreCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 14, minHeight: 170,
    elevation: 2,
  },
  exploreBadge: {
    alignSelf: "flex-start", borderRadius: 30,
    paddingHorizontal: 14, paddingVertical: 7, marginBottom: 10,
  },
  exploreBadgeText: { color: C.white, fontSize: 13, fontWeight: "800" },
  exploreIllus: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 8 },
  exploreImg: { width: 110, height: 110 },

  relaxCard: {
    backgroundColor: C.white, borderRadius: 22, padding: 18,
    flexDirection: "row", alignItems: "center", gap: 14,
    elevation: 3,
  },
  relaxIcon: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: "center", alignItems: "center",
  },
  relaxText: { flex: 1 },
  relaxTitle: { fontSize: 17, fontWeight: "900", color: C.navyDark },
  relaxSub:   { fontSize: 13, fontWeight: "500", color: C.muted, marginTop: 2 },
  playBtn: {
    backgroundColor: C.navy, borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 11,
    flexDirection: "row", alignItems: "center",
  },
  playText:  { color: C.white, fontSize: 14, fontWeight: "800" },

  // Happy modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: C.navyDark, marginBottom: 8 },
  modalSub:   { fontSize: 14, fontWeight: "500", color: C.muted, marginBottom: 20, lineHeight: 20 },
  modalInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 16,
    padding: 14, fontSize: 16, color: C.navyDark,
    minHeight: 100, textAlignVertical: "top", marginBottom: 20,
  },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalSkip: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, alignItems: "center",
  },
  modalSkipText: { fontSize: 15, fontWeight: "700", color: C.muted },
  modalSave: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: C.accent, alignItems: "center",
  },
  modalSaveText: { fontSize: 15, fontWeight: "800", color: C.white },
});
