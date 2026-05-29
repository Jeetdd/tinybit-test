import { useState, useEffect, useCallback } from "react";
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
  ActivityIndicator,
  Linking,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp, FadeOutDown } from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../utils/supabase";
import { API_BASE_URL } from "../../config/api";
import { notifyGuardiansOf, notifyElderOf } from "../../services/notifications";
import CountryPickerModal from "../../components/CountryPickerModal";
import { DEFAULT_COUNTRY, type Country } from "../../constants/countries";

const C = {
  navy:           "#1A2E6A",
  navyDark:       "#111D44",
  white:          "#FFFFFF",
  bg:             "#EEF2F7",
  muted:          "#8A9BB0",
  accent:         "#37B1E6",
  border:         "#E4EBF2",
  bloodPinkBg:    "#FDEAF0",
  bloodPinkText:  "#E05A7A",
  prescGreenBg:   "#E6F9F1",
  prescGreenText: "#10B981",
  purpleBg:       "#EEE8FF",
  purpleText:     "#7C5CFC",
  xrayBg:         "#F1F5F9",
  xrayText:       "#64748B",
};

type HealthRecord = {
  id: string;
  title: string;
  date: string;
  timestamp: number;
  size: string;
  type: string;
  category: string;
  icon_name: string;
  badge_bg: string;
  badge_color: string;
  uri?: string;
  mime_type?: string | null;
  user_id?: string;
  ai_read?: boolean;
};

type Doctor = {
  name: string;
  phone: string | null;
};

type ForecastMetric = {
  name: string;
  value: string;
  status: 'normal' | 'low' | 'high' | 'borderline';
  normalRange: string;
  insight: string;
};

type ForecastResult = {
  reportType: string;
  summary: string;
  alertLevel: 'normal' | 'caution' | 'alert';
  metrics: ForecastMetric[];
  riskFactors: string[];
  recommendations: string[];
  followUp: string;
};

type FileInfo = { uri: string; name: string; size?: number; mimeType?: string };

const CATEGORIES = ["Reports", "Prescriptions", "X-Rays"] as const;
type Category = typeof CATEGORIES[number];

const FILTERS = ["All", ...CATEGORIES];
const FILTER_LABELS = ["All", "Reports", "Prescription", "X-Rays"];

function iconForCategory(cat: string): string {
  switch (cat) {
    case "Reports":       return "document-text-outline";
    case "Prescriptions": return "create-outline";
    case "X-Rays":        return "scan-outline";
    default:              return "document-text-outline";
  }
}
function badgeBgForCategory(cat: string): string {
  switch (cat) {
    case "Reports":       return C.purpleBg;
    case "Prescriptions": return C.prescGreenBg;
    case "X-Rays":        return C.xrayBg;
    default:              return C.purpleBg;
  }
}
function badgeColorForCategory(cat: string): string {
  switch (cat) {
    case "Reports":       return C.purpleText;
    case "Prescriptions": return C.prescGreenText;
    case "X-Rays":        return C.xrayText;
    default:              return C.purpleText;
  }
}

async function callAnalyzeReport(
  base64: string,
  mimeType: string,
  token: string,
): Promise<{ isReport: boolean; category: Category | null } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/analyze-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ base64, mimeType }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

function alertBannerStyle(level: 'normal' | 'caution' | 'alert') {
  if (level === 'alert')   return { backgroundColor: '#FDE8EC' };
  if (level === 'caution') return { backgroundColor: '#FEF3CD' };
  return { backgroundColor: '#E6F9F1' };
}
function alertBannerTextColor(level: 'normal' | 'caution' | 'alert') {
  if (level === 'alert')   return '#E05A7A';
  if (level === 'caution') return '#B45309';
  return C.prescGreenText;
}
function metricStatusColor(status: string) {
  if (status === 'high')       return '#E05A7A';
  if (status === 'low')        return '#F4A46A';
  if (status === 'borderline') return '#FBBF24';
  return C.prescGreenText;
}

