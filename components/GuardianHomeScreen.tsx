import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, Image, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";

const { width: SCREEN_W } = Dimensions.get("window");

const C = {
  navy:     "#1A2E6A",
  navyDark: "#111D44",
  white:    "#FFFFFF",
  bg:       "#F4F5F8",
  muted:    "#8A9BB0",
  accent:   "#37B1E6",
  border:   "#E4EBF2",
  success:  "#16A34A",
  warning:  "#F59E0B",
  danger:   "#DC2626",
};

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
  elevation: 3,
};

// ── Mock parent data (replace with real API data once schema is set up) ────────
const MOCK_PARENT = {
  name:       "Ramabhai Patel",
  age:        72,
  location:   "Vadodara, Gujarat",
  dayStreak:  14,
  memories:   47,
  score:      90,
  rating:     5,
  healthScore: 72,
  streakDays:  5,
  isLive:      true,
  urgentAlerts: 1,
};

const MOCK_MEDICINES = [
  { id: "1", time: "8:00",  name: "Metformin Tablet 500mg",  meta: "Due 11:00 AM", priority: "High", tag: "Morning – after breakfast",  taken: true  },
  { id: "2", time: "9:00",  name: "Amlodipine 5mg",          meta: "Due 2:00 PM",  priority: "High", tag: "Afternoon – After Lunch",   taken: true  },
  { id: "3", time: "11:00", name: "Atorvastatin 10mg",       meta: "Due 9:00 PM",  priority: "High", tag: "Evening – Before Bedtime", taken: false, dueAt: "9:00" },
];

