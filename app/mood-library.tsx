import { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
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

const TAB_BAR_HEIGHT = 60;

type Track = { id: string; title: string; sub: string; icon: string; duration: string };

const CONTENT: Record<string, Track[]> = {
  bhajans: [
    { id: "1", title: "Vaishnav Jan To", sub: "Narsinh Mehta",     icon: "accessibility-outline",   duration: "4:15" },
    { id: "2", title: "Hari Bharwad",    sub: "Traditional",        icon: "hand-left-outline",       duration: "4:15" },
    { id: "3", title: "Mara Ghat Ma",    sub: "Gujarati Bhajan",    icon: "musical-note-outline",    duration: "4:15" },
    { id: "4", title: "Shanti Path",     sub: "Daily Prayer",       icon: "radio-button-on-outline", duration: "4:15" },
  ],
  meditation: [
    { id: "1", title: "Morning Calm",   sub: "Guided · 5 min",      icon: "sunny-outline",           duration: "5:00"  },
    { id: "2", title: "Better Sleep",   sub: "Soft Voice · 15 min", icon: "moon-outline",            duration: "15:00" },
    { id: "3", title: "Full Body Scan", sub: "Relaxation · 10 min", icon: "person-outline",          duration: "10:00" },
  ],
  jokes: [
    { id: "1", title: "Papad Pol Jokes",  sub: "Daily Fun",    icon: "happy-outline",  duration: "4:15" },
    { id: "2", title: "Gujarati Riddles", sub: "Brain Teaser", icon: "bulb-outline",   duration: "4:15" },
  ],
  nature: [
    { id: "1", title: "Rain Drops",       sub: "Daily Fun",         icon: "rainy-outline",    duration: "10:00" },
    { id: "2", title: "Mountain Stream",  sub: "Water Flow",        icon: "triangle-outline", duration: "10:00" },
    { id: "3", title: "Bird Melody",      sub: "Forest Chirping",   icon: "leaf-outline",     duration: "8:00"  },
  ],
};

export default function MoodLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type = "bhajans", title = "Bhajans" } = useLocalSearchParams<{ type: string; title: string }>();

  const [search,       setSearch]       = useState("");
  const [playingId,    setPlayingId]    = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  const tracks  = CONTENT[type as string] ?? CONTENT.bhajans;
  const filtered = useMemo(() =>
    search.trim()
      ? tracks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
      : tracks,
    [tracks, search],
  );

  const handlePlay = (track: Track) => {
    if (playingId === track.id) {
      setPlayingId(null);
    } else {
      setPlayingId(track.id);
      setCurrentTrack(track);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={["#1B3A5C", "#2B7FC0"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.navyDark} />
        </Pressable>
        <Text style={s.headerTitle}>{title}</Text>
      </LinearGradient>

      <View style={s.sheet}>
        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={20} color={C.muted} style={{ marginRight: 10 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search Favorites"
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            s.scroll,
            { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + (currentTrack ? 90 : 20) },
          ]}
        >
          {filtered.map((track, i) => {
            const isPlaying = playingId === track.id;
            return (
              <Animated.View key={track.id} entering={FadeInDown.delay(i * 70)}>
                <Pressable
                  style={[s.trackCard, isPlaying && s.trackCardActive]}
                  onPress={() => handlePlay(track)}
                >
                  <View style={s.trackIcon}>
                    <Ionicons name={track.icon as any} size={22} color={C.white} />
                  </View>

                  <View style={s.trackInfo}>
                    <View style={s.trackTitleRow}>
                      <Text style={s.trackTitle}>{track.title}</Text>
                      <Text style={s.trackDuration}>  {track.duration}</Text>
                    </View>
                    <Text style={s.trackSub}>{track.sub}</Text>
                  </View>

                  <Pressable
                    style={[s.actionBtn, isPlaying && s.actionBtnPause]}
                    onPress={() => handlePlay(track)}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={15}
                      color={C.white}
                    />
                    <Text style={s.actionBtnText}>{isPlaying ? "Pause" : "Play"}</Text>
                  </Pressable>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>

      {/* Mini Player */}
      {currentTrack && (
        <View style={[s.miniPlayer, { bottom: insets.bottom + TAB_BAR_HEIGHT + 8 }]}>
          <View style={s.miniIcon}>
            <Ionicons name={currentTrack.icon as any} size={20} color={C.white} />
          </View>
          <View style={s.miniInfo}>
            <View style={s.trackTitleRow}>
              <Text style={s.miniTitle}>{currentTrack.title}</Text>
              <Text style={s.trackDuration}>  {currentTrack.duration}</Text>
            </View>
            <Text style={s.miniSub}>{currentTrack.sub}</Text>
          </View>
          <Pressable
            style={s.miniPlayBtn}
            onPress={() => handlePlay(currentTrack)}
          >
            <Ionicons
              name={playingId === currentTrack.id ? "pause" : "play"}
              size={15}
              color={C.white}
            />
            <Text style={s.actionBtnText}>
              {playingId === currentTrack.id ? "Pause" : "Play"}
            </Text>
          </Pressable>
          <Pressable
            style={s.miniClose}
            onPress={() => { setCurrentTrack(null); setPlayingId(null); }}
          >
            <Ionicons name="close" size={22} color={C.navyDark} />
          </Pressable>
        </View>
      )}
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

  sheet: {
    flex: 1, marginTop: -22,
    backgroundColor: C.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: "hidden", paddingTop: 20,
  },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white, borderRadius: 50,
    marginHorizontal: 16, marginBottom: 16,
    paddingHorizontal: 18, paddingVertical: 13,
    boxShadow: "0px 2px 10px rgba(0,0,0,0.07)", elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "500", color: C.navyDark },

  scroll: { paddingHorizontal: 16 },

  trackCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white, borderRadius: 18,
    padding: 14, marginBottom: 12, gap: 12,
    borderWidth: 2, borderColor: "transparent",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 2,
  },
  trackCardActive: { borderColor: C.accent },

  trackIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.accent,
    justifyContent: "center", alignItems: "center",
  },
  trackInfo:     { flex: 1 },
  trackTitleRow: { flexDirection: "row", alignItems: "center" },
  trackTitle:    { fontSize: 16, fontWeight: "800", color: C.navyDark },
  trackDuration: { fontSize: 14, fontWeight: "700", color: C.accent },
  trackSub:      { fontSize: 13, fontWeight: "500", color: C.muted, marginTop: 2 },

  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.navy, borderRadius: 30,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  actionBtnPause: { backgroundColor: C.navy },
  actionBtnText:  { color: C.white, fontSize: 14, fontWeight: "800" },

  // Mini player
  miniPlayer: {
    position: "absolute", left: 16, right: 16,
    backgroundColor: C.white, borderRadius: 20,
    flexDirection: "row", alignItems: "center",
    padding: 14, gap: 10,
    boxShadow: "0px 4px 20px rgba(0,0,0,0.12)", elevation: 8,
  },
  miniIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.accent,
    justifyContent: "center", alignItems: "center",
  },
  miniInfo:    { flex: 1 },
  miniTitle:   { fontSize: 15, fontWeight: "800", color: C.navyDark },
  miniSub:     { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 1 },
  miniPlayBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: C.navy, borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  miniClose: { padding: 4 },
});
