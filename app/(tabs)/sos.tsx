import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
  Alert,
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
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { tr } from "../../constants/appTranslations";
import { getCountryEmergency } from "../../constants/emergencyNumbers";
import CountryPickerModal from "../../components/CountryPickerModal";
import type { Country } from "../../constants/countries";
import { COUNTRIES } from "../../constants/countries";
import { supabase } from "../../utils/supabase";
import { notifyGuardiansOf } from "../../services/notifications";


const C = {
  headerStart: "#2B3C86",
  headerEnd: "#2E9CD6",
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
  const { profile, user } = useAuth();
  const { colors: themeColors, language } = useLanguage();
  const t = tr(language);

  const countryEmergency = getCountryEmergency(profile?.countryCode || "");

  const profileContact: EmergencyContact | null = profile?.emergencyPhone?.trim()
    ? {
        id: "profile",
        name: profile.emergencyRelation?.trim() || "Emergency Contact",
        role: profile.emergencyPhone.trim(),
        initials: (profile.emergencyRelation?.trim() || "E")[0].toUpperCase(),
        color: "#F0F4FF",
        phone: profile.emergencyPhone.trim(),
      }
    : null;

  const countryContact: EmergencyContact = {
    id: "country",
    name: countryEmergency.label,
    role: `Default emergency · ${countryEmergency.number}`,
    initials: "🏥",
    color: "#FFF0EE",
    phone: countryEmergency.number,
  };

  const [isActivating, setIsActivating] = useState(false);
  const [isCalled, setIsCalled] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [guardianNames, setGuardianNames] = useState<string[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContact, setEditingContact] = useState<EmergencyContact>({
    name: "", role: "", initials: "", color: "", phone: "",
  });
  // Default dial code from user's country profile; fallback to +91 (India)
  const profileDialCode = profile?.countryCode
    ? (COUNTRIES.find(c => c.code === profile.countryCode)?.dial ?? "+91")
    : "+91";
  const [dialCode, setDialCode] = useState(profileDialCode);
  const [showDialPicker, setShowDialPicker] = useState(false);

  // Sync dial code when profile loads
  useEffect(() => {
    if (profile?.countryCode) {
      const found = COUNTRIES.find(c => c.code === profile.countryCode);
      if (found) setDialCode(found.dial);
    }
  }, [profile?.countryCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load persisted emergency contacts from Supabase
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('emergency_contacts')
      .select('id, name, role, phone, color')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setContacts(
            data.map((r: any) => ({
              id: r.id,
              name: r.name,
              role: r.role,
              phone: r.phone,
              color: r.color,
              initials: r.name.substring(0, 1).toUpperCase(),
            }))
          );
        }
      });

    // Load connected guardians for "Sharing with Family"
    supabase
      .from('guardian_elder_links')
      .select('guardian_id, profiles!guardian_id(first_name)')
      .eq('elder_id', user!.id)
      .eq('status', 'connected')
      .then(({ data }) => {
        if (data) {
          setGuardianNames(data.map((r: any) => r.profiles?.first_name ?? 'Guardian').filter(Boolean));
        }
      });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAddModal = () => {
    setEditingIndex(null);
    setEditingContact({ name: "", role: "", initials: "", color: "#F0F4FF", phone: "" });
    setDialCode("+91");
    setIsEditModalVisible(true);
  };

  const openEditModal = (contact: EmergencyContact, index: number) => {
    setEditingIndex(index);
    setEditingContact(contact);
    setIsEditModalVisible(true);
  };

  const handleSaveContact = async () => {
    if (!editingContact.name || !editingContact.phone) return;
    const digits = editingContact.phone.trim().replace(/\D/g, '');
    if (digits.length < 6) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number (at least 6 digits).');
      return;
    }
    const initials = editingContact.name.substring(0, 1).toUpperCase();
    const rawPhone = editingContact.phone.trim();
    const fullPhone = rawPhone.startsWith('+') ? rawPhone : `${dialCode}${rawPhone}`;
    const payload = {
      user_id: user!.id,
      name: editingContact.name.trim(),
      role: editingContact.role.trim(),
      phone: fullPhone,
      color: editingContact.color || '#F0F4FF',
    };

    if (editingIndex !== null && editingContact.id) {
      // Update existing
      const { error } = await supabase
        .from('emergency_contacts')
        .update({ name: payload.name, role: payload.role, phone: payload.phone, color: payload.color })
        .eq('id', editingContact.id);
      if (error) { Alert.alert('Error', 'Could not update contact.'); return; }
      const c = [...contacts];
      c[editingIndex] = { ...editingContact, phone: fullPhone, initials };
      setContacts(c);
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert(payload)
        .select('id')
        .single();
      if (error) { Alert.alert('Error', 'Could not save contact.'); return; }
      setContacts([...contacts, { ...payload, id: data.id, initials }]);
    }
    setIsEditModalVisible(false);
    setEditingIndex(null);
  };

  const handleDeleteContact = async () => {
    if (editingIndex === null) return;
    const contact = contacts[editingIndex];
    if (contact.id) {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contact.id);
      if (error) { Alert.alert('Error', 'Could not delete contact.'); return; }
    }
    const c = [...contacts];
    c.splice(editingIndex, 1);
    setContacts(c);
    setIsEditModalVisible(false);
    setEditingIndex(null);
  };

  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse rings animation
  const ring1Scale = useSharedValue(1);
  const progressPulse = useSharedValue(0);

  useEffect(() => {
    ring1Scale.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1400 }), withTiming(1, { duration: 1400 })),
      -1, true
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }] }));
  const progressRingStyle = useAnimatedStyle(() => ({
    width: interpolate(progressPulse.value, [0, 1], [170, 230]),
    height: interpolate(progressPulse.value, [0, 1], [170, 230]),
    borderRadius: interpolate(progressPulse.value, [0, 1], [85, 115]),
    opacity: interpolate(progressPulse.value, [0, 1], [0.05, 0.35]),
  }));

  const activateSOS = async () => {
    if (isCalled) return;
    setIsCalled(true);
    setIsActivating(false);
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (!user?.id) return;
    const name = profile?.fullName || profile?.firstName || 'Your elder';

    // Log the alert
    await supabase.from('sos_alerts').insert({ user_id: user.id });

    // Notify all connected guardians via push/in-app
    await notifyGuardiansOf(
      user.id,
      user.id,
      'sos_triggered',
      `🆘 SOS Alert — ${name}`,
      `${name} has triggered an emergency SOS. Please check on them immediately.`,
    );

    // Automatically send SMS to all emergency contacts
    sendSOSSMS(name);
  };

  const sendSOSSMS = async (senderName: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

    let locationLine = "Location: Unable to retrieve";
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        locationLine = `Location: https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      }
    } catch {}

    const bloodGroup = profile?.bloodGroup ? `Blood: ${profile.bloodGroup}` : "";
    const rawConditions = (profile?.medicalConditions ?? []).filter(
      (c: string) => c && c.toLowerCase() !== 'none' && c.trim() !== ''
    );
    const conditions = rawConditions.length ? `Conditions: ${rawConditions.join(', ')}` : "";

    // Single-line pipe format — works reliably on both Android and iOS.
    // Multi-line (\n → %0A) breaks in iOS Messages and some Android SMS apps.
    const parts = [
      `[SOS] ${senderName} needs IMMEDIATE HELP!`,
      `Time: ${timeStr} ${dateStr}`,
      locationLine,
      bloodGroup,
      conditions,
      `Call emergency services NOW. -TinyBit`,
    ].filter(Boolean);

    const encoded = encodeURIComponent(parts.join(' | '));
    const recipients: string[] = [];
    if (profileContact?.phone) recipients.push(profileContact.phone);
    contacts.forEach(c => { if (c.phone) recipients.push(c.phone); });
    if (recipients.length === 0) return;

    // ?body= is RFC-compliant and works on both iOS and Android.
    // iOS was previously using &body= which fails on modern iOS versions.
    Linking.openURL(`sms:${recipients[0]}?body=${encoded}`).catch(() => {});
  };

  const handlePressIn = () => {
    if (isCalled) return;
    setIsActivating(true);
    progressPulse.value = withTiming(1, { duration: 3000 });
    // Immediate heavy thud, then tick every 600 ms while holding
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    hapticIntervalRef.current = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 600);
  };

  const handlePressOut = () => {
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
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
  }, [isActivating, isCalled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCall = (number: string) => Linking.openURL(`tel:${number}`).catch(() => Alert.alert('Error', 'Could not place call'));

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
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.emergencySOS}</Text>
      </View>

      {/* White rounded sheet — covers everything below header */}
      <View style={[styles.scrollSheet, { backgroundColor: themeColors.bg }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* SOS section — sits directly on white sheet, no card wrapper */}
          <View style={styles.sosSection}>
            <Text style={styles.holdText}>
              {isCalled ? t.emergencyAlertSent : t.holdToActivate}
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
                      <Text style={styles.sosHint}>{t.pressFor3Sec}</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            <Text style={styles.sosInfoText}>
              {isCalled ? t.familyNotified : t.willCallBoth}
            </Text>

            {/* Manual Call button — shown after SOS is triggered */}
            {isCalled && (profileContact || contacts.length > 0) && (
              <TouchableOpacity
                style={styles.callNowBtn}
                onPress={() => {
                  const firstPhone = profileContact?.phone ?? contacts[0]?.phone;
                  if (firstPhone) handleCall(firstPhone);
                }}
              >
                <Ionicons name="call" size={20} color={C.white} style={{ marginRight: 8 }} />
                <Text style={styles.callNowText}>Call Emergency Contact</Text>
              </TouchableOpacity>
            )}

            {/* SMS all contacts button */}
            {isCalled && (
              <TouchableOpacity
                style={[styles.callNowBtn, { backgroundColor: "#2B7FC0", marginTop: 10 }]}
                onPress={() => sendSOSSMS(profile?.fullName || profile?.firstName || 'User')}
              >
                <Ionicons name="chatbubble-outline" size={20} color={C.white} style={{ marginRight: 8 }} />
                <Text style={styles.callNowText}>Send SMS Again</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Emergency Contacts Header */}
          <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t.emergencyContacts}</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.addContactBtn}>
            <Ionicons name="add-circle" size={13} color={C.green} style={{ marginRight: 5 }} />
            <Text style={styles.addContactText}>{t.addContact}</Text>
          </TouchableOpacity>
        </View>

        {/* Contacts Card */}
        <View style={[styles.contactsCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          {/* Red ribbon pill */}
          <View style={styles.redPill}>
            <Text style={styles.redPillText}>{t.whoGetsCallFirst}</Text>
          </View>

          {/* Profile emergency contact (from onboarding) */}
          {profileContact ? (
            <View style={[styles.contactRow, { paddingTop: 48 }, styles.contactDivider]}>
              <View style={[styles.avatar, styles.avatarInitials]}>
                <Text style={styles.avatarInitialText}>{profileContact.initials}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: themeColors.text }]}>{profileContact.name}</Text>
                <Text style={[styles.contactRole, { color: themeColors.muted }]}>{profileContact.role}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleCall(profileContact.phone)}
                style={styles.callIconBtn}
              >
                <Ionicons name="call" size={16} color={C.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.contactRow, { paddingTop: 48 }, styles.contactDivider]}>
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person-outline" size={22} color={C.muted} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: C.muted }]}>{t.noPersonalContact}</Text>
                <Text style={[styles.contactRole, { color: themeColors.muted }]}>{t.addInProfile}</Text>
              </View>
            </View>
          )}

          {/* Country default emergency number */}
          <View style={styles.contactRow}>
            <View style={[styles.avatar, styles.avatarEmergency]}>
              <Ionicons name="medical" size={22} color="#D03050" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{countryContact.name}</Text>
              <Text style={styles.contactRole}>{countryContact.role}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCall(countryContact.phone)}
              style={[styles.callIconBtn, { backgroundColor: "#D03050" }]}
            >
              <Ionicons name="call" size={16} color={C.white} />
            </TouchableOpacity>
          </View>

          {/* Additional user-added contacts */}
          {contacts.map((contact, index) => (
            <View
              key={contact.id ?? index}
              style={[styles.contactRow, styles.contactDivider]}
            >
              <View style={[styles.avatar, styles.avatarInitials]}>
                <Text style={styles.avatarInitialText}>{contact.initials}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: themeColors.text }]}>{contact.name}</Text>
                <Text style={[styles.contactRole, { color: themeColors.muted }]}>{contact.role}</Text>
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
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Safety Features</Text>
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
              {guardianNames.length > 0 ? (
                <Text style={styles.featureSub}>
                  {guardianNames.map((name, i) => (
                    <Text key={name}>
                      <Text style={styles.nameHighlight}>{name}</Text>
                      {i < guardianNames.length - 1 ? (i === guardianNames.length - 2 ? ' & ' : ', ') : ''}
                    </Text>
                  ))}
                  <Text>{' can see your location'}</Text>
                </Text>
              ) : (
                <Text style={styles.featureSub}>No guardians connected yet</Text>
              )}
            </View>
            {guardianNames.length > 0 && (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
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
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                  {editingIndex !== null ? t.editContact : t.addContact}
                </Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={C.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.nameLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={editingContact.name}
                  onChangeText={(text) => setEditingContact({ ...editingContact, name: text })}
                  placeholder={t.fullNamePlaceholder}
                  placeholderTextColor="#B8C4CE"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.mobileNumber}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.input, { width: 76, alignItems: "center", justifyContent: "center" }]}
                    onPress={() => setShowDialPicker(true)}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "700", color: C.text }}>{dialCode}</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={editingContact.phone}
                    onChangeText={(text) => setEditingContact({ ...editingContact, phone: text })}
                    placeholder={t.phonePlaceholder}
                    placeholderTextColor="#B8C4CE"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.relationLocation}</Text>
                <TextInput
                  style={styles.input}
                  value={editingContact.role}
                  onChangeText={(text) => setEditingContact({ ...editingContact, role: text })}
                  placeholder={t.rolePlaceholder}
                  placeholderTextColor="#B8C4CE"
                />
              </View>

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
                    {editingIndex !== null ? t.update : t.add}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <CountryPickerModal
        visible={showDialPicker}
        showDial
        onSelect={(c: Country) => { setDialCode(c.dial); setShowDialPicker(false); }}
        onClose={() => setShowDialPicker(false)}
      />
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
    fontSize: 22,
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
  callNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.green,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 16,
    marginHorizontal: 20,
  },
  callNowText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
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
    fontSize: 18,
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
    borderRadius: 20,
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
  avatarPlaceholder: {
    backgroundColor: "#F0F3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    backgroundColor: "#E8F1FB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4A9BC8",
  },
  avatarEmergency: {
    backgroundColor: "#FFF0EE",
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: 20,
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
    backgroundColor: "#2B3C86",
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
