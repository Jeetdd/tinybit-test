import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import CountryPickerModal from "../../components/CountryPickerModal";
import { DEFAULT_COUNTRY, type Country } from "../../constants/countries";
import { supabase } from "../../utils/supabase";
import { useAuth } from "../../context/AuthContext";
import { useLanguage, type Language } from "../../context/LanguageContext";

type Medication = { id: number; name: string; dosage: string; timing: string };

type CondKey =
  | "none" | "diabetes" | "pre_diabetes" | "cholesterol" | "hypertension"
  | "pcos" | "thyroid" | "physical_injury" | "stress_anxiety"
  | "sleep_issues" | "depression" | "anger_issues" | "loneliness"
  | "relationship_stress" | "others";

type Condition = { key: CondKey; fullRow?: boolean };

const CONDITIONS: Condition[] = [
  { key: "none",               fullRow: true },
  { key: "diabetes" },         { key: "pre_diabetes" },
  { key: "cholesterol" },      { key: "hypertension" },
  { key: "pcos" },             { key: "thyroid" },
  { key: "physical_injury",   fullRow: true },
  { key: "stress_anxiety",    fullRow: true },
  { key: "sleep_issues" },     { key: "depression" },
  { key: "anger_issues" },     { key: "loneliness" },
  { key: "relationship_stress", fullRow: true },
  { key: "others",             fullRow: true },
];

// Pre-compute rows — static, never changes
const ROWS: Condition[][] = (() => {
  const result: Condition[][] = [];
  let i = 0;
  while (i < CONDITIONS.length) {
    if (CONDITIONS[i].fullRow) { result.push([CONDITIONS[i]]); i++; }
    else if (i + 1 < CONDITIONS.length && !CONDITIONS[i + 1].fullRow) {
      result.push([CONDITIONS[i], CONDITIONS[i + 1]]); i += 2;
    } else { result.push([CONDITIONS[i]]); i++; }
  }
  return result;
})();

type ScreenT = {
  title: string; subtitle: string;
  conditionsLabel: string; medicationsLabel: string; addMedication: string;
  medName: string; dosage: string; timing: string;
  doctorName: string; doctorContact: string;
  next: string; saving: string;
  othersPlaceholder: string;
  conditions: Record<CondKey, string>;
};

