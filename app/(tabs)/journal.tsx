import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RecordingPresets, useAudioPlayer, useAudioRecorder } from "expo-audio";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../utils/supabase";

const C = {
  bg: '#F2F4F8',
  headerStart: '#2B3C86',
  headerEnd: '#2E9CD6',
  white: '#FFFFFF',
  text: '#15253E',
  muted: '#7B8AA0',
  blue: '#1F7BD7',
  cardBorder: '#EEF2F7',
};

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); // start on monday optionally? Let's use Sun start.
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateForWeekday(base: Date, weekday: DayOfWeek) {
  const s = startOfWeek(base);
  const d = new Date(s);
  d.setDate(s.getDate() + weekday);
  return d;
}

function formatWeekdayLabel(weekday: DayOfWeek) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekday];
}

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { streak, user } = useAuth();

  const [memories, setMemories] = useState<any[]>([]);
  const [playingId, setPlayingId] = useState<string | number | null>(null);

  const [activeUri, setActiveUri] = useState<string | null>(null);
  const player = useAudioPlayer(activeUri);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const [isWriteModalVisible, setIsWriteModalVisible] = useState(false);
  const [inputText, setInputText] = useState("");

  const weekDays = useMemo(() => {
    const base = new Date();
    // Reorder so Mon is first if that's what image has: Mon, Tue, Wed... Sun
    // Mockup 1 has: Mon, Tue, Wed, Thu, Fri, Sat, Sun
    return [1, 2, 3, 4, 5, 6, 0].map((id) => {
      const dayId = id as DayOfWeek;
      const d = dateForWeekday(base, dayId);
      return {
        id: dayId,
        label: formatWeekdayLabel(dayId),
        date: d.getDate(),
        done: id === 1 || id === 2 || id === 3 // Mock Mon, Tue, Wed as done (flame)
      };
    });
  }, []);

  useEffect(() => {
    if (user) loadMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('journal')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST205') throw error;

      let finalMeds = data || [];
      if (finalMeds.length === 0) {
        finalMeds = [
          { id: 'm1', created_at: new Date().toISOString(), type: "Voice", content: "Recorded a new memory from today." },
          { id: 'm2', created_at: new Date().toISOString(), type: "Voice", content: "Recorded a new memory from today." },
          { id: 'm3', created_at: new Date().toISOString(), type: "Voice", content: "Recorded a new memory from today." },
          { id: 'm4', created_at: new Date().toISOString(), type: "Voice", content: "Recorded a new memory from today." },
        ];
      }
      setMemories(finalMeds);
    } catch (e) {
      console.error(e);
    }
  };

  const startRecording = async () => { /* ... existing ... */ };
  const stopRecording = async () => { /* ... existing ... */ };
  const saveNewMemory = async (type: string, icon: string, text: string, uri?: string) => { /* ... existing ... */ };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={[C.headerStart, C.headerEnd]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Memory Journal
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.scrollSheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>

        {/* Top Story Card */}
        <View style={styles.topCard}>
          <Text style={styles.topCardSubtitle} allowFontScaling={false}>Your life story</Text>
          <Text style={styles.topCardTitle} allowFontScaling={false}>Memory Journal</Text>
          <Text style={styles.topCardDesc} allowFontScaling={false}>47 Memories shared . Family loves reading these</Text>

          <Text style={styles.streakTitle} allowFontScaling={false}>3 Day Streak! 🔥</Text>
          <View style={styles.streakDays}>
            {weekDays.map((d) => (
              <View key={d.id} style={styles.streakDay}>
                <Text style={[styles.streakDayLabel, d.id === 0 ? { color: '#E84545' } : null]} allowFontScaling={false}>
                  {d.label}
                </Text>
                {d.done ? (
                  <Text style={styles.streakDayIcon} allowFontScaling={false}>🔥</Text>
                ) : (
                  <Text style={styles.streakDayNumber} allowFontScaling={false}>{d.date}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Prompt Card */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>Today’s Memory Prompt</Text>
          <Text style={styles.sectionAction} allowFontScaling={false}>Monday</Text>
        </View>
        <View style={styles.promptCard}>
          <View style={styles.promptTag}>
            <Text style={styles.promptTagText} allowFontScaling={false}>Today's Question for you</Text>
          </View>
          <View style={styles.promptContent}>
            <Text style={styles.promptQuote} allowFontScaling={false}>
              <Text style={styles.quoteMark}>“ </Text>
              <Text style={styles.promptQuoteBold}>What was the most </Text>
              <Text style={styles.promptQuoteLight}>beautiful place you have ever visited in your life ?”</Text>
            </Text>
            <View style={styles.actionsRow}>
              <Pressable style={styles.actionBtn}>
                <View style={[styles.actionTag, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.actionTagText} allowFontScaling={false}>Record Voice</Text>
                </View>
                <View style={styles.actionInner}>
                  <View style={[styles.actionCircle, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="mic-outline" size={28} color="#3B82F6" />
                  </View>
                  <Text style={styles.actionDesc} allowFontScaling={false}>Just speak -{'\n'}Sathi will save</Text>
                </View>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => setIsWriteModalVisible(true)}>
                <View style={[styles.actionTag, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={styles.actionTagText} allowFontScaling={false}>Write It</Text>
                </View>
                <View style={styles.actionInner}>
                  <View style={[styles.actionCircle, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="pencil-outline" size={28} color="#8B5CF6" />
                  </View>
                  <Text style={styles.actionDesc} allowFontScaling={false}>Type your memory -{'\n'}Sathi will save it.</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Past Memories */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>Past Memories</Text>
          <Text style={styles.sectionAction} allowFontScaling={false}>View all</Text>
        </View>

        <View style={styles.memoriesList}>
          {memories.slice(0, 4).map((m, i) => (
            <View key={m.id || i} style={styles.memoryCard}>
              <View style={styles.memoryCardTop}>
                <Text style={styles.memoryDate} allowFontScaling={false}>Today . 25 March</Text>
                <View style={styles.playBtn}>
                  {i === 1 ? (
                    <Text style={styles.playBtnText} allowFontScaling={false}>⏸ <Text style={{ fontSize: 10 }}>ılılılılılı</Text></Text>
                  ) : (
                    <Text style={styles.playBtnText} allowFontScaling={false}>▶ Play Recording</Text>
                  )}
                </View>
              </View>
              <Text style={styles.memoryText} allowFontScaling={false}>{m.content}</Text>
            </View>
          ))}
        </View>

        {/* Create Memory Book Card */}
        <View style={[styles.sectionHeaderRow, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>Past Memories</Text>
        </View>
        <View style={[styles.memoryCard, styles.bookCardRow]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.bookSubtitle} allowFontScaling={false}>Your life story</Text>
            <Text style={styles.bookTitle} allowFontScaling={false}>Create Memory</Text>
            <Text style={styles.bookDesc} allowFontScaling={false}>47 Memories . Share as a PDF Gift</Text>
          </View>
          <Image source={require('../../assets/images/MemoryJournal.png')} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
        </View>

        </ScrollView>
      </View>

      {/* Modal */}
      <Modal
        visible={isWriteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsWriteModalVisible(false)}
      >
        {/* Simplified Modal */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Write Memory</Text>
                <TouchableOpacity onPress={() => setIsWriteModalVisible(false)}>
                  <Ionicons name="close" size={24} color={C.text} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="Tell your story..."
                multiline
                value={inputText}
                onChangeText={setInputText}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.saveBtn, !inputText && { opacity: 0.5 }]}
                onPress={() => inputText && saveNewMemory("Written", "✍️", inputText)}
                disabled={!inputText}
              >
                <Text style={styles.saveBtnText}>Share with Family</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 54,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: C.white,
    fontSize: 22,
    fontWeight: '800',
  },
  scrollSheet: {
    flex: 1,
    marginTop: -34,
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },

  topCard: {
    marginHorizontal: 1,
    padding: 20,
    borderRadius: 18,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  topCardSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text,
  },
  topCardTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2A79D8',
    marginTop: 4,
  },
  topCardDesc: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 20,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  streakDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  streakDay: {
    alignItems: 'center',
    width: 36,
  },
  streakDayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#898D9E',
  },
  streakDayIcon: {
    fontSize: 16,
    marginTop: 6,
  },
  streakDayNumber: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '800',
    color: '#222B3B',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A79D8',
  },

  promptCard: {
    marginHorizontal: 16,
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  promptTag: {
    backgroundColor: '#35C26B',
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderBottomRightRadius: 16,
  },
  promptTagText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },
  promptContent: {
    padding: 20,
  },
  promptQuote: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 24,
  },
  quoteMark: {
    fontSize: 24,
    fontWeight: '900',
    color: C.text,
  },
  promptQuoteBold: {
    fontWeight: '900',
    color: C.text,
  },
  promptQuoteLight: {
    fontWeight: '700',
    color: C.muted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    overflow: 'hidden',
  },
  actionTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomRightRadius: 12,
  },
  actionTagText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
  },
  actionInner: {
    padding: 16,
    alignItems: 'center',
  },
  actionCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionDesc: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },

  memoriesList: {
    marginHorizontal: 16,
    gap: 12,
  },
  memoryCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
  },
  memoryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  memoryDate: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
  },
  playBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  playBtnText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },
  memoryText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
  },

  bookCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  bookSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text,
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2A79D8',
    marginTop: 4,
    marginBottom: 6,
  },
  bookDesc: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: C.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, minHeight: 400 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  modalInput: { flex: 1, fontSize: 16, color: C.text, textAlignVertical: "top", marginBottom: 20 },
  saveBtn: { backgroundColor: "#3B82F6", padding: 18, borderRadius: 16, alignItems: "center" },
  saveBtnText: { color: C.white, fontSize: 16, fontWeight: "800" },
});
