import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  StatusBar, KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { sathiAi } from "../../utils/openai";

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

const GREETING = (name: string) =>
  `Hello ${name}! I'm Sathi, your health companion. How can I help you today? 😊`;

export default function TinyAIScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [inputText, setInputText] = useState("");
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [isTyping,  setIsTyping]  = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const name = profile?.fullName || "Friend";
    setMessages([{
      id: "greeting",
      sender: "tiny",
      text: GREETING(name),
      time: "Just now",
    }]);
  }, [profile?.fullName]);

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

    const reply = await sathiAi.chat(
      [...history, { role: "user", content: text }],
      `User Name: ${profile?.fullName || "Friend"}.`,
    );

    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      sender: "tiny",
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
    setIsTyping(false);
  };

  const clearHistory = () => {
    const name = profile?.fullName || "Friend";
    setMessages([{
      id: "greeting",
      sender: "tiny",
      text: GREETING(name),
      time: "Just now",
    }]);
  };

  const isWelcome =
    messages.length === 0 || (messages.length === 1 && messages[0].id === "greeting");

  // ─── Input Bar ────────────────────────────────────────────────────────────
  const inputBar = (
    <View style={s.inputBarWrap}>
      <TextInput
        style={s.inputField}
        placeholder="Ask me anything..."
        placeholderTextColor={C.muted}
        value={inputText}
        onChangeText={setInputText}
        multiline
        onSubmitEditing={handleSend}
        returnKeyType="send"
      />
      <Pressable
        style={[s.actionBtn, !inputText.trim() && { opacity: 0.5 }]}
        onPress={handleSend}
        disabled={!inputText.trim()}
      >
        <Ionicons name="send" size={18} color={C.white} />
      </Pressable>
    </View>
  );

  // ─── Welcome Screen ────────────────────────────────────────────────────────
  if (isWelcome) {
    return (
      <View style={[s.root, { backgroundColor: C.bgWelcome }]}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[s.welcomeRoot, { paddingTop: insets.top + 24 }]}>
            <Text style={s.welcomeTitle}>Meet Tinybit!</Text>
            <Text style={s.welcomeSub}>Your own AI assistant</Text>

            <View style={s.mascotWrap}>
              <Image
                source={require("../../assets/images/Group 427320054.png")}
                style={s.mascotLarge}
                resizeMode="contain"
              />
              <Text style={s.sparkle}>✨</Text>
            </View>

            <Text style={s.welcomeDesc}>
              Ask your questions and receive answers using AI assistant.
            </Text>
          </View>

          <View style={[s.welcomeInputArea, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 16 }]}>
            {isTyping && <Text style={s.typingHint}>Sathi is thinking... ✨</Text>}
            {inputBar}
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── Chat Screen ──────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: C.bgChat }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={["#1B3A5C", "#2B7FC0"]}
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
            <Text style={s.headerTitle}>Sathi Ai Say...</Text>
            <Text style={s.headerSub}>Your health companion</Text>
          </View>
        </View>
        <Pressable style={s.headerIconBtn} onPress={clearHistory}>
          <Ionicons name="trash-outline" size={18} color={C.white} />
        </Pressable>
      </LinearGradient>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[s.chatScroll, { paddingBottom: TAB_BAR_HEIGHT + 80 }]}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
                <Text style={s.timeText}>{msg.time}</Text>
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
                <View style={s.aiBubble}>
                  <Text style={s.aiText}>{msg.text}</Text>
                </View>
                <Text style={s.timeText}>{msg.time}</Text>
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
            <View style={s.aiBubble}>
              <Text style={[s.aiText, { fontStyle: "italic", color: C.muted }]}>
                Sathi is thinking... ✨
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + TAB_BAR_HEIGHT }}
      >
        <View style={[s.chatInputArea, { paddingBottom: 8 }]}>
          {inputBar}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
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
  headerTitle:    { fontSize: 17, fontWeight: "900", color: C.white },
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
