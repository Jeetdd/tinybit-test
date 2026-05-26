import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sathiAi } from '../utils/openai';

function detectSpeechLocale(text: string): string {
  if (/[ऀ-ॿ]/.test(text)) return 'hi-IN';
  if (/[઀-૿]/.test(text)) return 'gu-IN';
  if (/[஀-௿]/.test(text)) return 'ta-IN';
  if (/[ঀ-৿]/.test(text)) return 'bn-IN';
  if (/[਀-੿]/.test(text)) return 'pa-IN';
  if (/[ഀ-ൿ]/.test(text)) return 'ml-IN';
  if (/[ఀ-౿]/.test(text)) return 'te-IN';
  if (/[Ѐ-ӿ]/.test(text)) return 'ru-RU';
  if (/[؀-ۿ]/.test(text)) return 'ar-SA';
  if (/[฀-๿]/.test(text)) return 'th-TH';
  if (/[一-鿿]/.test(text)) return 'zh-CN';
  if (/[가-힣]/.test(text)) return 'ko-KR';
  if (/[ぁ-ヿ]/.test(text)) return 'ja-JP';
  return 'en-US';
}

type Status = 'idle' | 'listening' | 'thinking';
type Message = { role: 'user' | 'sathi'; text: string };

interface Props {
  visible: boolean;
  onClose: () => void;
  userName: string;
  context?: string;
}

