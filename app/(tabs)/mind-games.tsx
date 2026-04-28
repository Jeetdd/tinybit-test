import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  useWindowDimensions,
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

const CORRECT = "Sardar Patel";
const QUIZ_OPTIONS = ["Jawaharlal Nehru", "Mahatma Gandhi", "Subhas Bose", "Sardar Patel"];

const LEADERBOARD = [
  { id: "1", name: "Ramabhai Patel", info: "You . 14 Games this week", initial: "R", color: "#E8A87C" },
  { id: "2", name: "Shantaben Shah", info: "From :- Vadodara",         initial: "S", color: "#9B6FCC" },
  { id: "3", name: "Manubhai Desai", info: "From :- Surat",            initial: "M", color: "#5CB8B2" },
];

/* ── Game Illustrations ──────────────────────────────────── */

function NumberMemoryIllustration() {
  const tiles = [
    { n: "2", bg: "#9B59B6", top: 8,  left: 0  },
    { n: "1", bg: "#F4A261", top: 28, left: 28 },
    { n: "3", bg: "#27AE60", top: 8,  left: 56 },
  ];
  return (
    <View style={{ width: 100, height: 74, position: "relative" }}>
      {tiles.map(({ n, bg, top, left }) => (
        <View key={n} style={[illus.numTile, { backgroundColor: bg, top, left }]}>
          <Text style={illus.numText}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

function WordMatchIllustration() {
  const blocks = [
    ["C","O","N"],
    ["T","E","N"],
    ["T","✱","✱"],
  ];
  return (
    <View style={{ gap: 3 }}>
      {blocks.map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row", gap: 3 }}>
          {row.map((ch, ci) => (
            <View key={ci} style={[illus.wordTile, ch === "✱" && { opacity: 0 }]}>
              <Text style={illus.wordText}>{ch !== "✱" ? ch : ""}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function ColourRecallIllustration() {
  const colors = ["#E74C3C","#E67E22","#F1C40F","#2ECC71","#1ABC9C","#3498DB","#9B59B6","#E91E8C"];
  const r = 34;
  return (
    <View style={{ width: r * 2 + 16, height: r * 2 + 16, position: "relative" }}>
      {colors.map((c, i) => {
        const angle = (i / colors.length) * 2 * Math.PI - Math.PI / 2;
        const x = r + Math.cos(angle) * r - 9;
        const y = r + Math.sin(angle) * r - 9;
        return (
          <View
            key={i}
            style={[illus.colorDot, { backgroundColor: c, top: y, left: x }]}
          />
        );
      })}
      <View style={illus.colorCenter} />
    </View>
  );
}

function StoryQuizIllustration() {
  return (
    <View style={illus.phoneWrap}>
      <View style={illus.phoneInner}>
        {["❓","✅","❌"].map((e, i) => (
          <Text key={i} style={{ fontSize: 16, lineHeight: 22 }}>{e}</Text>
        ))}
      </View>
    </View>
  );
}

const illus = StyleSheet.create({
  numTile: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0px 3px 6px rgba(0,0,0,0.18)",
    elevation: 4,
  },
  numText: { color: "#fff", fontSize: 20, fontWeight: "900" },

  wordTile: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#B0BEC5",
    justifyContent: "center",
    alignItems: "center",
  },
  wordText: { color: "#fff", fontSize: 11, fontWeight: "900" },

  colorDot: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#fff",
  },
  colorCenter: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    top: 27,
    left: 27,
  },

  phoneWrap: {
    width: 56,
    height: 76,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  phoneInner: { alignItems: "flex-start", gap: 2 },
});

/* ── Main Screen ─────────────────────────────────────────── */

export default function MindGamesScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [selected, setSelected] = useState<string | null>(CORRECT);

  const cardW = (width - 16 * 2 - 12) / 2;

  const GAMES = [
    {
      id: "1", title: "Number Memory",
      badgeBg: "#0BBDB6",
      illustration: <NumberMemoryIllustration />,
    },
    {
      id: "2", title: "Word Match",
      badgeBg: "#7B3FC4",
      illustration: <WordMatchIllustration />,
    },
    {
      id: "3", title: "Colour Recall",
      badgeBg: "#1B7A4A",
      illustration: <ColourRecallIllustration />,
    },
    {
      id: "4", title: "Story Quiz",
      badgeBg: "#E87C22",
      illustration: <StoryQuizIllustration />,
    },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={["#1B3A5C", "#2B7FC0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.navyDark} />
        </Pressable>
        <Text style={s.headerTitle}>Mind Games</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brain Health Card ── */}
        <Animated.View entering={FadeInDown.delay(80)} style={s.card}>
          <Text style={s.cardLabel}>Your Brain Health</Text>
          <Text style={s.cardBig}>Active Your Mind!</Text>
          <Text style={s.cardSub}>Play daily for a healthier, Sharper Mind</Text>

          <View style={s.statsRow}>
            <Stat n={14} label="Today's Score" />
            <View style={s.divider} />
            <Stat n={47} label="Day Streak" />
            <View style={s.divider} />
            <Stat n={90} label="Your Rank" />
            <View style={s.divider} />
            <Stat n={5}  label="Play Time" />
          </View>
        </Animated.View>

        {/* ── Today's Challenge ── */}
        <View style={s.secHeader}>
          <Text style={s.secTitle}>Today's Challenge</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(160)} style={s.quizCard}>
          {/* Green badge */}
          <View style={s.quizBadge}>
            <Text style={s.quizBadgeText}>Daily Quiz Questions</Text>
          </View>

          <Text style={s.quizQuestion}>
            Who was called {"“"}Iron Man of India ?{"”"}
          </Text>

          {/* Options 2×2 */}
          <View style={s.optionsGrid}>
            {QUIZ_OPTIONS.map((opt) => {
              const isSel = selected === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setSelected(opt)}
                  style={[s.optBtn, isSel && s.optBtnSelected]}
                >
                  <Text style={[s.optText, isSel && s.optTextSelected]} numberOfLines={1}>
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Play Games ── */}
        <View style={s.secHeader}>
          <Text style={s.secTitle}>Play Games</Text>
        </View>

        <View style={s.gamesGrid}>
          {GAMES.map((g, i) => (
            <Animated.View key={g.id} entering={FadeInDown.delay(240 + i * 60)}>
              <Pressable style={[s.gameCard, { width: cardW }]}>
                <View style={[s.gameBadge, { backgroundColor: g.badgeBg }]}>
                  <Text style={s.gameBadgeText}>{g.title}</Text>
                </View>
                <View style={s.gameIllus}>
                  {g.illustration}
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* ── Leaderboard ── */}
        <View style={s.secHeader}>
          <Text style={s.secTitle}>Leaderboard</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(480)} style={s.lbCard}>
          {LEADERBOARD.map((p, i) => (
            <View key={p.id}>
              {i > 0 && <View style={s.lbDivider} />}
              <Pressable style={s.lbRow}>
                <View style={[s.lbAvatar, { backgroundColor: p.color }]}>
                  <Text style={s.lbInitial}>{p.initial}</Text>
                </View>
                <View style={s.lbInfo}>
                  <Text style={s.lbName}>{p.name}</Text>
                  <Text style={s.lbSub}>{p.info}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── Sub-component ──────────────────────────────────────── */
function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statN}>{n}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.white,
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: C.white },

  scroll: { paddingTop: 16 },

  /* Brain Health Card */
  card: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 22,
    padding: 20,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)",
    elevation: 3,
  },
  cardLabel: { fontSize: 13, fontWeight: "600", color: C.muted },
  cardBig:   { fontSize: 28, fontWeight: "900", color: C.navyDark, marginTop: 4 },
  cardSub:   { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 4 },
  statsRow:  { flexDirection: "row", alignItems: "center", marginTop: 20 },
  statItem:  { flex: 1, alignItems: "center" },
  statN:     { fontSize: 22, fontWeight: "900", color: C.accent },
  statLabel: { fontSize: 10, fontWeight: "600", color: C.muted, marginTop: 3, textAlign: "center" },
  divider:   { width: 1, height: 36, backgroundColor: "#D8E4EC" },

  /* Section header */
  secHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  secTitle: { fontSize: 18, fontWeight: "900", color: C.navyDark },

  /* Quiz Card */
  quizCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 22,
    padding: 20,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)",
    elevation: 3,
  },
  quizBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1A6B3A",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginBottom: 16,
  },
  quizBadgeText: { color: C.white, fontSize: 13, fontWeight: "800" },

  quizQuestion: {
    fontSize: 17,
    fontWeight: "800",
    color: C.navyDark,
    marginBottom: 18,
    lineHeight: 24,
  },

  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optBtn: {
    width: "48%",
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#D4DCE8",
    backgroundColor: C.white,
    alignItems: "center",
  },
  optBtnSelected: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  optText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.navyDark,
    textAlign: "center",
  },
  optTextSelected: { color: C.white },

  /* Games Grid */
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  gameCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 14,
    boxShadow: "0px 2px 10px rgba(0,0,0,0.07)",
    elevation: 3,
    minHeight: 148,
  },
  gameBadge: {
    alignSelf: "flex-start",
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  gameBadgeText: { color: C.white, fontSize: 12, fontWeight: "800" },
  gameIllus: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Leaderboard */
  lbCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    borderRadius: 22,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)",
    elevation: 3,
    overflow: "hidden",
  },
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  lbDivider: { height: 1, backgroundColor: "#EEF2F7", marginHorizontal: 18 },
  lbAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
    marginRight: 14,
  },
  lbInitial: { color: C.white, fontSize: 16, fontWeight: "900" },
  lbInfo:    { flex: 1 },
  lbName:    { fontSize: 15, fontWeight: "800", color: C.navyDark },
  lbSub:     { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 2 },
});
