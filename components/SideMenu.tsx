import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, Modal,
  ScrollView, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, Easing,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import type { Language } from "../context/LanguageContext";
import { useLanguage } from "../context/LanguageContext";

const { width: SCREEN_W } = Dimensions.get("window");
const MENU_W = SCREEN_W * 0.78;

const C = {
  navy:     "#1A2E6A",
  navyDark: "#111D44",
  white:    "#FFFFFF",
  bg:       "#F4F5F8",
  muted:    "#8A9BB0",
  accent:   "#37B1E6",
  border:   "#E4EBF2",
};

type SideMenuT = { [key: string]: string };

const MENU_TRANSLATIONS: Partial<Record<Language, SideMenuT>> = {
  "English": {
    health: "Health", activities: "Activities", connect: "Connect", memory: "Memory",
    medicine: "Medicine", dailyWellness: "Daily Wellness", healthRecords: "Health Records",
    sathi: "Sathi", brainGames: "Brain Games", moodLift: "Mood Lift",
    familyMessages: "Family Messages", myCalendar: "My Calendar",
    journal: "Journal", memoryHistory: "Memory History",
    sosEmergency: "SOS Emergency", notifications: "Notifications",
    profileSettings: "Profile & Settings", logOut: "Log Out",
  },
  "हिंदी": {
    health: "स्वास्थ्य", activities: "गतिविधियां", connect: "जोड़ें", memory: "यादें",
    medicine: "दवाई", dailyWellness: "दैनिक स्वास्थ्य", healthRecords: "स्वास्थ्य रिकॉर्ड",
    sathi: "साथी", brainGames: "ब्रेन गेम्स", moodLift: "मूड लिफ्ट",
    familyMessages: "पारिवारिक संदेश", myCalendar: "मेरा कैलेंडर",
    journal: "जर्नल", memoryHistory: "यादों का इतिहास",
    sosEmergency: "आपातकाल", notifications: "सूचनाएं",
    profileSettings: "प्रोफ़ाइल और सेटिंग्स", logOut: "लॉग आउट",
  },
  "ગુજરાતી": {
    health: "આરોગ્ય", activities: "પ્રવૃત્તિઓ", connect: "જોડો", memory: "યાદો",
    medicine: "દવા", dailyWellness: "દૈનિક સ્વાસ્થ્ય", healthRecords: "આરોગ્ય રેકૉર્ડ",
    sathi: "સાથી", brainGames: "બ્રેઈન ગેમ્સ", moodLift: "મૂડ લિફ્ટ",
    familyMessages: "પારિવારિક સંદેશ", myCalendar: "મારો કૅલેન્ડર",
    journal: "ડાયરી", memoryHistory: "યાદોનો ઇતિહાસ",
    sosEmergency: "કટોકટી", notifications: "સૂચનાઓ",
    profileSettings: "પ્રોફ઼ાઇલ અને સેટિંગ", logOut: "લૉગ આઉટ",
  },
  "தமிழ்": {
    health: "சுகாதாரம்", activities: "செயல்பாடுகள்", connect: "இணைப்பு", memory: "நினைவுகள்",
    medicine: "மருந்து", dailyWellness: "தினசரி ஆரோக்கியம்", healthRecords: "சுகாதார பதிவுகள்",
    sathi: "சாதி", brainGames: "மூளை விளையாட்டுகள்", moodLift: "மனநிலை உயர்வு",
    familyMessages: "குடும்ப செய்திகள்", myCalendar: "என் நாட்காட்டி",
    journal: "குறிப்பேடு", memoryHistory: "நினைவு வரலாறு",
    sosEmergency: "அவசரநிலை", notifications: "அறிவிப்புகள்",
    profileSettings: "சுயவிவரம் & அமைப்பு", logOut: "வெளியேறு",
  },
  "বাংলা": {
    health: "স্বাস্থ্য", activities: "কার্যক্রম", connect: "সংযোগ", memory: "স্মৃতি",
    medicine: "ওষুধ", dailyWellness: "দৈনিক সুস্থতা", healthRecords: "স্বাস্থ্য রেকর্ড",
    sathi: "সাথি", brainGames: "ব্রেইন গেমস", moodLift: "মেজাজ উন্নতি",
    familyMessages: "পারিবারিক বার্তা", myCalendar: "আমার ক্যালেন্ডার",
    journal: "জার্নাল", memoryHistory: "স্মৃতির ইতিহাস",
    sosEmergency: "জরুরী অবস্থা", notifications: "বিজ্ঞপ্তি",
    profileSettings: "প্রোফাইল ও সেটিং", logOut: "লগ আউট",
  },
  "मराठी": {
    health: "आरोग्य", activities: "उपक्रम", connect: "जोडा", memory: "आठवणी",
    medicine: "औषध", dailyWellness: "दैनंदिन स्वास्थ्य", healthRecords: "आरोग्य नोंदी",
    sathi: "साथी", brainGames: "ब्रेन गेम्स", moodLift: "मनःस्थिती उन्नती",
    familyMessages: "कौटुंबिक संदेश", myCalendar: "माझे दिनदर्शिका",
    journal: "जर्नल", memoryHistory: "आठवणींचा इतिहास",
    sosEmergency: "आपत्कालीन", notifications: "सूचना",
    profileSettings: "प्रोफाइल आणि सेटिंग्ज", logOut: "लॉग आउट",
  },
};

