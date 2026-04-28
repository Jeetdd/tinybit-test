import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useLanguage, Language } from "../../context/LanguageContext";

const { width } = Dimensions.get("window");

const C = {
  headerStart: '#304B76',
  headerEnd: '#4B99CA',
  navy: "#1A3050",
  white: "#FFFFFF",
  bg: "#F7F9FC", 
  muted: "#B2BDCE",
  blue: "#4AA5D9",
  cardBorder: "#F0F4F8",
  text: "#222C3A",
  blueIcon: "#3EA0DC", 
  danger: "#FF3B30",
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, logout } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [profileName, setProfileName] = useState(profile?.fullName || "Martin Parghe");
  const [profileMobile, setProfileMobile] = useState(profile?.mobile || "");
  const [profileAge, setProfileAge] = useState("28");
  const [profileLocation, setProfileLocation] = useState("Vadodara, Gujarat");

  const [selectedSize, setSelectedSize] = useState("Medium");
  const LANGUAGES: Language[] = ["English", "हिन्दी", "ગુજરાતી", "বাঙালি", "मराठी"];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      <LinearGradient
        colors={[C.headerStart, C.headerEnd]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={C.white} />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>Profile</Text>
        </View>
      </LinearGradient>

      <View style={styles.scrollSheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Full Width Top Profile Cap */}
        <View style={styles.topCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Martin&backgroundColor=b6e3f4" }} 
                style={styles.avatarImg} 
                resizeMode="cover"
              />
              <Pressable style={styles.editAvatarBtn}>
                <Ionicons name="pencil" size={10} color="white" />
              </Pressable>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{profileName}</Text>
              <Text style={styles.userDetail}>{profileAge} years . {profileLocation}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>14</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>47</Text>
              <Text style={styles.statLabel}>Memories</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>90</Text>
              <Text style={styles.statLabel}>Score</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>5</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* ── My Language ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Language</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageScroll}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang}
              onPress={() => setLanguage(lang)}
              style={[styles.languagePill, language === lang && styles.languagePillActive]}
            >
              <Text style={[styles.languageText, language === lang && styles.languageTextActive]}>
                {lang}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Text Size ── */}
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Text Size</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.textSizeInstruction}>Choose what is comfortable for your eyes</Text>
          <View style={styles.textSizeContainer}>
            {[{label:"Small", s:16}, {label:"Medium", s:18}, {label:"Large", s:20}, {label:"XL Large", s:24}].map((item) => (
              <Pressable
                key={item.label}
                onPress={() => setSelectedSize(item.label)}
                style={[styles.sizeBox, selectedSize === item.label && styles.sizeBoxActive]}
              >
                <Text style={[styles.sizeIcon, { fontSize: item.s }]}>A</Text>
                <Text style={styles.sizeLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── My Health Info ── */}
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My Health Info</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.rowItem}>
            <View style={styles.iconCircle}><Ionicons name="water-outline" size={18} color={C.white} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Blood Sugar Target</Text>
              <Text style={styles.itemSub}>Manage your target range</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </View>
          <View style={styles.itemDivider} />
          <View style={styles.rowItem}>
            <View style={styles.iconCircle}><Ionicons name="thermometer-outline" size={18} color={C.white} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Blood Pressure Target</Text>
              <Text style={styles.itemSub}>Set your normal range</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </View>
          <View style={styles.itemDivider} />
          <View style={styles.rowItem}>
            <View style={styles.iconCircle}><Ionicons name="person-outline" size={18} color={C.white} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>My Doctor</Text>
              <Text style={styles.itemSub}>Set your normal range</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </View>
        </View>

        {/* ── App Settings ── */}
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>App Settings</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.rowItem}>
            <View style={styles.iconCircle}><Ionicons name="notifications-outline" size={18} color={C.white} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Reminders & Alerts</Text>
              <Text style={styles.itemSub}>Medicine, Check-in, Games</Text>
            </View>
          </View>
          <View style={styles.itemDivider} />
          <View style={styles.rowItem}>
            <View style={styles.iconCircle}><Ionicons name="mic-outline" size={18} color={C.white} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Voice Navigation</Text>
              <Text style={styles.itemSub}>Navigate app by voice</Text>
            </View>
          </View>
          <View style={styles.itemDivider} />
          <View style={styles.rowItem}>
            <View style={styles.iconCircle}><Ionicons name="moon-outline" size={18} color={C.white} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Night Mode</Text>
              <Text style={styles.itemSub}>Easier on eyes at night</Text>
            </View>
          </View>
          <View style={styles.itemDivider} />
          <View style={styles.rowItem}>
            <View style={styles.iconCircle}><Ionicons name="sunny-outline" size={18} color={C.white} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Vibration Alerts</Text>
              <Text style={styles.itemSub}>Vibrate for important alerts</Text>
            </View>
          </View>
          <View style={styles.itemDivider} />
          <View style={styles.rowItem}>
            <View style={styles.iconCircle}><Ionicons name="lock-closed-outline" size={18} color={C.white} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Privacy & Data</Text>
              <Text style={styles.itemSub}>What Sathi collects</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </View>
        </View>

        {/* ── More ── */}
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>More</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.rowItem}>
            <View style={styles.iconCircle}><Ionicons name="information-circle-outline" size={18} color={C.white} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>About us</Text>
              <Text style={styles.itemSub}>Manage linked doctors</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </View>
          <View style={styles.itemDivider} />
          <View style={styles.rowItem}>
            <View style={styles.iconCircle}><Ionicons name="shield-outline" size={18} color={C.white} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Delete Account</Text>
              <Text style={styles.itemSub}>Data sharing preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </View>
          <View style={styles.itemDivider} />
          <Pressable style={styles.rowItem} onPress={() => logout()}>
            <View style={styles.iconCircle}><Ionicons name="log-out-outline" size={18} color={C.white} /></View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Log out</Text>
              <Text style={styles.itemSub}>Verdicts & reports</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#8D9CAE" />
          </Pressable>
        </View>

        {/* ── Your Plans ── */}
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Your Plans</Text>
        </View>
        <View style={styles.planCard}>
          <View style={styles.planBadgeActive}>
            <Text style={styles.planBadgeActiveText}>Active</Text>
          </View>
          
          <Text style={styles.planSubtitle}>Current Subscription</Text>
          <Text style={styles.planTitle}>Sathi Pro - ₹799/month</Text>
          <Text style={styles.planDesc}>Renews on 1 April 2026 . Auto-pay enabled</Text>
          
          <View style={styles.planDivider} />

          <View style={styles.planFeatures}>
            {["All 30 Features unlocked", "Unlimited Family members", "AI Health Watch 24/7", "WhatsApp bot in 6 Languages", "Priority caregiver support"].map((feature, i) => (
              <View key={i} style={styles.featureItem}>
                <Ionicons name="checkmark" size={16} color="#35C26B" style={{marginRight: 12}} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
          
          <LinearGradient colors={['#356D9A', '#53ADE1']} style={styles.planBtn} start={{x:0, y:0}} end={{x:1, y:0}}>
            <Text style={styles.planBtnText}>Password Reset</Text>
          </LinearGradient>
        </View>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingBottom: 64 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.0)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  headerTitle: { color: C.white, fontSize: 18, fontWeight: '800' },
  scrollSheet: {
    flex: 1,
    marginTop: -42,
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  
  topCard: {
    marginHorizontal: 0,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: C.white,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#E6EBF2',
  },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  avatarContainer: { marginRight: 14 },
  avatarImg: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#E2E8F0" },
  editAvatarBtn: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F45B69", 
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.white,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: "900", color: C.text, marginBottom: 4 },
  userDetail: { fontSize: 13, color: '#A3B1C6', fontWeight: "600" },
  
  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statCol: { alignItems: "center", flex: 1 },
  statVal: { fontSize: 20, fontWeight: "900", color: C.blue },
  statLabel: { fontSize: 11, fontWeight: "600", color: '#A3B1C6', marginTop: 6 },
  statDivider: { width: 1, height: 28, backgroundColor: '#E6EBF2' },

  sectionHeaderRow: { marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: C.text },

  languageScroll: { paddingHorizontal: 16, paddingBottom: 4 },
  languagePill: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 25,
    backgroundColor: C.white,
    marginRight: 10,
  },
  languagePillActive: { backgroundColor: '#3A5C97' },
  languageText: { fontSize: 13, fontWeight: "800", color: '#6A7E97' },
  languageTextActive: { color: C.white },

  card: {
    marginHorizontal: 16,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
  },
  textSizeInstruction: {
    fontSize: 13,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 20,
  },
  textSizeContainer: { flexDirection: "row", justifyContent: "space-between" },
  sizeBox: {
    flex: 0.23,
    aspectRatio: 0.75,
    borderRadius: 16,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6EBF2", 
  },
  sizeBoxActive: { borderColor: C.text },
  sizeIcon: { color: C.text, fontWeight: "900", marginBottom: 6 },
  sizeLabel: { fontSize: 11, fontWeight: "700", color: '#6A7E97' },

  rowItem: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.blueIcon,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "800", color: C.text, marginBottom: 2 },
  itemSub: { fontSize: 12, fontWeight: "600", color: '#D0D8E5' },
  itemDivider: {
    height: 1,
    backgroundColor: '#F5F7FA',
    marginVertical: 18,
    marginLeft: 52, 
  },

  planCard: {
    marginHorizontal: 16,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
    overflow: "hidden",
  },
  planBadgeActive: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#31C34A",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderBottomLeftRadius: 16,
  },
  planBadgeActiveText: { color: C.white, fontSize: 12, fontWeight: "900" },
  planSubtitle: { fontSize: 11, fontWeight: "700", color: C.text, marginBottom: 6 },
  planTitle: { fontSize: 19, fontWeight: "900", color: "#3B5A9F", marginBottom: 4 },
  planDesc: { fontSize: 11, fontWeight: "600", color: '#AAB4CB' },
  planDivider: { height: 1, backgroundColor: '#F5F7FA', marginTop: 18, marginBottom: 18 },
  planFeatures: { gap: 14, marginBottom: 28 },
  featureItem: { flexDirection: "row", alignItems: "center" },
  featureText: { fontSize: 12, color: '#323E4D', fontWeight: "700" },
  planBtn: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  planBtnText: { color: C.white, fontSize: 14, fontWeight: "900" },
});