export default function TalkToSathiModal({ visible, onClose, userName, context }: Props) {
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.2, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  useEffect(() => {
    if (visible && messages.length === 0) {
      const greeting = `Hello ${userName}! I'm Sathi, your health companion. Tap the mic button below and speak — I'm here to listen and help you feel good!`;
      setMessages([{
        role: 'sathi',
        text: `Hello ${userName}! 😊 I'm Sathi, your health companion.\n\nTap the button below and speak — I'm here to listen and help you feel good!`,
      }]);
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
        .then(() => Speech.speak(greeting, { language: 'en-US', rate: 0.88, pitch: 1.0 }))
        .catch(() => {});
    }
  }, [visible]);

  const sendToSathi = async (msgs: Message[]) => {
    setStatus('thinking');
    const history = msgs.map(m => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    }));
    const ctx = (context ? context + '. ' : '') +
      `User: ${userName}. IMPORTANT: Detect the language of the user's message and respond in that exact language only. No meta-commentary about language.`;
    const reply = await sathiAi.chat(history, ctx);
    setMessages([...msgs, { role: 'sathi', text: reply }]);
    setStatus('idle');
    if (reply) {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      Speech.speak(reply, { language: detectSpeechLocale(reply), rate: 0.88, pitch: 1.0 });
    }
  };

  const handleMic = async () => {
    if (isRecording) {
      setIsRecording(false);
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });

      const uri = recorder.uri;
      if (!uri) { setStatus('idle'); return; }

      // Verify the file exists before uploading (prevents the file-not-found error)
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) {
          setStatus('idle');
          const updated = [...messages, {
            role: 'sathi' as const,
            text: "I couldn't capture that. Please try speaking again.",
          }];
          setMessages(updated);
          return;
        }
      } catch {
        setStatus('idle');
        return;
      }

      setStatus('thinking');
      const transcribed = await sathiAi.transcribe(uri);
      if (!transcribed?.trim()) {
        setStatus('idle');
        const updated = [...messages, {
          role: 'sathi' as const,
          text: "I'm sorry, I couldn't hear you clearly. Could you try again or type below?",
        }];
        setMessages(updated);
        return;
      }

      const withUser = [...messages, { role: 'user' as const, text: transcribed }];
      setMessages(withUser);
      await sendToSathi(withUser);
    } else {
      Speech.stop();
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      setIsRecording(true);
      setStatus('listening');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || status === 'thinking') return;
    setInputText('');
    const withUser = [...messages, { role: 'user' as const, text }];
    setMessages(withUser);
    await sendToSathi(withUser);
  };

  const handleClose = () => {
    Speech.stop();
    if (isRecording) {
      recorder.stop().catch(() => {});
      setIsRecording(false);
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false }).catch(() => {});
    }
    setStatus('idle');
    setMessages([]);
    setInputText('');
    onClose();
  };

  const lastSathi = [...messages].reverse().find(m => m.role === 'sathi');
  const lastUser = [...messages].reverse().find(m => m.role === 'user');

  const statusLabel =
    status === 'listening' ? '🎙 Listening… Tap to stop'
    : status === 'thinking' ? 'Sathi is thinking… ✨'
    : 'Tap the button to speak';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <LinearGradient colors={['#0D1F3C', '#1B4980', '#0E2A50']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* ── Header ── */}
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
            </Pressable>
            <Text style={styles.headerTitle}>Talk to Sathi</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* ── Mascot ── */}
          <View style={styles.mascotWrap}>
            <Image
              source={require('../assets/images/homescreendrop.png')}
              style={styles.mascot}
              resizeMode="contain"
            />
            {status === 'thinking' && (
              <View style={styles.thinkingBadge}>
                <ActivityIndicator size="small" color="#3EA8D8" />
              </View>
            )}
          </View>

          <Text style={styles.sathiName}>Sathi</Text>
          <Text style={styles.sathiSub}>Your personal health companion</Text>

          {/* ── Sathi response bubble ── */}
          {lastSathi && (
            <View style={styles.sathiBubble}>
              <Text style={styles.sathiBubbleText}>{lastSathi.text}</Text>
            </View>
          )}

          {/* ── User message ── */}
          {lastUser && (
            <View style={styles.userBubbleRow}>
              <View style={styles.userBubble}>
                <Text style={styles.userBubbleText}>{lastUser.text}</Text>
              </View>
            </View>
          )}

          {/* ── Status label ── */}
          <Text style={styles.statusText}>{statusLabel}</Text>

          {/* ── Mic button ── */}
          <View style={styles.micArea}>
            <Animated.View style={[
              styles.micRing,
              pulseStyle,
              isRecording && styles.micRingRec,
            ]}>
              <Pressable
                onPress={handleMic}
                disabled={status === 'thinking'}
                style={[styles.micBtn, isRecording && styles.micBtnRec]}
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={44}
                  color="#fff"
                />
              </Pressable>
            </Animated.View>
          </View>

          {/* ── Text input ── */}
          <View style={[styles.inputRow, { paddingBottom: insets.bottom + 20 }]}>
            <TextInput
              style={styles.textInput}
              placeholder="Or type here…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={status !== 'thinking'}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || status === 'thinking'}
              style={[
                styles.sendBtn,
                (!inputText.trim() || status === 'thinking') && { opacity: 0.4 },
              ]}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },

  mascotWrap: { alignItems: 'center', marginTop: 12, marginBottom: 4 },
  mascot: { width: 130, height: 130 },
  thinkingBadge: {
    position: 'absolute', bottom: 2, right: '34%',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#0E2A50',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#3EA8D8',
  },

  sathiName: {
    textAlign: 'center', color: '#fff',
    fontSize: 22, fontWeight: '900', letterSpacing: 0.3,
  },
  sathiSub: {
    textAlign: 'center', color: 'rgba(255,255,255,0.5)',
    fontSize: 13, marginTop: 3, marginBottom: 2,
  },

  sathiBubble: {
    marginHorizontal: 22, marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 20, borderTopLeftRadius: 4,
    paddingHorizontal: 18, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  sathiBubbleText: { color: '#fff', fontSize: 16, fontWeight: '500', lineHeight: 25 },

  userBubbleRow: { alignItems: 'flex-end', marginHorizontal: 22, marginTop: 10 },
  userBubble: {
    backgroundColor: 'rgba(62,168,216,0.28)',
    borderRadius: 20, borderTopRightRadius: 4,
    paddingHorizontal: 16, paddingVertical: 10, maxWidth: '80%',
  },
  userBubbleText: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: '500' },

  statusText: {
    textAlign: 'center', marginTop: 20,
    fontSize: 15, color: 'rgba(255,255,255,0.5)', fontWeight: '600',
  },

  micArea: { alignItems: 'center', marginTop: 18 },
  micRing: {
    width: 124, height: 124, borderRadius: 62,
    backgroundColor: 'rgba(62,168,216,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(62,168,216,0.22)',
  },
  micRingRec: {
    backgroundColor: 'rgba(232,69,69,0.12)',
    borderColor: 'rgba(232,69,69,0.35)',
  },
  micBtn: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#3EA8D8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3EA8D8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.65,
    shadowRadius: 22,
    elevation: 14,
  },
  micBtnRec: { backgroundColor: '#E84545', shadowColor: '#E84545' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, gap: 10,
  },
  textInput: {
    flex: 1, height: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 15, color: '#fff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  sendBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#3EA8D8',
    alignItems: 'center', justifyContent: 'center',
  },
});
