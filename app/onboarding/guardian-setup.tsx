import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, TextInput, Image, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";

const C = {
  navy:     "#1A2E6A",
  navyDark: "#111D44",
  white:    "#FFFFFF",
  bg:       "#EEF2F7",
  muted:    "#8A9BB0",
  accent:   "#37B1E6",
  border:   "#E4EBF2",
  input:    "#F8FAFC",
};

const STEPS = [
  { title: "Tell Us About\nYourself",    sub: "Let's personalise your guardian profile" },
  { title: "Health\nInformation",        sub: "Key details to keep you and your family safe" },
  { title: "Add Your\nFirst Parent",     sub: "Connect the elder you are caring for" },
  { title: "Profile Ready! 🎉",          sub: "Your guardian account is all set" },
];

const LANGUAGES   = ["English", "हिन्दी", "ગુજરાતી", "বাংলা", "मराठी", "മലയാളം"];
const BLOOD_GROUPS= ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CONDITIONS  = ["Hypertension", "Diabetes", "Arthritis", "Heart Disease", "Appendicitis", "None"];
const RELATIONS   = ["Father", "Mother", "Spouse", "Sibling", "Relative", "Friend"];

// ─── Shared input sub-components ──────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, icon, keyboardType,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; icon?: string; keyboardType?: any;
}) {
  return (
    <View style={f.group}>
      <Text style={f.label}>{label}</Text>
      <View style={f.wrap}>
        {icon && <Ionicons name={icon as any} size={18} color={C.muted} style={{ marginRight: 8 }} />}
        <TextInput
          style={f.input}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

// ─── Step 1: Tell Us About Yourself ───────────────────────────────────────────
function Step1({
  fullName, setFullName, city, setCity, lang, setLang,
}: {
  fullName: string; setFullName: (v: string) => void;
  city: string; setCity: (v: string) => void;
  lang: string; setLang: (v: string) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      {/* Avatar */}
      <View style={s1.avatarWrap}>
        <View style={s1.avatar}>
          <Ionicons name="person-outline" size={44} color={C.muted} />
        </View>
        <Pressable style={s1.cameraBtn}>
          <Ionicons name="camera" size={16} color={C.white} />
        </Pressable>
        <Text style={s1.avatarHint}>Tap to add photo</Text>
      </View>

      <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Enter your full name" />
      <Field label="City" value={city} onChange={setCity} placeholder="Your city" icon="location-outline" />

      <View style={f.group}>
        <Text style={f.label}>Preferred Language</Text>
        <View style={s1.pillRow}>
          {LANGUAGES.map(l => (
            <Pressable
              key={l}
              style={[s1.pill, lang === l && s1.pillActive]}
              onPress={() => setLang(l)}
            >
              <Text style={[s1.pillText, lang === l && s1.pillTextActive]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Step 2: Health Information ───────────────────────────────────────────────
function Step2({
  dob, setDob, blood, setBlood,
  emergency, setEmergency, conditions, toggleCond,
}: {
  dob: string; setDob: (v: string) => void;
  blood: string; setBlood: (v: string) => void;
  emergency: string; setEmergency: (v: string) => void;
  conditions: string[]; toggleCond: (c: string) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <Field
        label="Date of Birth"
        value={dob}
        onChange={setDob}
        placeholder="DD / MM / YYYY"
        icon="calendar-outline"
        keyboardType="numeric"
      />

      <View style={f.group}>
        <Text style={f.label}>Blood Group</Text>
        <View style={s2.chipRow}>
          {BLOOD_GROUPS.map(bg => (
            <Pressable
              key={bg}
              style={[s2.bloodChip, blood === bg && s2.bloodChipActive]}
              onPress={() => setBlood(bg)}
            >
              <Text style={[s2.bloodChipText, blood === bg && s2.bloodChipTextActive]}>{bg}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={f.group}>
        <Text style={f.label}>Emergency Contact</Text>
        <View style={f.wrap}>
          <View style={s2.dialBox}>
            <Text style={s2.dialText}>+91</Text>
          </View>
          <TextInput
            style={[f.input, { flex: 1 }]}
            placeholder="Mobile number"
            placeholderTextColor={C.muted}
            value={emergency}
            onChangeText={setEmergency}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
      </View>

      <View style={f.group}>
        <Text style={f.label}>Medical Conditions</Text>
        <View style={s2.condRow}>
          {CONDITIONS.map(c => {
            const active = conditions.includes(c);
            return (
              <Pressable
                key={c}
                style={[s2.condChip, active && s2.condChipActive]}
                onPress={() => toggleCond(c)}
              >
                {active && <Ionicons name="checkmark" size={13} color={C.white} style={{ marginRight: 4 }} />}
                <Text style={[s2.condText, active && s2.condTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Step 3: Add Your First Parent ────────────────────────────────────────────
type Parent = { name: string; mobile: string; relation: string };

function Step3({
  parents, updateParent, addParent,
}: {
  parents: Parent[];
  updateParent: (i: number, field: keyof Parent, val: string) => void;
  addParent: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      {parents.map((p, i) => (
        <View key={i} style={s3.parentCard}>
          {parents.length > 1 && (
            <Text style={s3.parentLabel}>Parent {i + 1}</Text>
          )}
          <Field
            label="Parent's Name"
            value={p.name}
            onChange={v => updateParent(i, "name", v)}
            placeholder="Enter parent's full name"
            icon="person-outline"
          />
          <View style={f.group}>
            <Text style={f.label}>Parent's Mobile No.</Text>
            <View style={f.wrap}>
              <View style={s2.dialBox}>
                <Text style={s2.dialText}>+91</Text>
              </View>
              <TextInput
                style={[f.input, { flex: 1 }]}
                placeholder="10-digit mobile number"
                placeholderTextColor={C.muted}
                value={p.mobile}
                onChangeText={v => updateParent(i, "mobile", v)}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          <View style={f.group}>
            <Text style={f.label}>Relationship</Text>
            <View style={s3.relRow}>
              {RELATIONS.map(r => (
                <Pressable
                  key={r}
                  style={[s3.relChip, p.relation === r && s3.relChipActive]}
                  onPress={() => updateParent(i, "relation", r)}
                >
                  <Text style={[s3.relText, p.relation === r && s3.relTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ))}

      <Pressable style={s3.addBtn} onPress={addParent}>
        <Ionicons name="add" size={20} color={C.accent} />
        <Text style={s3.addBtnText}>Add Another Parent</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Step 4: Profile Ready ────────────────────────────────────────────────────
function Step4() {
  const chips = [
    { icon: "people-outline",     label: "Parents Connected", color: "#16A34A", bg: "#F0FFF4" },
    { icon: "medkit-outline",     label: "Medicine Set Up",   color: "#F59E0B", bg: "#FFF8E7" },
    { icon: "warning-outline",    label: "Alerts Enabled",    color: "#DC2626", bg: "#FFF0F0" },
  ];
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={s4.wrap}>
      {/* Decorative circles */}
      <View style={s4.confettiRing1} />
      <View style={s4.confettiRing2} />

      {/* Trophy */}
      <Image
        source={require("../../assets/images/Streak.png")}
        style={s4.trophy}
        resizeMode="contain"
      />

      <Text style={s4.readyTitle}>You're all set!</Text>
      <Text style={s4.readySub}>Your guardian profile is ready.{"\n"}Start watching over your loved ones.</Text>

      {/* Summary chips */}
      <View style={s4.chipWrap}>
        {chips.map(c => (
          <View key={c.label} style={[s4.chip, { backgroundColor: c.bg }]}>
            <Ionicons name={c.icon as any} size={18} color={c.color} />
            <Text style={[s4.chipText, { color: c.color }]}>{c.label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GuardianSetupScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { refreshProfile } = useAuth();
  const [step, setStep]       = useState(1);
  const [navigating, setNavigating] = useState(false);

  // Step 1 state
  const [fullName, setFullName] = useState("");
  const [city,     setCity]     = useState("");
  const [lang,     setLang]     = useState("English");

  // Step 2 state
  const [dob,       setDob]       = useState("");
  const [blood,     setBlood]     = useState("");
  const [emergency, setEmergency] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);

  // Step 3 state
  const [parents, setParents] = useState<{ name: string; mobile: string; relation: string }[]>([
    { name: "", mobile: "", relation: "Father" },
  ]);

  const toggleCond = (c: string) => {
    if (c === "None") { setConditions(["None"]); return; }
    setConditions(prev => {
      const without = prev.filter(x => x !== "None");
      return without.includes(c) ? without.filter(x => x !== c) : [...without, c];
    });
  };

  const addParent = () =>
    setParents(prev => [...prev, { name: "", mobile: "", relation: "Father" }]);

  const updateParent = (i: number, field: keyof typeof parents[0], val: string) =>
    setParents(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const handleContinue = async () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      setNavigating(true);
      await refreshProfile();
      router.replace("/(tabs)");
    }
  };

  return (
    <View style={gs.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={["#1B3A5C", "#2B7FC0"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[gs.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={gs.headerTop}>
          <Text style={gs.headerLabel}>Profile Setup</Text>
          <Text style={gs.stepCounter}>{step}/4</Text>
        </View>

        {/* 4-segment progress bar */}
        <View style={gs.progressRow}>
          {[1, 2, 3, 4].map(n => (
            <View key={n} style={[gs.seg, n <= step && gs.segActive]} />
          ))}
        </View>

        <Text style={gs.title}>{STEPS[step - 1].title}</Text>
        <Text style={gs.subtitle}>{STEPS[step - 1].sub}</Text>
      </LinearGradient>

      {/* ── White sheet ── */}
      <View style={gs.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[gs.scroll, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <Step1
              fullName={fullName} setFullName={setFullName}
              city={city} setCity={setCity}
              lang={lang} setLang={setLang}
            />
          )}
          {step === 2 && (
            <Step2
              dob={dob} setDob={setDob}
              blood={blood} setBlood={setBlood}
              emergency={emergency} setEmergency={setEmergency}
              conditions={conditions} toggleCond={toggleCond}
            />
          )}
          {step === 3 && (
            <Step3
              parents={parents}
              updateParent={updateParent}
              addParent={addParent}
            />
          )}
          {step === 4 && <Step4 />}
        </ScrollView>

        {/* Continue / Dashboard button */}
        <View style={[gs.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[gs.continueBtn, navigating && { opacity: 0.75 }]}
            onPress={handleContinue}
            disabled={navigating}
          >
            <LinearGradient
              colors={["#1B3A5C", "#2B7FC0"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {navigating ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <>
                <Text style={gs.continueBtnText}>
                  {step === 4 ? "Go to Home Dashboard" : "Continue"}
                </Text>
                {step < 4 && <Ionicons name="arrow-forward" size={20} color={C.white} />}
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Shared field styles ───────────────────────────────────────────────────────
const f = StyleSheet.create({
  group: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "700", color: C.muted, marginBottom: 8, marginLeft: 2 },
  wrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white, borderRadius: 16,
    paddingHorizontal: 16, height: 52,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "500", color: C.navyDark },
});

// ─── Step 1 styles ─────────────────────────────────────────────────────────────
const s1 = StyleSheet.create({
  avatarWrap: { alignItems: "center", marginBottom: 28, marginTop: 8 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.border,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: C.accent, borderStyle: "dashed",
  },
  cameraBtn: {
    position: "absolute", bottom: 26, right: "32%",
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.accent,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: C.white,
  },
  avatarHint: { fontSize: 12, fontWeight: "600", color: C.muted, marginTop: 8 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 30, backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.border,
  },
  pillActive: { backgroundColor: C.navy, borderColor: C.navy },
  pillText: { fontSize: 13, fontWeight: "700", color: C.muted },
  pillTextActive: { color: C.white },
});

// ─── Step 2 styles ─────────────────────────────────────────────────────────────
const s2 = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bloodChip: {
    width: 56, height: 44,
    borderRadius: 12, backgroundColor: C.white,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: C.border,
  },
  bloodChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  bloodChipText: { fontSize: 14, fontWeight: "800", color: C.muted },
  bloodChipTextActive: { color: C.white },
  dialBox: {
    backgroundColor: C.border, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, marginRight: 10,
  },
  dialText: { fontSize: 13, fontWeight: "700", color: C.navyDark },
  condRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  condChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.border,
  },
  condChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  condText: { fontSize: 13, fontWeight: "700", color: C.muted },
  condTextActive: { color: C.white },
});

// ─── Step 3 styles ─────────────────────────────────────────────────────────────
const s3 = StyleSheet.create({
  parentCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 16,
    marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  parentLabel: {
    fontSize: 12, fontWeight: "800", color: C.accent,
    textTransform: "uppercase", letterSpacing: 1,
    marginBottom: 12,
  },
  relRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, backgroundColor: C.bg,
    borderWidth: 1.5, borderColor: C.border,
  },
  relChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  relText: { fontSize: 13, fontWeight: "700", color: C.muted },
  relTextActive: { color: C.white },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 20,
    borderWidth: 2, borderColor: C.accent, borderStyle: "dashed",
    backgroundColor: "#EFF8FF",
  },
  addBtnText: { fontSize: 15, fontWeight: "800", color: C.accent },
});

// ─── Step 4 styles ─────────────────────────────────────────────────────────────
const s4 = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 20 },
  confettiRing1: {
    position: "absolute", width: 280, height: 280, borderRadius: 140,
    borderWidth: 2, borderColor: "rgba(55,177,230,0.15)", top: 0,
  },
  confettiRing2: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    borderWidth: 2, borderColor: "rgba(55,177,230,0.25)", top: 40,
  },
  trophy: { width: 160, height: 160, marginBottom: 20 },
  readyTitle: { fontSize: 28, fontWeight: "900", color: C.navyDark, marginBottom: 10 },
  readySub: {
    fontSize: 15, fontWeight: "500", color: C.muted,
    textAlign: "center", lineHeight: 22, marginBottom: 36,
  },
  chipWrap: { width: "100%", gap: 12 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16,
  },
  chipText: { fontSize: 15, fontWeight: "800" },
});

// ─── Main screen styles ────────────────────────────────────────────────────────
const gs = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 22, paddingBottom: 30,
  },
  headerTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  headerLabel: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.75)" },
  stepCounter: { fontSize: 14, fontWeight: "800", color: C.white },

  progressRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  seg: {
    flex: 1, height: 4, borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  segActive: { backgroundColor: C.white },

  title: {
    fontSize: 30, fontWeight: "900", color: C.white,
    lineHeight: 36, marginBottom: 6,
  },
  subtitle: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.75)" },

  sheet: {
    flex: 1, marginTop: -22,
    backgroundColor: C.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: "hidden",
  },
  scroll: { paddingTop: 24, paddingHorizontal: 20 },

  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: C.bg,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  continueBtn: {
    height: 56, borderRadius: 30,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
    overflow: "hidden",
  },
  continueBtnText: { fontSize: 17, fontWeight: "900", color: C.white },
});
