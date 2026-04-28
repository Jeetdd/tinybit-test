import React, { useState, useEffect } from "react";
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
import { useAudioPlayer } from "expo-audio";

const C = {
  navy: "#1A3050",
  teal: "#5CB8B2",
  white: "#FFFFFF",
  bg: "#EDF2F5",
  gray: "#7A90A4",
};

export default function MemoryHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [memories, setMemories] = useState<any[]>([]);
  const [playingId, setPlayingId] = useState<string | number | null>(null);
  
  const [activeUri, setActiveUri] = useState<string | null>(null);
  const player = useAudioPlayer(activeUri);

  useEffect(() => {
    if (user) {
      loadMemories();
    }
  }, [user]);

  const loadMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('journal')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const dynamicMemories = data || [];
      
      const pastMemories = [
        {
          id: 'past-1',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          type: "Voice",
          icon: "🎙️",
          content: '"I remember when Rahul was 5 years old and we went to Somnath temple together. He was so excited to see the sea for the first time..."',
        },
      ];

      setMemories([...dynamicMemories, ...pastMemories]);
    } catch (e) {
      console.error("Load memories error", e);
    }
  };

  const handlePlayMemory = async (memory: any) => {
    if (!memory.uri) return;

    if (playingId === memory.id) {
      player.pause();
      setPlayingId(null);
      return;
    }

    setActiveUri(memory.uri);
    setPlayingId(memory.id);
    player.seekTo(0);
    player.play();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} translucent={false} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>All Memories</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
          {memories.map((memory) => {
            const dateStr = memory.created_at 
              ? new Date(memory.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase()
              : "TODAY";
              
            return (
              <Pressable
                key={memory.id}
                onPress={() => (memory.type === "Voice" || memory.media_url) && handlePlayMemory(memory)}
                style={[
                  styles.memoryCard,
                  playingId === memory.id && { backgroundColor: '#F0FAFA' }
                ]}
              >
                <View style={styles.memoryTop}>
                  <Text style={styles.memoryDate}>{dateStr}</Text>
                  <View style={memory.type === "Voice" ? styles.badgeVoice : styles.badgeWritten}>
                    <Text style={memory.type === "Voice" ? styles.badgeVoiceText : styles.badgeWrittenText}>
                      {playingId === memory.id ? "Playing..." : `${memory.type} ${memory.icon || ''}`}
                    </Text>
                  </View>
                </View>
                <Text style={styles.memoryText}>{memory.content || memory.text}</Text>
                <View style={styles.usersRow}>
                  {(memory.users || [{ id: "U", color: C.teal }]).map((u: any, idx: number) => (
                    <View key={idx} style={[styles.userCircle, { backgroundColor: u.color || C.teal, marginLeft: idx > 0 ? -10 : 0 }]} />
                  ))}
                  <Text style={styles.familyLovedText}>family loved this</Text>
                </View>
              </Pressable>
            );
          })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 15, backgroundColor: C.white },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: C.navy },
  scrollContent: { padding: 20 },
  memoryCard: { backgroundColor: C.white, borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#EAEFF3' },
  memoryTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  memoryDate: { fontSize: 12, fontWeight: "800", color: C.gray },
  memoryText: { fontSize: 15, color: C.navy, fontWeight: "600", lineHeight: 22, marginBottom: 15 },
  badgeVoice: { backgroundColor: "#ECF7F7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeVoiceText: { color: "#41A09A", fontSize: 10, fontWeight: "800" },
  badgeWritten: { backgroundColor: "#FFF3EB", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeWrittenText: { color: "#DE8542", fontSize: 10, fontWeight: "800" },
  usersRow: { flexDirection: "row", alignItems: "center" },
  userCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: "#fff" },
  familyLovedText: { fontSize: 11, color: C.gray, fontWeight: "700", marginLeft: 8 },
});
