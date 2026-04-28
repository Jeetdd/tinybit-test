import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, useWindowDimensions, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

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

const EXPLORE = [
  { id: "bhajans",    title: "Bhajans",      badge: "#F59E0B", image: require("../assets/images/Bhajans.png")     },
  { id: "meditation", title: "Meditation",   badge: "#2B7FC0", image: require("../assets/images/Meditation.png")  },
  { id: "jokes",      title: "Joke & Fun",   badge: "#EAB308", image: require("../assets/images/Joke-Fun.png")    },
  { id: "nature",     title: "Nature Sound", badge: "#16A34A", image: require("../assets/images/Naturesound.png") },
];

export default function MoodLiftScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const gap      = 10;
  const hPad     = 16;
  const moodW    = (width - hPad * 2 - gap * 3) / 4;
  const exploreW = (width - hPad * 2 - 12) / 2;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={["#1B3A5C", "#2B7FC0"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.navyDark} />
        </Pressable>
        <Text style={s.headerTitle}>Mood Lift</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Daily Inspiration ── */}
        <Animated.View entering={FadeInDown.delay(60)} style={s.insCard}>
          <Text style={s.insLabel}>Daily Inspiration</Text>
          <Text style={s.insQuote}>
            {"“"}Happiness is not something ready-made. It comes from your own action.{"”"}
          </Text>
          <Text style={s.insAuthor}>-Dalai Lamba</Text>
        </Animated.View>

        {/* ── Today's Challenge ── */}
        <View style={s.secRow}>
          <Text style={s.secTitle}>Today's Challenge</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(140)} style={[s.moodRow, { paddingHorizontal: hPad, gap }]}>
          {MOODS.map(m => (
            <Pressable
              key={m.label}
              onPress={() => setSelectedMood(m.label)}
              style={[s.moodCard, { width: moodW }, selectedMood === m.label && s.moodCardActive]}
            >
              <View style={[s.moodBadge, { backgroundColor: m.badge }]}>
                <Text style={s.moodBadgeText}>{m.label}</Text>
              </View>
              <View style={s.moodEmojiWrap}>
                <Image source={m.image} style={s.moodImg} resizeMode="contain" />
              </View>
            </Pressable>
          ))}
        </Animated.View>

        {/* ── Explore More ── */}
        <View style={[s.secRow, { marginTop: 20 }]}>
          <Text style={s.secTitle}>Explore More</Text>
          <Pressable><Text style={s.viewAll}>View all</Text></Pressable>
        </View>

        <View style={[s.exploreGrid, { paddingHorizontal: hPad }]}>
          {EXPLORE.map((item, i) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(220 + i * 55)}>
              <Pressable
                style={[s.exploreCard, { width: exploreW }]}
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
          <Text style={s.secTitle}>Quick Relaxation</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(460)} style={[s.relaxCard, { marginHorizontal: hPad }]}>
          <View style={s.relaxIcon}>
            <Ionicons name="arrow-up-circle" size={26} color={C.white} />
          </View>
          <View style={s.relaxText}>
            <Text style={s.relaxTitle}>2-Min Breathing</Text>
            <Text style={s.relaxSub}>Exercise to calm your mind</Text>
          </View>
          <Pressable style={s.playBtn} onPress={() => router.push("/mood-breathe")}>
            <Ionicons name="play" size={13} color={C.white} />
            <Text style={s.playText}> Play</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

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

  /* Inspiration */
  insCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 22,
    borderRadius: 22, padding: 20,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)", elevation: 3,
  },
  insLabel: { fontSize: 15, fontWeight: "700", color: C.navyDark, marginBottom: 10 },
  insQuote: { fontSize: 17, fontWeight: "800", color: C.navyDark, lineHeight: 26, marginBottom: 10 },
  insAuthor: { fontSize: 14, fontWeight: "700", color: C.accent, textAlign: "right" },

  /* Section row */
  secRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 12,
  },
  secTitle: { fontSize: 19, fontWeight: "900", color: C.navyDark },
  viewAll:  { fontSize: 14, fontWeight: "700", color: C.accent },

  /* Mood cards */
  moodRow: { flexDirection: "row", marginBottom: 4 },
  moodCard: {
    backgroundColor: C.white, borderRadius: 18,
    paddingTop: 8, paddingBottom: 10, alignItems: "flex-start",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.07)", elevation: 2,
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

  /* Explore grid */
  exploreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 4 },
  exploreCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 14, minHeight: 170,
    boxShadow: "0px 2px 10px rgba(0,0,0,0.07)", elevation: 2,
  },
  exploreBadge: {
    alignSelf: "flex-start", borderRadius: 30,
    paddingHorizontal: 14, paddingVertical: 7, marginBottom: 10,
  },
  exploreBadgeText: { color: C.white, fontSize: 13, fontWeight: "800" },
  exploreIllus: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 8 },
  exploreImg: { width: 110, height: 110 },

  /* Quick Relaxation */
  relaxCard: {
    backgroundColor: C.white, borderRadius: 22, padding: 18,
    flexDirection: "row", alignItems: "center", gap: 14,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)", elevation: 3,
  },
  relaxIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.accent, justifyContent: "center", alignItems: "center",
  },
  relaxText: { flex: 1 },
  relaxTitle: { fontSize: 17, fontWeight: "900", color: C.navyDark },
  relaxSub:   { fontSize: 13, fontWeight: "500", color: C.muted, marginTop: 2 },
  playBtn: {
    backgroundColor: C.navy, borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 11,
    flexDirection: "row", alignItems: "center",
  },
  playText: { color: C.white, fontSize: 14, fontWeight: "800" },

});