export default function HealthVaultScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const params   = useLocalSearchParams<{ elderId?: string; elderName?: string }>();

  // When a guardian navigates here with ?elderId=xxx, all DB ops target that elder
  const targetUserId = (params.elderId as string | undefined) ?? user?.id;
  const isGuardianView = !!params.elderId;
  const elderName = params.elderName as string | undefined;

  const [activeFilter,     setActiveFilter]     = useState("All");
  const [dateFilter,       setDateFilter]       = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [masterFilterOpen, setMasterFilterOpen] = useState(false);
  // Temp state held while the master-filter sheet is open
  const [tempCategory,     setTempCategory]     = useState("All");
  const [tempDate,         setTempDate]         = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [records,          setRecords]          = useState<HealthRecord[]>([]);
  const [doctors,          setDoctors]          = useState<Doctor[]>([]);
  const [loadingRecords,   setLoadingRecords]   = useState(false);

  // Upload flow
  const [isUploadModal,    setIsUploadModal]    = useState(false);
  const [aiLoading,        setAiLoading]        = useState(false);
  const [notReportModal,   setNotReportModal]   = useState(false);

  // View record
  const [viewingRecord,    setViewingRecord]    = useState<HealthRecord | null>(null);

  // Edit record
  const [editingRecord,    setEditingRecord]    = useState<HealthRecord | null>(null);
  const [editTitle,        setEditTitle]        = useState('');
  const [editCategory,     setEditCategory]     = useState<Category>('Reports');
  const [savingEdit,       setSavingEdit]       = useState(false);

  // Health forecast
  const [forecastRecord,  setForecastRecord]  = useState<HealthRecord | null>(null);
  const [forecastResult,  setForecastResult]  = useState<ForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastModal,   setForecastModal]   = useState(false);

  // Share to doctor
  const [sharePickerModal, setSharePickerModal] = useState(false);
  const [sharingDoctor,    setSharingDoctor]    = useState<Doctor | null>(null);

  // Add doctor
  const [addDoctorModal,     setAddDoctorModal]     = useState(false);
  const [newDoctorName,      setNewDoctorName]      = useState('');
  const [newDoctorPhone,     setNewDoctorPhone]     = useState('');
  const [doctorCountry,      setDoctorCountry]      = useState<Country>(DEFAULT_COUNTRY);
  const [countryPickerOpen,  setCountryPickerOpen]  = useState(false);
  const [savingDoctor,       setSavingDoctor]        = useState(false);

  useEffect(() => {
    void loadAll();

    if (!targetUserId) return;

    const channel = supabase
      .channel(`health-records-${targetUserId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'health_records', filter: `user_id=eq.${targetUserId}` },
        () => { void loadRecords(); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user, targetUserId]);

  const loadAll = useCallback(async () => {
    setLoadingRecords(true);
    try {
      await Promise.all([loadRecords(), loadDoctors()]);
    } finally {
      setLoadingRecords(false);
    }
  }, [user, targetUserId]);

  const loadRecords = async () => {
    if (!targetUserId) return;
    const { data, error } = await supabase
      .from("health_records")
      .select("*")
      .eq("user_id", targetUserId)
      .order("timestamp", { ascending: false });
    if (!error && data) setRecords(data as HealthRecord[]);
  };

  const loadDoctors = async () => {
    if (!targetUserId) return;
    const seen = new Set<string>();
    const result: Doctor[] = [];

    const [medsRes, docRes] = await Promise.all([
      supabase.from("medicines").select("prescribed_by, doctor_phone").eq("user_id", targetUserId).not("prescribed_by", "is", null),
      supabase.from("user_doctors").select("name, phone").eq("user_id", targetUserId),
    ]);

    for (const row of (medsRes.data ?? []) as any[]) {
      if (row.prescribed_by && !seen.has(row.prescribed_by)) {
        seen.add(row.prescribed_by);
        result.push({ name: row.prescribed_by, phone: row.doctor_phone ?? null });
      }
    }
    for (const row of (docRes.data ?? []) as any[]) {
      if (row.name && !seen.has(row.name)) {
        seen.add(row.name);
        result.push({ name: row.name, phone: row.phone ?? null });
      }
    }
    setDoctors(result);
  };

  const handleAddDoctor = async () => {
    if (!newDoctorName.trim() || !targetUserId) return;
    setSavingDoctor(true);
    try {
      const phone = newDoctorPhone.trim()
        ? `${doctorCountry.dial}${newDoctorPhone.trim()}`
        : null;
      const { error } = await supabase.from("user_doctors").insert({
        user_id: targetUserId,
        name: newDoctorName.trim(),
        phone,
      });
      if (error) {
        Alert.alert("Could not save doctor", error.message);
        return;
      }
      setNewDoctorName('');
      setNewDoctorPhone('');
      setAddDoctorModal(false);
      await loadDoctors();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Something went wrong");
    } finally {
      setSavingDoctor(false);
    }
  };

  // ── Core save ──────────────────────────────────────────────────

  const saveRecord = async (file: FileInfo, category: Category) => {
    if (!targetUserId) return;

    // Upload to Supabase Storage so the file is accessible cross-device
    let storageUri = file.uri;
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${targetUserId}/${Date.now()}_${safeName}`;
      const mimeType = file.mimeType ?? 'application/octet-stream';

      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('health-records')
        .upload(storagePath, blob, { contentType: mimeType, upsert: false });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('health-records')
          .getPublicUrl(storagePath);
        storageUri = urlData.publicUrl;
      }
    } catch {
      // Fall back to local URI silently
    }

    const rec = {
      user_id:     targetUserId,
      title:       file.name.replace(/_\d+$/, "").replace(/_/g, " ") || "Health Record",
      date:        new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      timestamp:   Date.now(),
      size:        file.size ? (file.size / 1048576).toFixed(1) + " MB" : "—",
      type:        category,
      category,
      icon_name:   iconForCategory(category),
      badge_bg:    badgeBgForCategory(category),
      badge_color: badgeColorForCategory(category),
      uri:         storageUri,
      mime_type:   file.mimeType ?? null,
      ai_read:     true,
    };
    const { error } = await supabase.from("health_records").insert([rec]);
    if (error) {
      Alert.alert("Error", `Could not save the record: ${error.message}`);
      return;
    }
    await loadRecords();

    // Notify the other party (non-blocking)
    if (user?.id) {
      const recTitle = rec.title;
      if (isGuardianView && targetUserId) {
        // Guardian uploaded for elder → notify elder
        notifyElderOf(
          targetUserId, user.id,
          'health_record_uploaded',
          '📁 New Health Record',
          `Your guardian added "${recTitle}" to your Health Vault`,
        );
      } else {
        // Elder uploaded their own record → notify guardians
        notifyGuardiansOf(
          user.id, user.id,
          'health_record_uploaded',
          '📁 Health Record Uploaded',
          `${profile?.firstName || 'Your elder'} added "${recTitle}" to their Health Vault`,
        );
      }
    }
  };

  const deleteRecord = (r: HealthRecord) => {
    Alert.alert("Delete Record", `Remove "${r.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await supabase.from("health_records").delete().eq("id", r.id).eq("user_id", targetUserId ?? "");
          await loadRecords();
        },
      },
    ]);
  };

  const openEdit = (r: HealthRecord) => {
    setEditingRecord(r);
    setEditTitle(r.title);
    setEditCategory((r.category as Category) ?? 'Reports');
  };

  const handleEditSave = async () => {
    if (!editingRecord || !editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const cat = editCategory;
      const { error } = await supabase
        .from("health_records")
        .update({
          title:       editTitle.trim(),
          category:    cat,
          type:        cat,
          icon_name:   iconForCategory(cat),
          badge_bg:    badgeBgForCategory(cat),
          badge_color: badgeColorForCategory(cat),
        })
        .eq("id", editingRecord.id)
        .eq("user_id", targetUserId ?? "");
      if (error) { Alert.alert("Error", error.message); return; }
      setEditingRecord(null);
      await loadRecords();
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Upload handlers ────────────────────────────────────────────

  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  // For images: AI detects category automatically, no user prompt
  const processImage = async (uri: string, name: string, base64: string, mimeType: string) => {
    setIsUploadModal(false);
    setAiLoading(true);

    const token = await getToken();
    const aiResult = token ? await callAnalyzeReport(base64, mimeType, token) : null;

    if (!aiResult) {
      setAiLoading(false);
      Alert.alert("AI Unavailable", "Could not analyze the document. Please check your connection and try again.");
      return;
    }

    if (!aiResult.isReport) {
      setAiLoading(false);
      setNotReportModal(true);
      return;
    }

    // Keep overlay visible during storage upload
    const category: Category = aiResult.category ?? "Reports";
    await saveRecord({ uri, name, mimeType }, category);
    setAiLoading(false);
  };

  const handleCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return;
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7, base64: true });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      if (!a.base64) return;
      await processImage(a.uri, "Scan_" + Date.now(), a.base64, a.mimeType ?? "image/jpeg");
    }
  };

  const handleGallery = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.7, base64: true });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      if (!a.base64) return;
      await processImage(a.uri, "Image_" + Date.now(), a.base64, a.mimeType ?? "image/jpeg");
    }
  };

  const handleFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"] });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        setIsUploadModal(false);
        setAiLoading(true);

        let base64: string | null = null;
        try {
          base64 = await FileSystem.readAsStringAsync(a.uri, { encoding: 'base64' as any });
        } catch { /* unreadable file, skip AI */ }

        if (base64) {
          const token = await getToken();
          const aiResult = token
            ? await callAnalyzeReport(base64, a.mimeType ?? "application/pdf", token)
            : null;

          if (!aiResult) {
            setAiLoading(false);
            Alert.alert("AI Unavailable", "Could not analyze the document. Please check your connection and try again.");
            return;
          }
          if (!aiResult.isReport) {
            setAiLoading(false);
            setNotReportModal(true);
            return;
          }
          // Keep overlay visible during storage upload
          await saveRecord(
            { uri: a.uri, name: a.name, size: a.size ?? undefined, mimeType: a.mimeType ?? "application/pdf" },
            aiResult.category ?? "Reports",
          );
          setAiLoading(false);
        } else {
          // Keep overlay visible during storage upload
          await saveRecord(
            { uri: a.uri, name: a.name, size: a.size ?? undefined, mimeType: a.mimeType ?? "application/pdf" },
            "Reports",
          );
          setAiLoading(false);
        }
      }
    } catch { /* cancelled */ }
  };

  // ── View ───────────────────────────────────────────────────────

  const handleView = (r: HealthRecord) => {
    if (!r.uri) { Alert.alert("Not Available", "This record has no file attached."); return; }

    const mime = r.mime_type ?? "";
    const isImage =
      mime.startsWith("image/") ||
      (!mime && (
        r.uri.includes("ImagePicker") ||
        r.uri.includes("Camera") ||
        /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(r.uri)
      ));

    if (isImage) {
      setViewingRecord(r);
    } else {
      // Try to open with device's native viewer first, fall back to share sheet
      Linking.canOpenURL(r.uri).then((can) => {
        if (can) {
          Linking.openURL(r.uri!).catch(() => Alert.alert('Cannot Open', 'Unable to open this file'));
        } else {
          Sharing.shareAsync(r.uri!).catch(() =>
            Alert.alert("Cannot Open", "Unable to open this file on your device.")
          );
        }
      }).catch(() => {
        Sharing.shareAsync(r.uri!).catch(() =>
          Alert.alert("Cannot Open", "Unable to open this file on your device.")
        );
      });
    }
  };

  // ── Health Forecast ───────────────────────────────────────────

  const handleGetForecast = async (r: HealthRecord) => {
    if (!r.uri) { Alert.alert("No File", "This record has no file to analyse."); return; }
    setForecastRecord(r);
    setForecastResult(null);
    setForecastModal(true);
    setForecastLoading(true);

    try {
      const token = await getToken();
      if (!token) { setForecastLoading(false); return; }

      // Read the file as base64.
      // Remote URLs: fetch → ArrayBuffer → btoa (no file-system dependency, works reliably).
      // Local device URIs: use expo-file-system/legacy readAsStringAsync.
      let base64 = '';
      const isRemote = r.uri.startsWith('http://') || r.uri.startsWith('https://');
      if (isRemote) {
        const dlResp = await fetch(r.uri);
        if (!dlResp.ok) throw new Error(`Could not download the document (HTTP ${dlResp.status}). Try uploading again.`);
        const buffer = await dlResp.arrayBuffer();
        const bytes  = new Uint8Array(buffer);
        // Build binary string in chunks to avoid call-stack overflow on large files
        const CHUNK  = 4096;
        let binary   = '';
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
        }
        base64 = btoa(binary);
      } else {
        base64 = await (FileSystem as any).readAsStringAsync(r.uri, { encoding: 'base64' });
      }

      if (!base64 || base64.length < 100) {
        Alert.alert("Read Error", "Could not read the file content. Try uploading this record again.");
        setForecastModal(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/ai/health-forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          base64,
          mimeType: r.mime_type ?? 'image/jpeg',
          category: r.category,
          title:    r.title,
        }),
      });

      // Guard against HTML error pages (e.g. server not restarted yet)
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch {
        Alert.alert("Server Error", "Could not reach the AI service. Please restart the backend server and try again.");
        setForecastModal(false);
        return;
      }

      if (json?.data) setForecastResult(json.data as ForecastResult);
      else Alert.alert("AI Unavailable", json?.message ?? "Could not analyse this report. Please try again.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Something went wrong");
    } finally {
      setForecastLoading(false);
    }
  };

  // ── Share ──────────────────────────────────────────────────────

  const handleShareToDoctor = (doctor: Doctor) => {
    if (records.length === 0) { Alert.alert("No Records", "Upload a report first to share."); return; }
    setSharingDoctor(doctor);
    setSharePickerModal(true);
  };

  const handleShareRecord = async (r: HealthRecord) => {
    setSharePickerModal(false);
    if (!r.uri) { Alert.alert("No File", "This record has no file to share."); return; }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(r.uri, { dialogTitle: `Share with ${sharingDoctor?.name ?? "Doctor"}` });
    } else {
      Alert.alert(
        "Share",
        `Doctor: ${sharingDoctor?.name}\nPhone: ${sharingDoctor?.phone ?? "N/A"}\n\nSharing not supported on this device.`,
      );
    }
    setSharingDoctor(null);
  };

  // ── Derived ────────────────────────────────────────────────────

  const filtered = records.filter(r => {
    const catMatch = activeFilter === "All" || r.category === activeFilter;

    let dateMatch = true;
    if (dateFilter !== 'all') {
      const now = Date.now();
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      if (dateFilter === 'today') {
        dateMatch = r.timestamp >= startOfToday.getTime();
      } else if (dateFilter === 'week') {
        dateMatch = r.timestamp >= now - 7 * 24 * 60 * 60 * 1000;
      } else if (dateFilter === 'month') {
        const som = new Date(); som.setDate(1); som.setHours(0, 0, 0, 0);
        dateMatch = r.timestamp >= som.getTime();
      }
    }
    return catMatch && dateMatch;
  });

  const hasActiveFilters = activeFilter !== "All" || dateFilter !== 'all';

  const openMasterFilter = () => {
    setTempCategory(activeFilter);
    setTempDate(dateFilter);
    setMasterFilterOpen(true);
  };

  const applyMasterFilter = () => {
    setActiveFilter(tempCategory);
    setDateFilter(tempDate);
    setMasterFilterOpen(false);
  };

  const resetMasterFilter = () => {
    setTempCategory("All");
    setTempDate('all');
    setActiveFilter("All");
    setDateFilter('all');
    setMasterFilterOpen(false);
  };

  const counts = {
    reports: records.filter(r => r.category === "Reports").length,
    presc:   records.filter(r => r.category === "Prescriptions").length,
    xray:    records.filter(r => r.category === "X-Rays").length,
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={["#1B3A5C", "#2B7FC0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.navyDark} />
        </Pressable>
        <View>
          <Text style={s.headerTitle}>Health Vault</Text>
          {isGuardianView && elderName ? (
            <Text style={s.headerSub}>{elderName}</Text>
          ) : null}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary Card ── */}
        <Animated.View entering={FadeInDown.delay(80)} style={s.card}>
          <Text style={s.cardLabel}>{isGuardianView ? `${elderName ?? "Elder"}'s Records` : "Your Health Records"}</Text>
          <Text style={s.cardBig}>All Documents</Text>
          <Text style={s.cardSub}>
            {counts.reports + counts.presc + counts.xray} records stored safely
          </Text>
          <View style={s.statsRow}>
            <Stat n={counts.reports} label="Reports" />
            <View style={s.divider} />
            <Stat n={counts.presc}   label="Prescription" />
            <View style={s.divider} />
            <Stat n={counts.xray}    label="X-Rays" />
          </View>
        </Animated.View>

        {/* ── Scan Card ── */}
        <Animated.View entering={FadeInDown.delay(160)}>
          <Pressable onPress={() => setIsUploadModal(true)} style={s.scanCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.scanLabel}>Your health story</Text>
              <Text style={s.scanTitle}>Scan Prescription</Text>
              <Text style={s.scanSub}>Take photo · AI reads & sorts it for you</Text>
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

        {/* ── Records ── */}
        <View style={s.secHeader}>
          <View>
            <Text style={s.secTitle}>Recent Records</Text>
            {hasActiveFilters && (
              <Text style={s.filterActive}>
                {activeFilter !== "All" ? activeFilter : "All categories"}
                {dateFilter !== 'all' ? ` · ${dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'This Week' : 'This Month'}` : ''}
              </Text>
            )}
          </View>
          <Pressable onPress={openMasterFilter} style={[s.filterBtn, hasActiveFilters && s.filterBtnActive]}>
            <Ionicons name="options-outline" size={16} color={hasActiveFilters ? C.white : C.navy} />
            <Text style={[s.filterBtnText, hasActiveFilters && s.filterBtnTextActive]}>Filter</Text>
            {hasActiveFilters && <View style={s.filterDot} />}
          </Pressable>
        </View>

        <View style={s.list}>
          {loadingRecords ? (
            <ActivityIndicator color={C.accent} style={{ paddingVertical: 32 }} />
          ) : filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="folder-open-outline" size={48} color={C.muted} />
              <Text style={s.emptyText}>No records yet</Text>
              <Text style={s.emptySubText}>Tap "Scan Prescription" above to add your first document</Text>
            </View>
          ) : (
            filtered.map((r, i) => (
              <Animated.View key={r.id} entering={FadeInDown.delay(240 + i * 60)} style={s.recCard}>
                <View style={s.recRow}>
                  <View style={[s.iconCircle, { backgroundColor: badgeBgForCategory(r.category) }]}>
                    <Ionicons name={(r.icon_name || "document-text-outline") as any} size={22} color={badgeColorForCategory(r.category)} />
                  </View>
                  <View style={s.recMid}>
                    <Text style={s.recTitle} numberOfLines={1}>{r.title}</Text>
                    <Text style={s.recDate}>{r.date}</Text>
                  </View>
                  <View style={s.recActions}>
                    <Pressable hitSlop={8} style={s.actionIconBtn} onPress={() => handleView(r)}>
                      <Ionicons name="eye-outline" size={24} color={C.accent} />
                    </Pressable>
                    <Pressable hitSlop={8} style={s.actionIconBtn} onPress={() => openEdit(r)}>
                      <Ionicons name="create-outline" size={22} color="#F4A46A" />
                    </Pressable>
                    <Pressable hitSlop={8} style={s.actionIconBtn} onPress={async () => {
                      if (!r.uri) { Alert.alert("No File", "This record has no file to share."); return; }
                      const ok = await Sharing.isAvailableAsync();
                      if (ok) Sharing.shareAsync(r.uri);
                      else Alert.alert("Sharing not supported on this device.");
                    }}>
                      <Ionicons name="share-outline" size={24} color={C.accent} />
                    </Pressable>
                    <Pressable onPress={() => deleteRecord(r)} hitSlop={8} style={s.actionIconBtn}>
                      <Ionicons name="trash-outline" size={24} color="#E05A7A" />
                    </Pressable>
                  </View>
                </View>
                <View style={s.recBottom}>
                  <View style={[s.badge, { backgroundColor: r.badge_bg || badgeBgForCategory(r.category) }]}>
                    <Text style={[s.badgeText, { color: r.badge_color || badgeColorForCategory(r.category) }]}>
                      {r.category}{r.ai_read ? " · AI Read" : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleGetForecast(r)} style={s.insightBtn}>
                    <Ionicons name="sparkles" size={12} color={C.white} />
                    <Text style={s.insightBtnText}>AI Insights</Text>
                  </Pressable>
                  <Text style={s.recSize}>{r.size}</Text>
                </View>
              </Animated.View>
            ))
          )}
        </View>

        {/* ── My Doctors ── */}
        <>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>My Doctors</Text>
            <Pressable onPress={() => setAddDoctorModal(true)}>
              <Text style={s.secSub}>+ Add Doctor</Text>
            </Pressable>
          </View>
          {doctors.length > 0 && (
            <View style={[s.list, { marginTop: 0 }]}>
              {doctors.map((doc, i) => (
                <Animated.View key={doc.name} entering={FadeInDown.delay(300 + i * 60)} style={s.recCard}>
                  <View style={s.recRow}>
                    <View style={[s.iconCircle, { backgroundColor: C.prescGreenBg }]}>
                      <Ionicons name="person-outline" size={22} color={C.prescGreenText} />
                    </View>
                    <View style={s.recMid}>
                      <Text style={s.recTitle}>{doc.name}</Text>
                      {doc.phone ? (
                        <Pressable onPress={() => Linking.openURL(`tel:${doc.phone}`).catch(() => {})}>
                          <Text style={[s.recDate, { color: C.accent }]}>{doc.phone} · tap to call</Text>
                        </Pressable>
                      ) : (
                        <Text style={s.recDate}>No phone saved</Text>
                      )}
                    </View>
                    <Pressable style={s.shareBtn} onPress={() => handleShareToDoctor(doc)}>
                      <Ionicons name="share-outline" size={14} color={C.white} />
                      <Text style={s.shareBtnText}>Share</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </>
      </ScrollView>

      {/* ── AI Loading Overlay ── */}
      {aiLoading && (
        <View style={s.aiOverlay}>
          <View style={s.aiCard}>
            <ActivityIndicator color={C.accent} size="large" />
            <Text style={s.aiLoadingText}>Saving your document…</Text>
            <Text style={s.aiLoadingSub}>AI reads, categorises & uploads to cloud</Text>
          </View>
        </View>
      )}

      {/* ── Upload Modal ── */}
      <Modal
        visible={isUploadModal}
        transparent
        animationType="fade"
        onRequestClose={() => setIsUploadModal(false)}
      >
        <Pressable style={s.overlay} onPress={() => setIsUploadModal(false)}>
          <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Upload Document</Text>
            <Text style={s.sheetSub}>AI will auto-detect and save the category for you</Text>
            <View style={s.sheetOptions}>
              <UploadRow icon="camera"        label="Take Photo"          sub="Scan with camera · AI reads it"  color="#5CB8B2" onPress={handleCamera}  />
              <UploadRow icon="images"        label="Upload from Gallery" sub="Choose from your photos"          color={C.accent} onPress={handleGallery} />
              <UploadRow icon="document-text" label="Choose File"         sub="Select a PDF or document"         color="#F4A46A" onPress={handleFile}    />
            </View>
            <Pressable style={s.cancelBtn} onPress={() => setIsUploadModal(false)}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ── Not a Report Modal ── */}
      <Modal
        visible={notReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setNotReportModal(false)}
      >
        <Pressable style={s.overlay} onPress={() => setNotReportModal(false)}>
          <Animated.View entering={FadeInUp} style={s.sheet}>
            <View style={s.handle} />
            <View style={s.notReportIcon}>
              <Ionicons name="alert-circle-outline" size={48} color="#F4A46A" />
            </View>
            <Text style={s.sheetTitle}>Not a Medical Document</Text>
            <Text style={s.sheetSub}>
              This doesn't look like a medical report.{"\n"}
              Please upload a prescription, blood test result, X-ray, or medical report.
            </Text>
            <View style={{ gap: 12, marginTop: 8 }}>
              <Pressable
                style={[s.cancelBtn, { backgroundColor: C.accent }]}
                onPress={() => { setNotReportModal(false); setIsUploadModal(true); }}
              >
                <Text style={[s.cancelText, { color: C.white }]}>Try Again</Text>
              </Pressable>
              <Pressable style={s.cancelBtn} onPress={() => setNotReportModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ── View Record Modal (images) ── */}
      <Modal
        visible={!!viewingRecord}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingRecord(null)}
      >
        <View style={s.viewOverlay}>
          <Pressable style={s.viewClose} onPress={() => setViewingRecord(null)}>
            <Ionicons name="close" size={28} color={C.white} />
          </Pressable>
          {viewingRecord?.uri && (
            <Image
              source={{ uri: viewingRecord.uri }}
              style={s.viewImage}
              resizeMode="contain"
            />
          )}
          <Text style={s.viewCaption}>{viewingRecord?.title}</Text>
          <Text style={s.viewDate}>{viewingRecord?.date}</Text>
        </View>
      </Modal>

      {/* ── Share Record Picker Modal ── */}
      <Modal
        visible={sharePickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setSharePickerModal(false); setSharingDoctor(null); }}
      >
        <View style={s.overlay}>
          <Animated.View entering={FadeInUp} style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Share with {sharingDoctor?.name}</Text>
            <Text style={s.sheetSub}>Choose which record to send</Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                {records.map(r => (
                  <Pressable key={r.id} style={s.shareRecRow} onPress={() => handleShareRecord(r)}>
                    <View style={[s.shareRecIcon, { backgroundColor: badgeBgForCategory(r.category) }]}>
                      <Ionicons name={(r.icon_name || "document-text-outline") as any} size={20} color={badgeColorForCategory(r.category)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.shareRecTitle} numberOfLines={1}>{r.title}</Text>
                      <Text style={s.shareRecDate}>{r.date}</Text>
                    </View>
                    <Ionicons name="share-outline" size={18} color={C.accent} />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable style={[s.cancelBtn, { marginTop: 12 }]} onPress={() => { setSharePickerModal(false); setSharingDoctor(null); }}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Add Doctor Modal ── */}
      <Modal
        visible={addDoctorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddDoctorModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* dim backdrop — only above the sheet so it never blocks sheet touches */}
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.40)' }}
            onPress={() => setAddDoctorModal(false)}
          />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Add Doctor</Text>
            <Text style={s.sheetSub}>Doctor will appear in My Doctors for quick sharing</Text>
            <View style={{ gap: 12, marginBottom: 8 }}>
              <TextInput
                style={s.doctorInput}
                placeholder="Doctor Name  e.g. Dr. Mehta"
                placeholderTextColor={C.muted}
                value={newDoctorName}
                onChangeText={setNewDoctorName}
                returnKeyType="next"
              />
              <View style={s.doctorPhoneRow}>
                <Pressable
                  style={s.doctorDialBtn}
                  onPress={() => setCountryPickerOpen(true)}
                  hitSlop={8}
                >
                  <Text style={s.doctorDialFlag}>{doctorCountry.flag}</Text>
                  <Text style={s.doctorDialCode}>{doctorCountry.dial}</Text>
                  <Ionicons name="chevron-down" size={13} color={C.muted} />
                </Pressable>
                <View style={s.doctorPhoneDivider} />
                <TextInput
                  style={s.doctorPhoneInput}
                  placeholder="Phone number (optional)"
                  placeholderTextColor={C.muted}
                  keyboardType="phone-pad"
                  value={newDoctorPhone}
                  onChangeText={setNewDoctorPhone}
                  returnKeyType="done"
                />
              </View>
            </View>
            <Pressable
              style={[s.cancelBtn, { backgroundColor: newDoctorName.trim() ? C.navy : '#D0D8E4' }]}
              onPress={handleAddDoctor}
              disabled={!newDoctorName.trim() || savingDoctor}
            >
              <Text style={[s.cancelText, { color: newDoctorName.trim() ? C.white : C.muted }]}>
                {savingDoctor ? 'Saving…' : 'Add Doctor'}
              </Text>
            </Pressable>
            <Pressable style={[s.cancelBtn, { marginTop: 8 }]} onPress={() => setAddDoctorModal(false)}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          <CountryPickerModal
            visible={countryPickerOpen}
            onSelect={(c) => { setDoctorCountry(c); setCountryPickerOpen(false); }}
            onClose={() => setCountryPickerOpen(false)}
            showDial
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Health Forecast Modal ── */}
      <Modal
        visible={forecastModal}
        transparent
        animationType="slide"
        onRequestClose={() => setForecastModal(false)}
      >
        <View style={s.overlay}>
          <Animated.View entering={FadeInUp} style={[s.sheet, { maxHeight: '90%' }]}>
            <View style={s.handle} />

            {/* Header */}
            <View style={s.forecastHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>AI Health Insights</Text>
                {forecastRecord && (
                  <Text style={s.forecastRecordName} numberOfLines={1}>{forecastRecord.title}</Text>
                )}
              </View>
              <Pressable onPress={() => setForecastModal(false)} style={s.forecastClose}>
                <Ionicons name="close" size={20} color={C.muted} />
              </Pressable>
            </View>

            {forecastLoading ? (
              <View style={s.forecastLoading}>
                <ActivityIndicator size="large" color={C.accent} />
                <Text style={s.forecastLoadingText}>Analysing your report…</Text>
                <Text style={s.forecastLoadingSub}>AI is reading and extracting health data</Text>
              </View>
            ) : forecastResult ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 4 }}>
                {/* Alert Level Banner */}
                <View style={[s.alertBanner, alertBannerStyle(forecastResult.alertLevel)]}>
                  <Ionicons
                    name={forecastResult.alertLevel === 'alert' ? 'warning' : forecastResult.alertLevel === 'caution' ? 'alert-circle' : 'checkmark-circle'}
                    size={18}
                    color={alertBannerTextColor(forecastResult.alertLevel)}
                  />
                  <Text style={[s.alertBannerText, { color: alertBannerTextColor(forecastResult.alertLevel) }]}>
                    {forecastResult.alertLevel === 'alert' ? 'Needs Attention' : forecastResult.alertLevel === 'caution' ? 'Some Values to Watch' : 'All Looking Good'}
                  </Text>
                  <View style={[s.reportTypeBadge, { backgroundColor: C.purpleBg }]}>
                    <Text style={[s.reportTypeText, { color: C.purpleText }]}>{forecastResult.reportType}</Text>
                  </View>
                </View>

                {/* Summary */}
                <Text style={s.forecastSummary}>{forecastResult.summary}</Text>

                {/* Metrics */}
                {forecastResult.metrics.length > 0 && (
                  <>
                    <Text style={s.forecastSectionTitle}>Health Metrics</Text>
                    <View style={s.metricsGrid}>
                      {forecastResult.metrics.map((m, idx) => (
                        <View key={idx} style={[s.metricCard, { borderLeftColor: metricStatusColor(m.status) }]}>
                          <View style={s.metricRow}>
                            <Text style={s.metricName}>{m.name}</Text>
                            <View style={[s.metricStatusBadge, { backgroundColor: metricStatusColor(m.status) + '22' }]}>
                              <Text style={[s.metricStatusText, { color: metricStatusColor(m.status) }]}>
                                {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                              </Text>
                            </View>
                          </View>
                          <Text style={s.metricValue}>{m.value}</Text>
                          <Text style={s.metricRange}>Normal: {m.normalRange}</Text>
                          <Text style={s.metricInsight}>{m.insight}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* Risk Factors */}
                {forecastResult.riskFactors.length > 0 && (
                  <>
                    <Text style={s.forecastSectionTitle}>Risk Factors</Text>
                    <View style={s.forecastList}>
                      {forecastResult.riskFactors.map((rf, idx) => (
                        <View key={idx} style={s.forecastListItem}>
                          <Ionicons name="alert-circle-outline" size={15} color="#F4A46A" style={{ marginTop: 1 }} />
                          <Text style={s.forecastListText}>{rf}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* Recommendations */}
                {forecastResult.recommendations.length > 0 && (
                  <>
                    <Text style={s.forecastSectionTitle}>Recommendations</Text>
                    <View style={s.forecastList}>
                      {forecastResult.recommendations.map((rec, idx) => (
                        <View key={idx} style={s.forecastListItem}>
                          <Ionicons name="checkmark-circle-outline" size={15} color={C.prescGreenText} style={{ marginTop: 1 }} />
                          <Text style={s.forecastListText}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* Follow-up */}
                {!!forecastResult.followUp && (
                  <View style={s.followUpCard}>
                    <Ionicons name="calendar-outline" size={18} color={C.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.followUpLabel}>Follow-up</Text>
                      <Text style={s.followUpText}>{forecastResult.followUp}</Text>
                    </View>
                  </View>
                )}

                <Text style={s.aiDisclaimer}>
                  AI-generated insights are for informational purposes only. Always consult your doctor for medical decisions.
                </Text>
                <View style={{ height: 16 }} />
              </ScrollView>
            ) : null}

            {!forecastLoading && (
              <Pressable style={[s.cancelBtn, { marginTop: 12 }]} onPress={() => setForecastModal(false)}>
                <Text style={s.cancelText}>Close</Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* ── Master Filter Modal ── */}
      <Modal
        visible={masterFilterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMasterFilterOpen(false)}
      >
        <View style={s.overlay}>
          <Animated.View entering={FadeInUp} style={s.sheet}>
            <View style={s.handle} />
            <View style={s.filterModalHeader}>
              <Text style={s.sheetTitle}>Filter Records</Text>
              <Pressable onPress={resetMasterFilter}>
                <Text style={s.resetText}>Reset All</Text>
              </Pressable>
            </View>
            <Text style={s.filterSectionLabel}>Category</Text>
            <View style={s.filterChipRow}>
              {FILTERS.map((f, i) => (
                <Pressable
                  key={f}
                  onPress={() => setTempCategory(f)}
                  style={[s.chip, tempCategory === f && s.chipActive, { marginBottom: 8 }]}
                >
                  <Text style={[s.chipText, tempCategory === f && s.chipTextActive]}>
                    {FILTER_LABELS[i]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[s.filterSectionLabel, { marginTop: 8 }]}>Date Range</Text>
            <View style={s.filterChipRow}>
              {([
                ['all',   'All Time'],
                ['today', 'Today'],
                ['week',  'This Week'],
                ['month', 'This Month'],
              ] as const).map(([val, label]) => (
                <Pressable
                  key={val}
                  onPress={() => setTempDate(val)}
                  style={[s.chip, tempDate === val && s.chipActive, { marginBottom: 8 }]}
                >
                  <Text style={[s.chipText, tempDate === val && s.chipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={s.filterModalFooter}>
              <Pressable style={s.cancelBtn} onPress={() => setMasterFilterOpen(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.cancelBtn, { backgroundColor: C.navy, flex: 1.5 }]} onPress={applyMasterFilter}>
                <Text style={[s.cancelText, { color: C.white }]}>Apply Filter</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Edit Record Modal ── */}
      <Modal
        visible={!!editingRecord}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingRecord(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.40)' }}
            onPress={() => setEditingRecord(null)}
          />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Edit Record</Text>
            <Text style={s.sheetSub}>Update the title or category</Text>

            <TextInput
              style={[s.doctorInput, { marginBottom: 12 }]}
              placeholder="Record title"
              placeholderTextColor={C.muted}
              value={editTitle}
              onChangeText={setEditTitle}
              returnKeyType="done"
            />

            <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted, marginBottom: 8 }}>Category</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {(CATEGORIES as readonly Category[]).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setEditCategory(cat)}
                  style={[
                    s.chip,
                    { flex: 1, justifyContent: 'center' },
                    editCategory === cat && s.chipActive,
                  ]}
                >
                  <Text style={[s.chipText, { textAlign: 'center' }, editCategory === cat && s.chipTextActive]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[s.cancelBtn, { backgroundColor: editTitle.trim() ? C.navy : '#D0D8E4', marginBottom: 8 }]}
              onPress={handleEditSave}
              disabled={!editTitle.trim() || savingEdit}
            >
              <Text style={[s.cancelText, { color: editTitle.trim() ? C.white : C.muted }]}>
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </Text>
            </Pressable>
            <Pressable style={s.cancelBtn} onPress={() => setEditingRecord(null)}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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

function UploadRow({ icon, label, sub, color, onPress }: { icon: string; label: string; sub: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={s.uploadRow} onPress={onPress}>
      <View style={[s.uploadIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={22} color={color} />
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

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingBottom: 18, gap: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.white, justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: C.white },
  headerSub:   { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.75)", marginTop: 2 },

  scroll: { paddingTop: 16 },

  card: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 14,
    borderRadius: 22, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  cardLabel: { fontSize: 13, fontWeight: "600", color: C.muted },
  cardBig:   { fontSize: 30, fontWeight: "900", color: C.navyDark, marginTop: 4 },
  cardSub:   { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 4 },
  statsRow:  { flexDirection: "row", alignItems: "center", marginTop: 20 },
  statItem:  { flex: 1, alignItems: "center" },
  statN:     { fontSize: 22, fontWeight: "900", color: C.accent },
  statLabel: { fontSize: 10, fontWeight: "600", color: C.muted, marginTop: 3, textAlign: "center" },
  divider:   { width: 1, height: 36, backgroundColor: "#D8E4EC" },

  scanCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 18,
    borderRadius: 22, padding: 20,
    flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  scanLabel: { fontSize: 13, fontWeight: "600", color: C.muted },
  scanTitle: { fontSize: 24, fontWeight: "900", color: C.accent, marginTop: 4 },
  scanSub:   { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 4 },
  scanImg:   { width: 88, height: 88 },

  filterWrap: { marginBottom: 20 },
  filterRow:  { paddingHorizontal: 16, gap: 10 },
  chip: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: "#D4DCE8",
  },
  chipActive:     { backgroundColor: C.navy, borderColor: C.navy },
  chipText:       { fontSize: 14, fontWeight: "700", color: C.muted },
  chipTextActive: { color: C.white },

  secHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, marginBottom: 12, marginTop: 4,
  },
  secTitle: { fontSize: 18, fontWeight: "900", color: C.navyDark },
  secSub:   { fontSize: 13, fontWeight: "600", color: C.accent },

  list: { paddingHorizontal: 16, gap: 12, marginBottom: 24 },
  recCard: {
    backgroundColor: C.white, borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  recRow:     { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginRight: 12 },
  recMid:     { flex: 1 },
  recTitle:   { fontSize: 15, fontWeight: "800", color: C.navyDark },
  recDate:    { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 2 },
  recActions: { flexDirection: "row", alignItems: "center" },

  actionIconBtn: { padding: 6, marginLeft: 4 },

  shareBtn:     { backgroundColor: C.navy, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 24, flexDirection: "row", alignItems: "center", gap: 5 },
  shareBtnText: { fontSize: 13, fontWeight: "800", color: C.white },

  recBottom: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 12, paddingLeft: 60,
  },
  badge:     { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  recSize:   { fontSize: 12, fontWeight: "600", color: C.muted },

  emptyBox:     { padding: 40, alignItems: "center", gap: 8 },
  emptyText:    { fontSize: 16, fontWeight: "800", color: C.navyDark },
  emptySubText: { fontSize: 13, color: C.muted, textAlign: "center" },

  aiOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center", alignItems: "center",
  },
  aiCard: {
    backgroundColor: C.white, borderRadius: 24, padding: 32,
    alignItems: "center", gap: 12, marginHorizontal: 40,
  },
  aiLoadingText: { fontSize: 17, fontWeight: "800", color: C.navyDark, textAlign: "center" },
  aiLoadingSub:  { fontSize: 13, fontWeight: "500", color: C.muted, textAlign: "center" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.40)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.white, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 22, paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
  },
  handle:    { width: 38, height: 5, backgroundColor: "#D8E4EC", borderRadius: 3, alignSelf: "center", marginBottom: 18 },
  sheetTitle:{ fontSize: 20, fontWeight: "900", color: C.navyDark, textAlign: "center" },
  sheetSub:  { fontSize: 13, fontWeight: "500", color: C.muted, textAlign: "center", marginTop: 4, marginBottom: 20 },
  sheetOptions: { gap: 12, marginBottom: 18 },

  uploadRow:   { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  uploadIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  uploadLabel: { fontSize: 15, fontWeight: "800", color: C.navyDark },
  uploadSub:   { fontSize: 12, fontWeight: "500", color: C.muted, marginTop: 2 },

  cancelBtn:  { height: 52, borderRadius: 16, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "800", color: C.muted },

  notReportIcon: { alignItems: "center", marginBottom: 4 },

  shareRecRow:   { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, gap: 14 },
  shareRecIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  shareRecTitle: { fontSize: 15, fontWeight: "800", color: C.navyDark },
  shareRecDate:  { fontSize: 11, color: C.muted, marginTop: 2 },

  viewOverlay: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  viewClose: {
    position: "absolute", top: 56, right: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  viewImage:   { width: "100%", height: "75%" },
  viewCaption: { marginTop: 16, fontSize: 16, fontWeight: "800", color: C.white, textAlign: "center", paddingHorizontal: 20 },
  viewDate:    { marginTop: 4, fontSize: 13, color: "#aaa", textAlign: "center" },

  doctorInput: {
    backgroundColor: C.bg, borderRadius: 14, height: 50,
    paddingHorizontal: 16, fontSize: 15, fontWeight: "600" as const, color: C.navyDark,
    borderWidth: 1, borderColor: C.border,
  },
  doctorPhoneRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.bg, borderRadius: 14, height: 50,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12,
  },
  doctorDialBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingRight: 8,
  },
  doctorDialFlag: { fontSize: 20 },
  doctorDialCode: { fontSize: 13, fontWeight: "700" as const, color: C.navyDark },
  doctorPhoneDivider: { width: 1, height: 26, backgroundColor: C.border, marginRight: 10 },
  doctorPhoneInput: {
    flex: 1, fontSize: 15, fontWeight: "600" as const, color: C.navyDark,
  },

  filterBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.navy, backgroundColor: C.white,
  },
  filterBtnActive:    { backgroundColor: C.navy, borderColor: C.navy },
  filterBtnText:      { fontSize: 13, fontWeight: "700" as const, color: C.navy },
  filterBtnTextActive:{ color: C.white },
  filterDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.accent, marginLeft: 2,
  },
  filterActive: { fontSize: 11, fontWeight: "600" as const, color: C.accent, marginTop: 2 },

  filterModalHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 4,
  },
  resetText: { fontSize: 14, fontWeight: "700" as const, color: "#E05A7A" },
  filterSectionLabel: {
    fontSize: 13, fontWeight: "700" as const, color: C.muted,
    marginBottom: 10, marginTop: 18,
  },
  filterChipRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
  },
  filterModalFooter: {
    flexDirection: "row", gap: 10, marginTop: 20,
  },

  insightBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.navy, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
  },
  insightBtnText: { fontSize: 11, fontWeight: "700" as const, color: C.white },

  // Forecast modal
  forecastHeader: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 12,
  },
  forecastRecordName: { fontSize: 12, color: C.muted, fontWeight: "500" as const, marginTop: 2 },
  forecastClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.bg, justifyContent: "center", alignItems: "center", marginLeft: 8,
  },
  forecastLoading: {
    paddingVertical: 48, alignItems: "center", gap: 12,
  },
  forecastLoadingText: { fontSize: 16, fontWeight: "800" as const, color: C.navyDark },
  forecastLoadingSub:  { fontSize: 13, color: C.muted, textAlign: "center" },

  alertBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 16, padding: 14, marginBottom: 12,
  },
  alertBannerText: { fontSize: 14, fontWeight: "800" as const, flex: 1 },
  reportTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  reportTypeText:  { fontSize: 11, fontWeight: "700" as const },

  forecastSummary: {
    fontSize: 14, fontWeight: "500" as const, color: C.navyDark,
    lineHeight: 21, marginBottom: 16,
  },
  forecastSectionTitle: {
    fontSize: 14, fontWeight: "900" as const, color: C.navyDark,
    marginBottom: 10, marginTop: 4,
  },
  metricsGrid: { gap: 10, marginBottom: 16 },
  metricCard: {
    backgroundColor: C.bg, borderRadius: 16, padding: 14,
    borderLeftWidth: 4,
  },
  metricRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  metricName:        { fontSize: 13, fontWeight: "800" as const, color: C.navyDark, flex: 1 },
  metricStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  metricStatusText:  { fontSize: 11, fontWeight: "700" as const },
  metricValue:       { fontSize: 16, fontWeight: "900" as const, color: C.navyDark, marginBottom: 2 },
  metricRange:       { fontSize: 11, color: C.muted, fontWeight: "500" as const, marginBottom: 4 },
  metricInsight:     { fontSize: 12, color: "#5A6A7E", fontWeight: "500" as const, lineHeight: 17 },

  forecastList: { gap: 8, marginBottom: 16 },
  forecastListItem: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: C.bg, borderRadius: 14, padding: 12,
  },
  forecastListText: { flex: 1, fontSize: 13, fontWeight: "500" as const, color: C.navyDark, lineHeight: 19 },

  followUpCard: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
    backgroundColor: "#EBF6FF", borderRadius: 16, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: "#BAE3F9",
  },
  followUpLabel: { fontSize: 12, fontWeight: "700" as const, color: C.accent, marginBottom: 2 },
  followUpText:  { fontSize: 13, fontWeight: "500" as const, color: C.navyDark, lineHeight: 19 },

  aiDisclaimer: {
    fontSize: 11, color: C.muted, textAlign: "center",
    fontStyle: "italic", marginTop: 4, lineHeight: 16,
  },
});
