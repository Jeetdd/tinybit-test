import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../utils/supabase";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { useLanguage } from "../context/LanguageContext";
import { scaleStyles } from "../utils/scaleStyles";

function MemoryCard({
  memory,
  playingId,
  onPlay,
  onStop,
  themeColors,
  s,
}: {
  memory: any;
  playingId: string | number | null;
  onPlay: (id: string | number) => void;
  onStop: () => void;
  themeColors: any;
  s: any;
}) {
  const isPlaying = playingId === memory.id;
  const src = useMemo(
    () => (memory.audio_uri ? { uri: memory.audio_uri } : { uri: '' }),
    [memory.audio_uri]
  );
  const player = useAudioPlayer(src);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish && isPlaying) {
      onStop();
    }
  }, [status.didJustFinish, isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!memory.audio_uri) return;
    try {
      if (isPlaying) {
        player.seekTo(0);
        player.play();
      } else {
        player.pause();
      }
    } catch (e) {
      console.error("Playback sync error", e);
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async () => {
    if (memory.type !== "Voice" || !memory.audio_uri) return;
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (isPlaying) {
        onStop();
      } else {
        onPlay(memory.id);
      }
    } catch (e: any) {
      console.error("Toggle playback error", e);
    }
  };

  const dateStr = memory.created_at 
    ? new Date(memory.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase()
    : "TODAY";

  return (
    <Pressable
      onPress={toggle}
      style={[
        s.memoryCard,
        { backgroundColor: themeColors.card, borderColor: themeColors.border },
        isPlaying && { backgroundColor: '#F0FAFA' }
      ]}
    >
      <View style={s.memoryTop}>
        <Text style={[s.memoryDate, { color: themeColors.muted }]}>{dateStr}</Text>
        {memory.type === "Voice" ? (
          <View style={[s.playBtn, isPlaying && s.playBtnStop]}>
            <Ionicons name={isPlaying ? "stop" : "play"} size={12} color="#fff" />
            <Text style={s.playBtnText}>{isPlaying ? "Stop" : "Play"}</Text>
          </View>
        ) : (
          <View style={s.badgeWritten}>
            <Text style={s.badgeWrittenText}>Written ✍️</Text>
          </View>
        )}
      </View>
      <Text style={[s.memoryText, { color: themeColors.text }]}>{memory.content || memory.text}</Text>
      <View style={s.usersRow}>
        {(memory.users || [{ id: "U", color: '#5CB8B2' }]).map((u: any, idx: number) => (
          <View key={idx} style={[s.userCircle, { backgroundColor: u.color || '#5CB8B2', marginLeft: idx > 0 ? -10 : 0, borderColor: themeColors.card }]} />
        ))}
        <Text style={[s.familyLovedText, { color: themeColors.muted }]}>family loved this</Text>
      </View>
    </Pressable>
  );
}

export default function MemoryHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { fontScale, colors: themeColors } = useLanguage();
  const [memories, setMemories] = useState<any[]>([]);
  const [playingId, setPlayingId] = useState<string | number | null>(null);

  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);

  useEffect(() => {
    if (user) {
      loadMemories();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('journal')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (e) {
      console.error("Load memories error", e);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle={themeColors.text === "#FFFFFF" ? "light-content" : "dark-content"} backgroundColor={themeColors.card} translucent={false} />
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: themeColors.card }]}>
        <Pressable style={s.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={themeColors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: themeColors.text }]}>All Memories</Text>
      </View>
      <ScrollView contentContainerStyle={s.scrollContent}>
          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              playingId={playingId}
              onPlay={setPlayingId}
              onStop={() => setPlayingId(null)}
              themeColors={themeColors}
              s={s}
            />
          ))}
      </ScrollView>
    </View>
  );
}

const RAW_STYLES = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 15 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: "900" },
  scrollContent: { padding: 20 },
  memoryCard: { borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1 },
  memoryTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, alignItems: "center" },
  memoryDate: { fontSize: 12, fontWeight: "800" },
  memoryText: { fontSize: 15, fontWeight: "600", lineHeight: 22, marginBottom: 15 },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  playBtnStop: { backgroundColor: '#E84545' },
  playBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  badgeWritten: { backgroundColor: '#FFF3EB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeWrittenText: { color: '#DE8542', fontSize: 10, fontWeight: '800' },
  usersRow: { flexDirection: "row", alignItems: "center" },
  userCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1 },
  familyLovedText: { fontSize: 11, fontWeight: "700", marginLeft: 8 },
});