const MOCK_ACTIVITIES = [
  { time: "4:00",  title: "Papa recorded a memory in his journal",  sub: '"What was the most beautiful place I Visited..." · Voiced 2 min' },
  { time: "3:05",  title: "Papa scored 28/30 today's Mind Game",    sub: "Today's Brain Quiz Best his own personal best score"            },
  { time: "11:00", title: "Went for morning walk with Sunita",      sub: "45 Minutes. Alkapuri area to Fathegunj area"                    },
  { time: "8:00",  title: "Morning medicine confirmed taken",        sub: "Metforming 500 mg + Aspirin 75 mg very useful for Diabetes"    },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function getTagTheme(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes("morning"))   return { bg: "#E0F7FA", text: "#00838F" };
  if (t.includes("afternoon")) return { bg: "#FFF3E0", text: "#E65100" };
  if (t.includes("evening"))   return { bg: "#EDE7F6", text: "#6A1B9A" };
  return { bg: "#E8F5E9", text: "#2E7D32" };
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function MedItem({ item }: { item: typeof MOCK_MEDICINES[0] }) {
  const tag = getTagTheme(item.tag);
  return (
    <View style={s.medItem}>
      <View style={s.medTimeCol}>
        <Text style={s.medTime}>{item.time}</Text>
        <View style={s.medLine} />
      </View>
      <View style={s.medCard}>
        <View style={s.medCardTop}>
          <Text style={s.medName}>{item.name}</Text>
          {item.taken ? (
            <View style={s.takenBadge}>
              <Ionicons name="checkmark-circle" size={14} color={C.success} />
              <Text style={s.takenText}>Taken</Text>
            </View>
          ) : (
            <View style={s.dueBadge}>
              <Text style={s.dueText}>Due at {item.dueAt}</Text>
            </View>
          )}
        </View>
        <View style={s.medMeta}>
          <Ionicons name="time-outline" size={12} color={C.muted} />
          <Text style={s.medMetaText}>{item.meta}</Text>
          <Ionicons name="alert-circle-outline" size={12} color={C.muted} />
          <Text style={s.medMetaText}>Priority: {item.priority}</Text>
        </View>
        <View style={[s.medTag, { backgroundColor: tag.bg }]}>
          <Text style={[s.medTagText, { color: tag.text }]}>{item.tag}</Text>
        </View>
      </View>
    </View>
  );
}

function ActivityItem({ item, last }: { item: typeof MOCK_ACTIVITIES[0]; last: boolean }) {
  return (
    <View style={s.actItem}>
      <View style={s.actTimeCol}>
        <Text style={s.actTime}>{item.time}</Text>
        {!last && <View style={s.actLine} />}
      </View>
      <View style={s.actCard}>
        <Text style={s.actTitle}>{item.title}</Text>
        <Text style={s.actSub} numberOfLines={2}>{item.sub}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function GuardianHomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { profile, user } = useAuth();

  const guardianName = profile?.fullName || user?.email?.split("@")[0] || "Guardian";
  const initials     = guardianName.charAt(0).toUpperCase();

  const takenCount   = MOCK_MEDICINES.filter(m => m.taken).length;
  const totalMeds    = MOCK_MEDICINES.length;
  const medPct       = Math.round((takenCount / totalMeds) * 100);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning! ☀️" : hour < 17 ? "Good Afternoon! 🌤️" : "Good Evening! 🌙";

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header gradient ── */}
      <LinearGradient
        colors={["#333372", "#36B0E6"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting}</Text>
            <Text style={s.helloText}>Hello, {guardianName.split(" ")[0]}!</Text>
          </View>
          <View style={s.headerActions}>
            <Pressable style={s.headerBtn} onPress={() => router.push("/notifications")}>
              <Ionicons name="notifications-outline" size={22} color={C.white} />
              <View style={s.notifDot} />
            </Pressable>
            <View style={s.avatarCircle}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── Scrollable sheet ── */}
      <View style={s.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
        >

          {/* ── Papa's Health Today ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Papa's Health Today</Text>
            <Pressable><Text style={s.linkText}>Full Report</Text></Pressable>
          </View>

          <Animated.View entering={FadeInDown.delay(80)} style={[s.card, s.parentCard]}>
            {/* Elder profile row */}
            <View style={s.parentRow}>
              <View style={s.elderAvatar}>
                <Image
                  source={require("../assets/images/Group 427320054.png")}
                  style={s.elderAvatarImg}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.parentName}>{MOCK_PARENT.name}</Text>
                <Text style={s.parentSub}>{MOCK_PARENT.age} years · {MOCK_PARENT.location}</Text>
              </View>
              {MOCK_PARENT.isLive && (
                <View style={s.liveBadge}>
                  <View style={s.liveDot} />
                  <Text style={s.liveText}>LIVE</Text>
                </View>
              )}
            </View>

            {/* Stats row */}
            <View style={s.statsRow}>
              {[
                { label: "Day Streak", val: MOCK_PARENT.dayStreak, color: "#F59E0B" },
                { label: "Memories",   val: MOCK_PARENT.memories,  color: "#37B1E6" },
                { label: "Score",      val: MOCK_PARENT.score,     color: "#16A34A" },
                { label: "Rating",     val: MOCK_PARENT.rating,    color: "#7C3AED" },
              ].map((s2, i) => (
                <View key={i} style={s.statItem}>
                  <Text style={[s.statVal, { color: s2.color }]}>{s2.val}</Text>
                  <Text style={s.statLabel}>{s2.label}</Text>
                </View>
              ))}
            </View>

            {/* Health Score + Streak row */}
            <View style={s.scoreRow}>
              <View style={[s.scoreCard, { flex: 1.2 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Ionicons name="heart" size={14} color={C.danger} />
                  <Text style={s.scoreCardLabel}>Health Score</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
                  <Text style={s.scoreCardSub}>Progress  </Text>
                  <Text style={s.scoreVal}>{MOCK_PARENT.healthScore}</Text>
                  <Text style={s.scoreCardSub}>/100</Text>
                </View>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, { width: `${MOCK_PARENT.healthScore}%`, backgroundColor: "#37B1E6" }]} />
                </View>
              </View>

              <View style={[s.scoreCard, { flex: 1 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Text style={{ fontSize: 14 }}>🔥</Text>
                  <Text style={s.scoreCardLabel}>Streak</Text>
                </View>
                <Text style={s.scoreCardSub}>Streak Days</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                  <Text style={[s.scoreVal, { color: C.warning }]}>{MOCK_PARENT.streakDays}</Text>
                </View>
                <View style={s.dotRow}>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <View
                      key={i}
                      style={[s.dot, i < MOCK_PARENT.streakDays && s.dotActive]}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* 2×2 status grid */}
            <View style={s.statusGrid}>
              <View style={[s.statusCard, { backgroundColor: "#F0FFF4" }]}>
                <View style={[s.statusBadge, { backgroundColor: "#16A34A" }]}>
                  <Text style={s.statusBadgeText}>Status</Text>
                </View>
                <Image source={require("../assets/images/DailyCheckIn.png")} style={s.statusImg} resizeMode="contain" />
                <Text style={s.statusLabel}>All Okay . LIVE</Text>
              </View>

              <View style={[s.statusCard, { backgroundColor: "#FFF0F0" }]}>
                <View style={[s.statusBadge, { backgroundColor: "#DC2626" }]}>
                  <Text style={s.statusBadgeText}>Alerts</Text>
                </View>
                <Image source={require("../assets/images/SOS.png")} style={s.statusImg} resizeMode="contain" />
                <Text style={s.statusLabel}>{MOCK_PARENT.urgentAlerts} Urgent</Text>
              </View>

              <View style={[s.statusCard, { backgroundColor: "#FFF8E7" }]}>
                <View style={[s.statusBadge, { backgroundColor: "#F59E0B" }]}>
                  <Text style={s.statusBadgeText}>Medicine</Text>
                </View>
                <Image source={require("../assets/images/Medicine.png")} style={s.statusImg} resizeMode="contain" />
                <Text style={s.statusLabel}>On Track</Text>
              </View>

              <View style={[s.statusCard, { backgroundColor: "#FFF0F8" }]}>
                <View style={[s.statusBadge, { backgroundColor: "#F59E0B" }]}>
                  <Text style={s.statusBadgeText}>Day Streak</Text>
                </View>
                <Image source={require("../assets/images/Streak.png")} style={s.statusImg} resizeMode="contain" />
                <Text style={s.statusLabel}>{MOCK_PARENT.streakDays} Day Streak</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Today's Medicine ── */}
          <View style={[s.sectionHeader, { marginTop: 28 }]}>
            <Text style={s.sectionTitle}>Today's Medicine</Text>
            <Pressable><Text style={s.linkText}>View all</Text></Pressable>
          </View>

          <Animated.View entering={FadeInDown.delay(160)} style={[s.card, { paddingHorizontal: 0, paddingVertical: 0 }]}>
            <View style={{ paddingHorizontal: 18, paddingVertical: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={s.medProgressTitle}>Daily Medicines</Text>
                <LinearGradient
                  colors={["#333372", "#36B0E6"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.medBadge}
                >
                  <Text style={s.medBadgeText}>{takenCount} of {totalMeds} taken</Text>
                </LinearGradient>
              </View>
              <Text style={s.medPctText}>
                <Text style={{ color: C.accent }}>{medPct}%</Text>
                {"  Complete"}
              </Text>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${medPct}%`, backgroundColor: C.accent }]} />
              </View>
            </View>

            {MOCK_MEDICINES.map(med => <MedItem key={med.id} item={med} />)}
            <View style={{ height: 8 }} />
          </Animated.View>

          {/* ── Quick Actions ── */}
          <View style={[s.sectionHeader, { marginTop: 28 }]}>
            <Text style={s.sectionTitle}>Quick Actions</Text>
          </View>

          <Animated.View entering={FadeInDown.delay(200)} style={[s.card, s.qaRow]}>
            {[
              { icon: "call",           label: "Call Papa",   color: "#16A34A", bg: "#F0FFF4" },
              { icon: "mic-outline",    label: "Voice Note",  color: "#37B1E6", bg: "#EFF8FF" },
              { icon: "location",       label: "Location",    color: "#EC4899", bg: "#FFF0F8" },
              { icon: "document-text", label: "Report",       color: "#7C3AED", bg: "#F5F0FF" },
            ].map(q => (
              <Pressable key={q.label} style={s.qaItem}>
                <View style={[s.qaIcon, { backgroundColor: q.bg }]}>
                  <Ionicons name={q.icon as any} size={22} color={q.color} />
                </View>
                <Text style={s.qaLabel}>{q.label}</Text>
              </Pressable>
            ))}
          </Animated.View>

          {/* ── Today's Activity ── */}
          <View style={[s.sectionHeader, { marginTop: 28 }]}>
            <Text style={s.sectionTitle}>Today's Activity</Text>
            <Pressable><Text style={s.linkText}>View all</Text></Pressable>
          </View>

          <Animated.View entering={FadeInDown.delay(240)} style={[s.card, { paddingHorizontal: 0, paddingBottom: 0 }]}>
            <View style={{ paddingHorizontal: 18, paddingVertical: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={s.medProgressTitle}>Daily Activity</Text>
                <LinearGradient
                  colors={["#16A34A", "#22C55E"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.medBadge}
                >
                  <Text style={s.medBadgeText}>1 of 3 Done</Text>
                </LinearGradient>
              </View>
              <Text style={s.medPctText}>
                <Text style={{ color: C.success }}>40%</Text>
                {"  Complete"}
              </Text>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: "40%", backgroundColor: C.success }]} />
              </View>
            </View>

            {MOCK_ACTIVITIES.map((act, i) => (
              <ActivityItem
                key={i}
                item={act}
                last={i === MOCK_ACTIVITIES.length - 1}
              />
            ))}
            <View style={{ height: 12 }} />
          </Animated.View>

        </ScrollView>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  greeting: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.8)", marginBottom: 2 },
  helloText: { fontSize: 30, fontWeight: "900", color: C.white },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerBtn: { position: "relative" },
  notifDot: {
    position: "absolute", top: -1, right: -1,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: "#F59E0B", borderWidth: 1.5, borderColor: C.white,
  },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.6)",
  },
  avatarText: { fontSize: 18, fontWeight: "900", color: C.white },

  sheet: {
    flex: 1, marginTop: -20,
    backgroundColor: C.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: "hidden",
  },

  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 12, paddingHorizontal: 20,
  },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: C.navyDark },
  linkText: { fontSize: 14, fontWeight: "800", color: C.accent },

  card: {
    backgroundColor: C.white, borderRadius: 22,
    marginHorizontal: 20, padding: 18,
    ...CARD_SHADOW,
  },

  // Parent card
  parentCard: { gap: 16 },
  parentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  elderAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#E8F4FD", overflow: "hidden",
    justifyContent: "center", alignItems: "center",
  },
  elderAvatarImg: { width: 56, height: 56 },
  parentName: { fontSize: 18, fontWeight: "900", color: C.navyDark },
  parentSub:  { fontSize: 13, fontWeight: "500", color: C.muted, marginTop: 2 },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#F0FFF4", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.success },
  liveText: { fontSize: 12, fontWeight: "900", color: C.success },

  statsRow: {
    flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: C.border, paddingVertical: 14,
  },
  statItem: { flex: 1, alignItems: "center" },
  statVal:  { fontSize: 22, fontWeight: "900", marginBottom: 2 },
  statLabel:{ fontSize: 11, fontWeight: "600", color: C.muted },

  scoreRow: { flexDirection: "row", gap: 10 },
  scoreCard: {
    backgroundColor: C.bg, borderRadius: 16, padding: 14,
  },
  scoreCardLabel: { fontSize: 13, fontWeight: "800", color: C.navyDark },
  scoreCardSub:   { fontSize: 12, fontWeight: "500", color: C.muted },
  scoreVal:       { fontSize: 22, fontWeight: "900", color: C.accent },
  dotRow: { flexDirection: "row", gap: 4, marginTop: 8 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotActive: { backgroundColor: C.warning },

  progressBg:   { height: 6, backgroundColor: C.border, borderRadius: 3, marginTop: 8, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },

  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statusCard: {
    width: (SCREEN_W - 40 - 36 - 10) / 2,
    borderRadius: 18, padding: 12,
    alignItems: "center",
  },
  statusBadge: {
    alignSelf: "flex-start", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 8,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "800", color: C.white },
  statusImg: { width: 58, height: 58, marginBottom: 8 },
  statusLabel: { fontSize: 13, fontWeight: "800", color: C.navyDark, textAlign: "center" },

  // Medicine
  medProgressTitle: { fontSize: 15, fontWeight: "800", color: C.navyDark },
  medBadge: { borderRadius: 30, paddingHorizontal: 14, paddingVertical: 7 },
  medBadgeText: { fontSize: 12, fontWeight: "800", color: C.white },
  medPctText: { fontSize: 18, fontWeight: "900", color: C.navyDark, marginTop: 10 },

  medItem: { flexDirection: "row", paddingHorizontal: 18 },
  medTimeCol: { width: 52, alignItems: "flex-start", paddingTop: 4 },
  medTime: { fontSize: 13, fontWeight: "700", color: C.muted },
  medLine: { width: 2, flex: 1, backgroundColor: C.border, marginLeft: 14, marginTop: 4 },
  medCard: {
    flex: 1, backgroundColor: C.bg, borderRadius: 18,
    padding: 14, marginBottom: 12, marginLeft: 4,
  },
  medCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  medName: { fontSize: 15, fontWeight: "900", color: C.navyDark, flex: 1, marginRight: 8 },
  takenBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F0FFF4", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  takenText: { fontSize: 12, fontWeight: "800", color: C.success },
  dueBadge:  { backgroundColor: "#FFF8E7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  dueText:   { fontSize: 12, fontWeight: "800", color: "#E65100" },
  medMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5, flexWrap: "wrap" },
  medMetaText: { fontSize: 12, fontWeight: "500", color: C.muted },
  medTag: {
    alignSelf: "flex-start", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 8,
  },
  medTagText: { fontSize: 13, fontWeight: "700" },

  // Quick actions
  qaRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 20 },
  qaItem: { alignItems: "center", gap: 8 },
  qaIcon: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: "center", alignItems: "center",
  },
  qaLabel: { fontSize: 12, fontWeight: "700", color: C.navyDark, textAlign: "center" },

  // Activity
  actItem: { flexDirection: "row", paddingHorizontal: 18 },
  actTimeCol: { width: 52, alignItems: "flex-start", paddingTop: 4 },
  actTime: { fontSize: 12, fontWeight: "700", color: C.muted },
  actLine: { width: 2, flex: 1, backgroundColor: C.border, marginLeft: 14, marginTop: 4 },
  actCard: {
    flex: 1, paddingVertical: 4, marginBottom: 18, marginLeft: 4,
  },
  actTitle: { fontSize: 14, fontWeight: "800", color: C.navyDark, marginBottom: 4 },
  actSub:   { fontSize: 12, fontWeight: "500", color: C.muted, lineHeight: 17 },
});
