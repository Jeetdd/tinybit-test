import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Image,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp, FadeOutDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../utils/supabase";

const C = {
  navy:           "#1A2E6A",
  navyDark:       "#111D44",
  white:          "#FFFFFF",
  bg:             "#EEF2F7",
  muted:          "#8A9BB0",
  accent:         "#37B1E6",
  border:         "#E4EBF2",
  iconBg:         "#1B6EB5",
  bloodPinkBg:    "#FDEAF0",
  bloodPinkText:  "#E05A7A",
  prescGreenBg:   "#E6F9F1",
  prescGreenText: "#10B981",
  purpleBg:       "#EEE8FF",
  purpleText:     "#7C5CFC",
};

type HealthRecord = {
  id: string | number;
  title: string;
  date: string;
  timestamp: number;
  size: string;
  type: string;
  category: string;
  iconName: string;
  badgeBg: string;
  badgeColor: string;
  uri?: string;
  user_id?: string;
};

const DEFAULT_RECORDS: HealthRecord[] = [
  {
    id: 1,
    title: "Blood Sugar Report",
    date: "5 March 2026",
    timestamp: new Date("2026-03-05").getTime(),
    size: "1.2 MB",
    type: "Blood Test . AI Read",
    category: "Reports",
    iconName: "water",
    badgeBg: C.bloodPinkBg,
    badgeColor: C.bloodPinkText,
  },
  {
    id: 2,
    title: "Dr Mehta Prescription",
    date: "5 March 2026",
    timestamp: new Date("2026-03-05").getTime() - 1000,
    size: "1.2 MB",
    type: "Prescription . AI Read",
    category: "Prescriptions",
    iconName: "create-outline",
    badgeBg: C.prescGreenBg,
    badgeColor: C.prescGreenText,
  },
  {
    id: 3,
    title: "ECG Reports",
    date: "5 March 2026",
    timestamp: new Date("2026-03-05").getTime() - 2000,
    size: "1.2 MB",
    type: "Blood Test . AI Read",
    category: "Reports",
    iconName: "heart-outline",
    badgeBg: C.purpleBg,
    badgeColor: C.purpleText,
  },
];

const FILTERS = ["All", "Reports", "Prescriptions", "X-Rays", "Blood Tests"];
const FILTER_LABELS = ["All", "Reports", "Prescription", "X-Rays", "Blood Tests"];

function iconForCategory(cat: string) {
  switch (cat) {
    case "Reports":       return "water";
    case "Prescriptions": return "create-outline";
    case "X-Rays":        return "scan-outline";
    case "Blood Tests":   return "heart-outline";
    default:              return "document-text-outline";
  }
}
function badgeBgForCategory(cat: string) {
  switch (cat) {
    case "Reports":       return C.bloodPinkBg;
    case "Prescriptions": return C.prescGreenBg;
    case "X-Rays":        return "#F1F5F9";
    case "Blood Tests":   return C.bloodPinkBg;
    default:              return C.purpleBg;
  }
}
function badgeColorForCategory(cat: string) {
  switch (cat) {
    case "Reports":       return C.bloodPinkText;
    case "Prescriptions": return C.prescGreenText;
    case "X-Rays":        return "#64748B";
    case "Blood Tests":   return C.bloodPinkText;
    default:              return C.purpleText;
  }
}