const T: Partial<Record<Language, ScreenT>> = {
  English: {
    title: "Medical Information",
    subtitle: "Help us understand your health better so we can support you more effectively.",
    conditionsLabel: "Any Medical Conditions?",
    medicationsLabel: "Current Medications",
    addMedication: "+ Add Medication",
    medName: "Medicine Name", dosage: "Dosage (e.g. 500mg)", timing: "Timing (e.g. Morning)",
    doctorName: "Doctor's Name", doctorContact: "Doctor's Contact Number",
    next: "Next", saving: "Saving...",
    othersPlaceholder: "Describe your condition (e.g. ABSIA, joint pain...)",
    conditions: {
      none: "None", diabetes: "Diabetes", pre_diabetes: "Pre-Diabetes",
      cholesterol: "Cholesterol", hypertension: "Hypertension",
      pcos: "PCOS", thyroid: "Thyroid", physical_injury: "Physical Injury",
      stress_anxiety: "Excessive stress/anxiety", sleep_issues: "Sleep issues",
      depression: "Depression", anger_issues: "Anger issues",
      loneliness: "Loneliness", relationship_stress: "Relationship stress",
      others: "Others",
    },
  },
  "हिंदी": {
    title: "चिकित्सा जानकारी",
    subtitle: "आपके स्वास्थ्य को बेहतर समझने में हमारी मदद करें।",
    conditionsLabel: "कोई स्वास्थ्य समस्या?",
    medicationsLabel: "वर्तमान दवाएं", addMedication: "+ दवा जोड़ें",
    medName: "दवा का नाम", dosage: "खुराक (जैसे 500mg)", timing: "समय (जैसे सुबह)",
    doctorName: "डॉक्टर का नाम", doctorContact: "डॉक्टर का नंबर",
    next: "आगे", saving: "सहेजा जा रहा है...",
    othersPlaceholder: "अपनी स्थिति बताएं...",
    conditions: {
      none: "कोई नहीं", diabetes: "मधुमेह", pre_diabetes: "प्री-डायबिटीज",
      cholesterol: "कोलेस्ट्रॉल", hypertension: "उच्च रक्तचाप",
      pcos: "पीसीओएस", thyroid: "थायराइड", physical_injury: "शारीरिक चोट",
      stress_anxiety: "अत्यधिक तनाव/चिंता", sleep_issues: "नींद की समस्या",
      depression: "अवसाद", anger_issues: "क्रोध की समस्या",
      loneliness: "अकेलापन", relationship_stress: "संबंध तनाव",
      others: "अन्य",
    },
  },
  "ગુજરાતી": {
    title: "તબીબી માહિતી",
    subtitle: "તમારા સ્વાસ્થ્યને વધુ સારી રીતે સમજવામાં અમારી મદદ કરો.",
    conditionsLabel: "કોઈ સ્વાસ્થ્ય સ્થિતિ?",
    medicationsLabel: "વર્તમાન દવાઓ", addMedication: "+ દવા ઉમેરો",
    medName: "દવાનું નામ", dosage: "ડોઝ (દા.ત. 500mg)", timing: "સમય (દા.ત. સવારે)",
    doctorName: "ડૉક્ટરનું નામ", doctorContact: "ડૉક્ટરનો નંબર",
    next: "આગળ", saving: "સાચવી રહ્યા છીએ...",
    othersPlaceholder: "તમારી સ્થિતિ વર્ણવો...",
    conditions: {
      none: "કોઈ નહીં", diabetes: "ડાયાબિટીસ", pre_diabetes: "પ્રી-ડાયાબિટીસ",
      cholesterol: "કોલેસ્ટ્રોલ", hypertension: "હાઈ બ્લડ પ્રેશર",
      pcos: "પીસીઓએસ", thyroid: "થાઇરોઇડ", physical_injury: "શારીરિક ઈજા",
      stress_anxiety: "વધુ પડતો તણાવ/ચિંતા", sleep_issues: "ઊંઘની સમસ્યા",
      depression: "ડિપ્રેશન", anger_issues: "ગુસ્સાની સમસ્યા",
      loneliness: "એકલતા", relationship_stress: "સંબંધ તણાવ",
      others: "અન્ય",
    },
  },
  "தமிழ்": {
    title: "மருத்துவ தகவல்",
    subtitle: "உங்கள் ஆரோக்கியத்தை நன்கு புரிந்துகொள்ள உதவுங்கள்.",
    conditionsLabel: "ஏதேனும் மருத்துவ நிலை?",
    medicationsLabel: "தற்போதைய மருந்துகள்", addMedication: "+ மருந்து சேர்",
    medName: "மருந்து பெயர்", dosage: "அளவு (எ.கா. 500mg)", timing: "நேரம் (எ.கா. காலை)",
    doctorName: "மருத்துவர் பெயர்", doctorContact: "மருத்துவர் தொடர்பு எண்",
    next: "அடுத்து", saving: "சேமிக்கிறது...",
    othersPlaceholder: "உங்கள் நிலையை விவரிக்கவும்...",
    conditions: {
      none: "எதுவும் இல்லை", diabetes: "நீரிழிவு", pre_diabetes: "முன்-நீரிழிவு",
      cholesterol: "கொலஸ்ட்ரால்", hypertension: "உயர் இரத்த அழுத்தம்",
      pcos: "பிசிஓஎஸ்", thyroid: "தைராய்டு", physical_injury: "உடல் காயம்",
      stress_anxiety: "அதிகப்படியான மன அழுத்தம்", sleep_issues: "தூக்க பிரச்சனைகள்",
      depression: "மனச்சோர்வு", anger_issues: "கோப பிரச்சனைகள்",
      loneliness: "தனிமை", relationship_stress: "உறவு மன அழுத்தம்",
      others: "மற்றவை",
    },
  },
  "বাংলা": {
    title: "চিকিৎসা তথ্য",
    subtitle: "আপনার স্বাস্থ্য আরও ভালোভাবে বুঝতে আমাদের সাহায্য করুন।",
    conditionsLabel: "কোনো চিকিৎসা অবস্থা?",
    medicationsLabel: "বর্তমান ওষুধ", addMedication: "+ ওষুধ যোগ করুন",
    medName: "ওষুধের নাম", dosage: "ডোজ (যেমন 500mg)", timing: "সময় (যেমন সকাল)",
    doctorName: "ডাক্তারের নাম", doctorContact: "ডাক্তারের নম্বর",
    next: "পরবর্তী", saving: "সংরক্ষণ হচ্ছে...",
    othersPlaceholder: "আপনার অবস্থা বর্ণনা করুন...",
    conditions: {
      none: "কোনোটি নয়", diabetes: "ডায়াবেটিস", pre_diabetes: "প্রি-ডায়াবেটিস",
      cholesterol: "কোলেস্টেরল", hypertension: "উচ্চ রক্তচাপ",
      pcos: "পিসিওএস", thyroid: "থাইরয়েড", physical_injury: "শারীরিক আঘাত",
      stress_anxiety: "অতিরিক্ত চাপ/উদ্বেগ", sleep_issues: "ঘুমের সমস্যা",
      depression: "বিষণ্নতা", anger_issues: "রাগের সমস্যা",
      loneliness: "একাকীত্ব", relationship_stress: "সম্পর্কের চাপ",
      others: "অন্যান্য",
    },
  },
  "मराठी": {
    title: "वैद्यकीय माहिती",
    subtitle: "आपले आरोग्य अधिक चांगले समजण्यासाठी आम्हाला मदत करा.",
    conditionsLabel: "कोणतीही वैद्यकीय स्थिती?",
    medicationsLabel: "सध्याची औषधे", addMedication: "+ औषध जोडा",
    medName: "औषधाचे नाव", dosage: "मात्रा (उदा. 500mg)", timing: "वेळ (उदा. सकाळी)",
    doctorName: "डॉक्टरचे नाव", doctorContact: "डॉक्टरचा नंबर",
    next: "पुढे", saving: "जतन होत आहे...",
    othersPlaceholder: "तुमची स्थिती सांगा...",
    conditions: {
      none: "काहीही नाही", diabetes: "मधुमेह", pre_diabetes: "प्री-डायबेटिस",
      cholesterol: "कोलेस्टेरॉल", hypertension: "उच्च रक्तदाब",
      pcos: "पीसीओएस", thyroid: "थायरॉइड", physical_injury: "शारीरिक दुखापत",
      stress_anxiety: "अत्याधिक ताण/चिंता", sleep_issues: "झोपेच्या समस्या",
      depression: "नैराश्य", anger_issues: "रागाच्या समस्या",
      loneliness: "एकटेपणा", relationship_stress: "नातेसंबंध ताण",
      others: "इतर",
    },
  },
};