type MenuItem = {
  key: string;
  icon: string;
  route: string;
  color: string;
  bg: string;
};

const SECTIONS: { titleKey: string; items: MenuItem[] }[] = [
  {
    titleKey: "health",
    items: [
      { key: "medicine",      icon: "medkit-outline",            route: "/(tabs)/medicine",       color: "#F59E0B", bg: "#FFF8E7" },
      { key: "dailyWellness", icon: "checkmark-circle-outline",  route: "/(tabs)/daily-check-in", color: "#16A34A", bg: "#F0FFF4" },
      { key: "healthRecords", icon: "shield-checkmark-outline",  route: "/(tabs)/health-vault",   color: "#37B1E6", bg: "#EFF8FF" },
    ],
  },
  {
    titleKey: "activities",
    items: [
      { key: "sathi",      icon: "chatbubble-ellipses-outline", route: "/(tabs)/ai",        color: "#7C3AED", bg: "#F5F0FF" },
      { key: "brainGames", icon: "game-controller-outline",     route: "/(tabs)/mind-games", color: "#EC4899", bg: "#FFF0F8" },
      { key: "moodLift",   icon: "sunny-outline",               route: "/mood-lift",         color: "#F59E0B", bg: "#FFF8E7" },
    ],
  },
  {
    titleKey: "connect",
    items: [
      { key: "familyMessages", icon: "people-outline",   route: "/(tabs)/family-messages", color: "#16A34A", bg: "#F0FFF4" },
      { key: "myCalendar",     icon: "calendar-outline", route: "/(tabs)/care-calendar",   color: "#37B1E6", bg: "#EFF8FF" },
    ],
  },
  {
    titleKey: "memory",
    items: [
      { key: "journal",       icon: "book-outline",  route: "/(tabs)/journal",  color: "#7C3AED", bg: "#F5F0FF" },
      { key: "memoryHistory", icon: "time-outline",  route: "/memory-history",  color: "#EC4899", bg: "#FFF0F8" },
    ],
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
}

export default function SideMenu({ visible, onClose, userName, userEmail, onLogout }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const translateX = useSharedValue(MENU_W);
  const [modalVisible, setModalVisible] = useState(false);

  const mt = MENU_TRANSLATIONS[language] ?? MENU_TRANSLATIONS["English"]!;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      translateX.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    } else {
      translateX.value = withTiming(MENU_W, { duration: 320, easing: Easing.out(Easing.cubic) });
      const t = setTimeout(() => setModalVisible(false), 320);
      return () => clearTimeout(t);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const navigate = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 50);
  };

  const initials = (userName ?? "U").charAt(0).toUpperCase();

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
      <View style={s.overlay}>
        {/* Dim backdrop */}
        <Pressable style={s.backdrop} onPress={onClose} />

        {/* Slide panel */}
        <Animated.View style={[s.panel, panelStyle]}>
          {/* Header */}
          <LinearGradient
            colors={["#1B3A5C", "#2B7FC0"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[s.panelHeader, { paddingTop: insets.top + 20 }]}
          >
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={C.white} />
            </Pressable>

            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <Text style={s.userName}>{userName ?? "Friend"}</Text>
            {userEmail && <Text style={s.userEmail}>{userEmail}</Text>}

            {/* SOS quick-access */}
            <Pressable style={s.sosChip} onPress={() => navigate("/(tabs)/sos")}>
              <Ionicons name="warning-outline" size={14} color={C.white} />
              <Text style={s.sosChipText}>{mt.sosEmergency}</Text>
            </Pressable>
          </LinearGradient>

          {/* Menu list */}
          <ScrollView
            style={s.menuScroll}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
          >
            {SECTIONS.map((section) => (
              <View key={section.titleKey} style={s.section}>
                <Text style={s.sectionTitle}>{mt[section.titleKey]}</Text>
                {section.items.map((item) => (
                  <Pressable
                    key={item.key}
                    style={s.menuItem}
                    onPress={() => navigate(item.route)}
                  >
                    <View style={[s.menuIcon, { backgroundColor: item.bg }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <Text style={s.menuLabel}>{mt[item.key]}</Text>
                    <Ionicons name="chevron-forward" size={16} color={C.muted} />
                  </Pressable>
                ))}
              </View>
            ))}

            {/* Divider */}
            <View style={s.divider} />

            {/* Notifications */}
            <Pressable style={s.menuItem} onPress={() => navigate("/notifications")}>
              <View style={[s.menuIcon, { backgroundColor: "#EFF8FF" }]}>
                <Ionicons name="notifications-outline" size={20} color="#37B1E6" />
              </View>
              <Text style={s.menuLabel}>{mt.notifications}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.muted} />
            </Pressable>

            {/* Profile */}
            <Pressable style={s.menuItem} onPress={() => navigate("/(tabs)/profile")}>
              <View style={[s.menuIcon, { backgroundColor: "#F5F0FF" }]}>
                <Ionicons name="person-outline" size={20} color="#7C3AED" />
              </View>
              <Text style={s.menuLabel}>{mt.profileSettings}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.muted} />
            </Pressable>

            {/* Logout */}
            <Pressable
              style={s.logoutBtn}
              onPress={() => { onClose(); onLogout(); }}
            >
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text style={s.logoutText}>{mt.logOut}</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, flexDirection: "row",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
  },
  panel: {
    width: MENU_W,
    backgroundColor: C.bg,
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
  },

  // Header
  panelHeader: {
    paddingHorizontal: 22, paddingBottom: 24,
    alignItems: "flex-start",
  },
  closeBtn: {
    alignSelf: "flex-end", marginBottom: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 12,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText:  { fontSize: 28, fontWeight: "900", color: C.white },
  userName:    { fontSize: 20, fontWeight: "900", color: C.white, marginBottom: 4 },
  userEmail:   { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.7)", marginBottom: 16 },
  sosChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(220,38,38,0.8)",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  sosChipText: { color: C.white, fontSize: 13, fontWeight: "800" },

  // Menu
  menuScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  section:     { marginTop: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: "800", color: C.muted,
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: 8, marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white, borderRadius: 14,
    padding: 12, marginBottom: 8, gap: 12,
    boxShadow: "0px 1px 6px rgba(0,0,0,0.05)", elevation: 1,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: C.navyDark },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 12, marginHorizontal: 4 },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginTop: 4, paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#FFF0F0", borderRadius: 14,
  },
  logoutText: { fontSize: 15, fontWeight: "800", color: "#DC2626" },
});
