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
  View,
  Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

import { requestRecordingPermissionsAsync, setAudioModeAsync, RecordingPresets, useAudioRecorder, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../utils/supabase";
import { useLanguage } from "../../context/LanguageContext";
import type { Language } from "../../context/LanguageContext";
import { scaleStyles } from "../../utils/scaleStyles";
import { getTodaysMemoryPrompt } from "../../utils/daily";

async function uploadJournalAudio(uri: string, userId: string): Promise<string> {
  const buf  = await (await fetch(uri)).arrayBuffer();
  const path = `${userId}/${Date.now()}.m4a`;
  const { error } = await supabase.storage
    .from('journal-audio')
    .upload(path, buf, { contentType: 'audio/m4a' });
  if (error) throw error;
  return supabase.storage.from('journal-audio').getPublicUrl(path).data.publicUrl;
}

type JournalT = {
  memoryJournal: string; yourLifeStory: string; memoriesShared: string; dayStreak: string;
  todaysMemoryPrompt: string; todaysQuestion: string;
  recordVoice: string; writeIt: string; justSpeak: string; typeYourMemory: string;
  pastMemories: string; viewAll: string; createMemory: string; shareAsPdf: string;
  writeMemory: string; tellYourStory: string; shareWithFamily: string;
};

const JT: Partial<Record<Language, JournalT>> = {
  English: {
    memoryJournal: "My Memories", yourLifeStory: "Your life story", memoriesShared: "Memories shared · Family loves reading these",
    dayStreak: "Day Streak! 🔥", todaysMemoryPrompt: "Today's Memory Prompt", todaysQuestion: "Today's Question for you",
    recordVoice: "Record Voice", writeIt: "Write It", justSpeak: "Just speak -\nSathi will save", typeYourMemory: "Type your memory -\nSathi will save it.",
    pastMemories: "Past Memories", viewAll: "View all", createMemory: "Create Memory", shareAsPdf: "Memories · Share as a PDF Gift",
    writeMemory: "Write Memory", tellYourStory: "Tell your story...", shareWithFamily: "Share with Family",
  },
  "हिंदी": {
    memoryJournal: "मेरी यादें", yourLifeStory: "आपकी जीवन कहानी", memoriesShared: "यादें साझा · परिवार पढ़ना पसंद करता है",
    dayStreak: "दिन की स्ट्रीक! 🔥", todaysMemoryPrompt: "आज का यादों का संकेत", todaysQuestion: "आज का आपके लिए सवाल",
    recordVoice: "आवाज़ रिकॉर्ड करें", writeIt: "लिखें", justSpeak: "बस बोलें -\nसाथी सहेज लेगा", typeYourMemory: "अपनी याद लिखें -\nसाथी सहेज लेगा।",
    pastMemories: "पुरानी यादें", viewAll: "सभी देखें", createMemory: "याद बनाएं", shareAsPdf: "यादें · PDF उपहार के रूप में साझा करें",
    writeMemory: "याद लिखें", tellYourStory: "अपनी कहानी बताएं...", shareWithFamily: "परिवार के साथ साझा करें",
  },
  "ગુજરાતી": {
    memoryJournal: "મારી યાદો", yourLifeStory: "તમારી જીવન કહાની", memoriesShared: "યાદો શૅર · પરિવારને વાંચવી ગમે છે",
    dayStreak: "દિવસ સ્ટ્રીક! 🔥", todaysMemoryPrompt: "આજની યાદ સૂચના", todaysQuestion: "આજનો તમારા માટે સવાલ",
    recordVoice: "અવાજ રેકૉર્ડ કરો", writeIt: "લખો", justSpeak: "બસ બોલો -\nસાથી સાચવશે", typeYourMemory: "તમારી યાદ લખો -\nસાથી સાચવશે.",
    pastMemories: "જૂની યાદો", viewAll: "બધું જુઓ", createMemory: "યાદ બનાવો", shareAsPdf: "યાદો · PDF ભેટ તરીકે શૅર કરો",
    writeMemory: "યાદ લખો", tellYourStory: "તમારી વાર્તા કહો...", shareWithFamily: "પરિવાર સાથે શૅર કરો",
  },
  "தமிழ்": {
    memoryJournal: "என் நினைவுகள்", yourLifeStory: "உங்கள் வாழ்க்கை கதை", memoriesShared: "நினைவுகள் பகிர்வு · குடும்பம் படிக்க விரும்புகிறது",
    dayStreak: "நாள் தொடர்! 🔥", todaysMemoryPrompt: "இன்றைய நினைவு தூண்டுதல்", todaysQuestion: "இன்றைய உங்களுக்கான கேள்வி",
    recordVoice: "குரல் பதிவு", writeIt: "எழுதுங்கள்", justSpeak: "பேசுங்கள் -\nசாதி சேமிக்கும்", typeYourMemory: "நினைவை தட்டச்சு செய்யுங்கள் -\nசாதி சேமிக்கும்.",
    pastMemories: "பழைய நினைவுகள்", viewAll: "அனைத்தும் காண்க", createMemory: "நினைவை உருவாக்கு", shareAsPdf: "நினைவுகள் · PDF பரிசாக பகிர்",
    writeMemory: "நினைவை எழுது", tellYourStory: "உங்கள் கதையை சொல்லுங்கள்...", shareWithFamily: "குடும்பத்துடன் பகிர்",
  },
  "বাংলা": {
    memoryJournal: "আমার স্মৃতি", yourLifeStory: "আপনার জীবন কাহিনী", memoriesShared: "স্মৃতি শেয়ার · পরিবার পড়তে ভালোবাসে",
    dayStreak: "দিনের ধারা! 🔥", todaysMemoryPrompt: "আজকের স্মৃতির ইঙ্গিত", todaysQuestion: "আজকের আপনার জন্য প্রশ্ন",
    recordVoice: "ভয়েস রেকর্ড", writeIt: "লিখুন", justSpeak: "শুধু বলুন -\nসাথি সংরক্ষণ করবে", typeYourMemory: "আপনার স্মৃতি টাইপ করুন -\nসাথি সংরক্ষণ করবে।",
    pastMemories: "পুরনো স্মৃতি", viewAll: "সব দেখুন", createMemory: "স্মৃতি তৈরি করুন", shareAsPdf: "স্মৃতি · PDF উপহার হিসেবে শেয়ার করুন",
    writeMemory: "স্মৃতি লিখুন", tellYourStory: "আপনার গল্প বলুন...", shareWithFamily: "পরিবারের সাথে শেয়ার করুন",
  },
  "मराठी": {
    memoryJournal: "माझ्या आठवणी", yourLifeStory: "तुमची जीवन कथा", memoriesShared: "आठवणी शेअर · कुटुंबाला वाचणे आवडते",
    dayStreak: "दिवस स्ट्रीक! 🔥", todaysMemoryPrompt: "आजचे आठवणीचे संकेत", todaysQuestion: "आजचा तुमच्यासाठी प्रश्न",
    recordVoice: "आवाज रेकॉर्ड करा", writeIt: "लिहा", justSpeak: "फक्त बोला -\nसाथी सेव्ह करेल", typeYourMemory: "तुमची आठवण टाइप करा -\nसाथी सेव्ह करेल.",
    pastMemories: "जुन्या आठवणी", viewAll: "सर्व पाहा", createMemory: "आठवण तयार करा", shareAsPdf: "आठवणी · PDF भेट म्हणून शेअर करा",
    writeMemory: "आठवण लिहा", tellYourStory: "तुमची कथा सांगा...", shareWithFamily: "कुटुंबासोबत शेअर करा",
  },
};

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
      console.error(e);
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
      console.error(e);
    }
  };

  return (
    <Pressable
      onPress={toggle}
      style={[
        s.memoryCard,
        { backgroundColor: themeColors.card, borderColor: themeColors.border },
        isPlaying && { backgroundColor: '#F0FAFA' }
      ]}
    >
      <View style={s.memoryCardTop}>
        <Text style={[s.memoryDate, { color: themeColors.muted }]}>
          {new Date(memory.created_at).toLocaleDateString()}
        </Text>
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
      <Text style={[s.memoryText, { color: themeColors.text }]} numberOfLines={2}>
        {memory.content}
      </Text>
    </Pressable>
  );
}

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language, fontScale, colors: themeColors } = useLanguage();
  const jt = (JT[language] ?? JT.English) as JournalT;
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);

  const [memories, setMemories] = useState<any[]>([]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isWriteModalVisible, setIsWriteModalVisible] = useState(false);
  const [inputText, setInputText] = useState("");
  const [saving, setSaving] = useState(false);
  const [playingId, setPlayingId] = useState<string | number | null>(null);

  const todaysPrompt = useMemo(() => getTodaysMemoryPrompt(), []);


  useEffect(() => {
    if (user) loadMemories();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('journal').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
      if (error && error.code !== 'PGRST205') throw error;
      const rows = data || [];
      setMemories(rows);
    } catch (e) { console.error(e); }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // ── Stop ──
      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        setIsRecording(false);
        const uri = recorder.uri;
        if (uri) {
          await saveNewMemory("Voice", "🎙️", "Recorded a voice memory", uri);
        } else {
          Alert.alert("No audio", "Nothing was recorded. Please try again.");
        }
      } catch (err: any) {
        setIsRecording(false);
        Alert.alert("Recording error", err?.message ?? "Could not stop recording.");
        console.error(err);
      }
    } else {
      // ── Start ──
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) return Alert.alert("Permission denied", "Microphone access is required to record memories.");
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);
      } catch (err: any) {
        Alert.alert("Recording error", err?.message ?? "Could not start recording.");
        console.error(err);
      }
    }
  };

  const saveNewMemory = async (type: string, _icon: string, content: string, uri?: string) => {
    if (!user) return;
    setSaving(true);
    try {
      let audioUrl: string | undefined;
      if (uri) {
        audioUrl = await uploadJournalAudio(uri, user.id);
      }
      const { error } = await supabase.from('journal').insert({
        user_id: user.id, type, content, audio_uri: audioUrl, prompt: todaysPrompt,
      });
      if (error) throw error;
      Alert.alert("Saved! 🎉", "Your memory has been shared with family.");
      setIsWriteModalVisible(false); setInputText(""); loadMemories();
    } catch (err: any) { Alert.alert("Error", err.message); } finally { setSaving(false); }
  };

  const buildMemoriesHTML = () => {
    const textMemories = memories.filter(m => m.type !== 'Voice');
    return { textMemories, html: `<html><body style="font-family:sans-serif;padding:40px;">
      <h1 style="color:#4AA5D9;text-align:center;">My Memories</h1>
      <p style="text-align:center;color:#999;">Generated on ${new Date().toLocaleDateString()}</p>
      ${textMemories.map(m => `<div style="margin-bottom:30px;border-bottom:1px solid #eee;padding-bottom:10px;">
        <div style="font-weight:bold;color:#777;">${new Date(m.created_at).toLocaleDateString()}</div>
        <div style="font-size:18px;">${m.content}</div></div>`).join('')}
    </body></html>` };
  };

  const downloadPDF = async () => {
    const { textMemories, html } = buildMemoriesHTML();
    if (textMemories.length === 0) return Alert.alert("No Memories", "Write some text memories first to create a PDF.");
    try {
      const { uri } = await Print.printToFileAsync({ html });
      const fileName = `TinyBit_Memories_${new Date().toISOString().split('T')[0]}.pdf`;
      const destPath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: destPath });
      Alert.alert(
        "✅ PDF Downloaded!",
        `Your memories have been saved to:\n${destPath}`,
        [
          { text: "Open File", onPress: () => Sharing.shareAsync(destPath, { UTI: '.pdf', mimeType: 'application/pdf' }) },
          { text: "OK", style: "cancel" },
        ],
      );
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  const sharePDF = async () => {
    const { textMemories, html } = buildMemoriesHTML();
    if (textMemories.length === 0) return Alert.alert("No Memories", "Write some text memories first to create a PDF.");
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  const generatePDF = () => {
    Alert.alert(
      "PDF Options",
      "What would you like to do?",
      [
        { text: "⬇️ Download to Device", onPress: downloadPDF },
        { text: "📤 Share PDF", onPress: sharePDF },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const todayWeekday = new Date().toLocaleDateString('en-US', {weekday: 'long'} as const);

  return (
    <View style={[s.container, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[C.headerStart, C.headerEnd]} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.backBtn}><Ionicons name="arrow-back" size={22} color={C.white} /></Pressable>
          <Text style={s.headerTitle} allowFontScaling={false}>{jt.memoryJournal}</Text>
        </View>
      </LinearGradient>

      <View style={[s.scrollSheet, { backgroundColor: themeColors.bg }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
          <View style={[s.topCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[s.topCardSubtitle, { color: themeColors.text }]} allowFontScaling={false}>{jt.yourLifeStory}</Text>
            <Text style={s.topCardTitle} allowFontScaling={false}>{jt.memoryJournal}</Text>
            <Text style={[s.topCardDesc, { color: themeColors.muted }]} allowFontScaling={false}>{memories.length} {jt.memoriesShared}</Text>
          </View>

          <View style={s.sectionHeaderRow}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]} allowFontScaling={false}>{jt.todaysMemoryPrompt}</Text>
            <Text style={s.sectionAction} allowFontScaling={false}>{todayWeekday}</Text>
          </View>
          <View style={[s.promptCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={s.promptTag}><Text style={s.promptTagText} allowFontScaling={false}>{jt.todaysQuestion}</Text></View>
            <View style={s.promptContent}>
              <Text style={[s.promptQuote, { color: themeColors.text }]} allowFontScaling={false}>
                <Text style={{ fontWeight: '900' }}>{todaysPrompt.split(' ').slice(0, 4).join(' ')} </Text>
                <Text style={{ color: themeColors.muted }}>{todaysPrompt.split(' ').slice(4).join(' ')}</Text>
              </Text>
              <View style={s.actionsRow}>
                <Pressable style={[s.actionBtn, isRecording && { borderColor: '#E84545' }]} onPress={toggleRecording}>
                  <View style={[s.actionTag, { backgroundColor: isRecording ? '#E84545' : '#3B82F6' }]}><Text style={s.actionTagText}>{isRecording ? "Tap to Stop" : jt.recordVoice}</Text></View>
                  <View style={s.actionInner}>
                    <View style={[s.actionCircle, { backgroundColor: isRecording ? '#FEE2E2' : '#E0F2FE' }]}><Ionicons name={isRecording ? "stop-circle" : "mic-outline"} size={28} color={isRecording ? "#E84545" : "#3B82F6"} /></View>
                    <Text style={s.actionDesc}>{isRecording ? "Recording… tap to save" : jt.justSpeak}</Text>
                  </View>
                </Pressable>
                <Pressable style={s.actionBtn} onPress={() => setIsWriteModalVisible(true)}>
                  <View style={[s.actionTag, { backgroundColor: '#8B5CF6' }]}><Text style={s.actionTagText}>{jt.writeIt}</Text></View>
                  <View style={s.actionInner}>
                    <View style={[s.actionCircle, { backgroundColor: '#EDE9FE' }]}><Ionicons name="pencil-outline" size={28} color="#8B5CF6" /></View>
                    <Text style={s.actionDesc}>{jt.typeYourMemory}</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={s.sectionHeaderRow}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]} allowFontScaling={false}>{jt.pastMemories}</Text>
            <Text style={s.sectionAction} allowFontScaling={false} onPress={() => router.push("/memory-history")}>{jt.viewAll}</Text>
          </View>
          <View style={s.memoriesList}>
            {memories.length === 0 ? (
              <Text style={{ textAlign: 'center', color: themeColors.muted, margin: 20 }}>No memories yet.</Text>
            ) : (
              memories.slice(0, 4).map((m, i) => (
                <MemoryCard
                  key={m.id || i}
                  memory={m}
                  playingId={playingId}
                  onPlay={setPlayingId}
                  onStop={() => setPlayingId(null)}
                  themeColors={themeColors}
                  s={s}
                />
              ))
            )}
          </View>

          <View style={[s.sectionHeaderRow, { marginTop: 10 }]}><Text style={[s.sectionTitle, { color: themeColors.text }]}>{jt.createMemory}</Text></View>
          <Pressable style={[s.memoryCard, s.bookCardRow, { backgroundColor: themeColors.card, borderColor: themeColors.border, marginHorizontal: 16 }]} onPress={generatePDF}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[s.bookSubtitle, { color: themeColors.text }]}>{jt.yourLifeStory}</Text>
              <Text style={s.bookTitle}>{jt.createMemory}</Text>
              <Text style={[s.bookDesc, { color: themeColors.muted }]}>{jt.shareAsPdf}</Text>
            </View>
            <Image source={require('../../assets/images/MemoryJournal.png')} style={{ width: 60, height: 60, resizeMode: 'contain' }} />
          </Pressable>
        </ScrollView>
      </View>

      <Modal visible={isWriteModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.modalOverlay}><View style={[s.modalContent, { backgroundColor: themeColors.card }]}>
              <View style={s.modalHeader}><Text style={[s.modalTitle, { color: themeColors.text }]}>{jt.writeMemory}</Text><TouchableOpacity onPress={() => setIsWriteModalVisible(false)}><Ionicons name="close" size={24} color={themeColors.text} /></TouchableOpacity></View>
              <TextInput style={[s.modalInput, { color: themeColors.text }]} placeholder={jt.tellYourStory} placeholderTextColor={themeColors.muted} multiline value={inputText} onChangeText={setInputText} autoFocus />
              <TouchableOpacity style={[s.saveBtn, (!inputText || saving) && { opacity: 0.5 }]} onPress={() => inputText && !saving && saveNewMemory("Written", "✍️", inputText)} disabled={!inputText || saving}><Text style={s.saveBtnText}>{saving ? "Saving..." : jt.shareWithFamily}</Text></TouchableOpacity>
          </View></View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const RAW_STYLES = StyleSheet.create({
  container: { flex: 1 }, header: { paddingHorizontal: 18, paddingBottom: 54 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontSize: 22, fontWeight: '800' },
  scrollSheet: { flex: 1, marginTop: -34, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  topCard: { marginHorizontal: 1, padding: 20, borderRadius: 18, borderWidth: 1, elevation: 6 },
  topCardSubtitle: { fontSize: 14, fontWeight: '800' }, topCardTitle: { fontSize: 28, fontWeight: '900', color: '#4AA5D9', marginTop: 4 },
  topCardDesc: { fontSize: 12, fontWeight: '600', marginTop: 6, marginBottom: 20 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' }, sectionAction: { fontSize: 14, fontWeight: '700', color: '#4AA5D9' },
  promptCard: { marginHorizontal: 16, borderRadius: 20, borderWidth: 1, overflow: 'hidden', elevation: 4 },
  promptTag: { backgroundColor: '#35C26B', paddingHorizontal: 16, paddingVertical: 6, alignSelf: 'flex-start', borderBottomRightRadius: 16 },
  promptTagText: { color: C.white, fontSize: 12, fontWeight: '800' },
  promptContent: { padding: 20 }, promptQuote: { fontSize: 18, lineHeight: 26, marginBottom: 24 },
  actionsRow: { flexDirection: 'row', gap: 12 }, actionBtn: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  actionTag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderBottomRightRadius: 12 },
  actionTagText: { color: C.white, fontSize: 11, fontWeight: '800' },
  actionInner: { padding: 16, alignItems: 'center' }, actionCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionDesc: { fontSize: 12, color: '#7B8AA0', fontWeight: '600', textAlign: 'center' },
  memoriesList: { marginHorizontal: 16, gap: 12 },
  memoryCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  memoryCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  memoryDate: { fontSize: 12, fontWeight: '700' },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  playBtnStop: { backgroundColor: '#E84545' },
  playBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  badgeWritten: { backgroundColor: '#FFF3EB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeWrittenText: { color: '#DE8542', fontSize: 10, fontWeight: '800' },
  memoryText: { fontSize: 16, fontWeight: '800' },
  bookCardRow: { flexDirection: 'row', alignItems: 'center' }, bookSubtitle: { fontSize: 14, fontWeight: '800' },
  bookTitle: { fontSize: 24, fontWeight: '900', color: '#4AA5D9', marginTop: 4, marginBottom: 6 }, bookDesc: { fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, minHeight: 400 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800" }, modalInput: { flex: 1, fontSize: 16, textAlignVertical: "top", marginBottom: 20 },
  saveBtn: { backgroundColor: "#3B82F6", padding: 18, borderRadius: 16, alignItems: "center" },
  saveBtnText: { color: C.white, fontSize: 16, fontWeight: "800" },
});