export default function HealthVaultScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();

  const [activeFilter,         setActiveFilter]         = useState("All");
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isCategoryModal,      setIsCategoryModal]      = useState(false);
  const [selectedFile,         setSelectedFile]         = useState<any>(null);
  const [records,              setRecords]              = useState<HealthRecord[]>([]);

  useEffect(() => { loadRecords(); }, [user]);

  const loadRecords = async () => {
    try {
      let db: HealthRecord[] = [];
      if (user) {
        const { data, error } = await supabase
          .from("health_records")
          .select("*")
          .eq("user_id", user.id)
          .order("timestamp", { ascending: false });
        if (!error && data) db = data as HealthRecord[];
      }
      setRecords([...db, ...DEFAULT_RECORDS].sort((a, b) => b.timestamp - a.timestamp));
    } catch {
      setRecords(DEFAULT_RECORDS);
    }
  };

  const saveRecord = async (category: string) => {
    if (!selectedFile) return;
    try {
      const rec: HealthRecord = {
        id:         "rec_" + Date.now(),
        title:      selectedFile.name || "Health Record",
        date:       new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        timestamp:  Date.now(),
        size:       selectedFile.size ? (selectedFile.size / 1048576).toFixed(1) + " MB" : "0.5 MB",
        type:       category + " . AI Read",
        category,
        iconName:   iconForCategory(category),
        badgeBg:    badgeBgForCategory(category),
        badgeColor: badgeColorForCategory(category),
        uri:        selectedFile.uri,
      };
      if (user) await supabase.from("health_records").insert([{ ...rec, user_id: user.id }]);
      await loadRecords();
      setIsCategoryModal(false);
      setSelectedFile(null);
    } catch {
      Alert.alert("Error", "Could not save the record.");
    }
  };

  const handleCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return;
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 1 });
    if (!res.canceled && res.assets?.[0]) {
      setIsUploadModalVisible(false);
      setSelectedFile({ uri: res.assets[0].uri, name: "Scan_" + Date.now() });
      setIsCategoryModal(true);
    }
  };

  const handleGallery = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 1 });
    if (!res.canceled && res.assets?.[0]) {
      setIsUploadModalVisible(false);
      setSelectedFile({ uri: res.assets[0].uri, name: "Image_" + Date.now() });
      setIsCategoryModal(true);
    }
  };

  const handleFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"] });
      if (!res.canceled && res.assets?.[0]) {
        setIsUploadModalVisible(false);
        setSelectedFile({ uri: res.assets[0].uri, name: res.assets[0].name, size: res.assets[0].size });
        setIsCategoryModal(true);
      }
    } catch { /* cancelled */ }
  };

  const handleShare = async (r: HealthRecord) => {
    if (r.uri) await Sharing.shareAsync(r.uri);
    else Alert.alert("Notice", "Sharing not available for sample records.");
  };

  const filtered = activeFilter === "All" ? records : records.filter(r => r.category === activeFilter);

  const counts = {
    reports: records.filter(r => r.category === "Reports").length,
    presc:   records.filter(r => r.category === "Prescriptions").length,
    xray:    records.filter(r => r.category === "X-Rays").length,
    blood:   records.filter(r => r.category === "Blood Tests" || r.type.includes("Blood")).length,
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={["#1B3A5C", "#2B7FC0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.navyDark} />
        </Pressable>
        <Text style={s.headerTitle}>Health Vault</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary Card ── */}
        <Animated.View entering={FadeInDown.delay(80)} style={s.card}>
          <Text style={s.cardLabel}>Your Health Record</Text>
          <Text style={s.cardBig}>All Documents</Text>
          <Text style={s.cardSub}>
            {counts.reports + counts.presc + counts.xray} Memories shared . Family loves reading these
          </Text>

          <View style={s.statsRow}>
            <Stat n={counts.reports} label="Reports" />
            <View style={s.divider} />
            <Stat n={counts.presc}   label="Prescription" />
            <View style={s.divider} />
            <Stat n={counts.xray}    label="X-Rays" />
            <View style={s.divider} />
            <Stat n={counts.blood}   label="Blood Test" />
          </View>
        </Animated.View>

        {/* ── Scan Prescription Card ── */}
        <Animated.View entering={FadeInDown.delay(160)}>
          <Pressable onPress={() => setIsUploadModalVisible(true)} style={s.scanCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.scanLabel}>Your life story</Text>
              <Text style={s.scanTitle}>Scan Presciption</Text>
              <Text style={s.scanSub}>Take photo . AI reads it for you</Text>
            </View>
            <Image
              source={require("../../assets/images/ScanPrescrption.png")}
              style={s.scanImg}
              resizeMode="contain"
            />
          </Pressable>
        </Animated.View>

        {/* ── Filter Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          style={s.filterWrap}
        >
          {FILTERS.map((f, i) => (
            <Pressable
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[s.chip, activeFilter === f && s.chipActive]}
            >
              <Text style={[s.chipText, activeFilter === f && s.chipTextActive]}>
                {FILTER_LABELS[i]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Recent Records ── */}
        <View style={s.secHeader}>
          <Text style={s.secTitle}>Recent Records</Text>
          <Pressable><Text style={s.viewAll}>View all</Text></Pressable>
        </View>

        <View style={s.list}>
          {filtered.slice(0, 3).map((r, i) => (
            <Animated.View key={r.id.toString()} entering={FadeInDown.delay(240 + i * 70)} style={s.recCard}>
              {/* Row 1 */}
              <View style={s.recRow}>
                <View style={s.iconCircle}>
                  <Ionicons name={r.iconName as any} size={22} color={C.white} />
                </View>
                <View style={s.recMid}>
                  <Text style={s.recTitle}>{r.title}</Text>
                  <Text style={s.recDate}>{r.date}</Text>
                </View>
                <Pressable style={s.viewBtn}>
                  <Text style={s.viewBtnText}>View</Text>
                </Pressable>
              </View>
              {/* Row 2 */}
              <View style={s.recBottom}>
                <View style={[s.badge, { backgroundColor: r.badgeBg }]}>
                  <Text style={[s.badgeText, { color: r.badgeColor }]}>{r.type}</Text>
                </View>
                <Text style={s.recSize}>{r.size}</Text>
              </View>
            </Animated.View>
          ))}

          {filtered.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>No records in this category</Text>
            </View>
          )}
        </View>

        {/* ── Share Records ── */}
        <View style={[s.secHeader, { marginTop: 4 }]}>
          <Text style={s.secTitle}>Share Records</Text>
        </View>

        <Animated.View
          entering={FadeInDown.delay(520)}
          style={[s.recCard, { marginHorizontal: 16, marginBottom: 12 }]}
        >
          <View style={s.recRow}>
            <View style={s.iconCircle}>
              <Ionicons name="arrow-up-circle-outline" size={22} color={C.white} />
            </View>
            <View style={s.recMid}>
              <Text style={s.recTitle}>Share with Dr Mehta</Text>
              <Text style={s.recDate}>Next Apointment :- 14 th March 26</Text>
            </View>
            <Pressable
              style={s.shareBtn}
              onPress={() => records.length > 0 ? handleShare(records[0]) : Alert.alert("Vault Empty", "No records to share.")}
            >
              <Text style={s.shareBtnText}>Share</Text>
            </Pressable>
          </View>
          <View style={s.recBottom}>
            <View style={[s.badge, { backgroundColor: C.purpleBg }]}>
              <Text style={[s.badgeText, { color: C.purpleText }]}>Blood Test . AI Read</Text>
            </View>
            <Text style={s.recSize}>1.2 MB</Text>
          </View>
        </Animated.View>

      </ScrollView>

      {/* ── Upload Modal ── */}
      <Modal
        visible={isUploadModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsUploadModalVisible(false)}
      >
        <Pressable style={s.overlay} onPress={() => setIsUploadModalVisible(false)}>
          <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Upload Document</Text>
            <Text style={s.sheetSub}>Choose a source for your record</Text>
            <View style={s.sheetOptions}>
              <UploadRow icon="camera"        label="Take Photo"          sub="Use camera to scan"       color="#5CB8B2" onPress={handleCamera}  />
              <UploadRow icon="images"        label="Upload from Gallery" sub="Choose from your photos"  color={C.accent} onPress={handleGallery} />
              <UploadRow icon="document-text" label="Choose File"         sub="Select a PDF or document" color="#F4A46A" onPress={handleFile}    />
            </View>
            <Pressable style={s.cancelBtn} onPress={() => setIsUploadModalVisible(false)}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ── Category Modal ── */}
      <Modal
        visible={isCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCategoryModal(false)}
      >
        <View style={s.overlay}>
          <Animated.View entering={FadeInUp} style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Select Report Type</Text>
            <Text style={s.sheetSub}>Which category does this belong to?</Text>
            <View style={s.sheetOptions}>
              {FILTERS.filter(f => f !== "All").map(cat => (
                <Pressable key={cat} style={s.catRow} onPress={() => saveRecord(cat)}>
                  <View style={[s.catIcon, { backgroundColor: badgeBgForCategory(cat) }]}>
                    <Ionicons name={iconForCategory(cat) as any} size={20} color={badgeColorForCategory(cat)} />
                  </View>
                  <Text style={s.catLabel}>{cat}</Text>
                  <Ionicons name="chevron-forward" size={18} color={C.muted} />
                </Pressable>
              ))}
            </View>
            <Pressable style={s.cancelBtn} onPress={() => setIsCategoryModal(false)}>
              <Text style={s.cancelText}>Back</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statN}>{n}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function UploadRow({ icon, label, sub, color, onPress }: any) {
  return (
    <Pressable style={s.uploadRow} onPress={onPress}>
      <View style={[s.uploadIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={s.uploadLabel}>{label}</Text>
        <Text style={s.uploadSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </Pressable>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.white,
  },

  scroll: { paddingTop: 16 },

  /* Summary Card */
  card: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 22,
    padding: 20,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)",
    elevation: 3,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.muted,
  },
  cardBig: {
    fontSize: 30,
    fontWeight: "900",
    color: C.navyDark,
    marginTop: 4,
  },
  cardSub: {
    fontSize: 12,
    fontWeight: "500",
    color: C.muted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  statItem: { flex: 1, alignItems: "center" },
  statN: {
    fontSize: 22,
    fontWeight: "900",
    color: C.accent,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.muted,
    marginTop: 3,
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: "#D8E4EC",
  },

  /* Scan Card */
  scanCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 22,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    boxShadow: "0px 2px 12px rgba(0,0,0,0.07)",
    elevation: 3,
  },
  scanLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.muted,
  },
  scanTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: C.accent,
    marginTop: 4,
  },
  scanSub: {
    fontSize: 12,
    fontWeight: "500",
    color: C.muted,
    marginTop: 4,
  },
  scanImg: {
    width: 88,
    height: 88,
  },

  /* Filter Chips */
  filterWrap: { marginBottom: 20 },
  filterRow:  { paddingHorizontal: 16, gap: 10 },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: "#D4DCE8",
  },
  chipActive:     { backgroundColor: "#1A2E6A", borderColor: "#1A2E6A" },
  chipText:       { fontSize: 14, fontWeight: "700", color: C.muted },
  chipTextActive: { color: C.white },

  /* Section Header */
  secHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  secTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111D44",
  },
  viewAll: {
    fontSize: 14,
    fontWeight: "700",
    color: C.accent,
  },

  /* Record Cards */
  list: { paddingHorizontal: 16, gap: 12, marginBottom: 24 },
  recCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    boxShadow: "0px 1px 8px rgba(0,0,0,0.06)",
    elevation: 2,
  },

  /* Row 1 inside card */
  recRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.iconBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recMid:   { flex: 1 },
  recTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111D44",
  },
  recDate: {
    fontSize: 12,
    fontWeight: "500",
    color: C.muted,
    marginTop: 2,
  },

  viewBtn: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.white,
  },

  shareBtn: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.white,
  },

  /* Row 2 inside card */
  recBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingLeft: 60,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  recSize: {
    fontSize: 12,
    fontWeight: "600",
    color: C.muted,
  },

  emptyBox:  { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center" },

  /* Modal */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.40)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
  },
  handle: {
    width: 38,
    height: 5,
    backgroundColor: "#D8E4EC",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111D44",
    textAlign: "center",
  },
  sheetSub: {
    fontSize: 13,
    fontWeight: "500",
    color: C.muted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  sheetOptions: { gap: 12, marginBottom: 18 },

  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  uploadIcon:  {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadLabel: { fontSize: 15, fontWeight: "800", color: "#111D44" },
  uploadSub:   { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 2 },

  catRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  catIcon:  {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  catLabel: { flex: 1, fontSize: 15, fontWeight: "800", color: "#111D44" },

  cancelBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "800", color: C.muted },
});