// ── Medication card extracted + memoized so only the changed card re-renders ──
type MedCardProps = {
  med: Medication;
  index: number;
  labels: Pick<ScreenT, "medName" | "dosage" | "timing">;
  onUpdate: (id: number, field: keyof Omit<Medication, "id">, value: string) => void;
  onRemove: (id: number) => void;
};

const MedicationCard = memo(function MedicationCard({
  med, index, labels, onUpdate, onRemove,
}: MedCardProps) {
  return (
    <View style={styles.medCard}>
      <View style={styles.medCardHeader}>
        <Text style={styles.medCardNum}>#{index + 1}</Text>
        <Pressable onPress={() => onRemove(med.id)} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color="#E53E3E" />
        </Pressable>
      </View>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder={labels.medName}
          placeholderTextColor="#B0BBC8"
          value={med.name}
          onChangeText={(v) => onUpdate(med.id, "name", v)}
        />
      </View>
      <View style={styles.medRow}>
        <View style={[styles.inputBox, { flex: 1 }]}>
          <TextInput
            style={styles.input}
            placeholder={labels.dosage}
            placeholderTextColor="#B0BBC8"
            value={med.dosage}
            onChangeText={(v) => onUpdate(med.id, "dosage", v)}
          />
        </View>
        <View style={[styles.inputBox, { flex: 1 }]}>
          <TextInput
            style={styles.input}
            placeholder={labels.timing}
            placeholderTextColor="#B0BBC8"
            value={med.timing}
            onChangeText={(v) => onUpdate(med.id, "timing", v)}
          />
        </View>
      </View>
    </View>
  );
});

