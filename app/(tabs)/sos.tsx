import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
  Switch,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../context/AuthContext";


const C = {
  headerStart: "#2E4A78",
  headerEnd: "#4A9BC8",
  bg: "#F0F3F8",
  white: "#FFFFFF",
  text: "#15253E",
  muted: "#8D9CAE",
  blue: "#4AA5D9",
  cardBorder: "#E8EDF4",
  sos1: "#F97B6A",
  sos2: "#D93050",
  green: "#35C26B",
  greenBg: "#E8F8EE",
};

interface EmergencyContact {
  id?: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  phone: string;
}

export default function SOSScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useAuth();

  const [isActivating, setIsActivating] = useState(false);
  const [isCalled, setIsCalled] = useState(false);
  const [fallDetection, setFallDetection] = useState(true);

  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: "1", name: "Drashti Patil", role: "Sister · Vadodara, Gujarat", initials: "D", color: "#F0F4FF", phone: "12345" },
    { id: "2", name: "Drashti Patil", role: "Mother · Vadodara, Gujarat", initials: "D", color: "#F0F4FF", phone: "12345" },
    { id: "3", name: "Drashti Patil", role: "Father · Vadodara, Gujarat", initials: "D", color: "#F0F4FF", phone: "12345" },
  ]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContact, setEditingContact] = useState<EmergencyContact>({
    name: "", role: "", initials: "", color: "", phone: "",
  });

  const openAddModal = () => {
    setEditingIndex(null);
    setEditingContact({ name: "", role: "", initials: "", color: "#F0F4FF", phone: "" });
    setIsEditModalVisible(true);
  };

  const openEditModal = (contact: EmergencyContact, index: number) => {
    setEditingIndex(index);
    setEditingContact(contact);
    setIsEditModalVisible(true);
  };

  const handleSaveContact = () => {
    if (!editingContact.name || !editingContact.phone) return;
    const initials = editingContact.name.substring(0, 1).toUpperCase();
    if (editingIndex !== null) {
      const c = [...contacts];
      c[editingIndex] = { ...editingContact, initials };
      setContacts(c);
    } else {
      setContacts([...contacts, { ...editingContact, initials, id: Math.random().toString() }]);
    }
    setIsEditModalVisible(false);
    setEditingIndex(null);
  };

  const handleDeleteContact = () => {
    if (editingIndex !== null) {
      const c = [...contacts];
      c.splice(editingIndex, 1);
      setContacts(c);
      setIsEditModalVisible(false);
      setEditingIndex(null);
    }
  };

  // Pulse rings animation
  const ring1Scale = useSharedValue(1);
  const progressPulse = useSharedValue(0);

  useEffect(() => {
    ring1Scale.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1400 }), withTiming(1, { duration: 1400 })),
      -1, true
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }] }));
  const progressRingStyle = useAnimatedStyle(() => ({
    width: interpolate(progressPulse.value, [0, 1], [170, 230]),
    height: interpolate(progressPulse.value, [0, 1], [170, 230]),
    borderRadius: interpolate(progressPulse.value, [0, 1], [85, 115]),
    opacity: interpolate(progressPulse.value, [0, 1], [0.05, 0.35]),
  }));

  const activateSOS = () => {
    if (isCalled) return;
    setIsCalled(true);
    setIsActivating(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handlePressIn = () => {
    if (isCalled) return;
    setIsActivating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    progressPulse.value = withTiming(1, { duration: 3000 });
  };

  const handlePressOut = () => {
    if (!isCalled) {
      progressPulse.value = withTiming(0, { duration: 300 });
      setIsActivating(false);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActivating && !isCalled) {
      interval = setInterval(() => {
        if (progressPulse.value >= 0.98) {
          activateSOS();
          clearInterval(interval);
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isActivating, isCalled]);

  const handleCall = (number: string) => Linking.openURL(`tel:${number}`);

  return (
    // Root is the blue gradient so rounded-corner curves show blue
    <LinearGradient
      colors={[C.headerStart, C.headerEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header — plain View, inherits gradient from parent */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Emergency SOS</Text>
      </View>

      {/* White rounded sheet — covers everything below header */}
      <View style={styles.scrollSheet}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* SOS section — sits directly on white sheet, no card wrapper */}
          <View style={styles.sosSection}>
            <Text style={styles.holdText}>
              {isCalled ? "EMERGENCY ALERT SENT" : "HOLD TO ACTIVATE"}
            </Text>

            {/* Button + rings */}
            <View style={styles.buttonArea}>
              {/* Outer shell ring — barely off-white, subtle pulse */}
              <Animated.View style={[styles.outerRing1, ring1Style]} />

              {/* Solid gray platform disk */}
              <View style={styles.outerRing2} />

              {/* Progress overlay while holding */}
              {isActivating && !isCalled && (
                <Animated.View style={[styles.progressRing, progressRingStyle]} />
              )}

              {/* SOS Pressable */}
              <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.sosPressable}
              >
                <LinearGradient
                  colors={isCalled ? ["#3CC96A", "#28A855"] : ["#F58570", "#D03050"]}
                  start={{ x: 0.35, y: 0 }}
                  end={{ x: 0.65, y: 1 }}
                  style={[styles.sosButton, isCalled && styles.sosButtonActive]}
                >
                  {isCalled ? (
                    <Ionicons name="checkmark-circle" size={48} color="white" />
                  ) : (
                    <>
                      <Text style={styles.sosLabel}>SOS</Text>
                      <Text style={styles.sosHint}>Press for 3 second</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            <Text style={styles.sosInfoText}>
              {isCalled
                ? "Your family and emergency services\nhave been notified."
                : "This will call your family and\nambulance at the same time"}
            </Text>
          </View>

          {/* Emergency Contacts Header */}
          <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.addContactBtn}>
            <Ionicons name="add-circle" size={13} color={C.green} style={{ marginRight: 5 }} />
            <Text style={styles.addContactText}>Add Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Contacts Card */}
        <View style={styles.contactsCard}>
          {/* Red ribbon pill */}
          <View style={styles.redPill}>
            <Text style={styles.redPillText}>Who gets call first</Text>
          </View>

          {contacts.map((contact, index) => (
            <View
              key={contact.id ?? index}
              style={[
                styles.contactRow,
                index === 0 && { paddingTop: 48 },
                index < contacts.length - 1 && styles.contactDivider,
              ]}
            >
              <Image
                source={{ uri: `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(contact.name + index)}&backgroundColor=b6e3f4,c0aede` }}
                style={styles.avatar}
              />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactRole}>{contact.role}</Text>
              </View>
              <TouchableOpacity
                onPress={() => openEditModal(contact, index)}
                style={styles.editIconBtn}
              >
                <Ionicons name="pencil-outline" size={15} color={C.muted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleCall(contact.phone)}
                style={styles.callIconBtn}
              >
                <Ionicons name="call" size={16} color={C.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Safety Features Header */}
        <View style={[styles.sectionRow, { marginTop: 28 }]}>
          <Text style={styles.sectionTitle}>Safety Features</Text>
        </View>

        {/* Fall Detection Card */}
        <View style={styles.featureCard}>
          <View style={styles.featureRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>Fall Detection</Text>
              <Text style={styles.featureSub}>Auto-alerts family if a fall is detected</Text>
            </View>
            <Switch
              value={fallDetection}
              onValueChange={setFallDetection}
              trackColor={{ false: "#D8E2EC", true: C.green }}
              thumbColor={C.white}
              ios_backgroundColor="#D8E2EC"
            />
          </View>
        </View>

        {/* Sharing with Family Card */}
        <View style={[styles.featureCard, { marginTop: 14 }]}>
          <View style={styles.featureRow}>
            <View style={styles.locationIconWrap}>
              <Image
                source={require("../../assets/images/location.png")}
                style={styles.locationIcon}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>Sharing with family</Text>
              <Text style={styles.featureSub}>
                <Text style={styles.nameHighlight}>Rahul</Text>
                {" & "}
                <Text style={styles.nameHighlight}>Priya</Text>
                {" can see your location"}
              </Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>
        </View>
        </ScrollView>
      </View>

      {/* Edit / Add Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%" }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingIndex !== null ? "Edit Contact" : "Add Contact"}
                </Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={C.text} />
                </TouchableOpacity>
              </View>

              {[
                { label: "Name", key: "name", placeholder: "Full name", keyboard: "default" },
                { label: "Mobile Number", key: "phone", placeholder: "Phone number", keyboard: "phone-pad" },
                { label: "Relation / Location", key: "role", placeholder: "e.g. Sister · Vadodara, Gujarat", keyboard: "default" },
              ].map(({ label, key, placeholder, keyboard }) => (
                <View style={styles.inputGroup} key={key}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={(editingContact as any)[key]}
                    onChangeText={(text) => setEditingContact({ ...editingContact, [key]: text })}
                    placeholder={placeholder}
                    placeholderTextColor="#B8C4CE"
                    keyboardType={keyboard as any}
                  />
                </View>
              ))}

              <View style={styles.modalFooter}>
                {editingIndex !== null && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteContact}>
                    <Ionicons name="trash-outline" size={22} color="#D94055" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveBtn, { flex: 1 }]}
                  onPress={handleSaveContact}
                >
                  <Text style={styles.saveBtnText}>
                    {editingIndex !== null ? "Update" : "Add"}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

const BUTTON_SIZE = 168;
const RING2_SIZE = 222;
const RING1_SIZE = 268;

const styles = StyleSheet.create({
  // Root LinearGradient — no bg needed, gradient provides it
  container: { flex: 1 },

  // White rounded sheet that sits below the gradient header.
  // No overflow:hidden — it blocks Android scroll events.
  // The white bg against the blue gradient parent gives the rounded-corner look.
  scrollSheet: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  // SOS content sits directly on the white sheet (no card wrapper)
  sosSection: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 20,
    gap: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  // ── Scroll ───────────────────────────────────────────────────
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: 16,
  },

  // ── SOS Card ─────────────────────────────────────────────────
  sosCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    paddingTop: 30,
    paddingBottom: 32,
    alignItems: "center",
    boxShadow: "0px 6px 14px rgba(46, 74, 120, 0.07)",
    elevation: 4,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  holdText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9DAEC0",
    letterSpacing: 1.2,
    marginBottom: 28,
  },

  buttonArea: {
    width: RING1_SIZE + 16,
    height: RING1_SIZE + 16,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  progressRing: {
    position: "absolute",
    backgroundColor: "rgba(217,48,80,0.15)",
  },
  // Outermost shell — barely off-white, just a subtle halo
  outerRing1: {
    position: "absolute",
    width: RING1_SIZE,
    height: RING1_SIZE,
    borderRadius: RING1_SIZE / 2,
    backgroundColor: "#EAEBEE",
  },
  // Inner solid gray platform disk — the key visual from the design
  outerRing2: {
    position: "absolute",
    width: RING2_SIZE,
    height: RING2_SIZE,
    borderRadius: RING2_SIZE / 2,
    backgroundColor: "#D2D4DA",
  },
  sosPressable: {
    // Strong coral glow — the defining feature
    boxShadow: "0px 14px 40px rgba(210, 55, 55, 0.55), 0px 4px 16px rgba(210, 55, 55, 0.30)",
    elevation: 14,
    borderRadius: BUTTON_SIZE / 2,
  },
  sosButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sosButtonActive: {
    transform: [{ scale: 1.06 }],
  },
  sosLabel: {
    color: C.white,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  sosHint: {
    color: "rgba(255,255,255,0.90)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  sosInfoText: {
    textAlign: "center",
    color: C.text,
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 30,
    paddingHorizontal: 20,
  },

  // ── Section headers ───────────────────────────────────────────
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
  },
  addContactBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.greenBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addContactText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.green,
  },

  // ── Contacts Card ─────────────────────────────────────────────
  contactsCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.cardBorder,
    boxShadow: "0px 2px 8px rgba(46, 74, 120, 0.06)",
    elevation: 2,
  },
  redPill: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#B8263A",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomRightRadius: 16,
    zIndex: 10,
  },
  redPillText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  contactDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F3F8",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: "#E8F1FB",
  },
  contactInfo: { flex: 1 },
  contactName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    marginBottom: 2,
  },
  contactRole: {
    fontSize: 12,
    fontWeight: "500",
    color: C.muted,
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDE5EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: C.white,
  },
  callIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#5DC983",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Feature Cards ─────────────────────────────────────────────
  featureCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    boxShadow: "0px 2px 8px rgba(46, 74, 120, 0.05)",
    elevation: 2,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    marginBottom: 3,
  },
  featureSub: {
    fontSize: 12,
    fontWeight: "400",
    color: C.muted,
    lineHeight: 17,
  },
  nameHighlight: {
    color: C.blue,
    fontWeight: "700",
  },
  // No background box — just the pin image directly
  locationIconWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  locationIcon: {
    width: 36,
    height: 36,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.greenBg,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 10,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.green,
    marginRight: 6,
  },
  activeBadgeText: {
    color: C.green,
    fontSize: 12,
    fontWeight: "800",
  },

  // ── Modal ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10,20,40,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDE4EF",
    alignSelf: "center",
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: C.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7A8EA4",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: "#F5F7FA",
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
    borderWidth: 1,
    borderColor: "#E4EAF2",
  },
  modalFooter: {
    flexDirection: "row",
    marginTop: 22,
    gap: 10,
    alignItems: "center",
  },
  deleteBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FCEAEA",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    backgroundColor: C.blue,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "800",
  },
});
