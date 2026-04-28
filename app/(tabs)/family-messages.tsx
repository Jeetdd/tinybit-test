import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../utils/supabase";

const { width } = Dimensions.get("window");

const C = {
  navy: "#1A3050",
  teal: "#5CB8B2",
  white: "#FFFFFF",
  bg: "#EDF2F5",
  cardBg: "#223A57",
  cardBtnBg: "#3A5576",
  muted: "#7A90A4",
  whatsapp: "#399155",
};

interface Message {
  id: string;
  sender_id: string;
  sender_name?: string;
  type: 'voice' | 'photo' | 'text';
  created_at: string;
  duration?: number;
  content?: string;
  media_url?: string;
  is_read?: boolean;
}

export default function FamilyMessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Voice Recording
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  // Text Modal
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('family_messages')
        .select('*, sender:profiles!sender_id (full_name)')
        .eq('receiver_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formatted = (data || []).map(m => ({
        ...m,
        sender_name: m.sender?.full_name
      }));
      
      setMessages(formatted);
    } catch (err) {
      console.log('Error fetching messages', err);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.granted) {
        await recorder.record();
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert("Microphone Error", "Please grant microphone permissions to record.");
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recorder.stop();
      const uri = recorder.uri;
      
      if (uri) {
        const { error } = await supabase
          .from('family_messages')
          .insert([{
            sender_id: user?.id,
            receiver_id: '8689888d-7667-466d-888a-6668777a666b', // Placeholder family member ID
            type: 'voice',
            media_url: uri,
            duration: 0 // In a real app we'd get duration
          }]);
        
        if (error) throw error;
        Alert.alert("Voice Sent!", "Your wonderful voice message has been sent to the family.");
        fetchMessages();
      }
    } catch (err) {
      console.error('Stop recording error', err);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
       const { error } = await supabase
          .from('family_messages')
          .insert([{
            sender_id: user?.id,
            receiver_id: '8689888d-7667-466d-888a-6668777a666b',
            type: 'photo',
            media_url: result.assets[0].uri
          }]);
      if (error) Alert.alert("Error", error.message);
      else {
        Alert.alert("Photo Sent!", "Your photo is on its way to your loved ones.");
        fetchMessages();
      }
    }
  };

  const sendTextMessage = async () => {
    if (messageText.trim().length === 0) return;
    
    try {
      const { error } = await supabase
          .from('family_messages')
          .insert([{
            sender_id: user?.id,
            receiver_id: '8689888d-7667-466d-888a-6668777a666b',
            type: 'text',
            content: messageText
          }]);
      
      if (error) throw error;
      
      Alert.alert("Message Sent!", "We've shared your message with the family.");
      setMessageText("");
      setTextModalVisible(false);
      fetchMessages();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} translucent={false} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable style={styles.backButton} onPress={() => router.push("/")}>
            <Ionicons name="chevron-back" size={24} color="#1A3050" />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Family Messages</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.headerSubtitle}>3 new messages from family </Text>
              <View style={styles.headerRedDot} />
            </View>
          </View>
        </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Main Action Card */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.actionCard}>
            <Text style={styles.actionCardLabel}>SEND A MESSAGE TO FAMILY</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.actionCardTitle}>Talk to Your Loved Ones </Text>
              <Text style={{ fontSize: 22 }}>💛</Text>
            </View>
            <Text style={styles.actionCardSub}>Record voice · Send to family instantly</Text>

            <View style={styles.actionButtonsRow}>
              {/* Record Voice Button */}
              <Pressable 
                style={[styles.actionBtn, isRecording ? styles.actionBtnRecording : styles.actionBtnTeal]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <View style={[styles.actionBtnIconBox, isRecording && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                  <Ionicons name={isRecording ? "stop" : "mic-outline"} size={26} color="white" />
                </View>
                <Text style={styles.actionBtnText}>{isRecording ? "Stop" : "Record\nVoice"}</Text>
                <Text style={styles.actionBtnSubText}>{isRecording ? "Recording..." : "Tap & speak"}</Text>
              </Pressable>

              {/* Send Photo Button */}
              <Pressable style={[styles.actionBtn, styles.actionBtnDark]} onPress={pickImage}>
                <View style={styles.actionBtnIconBoxDark}>
                  <Ionicons name="camera-outline" size={26} color="white" />
                </View>
                <Text style={styles.actionBtnText}>{"Send\nPhoto"}</Text>
                <Text style={styles.actionBtnSubText}>Take or{"\n"}upload</Text>
              </Pressable>

              {/* Send Text Button */}
              <Pressable style={[styles.actionBtn, styles.actionBtnDark]} onPress={() => setTextModalVisible(true)}>
                <View style={styles.actionBtnIconBoxDark}>
                  <Ionicons name="chatbubble-outline" size={26} color="white" />
                </View>
                <Text style={styles.actionBtnText}>Send Text</Text>
                <Text style={[styles.actionBtnSubText, { marginTop: 22 }]}>Type a{"\n"}message</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Send To Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Send To</Text>
            <Text style={styles.sectionAction}>All Family →</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.familyScroll}>
            {FAMILY_MEMBERS.map((member, index) => (
              <Animated.View entering={FadeInDown.delay(200 + index * 50)} key={member.id} style={styles.familyMemberBox}>
                <View style={[styles.avatarBox, { backgroundColor: member.color }]}>
                  <Text style={styles.avatarLetter}>{member.letter}</Text>
                  {member.badge && (
                    <View style={styles.avatarBadge}>
                      <Text style={styles.avatarBadgeText}>{member.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRel}>{member.rel}</Text>
              </Animated.View>
            ))}
          </ScrollView>

          {/* Received Messages */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Received Messages</Text>
            <Text style={styles.sectionAction}>All →</Text>
          </View>

          <Animated.View entering={FadeInDown.delay(400)} style={styles.messagesContainer}>
            {messages.length > 0 ? messages.map((msg, index) => {
              const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <View key={msg.id} style={[styles.messageRow, index < messages.length - 1 && styles.messageRowBorder]}>
                  <View style={[styles.msgAvatarBox, { backgroundColor: '#5CB8B2' }]}>
                    <Text style={styles.msgAvatarLetter}>{msg.sender_name?.charAt(0) || "F"}</Text>
                  </View>
                  <View style={styles.msgContentCol}>
                    <Text style={styles.msgName}>{msg.sender_name}</Text>
                    <View style={styles.msgTypeRow}>
                      {msg.type === 'voice' && <Text style={{fontSize: 12}}>🎙️</Text>}
                      {msg.type === 'photo' && <Text style={{fontSize: 12}}>📷</Text>}
                      {msg.type === 'text' && <Text style={{fontSize: 12}}>💬</Text>}
                      <Text style={styles.msgTypeDesc}>
                        {msg.type === 'voice' && (msg.duration ? `${msg.duration}s` : "Voice message")}
                        {msg.type === 'photo' && " Photo"}
                        {msg.type === 'text' && (msg.content || " Text message")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.msgRightCol}>
                    <Text style={styles.msgTime}>{timeStr}</Text>
                    {msg.is_read === false ? (
                      <View style={styles.msgBadge}>
                        <Text style={styles.msgBadgeText}>1</Text>
                      </View>
                    ) : (
                      <Pressable style={styles.playBtn}>
                        <Ionicons name="play-outline" size={14} color={C.teal} />
                        <Text style={styles.playBtnText}>Play</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: C.muted, fontWeight: '700' }}>No messages yet. Send one!</Text>
              </View>
            )}
          </Animated.View>

          {/* WhatsApp Card */}
          <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>Also on WhatsApp</Text>
          <Animated.View entering={FadeInDown.delay(500)} style={styles.whatsappCard}>
            <View style={styles.waIconBox}>
              <Ionicons name="chatbubble" size={28} color="#D1ECD8" />
            </View>
            <View style={styles.waContentCol}>
              <Text style={styles.waTitle}>Family WhatsApp{"\n"}Group</Text>
              <Text style={styles.waSubTitle}>All messages also sent{"\n"}there · 5 members</Text>
            </View>
            <Pressable style={styles.waOpenBtn}>
              <Text style={styles.waOpenText}>Open →</Text>
            </Pressable>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>

      {/* Text Modal */}
      <Modal visible={textModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : undefined} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Message</Text>
              <Pressable onPress={() => setTextModalVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={C.navy} />
              </Pressable>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="How are you all doing today?"
              placeholderTextColor="#999"
              multiline
              autoFocus
              value={messageText}
              onChangeText={setMessageText}
            />
            <Pressable style={styles.sendBtn} onPress={sendTextMessage}>
              <Text style={styles.sendBtnText}>Send Message</Text>
              <Ionicons name="send" size={18} color="white" style={{marginLeft: 8}} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: C.white,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F0FAFA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#D9EDED",
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: C.navy },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.muted,
    marginTop: 2,
  },
  headerRedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DB5461",
    marginLeft: 6,
    marginTop: 2,
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

  actionCard: {
    backgroundColor: C.cardBg,
    borderRadius: 24,
    padding: 24,
    marginBottom: 30,
  },
  actionCardLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  actionCardTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  actionCardSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 20,
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionBtn: {
    width: (width - 40 - 48 - 20) / 3, // approx 1/3 minus paddings
    borderRadius: 16,
    padding: 14,
    minHeight: 140,
    borderWidth: 1,
  },
  actionBtnTeal: {
    backgroundColor: C.teal,
    borderColor: "#66C7C0",
  },
  actionBtnRecording: {
    backgroundColor: "#DB5461",
    borderColor: "#E56B77",
  },
  actionBtnDark: {
    backgroundColor: "transparent",
    borderColor: C.cardBtnBg,
  },
  actionBtnIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionBtnIconBoxDark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.cardBtnBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  actionBtnSubText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: C.navy,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: "800",
    color: C.teal,
  },

  familyScroll: {
    paddingBottom: 10,
    marginBottom: 20,
  },
  familyMemberBox: {
    alignItems: "center",
    marginRight: 20,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarLetter: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
  },
  avatarBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EBA352",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.bg,
  },
  avatarBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
  },
  memberName: {
    fontSize: 14,
    fontWeight: "900",
    color: C.navy,
  },
  memberRel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.muted,
  },

  messagesContainer: {
    backgroundColor: C.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EAEFF3",
    marginBottom: 30,
  },
  messageRow: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  messageRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F7",
  },
  msgAvatarBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  msgAvatarLetter: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
  },
  msgContentCol: {
    flex: 1,
  },
  msgName: {
    fontSize: 16,
    fontWeight: "900",
    color: C.navy,
    marginBottom: 4,
  },
  msgTypeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  msgTypeDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: C.muted,
    marginLeft: 6,
  },
  msgRightCol: {
    alignItems: "flex-end",
  },
  msgTime: {
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
    marginBottom: 8,
  },
  msgBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EBA352",
    justifyContent: "center",
    alignItems: "center",
  },
  msgBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "900",
  },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FAFA",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DFF0EF",
  },
  playBtnText: {
    color: C.teal,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },

  whatsappCard: {
    backgroundColor: C.whatsapp,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  waIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  waContentCol: {
    flex: 1,
    marginLeft: 15,
  },
  waTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  waSubTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
  },
  waOpenBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  waOpenText: {
    color: "white",
    fontSize: 13,
    fontWeight: "800",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: C.navy,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F4F7",
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: "#F8F9FB",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: C.navy,
    textAlignVertical: "top",
    minHeight: 120,
    marginBottom: 24,
  },
  sendBtn: {
    backgroundColor: C.teal,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
  },
});
