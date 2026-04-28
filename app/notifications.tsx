import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const C = {
  navy:     "#1A2E6A",
  navyDark: "#111D44",
  white:    "#FFFFFF",
  bg:       "#EEF2F7",
  muted:    "#8A9BB0",
  accent:   "#37B1E6",
  border:   "#E4EBF2",
};

type NotifType = "medicine" | "family" | "checkin" | "sathi" | "sos" | "health";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const TYPE_META: Record<NotifType, { icon: string; color: string; bg: string }> = {
  medicine: { icon: "medkit-outline",       color: "#F59E0B", bg: "#FFF8E7" },
  family:   { icon: "people-outline",       color: "#16A34A", bg: "#F0FFF4" },
  checkin:  { icon: "checkmark-done-outline",color: "#7C3AED", bg: "#F5F0FF" },
  sathi:    { icon: "chatbubble-ellipses-outline", color: "#37B1E6", bg: "#EFF8FF" },
  sos:      { icon: "warning-outline",      color: "#DC2626", bg: "#FFF0F0" },
  health:   { icon: "heart-outline",        color: "#EC4899", bg: "#FFF0F8" },
};

const INITIAL: Notif[] = [
  // Today
  { id: "1",  type: "medicine", title: "Medicine Reminder",        body: "Time to take your evening dose — Metformin 500mg.",         time: "6:00 PM",   read: false },
  { id: "2",  type: "sathi",    title: "Sathi has a tip for you",  body: "Your step count is lower today. A short walk can help!",    time: "4:30 PM",   read: false },
  { id: "3",  type: "family",   title: "Message from Priya",       body: "\"How are you feeling today, Dad? Call me when you can!\"", time: "2:15 PM",   read: false },
  { id: "4",  type: "checkin",  title: "Daily Check-In Pending",   body: "You haven't completed today's health check-in yet.",        time: "10:00 AM",  read: true  },
  // Yesterday
  { id: "5",  type: "medicine", title: "Morning Dose Reminder",    body: "Don't forget — Atorvastatin 10mg with breakfast.",          time: "Yesterday", read: true  },
  { id: "6",  type: "health",   title: "Blood Sugar Alert",        body: "Yesterday's reading was slightly high. Consult your doctor.",time: "Yesterday", read: true  },
  { id: "7",  type: "family",   title: "Voice message from Rahul", body: "Rahul sent you a voice message. Tap to listen.",            time: "Yesterday", read: true  },
  // Earlier
  { id: "8",  type: "sos",      title: "SOS Test Alert",           body: "Your SOS test was sent successfully to family.",            time: "Mon",       read: true  },
  { id: "9",  type: "checkin",  title: "Weekly Summary Ready",     body: "Your weekly health summary is ready. Great job this week!", time: "Sun",       read: true  },
  { id: "10", type: "sathi",    title: "Sathi remembers",          body: "It's been 3 days since your last journal entry.",           time: "Sat",       read: true  },
];

const GROUPS = [
  { label: "Today",     ids: ["1","2","3","4"] },
  { label: "Yesterday", ids: ["5","6","7"] },
  { label: "Earlier",   ids: ["8","9","10"] },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL);

  const unreadCount = notifs.filter(n => !n.read).length;

  const markRead = (id: string) =>
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const markAllRead = () =>
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
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
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={s.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead} style={s.markAllBtn}>
            <Text style={s.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </LinearGradient>

      {/* Sheet */}
      <View style={s.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}
        >
          {GROUPS.map((group, gi) => {
            const items = notifs.filter(n => group.ids.includes(n.id));
            return (
              <Animated.View key={group.label} entering={FadeInDown.delay(gi * 80)}>
                <Text style={s.groupLabel}>{group.label}</Text>
                {items.map((notif, i) => {
                  const meta = TYPE_META[notif.type];
                  return (
                    <Pressable
                      key={notif.id}
                      style={[s.card, !notif.read && s.cardUnread]}
                      onPress={() => markRead(notif.id)}
                    >
                      {/* Icon */}
                      <View style={[s.iconCircle, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                      </View>

                      {/* Content */}
                      <View style={s.cardBody}>
                        <View style={s.cardTop}>
                          <Text style={[s.cardTitle, !notif.read && s.cardTitleUnread]} numberOfLines={1}>
                            {notif.title}
                          </Text>
                          <Text style={s.cardTime}>{notif.time}</Text>
                        </View>
                        <Text style={s.cardDesc} numberOfLines={2}>{notif.body}</Text>
                      </View>

                      {/* Unread dot */}
                      {!notif.read && <View style={s.unreadDot} />}
                    </Pressable>
                  );
                })}
              </Animated.View>
            );
          })}

          {unreadCount === 0 && (
            <Animated.View entering={FadeInDown} style={s.emptyWrap}>
              <View style={s.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={40} color={C.muted} />
              </View>
              <Text style={s.emptyTitle}>You're all caught up!</Text>
              <Text style={s.emptySub}>No new notifications right now.</Text>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingBottom: 28, gap: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "900", color: C.white },
  headerSub:   { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  markAllBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  markAllText: { fontSize: 13, fontWeight: "700", color: C.white },

  sheet: {
    flex: 1, marginTop: -22,
    backgroundColor: C.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: "hidden",
  },

  scroll: { paddingTop: 20, paddingHorizontal: 16 },

  groupLabel: {
    fontSize: 13, fontWeight: "800", color: C.muted,
    textTransform: "uppercase", letterSpacing: 1,
    marginBottom: 10, marginTop: 6,
  },

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white, borderRadius: 18,
    padding: 14, marginBottom: 10, gap: 12,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 2,
  },
  cardUnread: {
    borderLeftWidth: 3, borderLeftColor: C.accent,
  },

  iconCircle: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: "center", alignItems: "center",
    flexShrink: 0,
  },

  cardBody:  { flex: 1 },
  cardTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.muted, flex: 1, marginRight: 8 },
  cardTitleUnread: { color: C.navyDark, fontWeight: "800" },
  cardTime:  { fontSize: 12, fontWeight: "600", color: C.muted, flexShrink: 0 },
  cardDesc:  { fontSize: 13, fontWeight: "500", color: C.muted, lineHeight: 18 },

  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.accent, flexShrink: 0,
  },

  emptyWrap: {
    alignItems: "center", marginTop: 80,
  },
  emptyIcon: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: C.white, justifyContent: "center", alignItems: "center",
    marginBottom: 20,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)", elevation: 3,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: C.navyDark, marginBottom: 8 },
  emptySub:   { fontSize: 14, fontWeight: "500", color: C.muted },
});