export default function MedicalScreen() {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { refreshProfile, user, profile } = useAuth();
  const { language } = useLanguage();

  // Memoize translation lookup — only recomputes when language changes
  const t = useMemo(() => (T[language] ?? T.English) as ScreenT, [language]);

  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [otherText,   setOtherText]   = useState("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [docName,     setDocName]     = useState("");
  const [docContact,  setDocContact]  = useState("");
  const [docCountry,  setDocCountry]  = useState<Country>(DEFAULT_COUNTRY);
  const [docPickerVisible, setDocPickerVisible] = useState(false);
  const [loading,     setLoading]     = useState(false);

  // Stable id counter for medication items — avoids index-as-key issues
  const nextId = useRef(0);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (key === "none") return next.has("none") ? new Set() : new Set(["none"]);
      next.delete("none");
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const addMedication = useCallback(() => {
    const id = nextId.current++;
    setMedications((prev) => [...prev, { id, name: "", dosage: "", timing: "" }]);
  }, []);

  // Keyed by stable id — only the changed card re-renders
  const updateMedication = useCallback(
    (id: number, field: keyof Omit<Medication, "id">, value: string) =>
      setMedications((prev) =>
        prev.map((m) => m.id === id ? { ...m, [field]: value } : m)
      ),
    []
  );

  const removeMedication = useCallback(
    (id: number) => setMedications((prev) => prev.filter((m) => m.id !== id)),
    []
  );

  const medLabels = useMemo(
    () => ({ medName: t.medName, dosage: t.dosage, timing: t.timing }),
    [t]
  );

  const canNext = selected.size > 0;

  const handleNext = async () => {
    if (!canNext) return;
    
    console.log('[DEBUG] handleNext starting. User:', user?.id);
    
    // Dismiss keyboard immediately to prevent layout shifts during navigation
    Keyboard.dismiss();
    
    setLoading(true);
    try {
      if (user) {
        console.log('[DEBUG] Upserting profile for user:', user.id);
        // Use upsert to ensure the row exists (PostgREST MERGE behavior).
        // Include 'role' and 'id' to be absolutely sure the record is valid.
        const { error } = await supabase.from("profiles").upsert({
          id:                 user.id,
          medical_conditions: Array.from(selected),
          other_condition:    selected.has("others") ? otherText.trim() : "",
          medications:        medications.filter((m) => m.name.trim()),
          doctor_name:        docName.trim(),
          doctor_contact:     docContact.trim() ? `${docCountry.dial} ${docContact.trim()}` : "",
        }, { onConflict: "id" });
        
        if (error) {
          console.error('[DEBUG] Upsert error:', error);
          throw error;
        }
        console.log('[DEBUG] Upsert successful');
      }
      
      // Await profile refresh BEFORE navigating.
      console.log('[DEBUG] Refreshing profile...');
      await refreshProfile();
      console.log('[DEBUG] Profile refreshed.');
      
      // Delay navigation on Android to ensure keyboard dismissal and state batching are complete
      const delay = Platform.OS === 'android' ? 300 : 0;
      console.log(`[DEBUG] Navigating to tabs with delay: ${delay}ms`);
      
      setTimeout(() => {
        try {
          router.replace("/(tabs)");
          console.log('[DEBUG] router.replace("/(tabs)") called');
        } catch (navErr) {
          console.error('[DEBUG] Navigation error:', navErr);
        }
      }, delay);
    } catch (err: any) {
      console.error('[DEBUG] handleNext error:', err);
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // behavior={undefined} on Android lets the OS handle resizing (adjustResize),
    // which prevents the 'app freeze' and layout loops caused by 'padding'
    // behavior on complex screens with many inputs.
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top bar with back + progress */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/onboarding')} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#1A3050" />
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        {/* ── Medical Conditions ── */}
        <Text style={styles.sectionLabel}>{t.conditionsLabel}</Text>
        {ROWS.map((row, ri) => (
          <View key={ri} style={styles.condRow}>
            {row.map((cond) => {
              const active = selected.has(cond.key);
              return (
                <Pressable
                  key={cond.key}
                  style={[
                    styles.condChip,
                    row.length === 1 && styles.condChipFull,
                    active && styles.condChipActive,
                  ]}
                  onPress={() => toggle(cond.key)}
                >
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.condLabel, active && styles.condLabelActive]}>
                    {t.conditions[cond.key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}

        {selected.has("others") && (
          <View style={[styles.inputBox, { marginBottom: 12, height: 80, alignItems: "flex-start", paddingTop: 12 }]}>
            <TextInput
              style={[styles.input, { width: "100%" }]}
              placeholder={t.othersPlaceholder}
              placeholderTextColor="#B0BBC8"
              multiline
              numberOfLines={3}
              value={otherText}
              onChangeText={setOtherText}
            />
          </View>
        )}

        {/* ── Current Medications ── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t.medicationsLabel}</Text>
        {medications.map((med, idx) => (
          <MedicationCard
            key={med.id}
            med={med}
            index={idx}
            labels={medLabels}
            onUpdate={updateMedication}
            onRemove={removeMedication}
          />
        ))}
        <Pressable onPress={addMedication} style={styles.addMedBtn}>
          <Ionicons name="add-circle-outline" size={18} color="#2A4B8C" />
          <Text style={styles.addMedText}>{t.addMedication}</Text>
        </Pressable>

        {/* ── Doctor Info ── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t.doctorName}</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            placeholder="Dr. Sharma"
            placeholderTextColor="#B0BBC8"
            value={docName}
            onChangeText={setDocName}
          />
        </View>
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>{t.doctorContact}</Text>
        <View style={styles.phoneRow}>
          <Pressable style={styles.countryDialBtn} onPress={() => setDocPickerVisible(true)}>
            <Text style={styles.countryFlag}>{docCountry.flag}</Text>
            <Text style={styles.countryDialText}>{docCountry.dial}</Text>
            <Ionicons name="chevron-down" size={16} color="#8A94A6" />
          </Pressable>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <TextInput
              style={styles.input}
              placeholder="98765 43210"
              placeholderTextColor="#B0BBC8"
              keyboardType="phone-pad"
              value={docContact}
              onChangeText={setDocContact}
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.nextBtn, !canNext && styles.nextBtnDisabled, loading && { opacity: 0.7 }]}
          onPress={handleNext}
          disabled={!canNext || loading}
        >
          <LinearGradient
            colors={canNext && !loading ? ["#2A6FAF", "#3EA8D8"] : ["#C2CDD8", "#C2CDD8"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.nextBtnGradient}
          >
            <Text style={[styles.nextBtnText, !canNext && styles.nextBtnTextDisabled]}>
              {loading ? t.saving : t.next}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      <CountryPickerModal
        visible={docPickerVisible}
        onSelect={setDocCountry}
        onClose={() => setDocPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14, gap: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "#F2F4F8",
    justifyContent: "center", alignItems: "center",
  },
  progressTrack: { flex: 1, height: 5, backgroundColor: "#E8EDF3", borderRadius: 10, overflow: "hidden" },
  progressFill:  { width: "100%", height: "100%", backgroundColor: "#3EA8D8", borderRadius: 10 },

  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  title:    { fontSize: 26, fontWeight: "900", color: "#1A3050", lineHeight: 34, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 13, fontWeight: "500", color: "#7A90A4", textAlign: "center", lineHeight: 20, marginBottom: 24, paddingHorizontal: 8 },

  sectionLabel: { fontSize: 13, fontWeight: "800", color: "#2A4B8C", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },

  condRow:        { flexDirection: "row", gap: 12, marginBottom: 12 },
  condChip:       { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#DDE3EC", backgroundColor: "#F8FAFC" },
  condChipFull:   { flex: 1 },
  condChipActive: { borderColor: "#3EA8D8", backgroundColor: "#EEF7FC" },
  radio:          { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#B0BBC8", alignItems: "center", justifyContent: "center" },
  radioActive:    { borderColor: "#3EA8D8" },
  radioDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: "#3EA8D8" },
  condLabel:       { fontSize: 14, fontWeight: "600", color: "#4A5568", flexShrink: 1 },
  condLabelActive: { color: "#2A4B8C", fontWeight: "700" },

  medCard: {
    backgroundColor: "#F8FAFC", borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: "#DDE3EC",
  },
  medCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  medCardNum:    { fontSize: 13, fontWeight: "700", color: "#4A5568" },
  medRow:        { flexDirection: "row", gap: 10, marginTop: 8 },
  phoneRow:      { flexDirection: "row", alignItems: "center", gap: 10 },
  countryDialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#DDE3EC",
  },
  countryFlag: { fontSize: 20 },
  countryDialText: { fontSize: 14, fontWeight: "700", color: "#1A3050" },

  addMedBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  addMedText: { fontSize: 14, fontWeight: "700", color: "#2A4B8C" },

  inputBox: {
    backgroundColor: "#fff", borderRadius: 14, height: 50, paddingHorizontal: 16,
    justifyContent: "center", borderWidth: 1, borderColor: "#DDE3EC",
    marginBottom: 2,
  },
  input: { fontSize: 15, fontWeight: "600", color: "#1A3050" },

  footer: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#F0F3F7" },
  nextBtn:         { borderRadius: 28, overflow: "hidden" },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnGradient: { height: 56, alignItems: "center", justifyContent: "center" },
  nextBtnText:         { fontSize: 17, fontWeight: "900", color: "#fff", letterSpacing: 0.3 },
  nextBtnTextDisabled: { color: "#9AA5B4" },
});
