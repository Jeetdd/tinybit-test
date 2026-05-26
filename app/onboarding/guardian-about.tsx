import { useState, useMemo, useEffect } from "react";
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
  Keyboard,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import CountryPickerModal from "../../components/CountryPickerModal";
import { DEFAULT_COUNTRY, type Country } from "../../constants/countries";
import { getCountryLanguages, type LangOption } from "../../constants/countryLanguages";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { buildFullName } from "../../utils/profileName";
import { supabase } from "../../utils/supabase";

export default function GuardianAboutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name, firstName = "", lastName = "", email: paramEmail = "" } = useLocalSearchParams<{
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }>();
  const { setLanguage } = useLanguage();
  const { refreshProfile, user } = useAuth();

  const [email, setEmail] = useState(paramEmail);
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedLang, setSelectedLang] = useState<LangOption>(
    getCountryLanguages(DEFAULT_COUNTRY.code)[0]
  );
  const [sex, setSex] = useState<"male" | "female" | null>(null);
  const [loading, setLoading] = useState(false);

  const langs = useMemo(() => getCountryLanguages(country.code), [country.code]);

  // Pre-fill email from auth as fallback when not passed via params
  useEffect(() => {
    if (paramEmail) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setEmail(data.user.email);
    });
  }, []);

  const canNext = sex !== null;

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    const newLangs = getCountryLanguages(c.code);
    setSelectedLang(newLangs[0]);
    setLanguage(newLangs[0].appLang);
  };

  const handleLangSelect = (lang: LangOption) => {
    setSelectedLang(lang);
    setLanguage(lang.appLang);
  };

  const handleNext = async () => {
    if (!canNext) return;
    
    // Dismiss keyboard to prevent layout shift during navigation
    Keyboard.dismiss();

    setLoading(true);
    try {
      const fullName = buildFullName(firstName, lastName) || (name?.trim() ?? "");
      
      if (user) {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: fullName,
          email: email.trim().toLowerCase(),
          country: country.name,
          country_code: country.code,
          preferred_language: selectedLang.appLang,
          biological_sex: sex,
          role: "guardian",
        }, { onConflict: 'id' });
        if (error) throw error;
      }
      // Refresh profile so role is in memory before add-parent navigates to tabs.
      await refreshProfile();

      // Delay navigation on Android for stability
      if (Platform.OS === 'android') {
        setTimeout(() => {
          router.push({ pathname: "/onboarding/add-parent" as any, params: { guardianName: fullName } });
        }, 100);
      } else {
        router.push({ pathname: "/onboarding/add-parent" as any, params: { guardianName: fullName } });
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={["#333372", "#36B0E6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 28 }]}
      >
        <Text style={styles.title}>Tell Us About You</Text>
        <Text style={styles.subtitle}>
          Your details help us personalise your{"\n"}guardian experience.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Email */}
          <Text style={styles.fieldLabel}>Your Email ID</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor="#B0BBC8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Country */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Where are you from?</Text>
          <Pressable style={styles.rowBtn} onPress={() => setPickerVisible(true)}>
            <Text style={styles.countryFlag}>{country.flag}</Text>
            <Text style={styles.rowBtnText}>{country.name}</Text>
            <Ionicons name="chevron-down" size={16} color="#8A94A6" />
          </Pressable>

          {/* Language */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
            Which language do you prefer?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {langs.map((l) => {
              const active = selectedLang.appLang === l.appLang;
              return (
                <Pressable
                  key={l.appLang}
                  onPress={() => handleLangSelect(l)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{l.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Biological Sex */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
            What's your biological sex?
          </Text>
          <View style={styles.sexRow}>
            {(["male", "female"] as const).map((s) => (
              <Pressable
                key={s}
                style={[styles.sexCard, sex === s && styles.sexCardActive]}
                onPress={() => setSex(s)}
              >
                <Ionicons
                  name={s}
                  size={28}
                  color={sex === s ? "#fff" : s === "male" ? "#36B0E6" : "#E91E8C"}
                />
                <Text style={[styles.sexLabel, sex === s && styles.sexLabelActive]}>
                  {s === "male" ? "Male" : "Female"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Next */}
          <Pressable
            onPress={handleNext}
            disabled={!canNext || loading}
            style={{ marginTop: 40 }}
          >
            <LinearGradient
              colors={canNext && !loading ? ["#333372", "#36B0E6"] : ["#C2CDD8", "#C2CDD8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtn}
            >
              <Text style={styles.nextBtnText}>
                {loading ? "Please wait..." : "Next"}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </View>

      <CountryPickerModal
        visible={pickerVisible}
        onSelect={handleCountrySelect}
        onClose={() => setPickerVisible(false)}
        showDial={false}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 52, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "900", color: "#fff", marginBottom: 12, textAlign: "center" },
  subtitle: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 20 },

  card: {
    flex: 1, backgroundColor: "#F2F4F8",
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -28, overflow: "hidden",
  },
  scroll: { paddingHorizontal: 20, paddingTop: 28 },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#4A5568", marginBottom: 10 },

  rowBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 14, height: 52, paddingHorizontal: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  countryFlag: { fontSize: 22 },
  rowBtnText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1A3050" },

  inputBox: {
    backgroundColor: "#fff", borderRadius: 14, height: 52, paddingHorizontal: 16,
    justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    marginBottom: 4,
  },
  input: { fontSize: 15, fontWeight: "600", color: "#1A3050" },

  chipRow: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#DDE3EC",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#333372", borderColor: "#333372" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#4A5568" },
  chipTextActive: { color: "#fff" },

  sexRow: { flexDirection: "row", gap: 14 },
  sexCard: {
    flex: 1, height: 80, borderRadius: 18, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: "#DDE3EC",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sexCardActive: { backgroundColor: "#36B0E6", borderColor: "#36B0E6" },
  sexLabel: { fontSize: 14, fontWeight: "700", color: "#4A5568" },
  sexLabelActive: { color: "#fff" },

  nextBtn: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  nextBtnText: { fontSize: 17, fontWeight: "900", color: "#fff", letterSpacing: 0.3 },
});
