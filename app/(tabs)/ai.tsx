import { useState, useEffect, useMemo, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  StatusBar, KeyboardAvoidingView, Platform, Image, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import {
  RecordingPresets, requestRecordingPermissionsAsync,
  setAudioModeAsync, useAudioRecorder,
} from "expo-audio";
import * as Speech from "expo-speech";
import { useAuth } from "../../context/AuthContext";
import { sathiAi } from "../../utils/openai";
import { useLanguage } from "../../context/LanguageContext";
import type { Language } from "../../context/LanguageContext";
import { scaleStyles } from "../../utils/scaleStyles";

type AIScreenT = {
  meetTinybit: string; yourOwnAI: string; askYourQuestions: string;
  sathiIsThinking: string; askMeAnything: string;
  sathiAiSay: string; yourHealthCompanion: string; greeting: string;
};

const AT: Partial<Record<Language, AIScreenT>> = {
  English: {
    meetTinybit: "Meet Tinybit!", yourOwnAI: "Your own AI assistant",
    askYourQuestions: "Ask your questions and receive answers using AI assistant.",
    sathiIsThinking: "Sathi is thinking... ✨", askMeAnything: "Ask me anything...",
    sathiAiSay: "Sathi Ai Say...", yourHealthCompanion: "Your health companion",
    greeting: "Hello {name}! I'm Sathi, your health companion. How can I help you today? 😊",
  },
  "हिंदी": {
    meetTinybit: "टाइनीबिट से मिलें!", yourOwnAI: "आपका अपना AI सहायक",
    askYourQuestions: "AI सहायक से अपने सवाल पूछें और जवाब पाएं।",
    sathiIsThinking: "साथी सोच रहा है... ✨", askMeAnything: "कुछ भी पूछें...",
    sathiAiSay: "साथी AI कहता है...", yourHealthCompanion: "आपका स्वास्थ्य साथी",
    greeting: "नमस्ते {name}! मैं साथी हूं, आपका स्वास्थ्य साथी। आज मैं आपकी कैसे मदद करूं? 😊",
  },
  "ગુજરાતી": {
    meetTinybit: "ટાઇનીબિટ સાથે મળો!", yourOwnAI: "તમારો પોતાનો AI સહાયક",
    askYourQuestions: "AI સહાયક પાસેથી તમારા સવાલોના જવાબ મેળવો.",
    sathiIsThinking: "સાથી વિચારી રહ્યો છે... ✨", askMeAnything: "કંઈ પણ પૂછો...",
    sathiAiSay: "સાથી AI કહે છે...", yourHealthCompanion: "તમારો સ્વાસ્થ્ય સાથી",
    greeting: "નમસ્તે {name}! હું સાથી છું, તમારો સ્વાસ્થ્ય સાથી. આજે હું તમારી કેવી રીતે મદદ કરી શકું? 😊",
  },
  "தமிழ்": {
    meetTinybit: "டைனிபிட்டை சந்தியுங்கள்!", yourOwnAI: "உங்கள் சொந்த AI உதவியாளர்",
    askYourQuestions: "AI உதவியாளரிடம் உங்கள் கேள்விகளுக்கு பதில் பெறுங்கள்.",
    sathiIsThinking: "சாதி சிந்திக்கிறது... ✨", askMeAnything: "எதையும் கேளுங்கள்...",
    sathiAiSay: "சாதி AI சொல்கிறது...", yourHealthCompanion: "உங்கள் சுகாதார தோழர்",
    greeting: "வணக்கம் {name}! நான் சாதி, உங்கள் சுகாதார தோழர். இன்று நான் எப்படி உதவலாம்? 😊",
  },
  "বাংলা": {
    meetTinybit: "টাইনিবিটের সাথে পরিচিত হন!", yourOwnAI: "আপনার নিজস্ব AI সহায়ক",
    askYourQuestions: "AI সহায়কের কাছে আপনার প্রশ্নের উত্তর পান।",
    sathiIsThinking: "সাথি ভাবছে... ✨", askMeAnything: "যেকোনো কিছু জিজ্ঞেস করুন...",
    sathiAiSay: "সাথি AI বলছে...", yourHealthCompanion: "আপনার স্বাস্থ্য সঙ্গী",
    greeting: "নমস্কার {name}! আমি সাথি, আপনার স্বাস্থ্য সঙ্গী। আজ আমি কীভাবে সাহায্য করতে পারি? 😊",
  },
  "मराठी": {
    meetTinybit: "टाइनीबिटशी भेटा!", yourOwnAI: "तुमचा स्वतःचा AI सहायक",
    askYourQuestions: "AI सहायकाकडून तुमच्या प्रश्नांची उत्तरे मिळवा.",
    sathiIsThinking: "साथी विचार करत आहे... ✨", askMeAnything: "काहीही विचारा...",
    sathiAiSay: "साथी AI म्हणतो...", yourHealthCompanion: "तुमचा आरोग्य साथी",
    greeting: "नमस्कार {name}! मी साथी आहे, तुमचा आरोग्य साथी. आज मी तुम्हाला कशी मदत करू? 😊",
  },
};

/* Detects the script of AI reply text and returns the right BCP-47 locale for TTS */
function detectSpeechLocale(text: string): string {
  if (/[ऀ-ॿ]/.test(text)) return 'hi-IN'; // Devanagari — Hindi / Marathi / Haryanvi
  if (/[઀-૿]/.test(text)) return 'gu-IN'; // Gujarati
  if (/[஀-௿]/.test(text)) return 'ta-IN'; // Tamil
  if (/[ঀ-৿]/.test(text)) return 'bn-IN'; // Bengali
  if (/[਀-੿]/.test(text)) return 'pa-IN'; // Gurmukhi — Punjabi
  if (/[ഀ-ൿ]/.test(text)) return 'ml-IN'; // Malayalam
  if (/[ఀ-౿]/.test(text)) return 'te-IN'; // Telugu
  if (/[؀-ۿ]/.test(text)) return 'ar-SA'; // Arabic
  if (/[぀-ヿ]/.test(text)) return 'ja-JP'; // Hiragana / Katakana
  if (/[一-鿿]/.test(text)) return 'zh-CN'; // CJK — Chinese
  if (/[가-힣]/.test(text)) return 'ko-KR'; // Hangul — Korean
  if (/[Ѐ-ӿ]/.test(text)) return 'ru-RU'; // Cyrillic — Russian
  if (/[฀-๿]/.test(text)) return 'th-TH'; // Thai
  if (/[Ḁ-ỿ]/.test(text)) return 'vi-VN'; // Vietnamese (extended Latin)
  return 'en-US';
}


const C = {
  navy:      "#1A2E6A",
  navyDark:  "#111D44",
  white:     "#FFFFFF",
  bgWelcome: "#ECEEF5",
  bgChat:    "#EEF2F7",
  muted:     "#8A9BB0",
  accent:    "#37B1E6",
};

const TAB_BAR_HEIGHT = 60;

interface Message {
  id: string;
  sender: "user" | "tiny";
  text: string;
  time: string;
}

function buildHealthContext(profile: any): string {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.fullName) parts.push(`User: ${profile.fullName}`);
  if (profile.age) parts.push(`Age: ${profile.age}`);
  if (profile.biologicalSex) parts.push(`Sex: ${profile.biologicalSex}`);
  if (profile.bloodGroup) parts.push(`Blood group: ${profile.bloodGroup}`);
  if (profile.height && profile.weight) parts.push(`Height: ${profile.height} ${profile.heightUnit ?? ""}, Weight: ${profile.weight} ${profile.weightUnit ?? ""}`);
  if (profile.medicalConditions?.length) parts.push(`Medical conditions: ${profile.medicalConditions.join(', ')}`);
  if (profile.medications?.length) {
    const meds = profile.medications.map((m: any) => `${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.timing ? ` (${m.timing})` : ""}`).join(', ');
    parts.push(`Current medications: ${meds}`);
  }
  if (profile.doctorName) parts.push(`Doctor: ${profile.doctorName}`);
  return parts.join('. ');
}

export default function TinyAIScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { language, fontScale, colors: themeColors } = useLanguage();
  const at = (AT[language] ?? AT.English) as AIScreenT;
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);

  const [inputText,   setInputText]   = useState("");
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [isTyping,    setIsTyping]    = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    const name = profile?.fullName || "Friend";
    setMessages([{
      id: "greeting",
      sender: "tiny",
      text: at.greeting.replace('{name}', name),
      time: "Just now",
    }]);
  }, [profile?.fullName, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    const history = [...messages, userMsg]
      .filter(m => m.id !== "greeting")
      .map(m => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));

    const healthCtx = buildHealthContext(profile);
    const systemPrompt = `You are Saathi, a compassionate AI health companion for elderly users. ${healthCtx ? `Patient profile — ${healthCtx}.` : ""} Always be warm, supportive, and concise. For medical questions give general guidance and remind the user to consult their doctor. IMPORTANT: Detect the language of the user's message and respond in that exact language only. No meta-commentary about language.`;
    const reply = await sathiAi.chat(
      [...history, { role: "user", content: text }],
      systemPrompt,
    );

    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      sender: "tiny",
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
    setIsTyping(false);
    if (reply) Speech.speak(reply, { language: detectSpeechLocale(reply), rate: 0.88, pitch: 1.0 });
  };

  const handleMic = async () => {
    try {
      if (isRecording) {
        setIsRecording(false);
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        const uri = recorder.uri;
        if (!uri) return;
        setIsTyping(true);
        const transcribed = await sathiAi.transcribe(uri);
        if (!transcribed?.trim()) {
          setIsTyping(false);
          Alert.alert("Couldn't hear you", "Please try speaking again or type below.");
          return;
        }
        const userMsg: Message = {
          id: Date.now().toString(),
          sender: "user",
          text: transcribed,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        const history = [...messages, userMsg]
          .filter(m => m.id !== "greeting")
          .map(m => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })) as any[];
        setMessages(prev => [...prev, userMsg]);
        const healthCtx = buildHealthContext(profile);
        const systemPrompt = `You are Saathi, a compassionate AI health companion for elderly users. ${healthCtx ? `Patient profile — ${healthCtx}.` : ""} Always be warm, supportive, and concise. For medical questions give general guidance and remind the user to consult their doctor. IMPORTANT: Detect the language of the user's message and respond in that exact language only. No meta-commentary about language.`;
        const reply = await sathiAi.chat(history, systemPrompt);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: "tiny",
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }]);
        setIsTyping(false);
        if (reply) {
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
          Speech.speak(reply, { language: detectSpeechLocale(reply), rate: 0.88, pitch: 1.0 });
        }
      } else {
        Speech.stop();
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) return Alert.alert("Permission denied", "Microphone access is required.");
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setIsRecording(true);
      }
    } catch (err: any) {
      setIsRecording(false);
      setIsTyping(false);
      Alert.alert("Mic error", err?.message ?? "Could not use microphone. Please try again.");
    }
  };

  const clearHistory = () => {
    const name = profile?.fullName || "Friend";
    setMessages([{
      id: "greeting",
      sender: "tiny",
      text: at.greeting.replace('{name}', name),
      time: "Just now",
    }]);
    sathiAi.clearHistory().catch(() => {});
  };

  const isWelcome =
    messages.length === 0 || (messages.length === 1 && messages[0].id === "greeting");

  // ─── Input Bar ────────────────────────────────────────────────────────────
  const inputBar = (
    <View style={s.inputBarWrap}>
      {/* Mic button */}
      <Pressable
        style={[s.micBtn, isRecording && s.micBtnRec]}
        onPress={handleMic}
        disabled={isTyping}
      >
        <Ionicons name={isRecording ? "stop" : "mic"} size={18} color={C.white} />
      </Pressable>

      <TextInput
        style={s.inputField}
        placeholder={isRecording ? "🎙 Listening…" : at.askMeAnything}
        placeholderTextColor={isRecording ? "#E84545" : C.muted}
        value={inputText}
        onChangeText={setInputText}
        multiline
        onSubmitEditing={handleSend}
        returnKeyType="send"
        editable={!isRecording && !isTyping}
      />
      <Pressable
        style={[s.actionBtn, (!inputText.trim() || isRecording) && { opacity: 0.5 }]}
        onPress={handleSend}
        disabled={!inputText.trim() || isRecording}
      >
        <Ionicons name="send" size={18} color={C.white} />
      </Pressable>
    </View>
  );

  // ─── Welcome Screen ────────────────────────────────────────────────────────
  if (isWelcome) {
    return (
      <View style={[s.root, { backgroundColor: themeColors.bg }]}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.welcomeRoot, { paddingTop: insets.top + 24 }]}>
            <Text style={s.welcomeTitle}>{at.meetTinybit}</Text>
            <Text style={s.welcomeSub}>{at.yourOwnAI}</Text>

            <View style={s.mascotWrap}>
              <Image
                source={require("../../assets/images/Group 427320054.png")}
                style={s.mascotLarge}
                resizeMode="contain"
              />
              <Text style={s.sparkle}>✨</Text>
            </View>

            <Text style={s.welcomeDesc}>
              {at.askYourQuestions}
            </Text>
          </View>

          <View style={[s.welcomeInputArea, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 16 }]}>
            {isTyping && <Text style={s.typingHint}>{at.sathiIsThinking}</Text>}
            {inputBar}
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── Chat Screen ──────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={["#2B3C86", "#2E9CD6"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.chatHeader, { paddingTop: insets.top + 12 }]}
      >
        <View style={s.chatHeaderLeft}>
          <Image
            source={require("../../assets/images/Group 427320054.png")}
            style={s.headerMascot}
            resizeMode="contain"
          />
          <View style={{ marginLeft: 10 }}>
            <Text style={s.headerTitle}>{at.sathiAiSay}</Text>
            <Text style={s.headerSub}>{at.yourHealthCompanion}</Text>
          </View>
        </View>
        <Pressable style={s.headerIconBtn} onPress={clearHistory}>
          <Ionicons name="trash-outline" size={18} color={C.white} />
        </Pressable>
      </LinearGradient>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[s.chatScroll, { paddingBottom: TAB_BAR_HEIGHT + 100 }]}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {messages.map((msg, index) =>
          msg.sender === "user" ? (
            <Animated.View key={msg.id} entering={FadeInDown.delay(index * 40)} style={s.userRow}>
              <View style={s.userBubbleWrap}>
                <LinearGradient
                  colors={["#1B3A5C", "#2B7FC0"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.userBubble}
                >
                  <Text style={s.userText}>{msg.text}</Text>
                </LinearGradient>
                <Text style={[s.timeText, { color: themeColors.muted }]}>{msg.time}</Text>
              </View>
              <View style={s.userAvatar}>
                <Ionicons name="person" size={17} color={C.white} />
              </View>
            </Animated.View>
          ) : (
            <Animated.View key={msg.id} entering={FadeInDown.delay(index * 40)} style={s.aiRow}>
              <View style={s.aiAvatarCircle}>
                <Image
                  source={require("../../assets/images/Group 427320054.png")}
                  style={s.aiAvatarImg}
                  resizeMode="contain"
                />
              </View>
              <View style={s.aiBubbleWrap}>
                <View style={[s.aiBubble, { backgroundColor: themeColors.card }]}>
                  <Text style={[s.aiText, { color: themeColors.text }]}>{msg.text}</Text>
                </View>
                <Text style={[s.timeText, { color: themeColors.muted }]}>{msg.time}</Text>
              </View>
            </Animated.View>
          )
        )}

        {isTyping && (
          <View style={s.aiRow}>
            <View style={s.aiAvatarCircle}>
              <Image
                source={require("../../assets/images/Group 427320054.png")}
                style={s.aiAvatarImg}
                resizeMode="contain"
              />
            </View>
            <View style={[s.aiBubble, { backgroundColor: themeColors.card }]}>
              <Text style={[s.aiText, { fontStyle: "italic", color: themeColors.muted }]}>
                {at.sathiIsThinking}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom + TAB_BAR_HEIGHT + 8 : 0}
        style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + TAB_BAR_HEIGHT }}
      >
        <View style={[s.chatInputArea, { paddingBottom: 8 }]}>
          {inputBar}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const RAW_STYLES = StyleSheet.create({
  root: { flex: 1 },

  // ── Welcome screen ────────────────────────────────────────────────────────
  welcomeRoot: {
    flex: 1, alignItems: "center",
    paddingHorizontal: 28,
  },
  welcomeTitle: { fontSize: 32, fontWeight: "900", color: C.navyDark, textAlign: "center" },
  welcomeSub: {
    fontSize: 17, fontWeight: "600", color: C.muted,
    marginTop: 8, textAlign: "center",
  },
  mascotWrap:  { position: "relative", marginVertical: 28 },
  mascotLarge: { width: 190, height: 190 },
  sparkle:     { position: "absolute", top: -8, right: -12, fontSize: 28 },
  welcomeDesc: {
    fontSize: 15, fontWeight: "500", color: C.muted,
    textAlign: "center", lineHeight: 23, paddingHorizontal: 8,
  },
  welcomeInputArea: { paddingHorizontal: 16, paddingTop: 8 },
  typingHint: {
    fontSize: 13, color: C.muted, fontStyle: "italic",
    textAlign: "center", marginBottom: 8,
  },

  // ── Shared input bar ──────────────────────────────────────────────────────
  inputBarWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white, borderRadius: 50,
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
    boxShadow: "0px 2px 14px rgba(0,0,0,0.10)", elevation: 4,
  },
  inputField: {
    flex: 1, fontSize: 15, fontWeight: "500",
    color: C.navyDark, maxHeight: 80,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  micBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.muted, justifyContent: "center", alignItems: "center",
  },
  micBtnRec: { backgroundColor: "#E84545" },
  actionBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.navy, justifyContent: "center", alignItems: "center",
  },

  // ── Chat screen header ────────────────────────────────────────────────────
  chatHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18, paddingBottom: 16,
  },
  chatHeaderLeft: { flexDirection: "row", alignItems: "center" },
  headerMascot:   { width: 46, height: 46 },
  headerTitle:    { fontSize: 20, fontWeight: "900", color: C.white },
  headerSub:      { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.70)", marginTop: 2 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },

  // ── Chat messages ─────────────────────────────────────────────────────────
  chatScroll: { paddingHorizontal: 16, paddingTop: 16 },

  userRow: {
    flexDirection: "row", alignItems: "flex-end",
    justifyContent: "flex-end", marginBottom: 16, gap: 8,
  },
  userBubbleWrap: { alignItems: "flex-end", maxWidth: "75%" },
  userBubble: {
    borderRadius: 22, borderBottomRightRadius: 6,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  userText:   { color: C.white, fontSize: 15, fontWeight: "600", lineHeight: 22 },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.navy, justifyContent: "center", alignItems: "center",
  },

  aiRow: {
    flexDirection: "row", alignItems: "flex-end",
    marginBottom: 16, gap: 8,
  },
  aiAvatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#E8F4FD", justifyContent: "center",
    alignItems: "center", overflow: "hidden",
  },
  aiAvatarImg:  { width: 30, height: 30 },
  aiBubbleWrap: { maxWidth: "75%" },
  aiBubble: {
    backgroundColor: C.white, borderRadius: 22, borderBottomLeftRadius: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.07)", elevation: 2,
  },
  aiText:   { color: C.navyDark, fontSize: 15, fontWeight: "600", lineHeight: 22 },
  timeText: { fontSize: 10, color: C.muted, marginTop: 4, fontWeight: "600" },

  chatInputArea: { paddingHorizontal: 16, paddingTop: 12 },
});
