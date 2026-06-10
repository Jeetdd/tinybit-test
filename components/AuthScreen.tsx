import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "../context/AuthContext";
import CountryPickerModal from "./CountryPickerModal";
import { DEFAULT_COUNTRY, type Country } from "../constants/countries";
import { supabase } from "../utils/supabase";
import { signInWithGoogle } from "../services/oauth";

type Tab = "signup" | "login";

const C = {
  navy: "#2B4C7E",
  white: "#FFFFFF",
  bg: "#F4F5F8",
  muted: "#8A94A6",
  textMain: "#8A94A6",
  textInput: "#1A2233",
  blueBtn: "#2791D6",
};

type ProfileInsert = {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  mobile?: string;
  country_code?: string;
  date_of_birth?: string;
  role?: "elder" | "guardian" | "caregiver" | "admin";
};

async function createProfile(profile: ProfileInsert) {
  const fullName = profile.full_name ?? `${profile.first_name} ${profile.last_name}`.trim();
  const payload = { ...profile, full_name: fullName };
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export default function AuthScreen({ initialTab, role }: { initialTab: Tab; role?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useAuth(); // ensures AuthProvider is mounted
  const colorScheme = useColorScheme();
  const isSystemDark = colorScheme === "dark";

  const [tab, setTab] = useState<Tab>(initialTab);
  const tabProgress = useSharedValue(initialTab === "signup" ? 0 : 1);
  const [toggleWidth, setToggleWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    tabProgress.value = withTiming(tab === "signup" ? 0 : 1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [tab, tabProgress]);

  const indicatorStyle = useAnimatedStyle(() => {
    const x = toggleWidth ? tabProgress.value * (toggleWidth / 2) : 0;
    return { transform: [{ translateX: x }] };
  }, [toggleWidth]);

  const pagesStyle = useAnimatedStyle(() => {
    const x = viewportWidth ? -tabProgress.value * viewportWidth : 0;
    return { transform: [{ translateX: x }] };
  }, [viewportWidth]);

  const datePickerBg = isSystemDark ? "#0B1220" : "#FFFFFF";
  const datePickerBorder = isSystemDark ? "#1F2937" : "#E5E7EB";
  const datePickerText = isSystemDark ? "#E5E7EB" : "#111827";
  const datePickerMuted = isSystemDark ? "#9CA3AF" : "#6B7280";
  const iosDateDisplay =
    Platform.OS === "ios" && typeof Platform.Version === "number" && Platform.Version >= 14
      ? ("inline" as const)
      : ("spinner" as const);

  // ----- SIGNUP state -----
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [dob, setDob] = useState("");
  const [dobDate, setDobDate] = useState(new Date());
  const [dobDraftDate, setDobDraftDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mobile, setMobile] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [pickerVisible, setPickerVisible] = useState(false);

  const validateEmail = (text: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmail(text);
    if (!text) setEmailError("");
    else if (!emailRegex.test(text)) setEmailError("Please enter a valid email address");
    else setEmailError("");
  };

  const handleMobileChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    const limited = cleaned.slice(0, 10);
    setMobile(limited);
    if (limited.length > 0 && limited.length < 10) setMobileError("Mobile number must be 10 digits");
    else setMobileError("");
  };

  const formatDob = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const openDatePicker = () => {
    setDobDraftDate(dobDate);
    setShowDatePicker(true);
  };

  const closeDatePicker = () => setShowDatePicker(false);

  const confirmDob = () => {
    setDobDate(dobDraftDate);
    setDob(formatDob(dobDraftDate));
    closeDatePicker();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      closeDatePicker();
      if (event?.type !== "set" || !selectedDate) return;
      setDobDate(selectedDate);
      setDobDraftDate(selectedDate);
      setDob(formatDob(selectedDate));
      return;
    }

    if (selectedDate) setDobDraftDate(selectedDate);
  };

  const handleRegister = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (!mobile || mobile.length !== 10) {
      setMobileError("Mobile number must be 10 digits");
      return;
    }
    
    try {
      const dobIso = dobDate && dob
        ? `${dobDate.getFullYear()}-${String(dobDate.getMonth() + 1).padStart(2, '0')}-${String(dobDate.getDate()).padStart(2, '0')}`
        : undefined;

      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName },
        },
      });

      if (error) throw error;

      if (signUpData.user) {
        await createProfile({
          id: signUpData.user.id,
          first_name: firstName,
          last_name: lastName,
          email,
          mobile,
          country_code: selectedCountry.dial,
          date_of_birth: dobIso,
          role: (role as ProfileInsert["role"]) ?? 'elder',
        });
      }

      if (role === 'guardian') {
        router.replace('/onboarding/guardian-setup');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Registration Error', err.message);
    }
  };

  // ----- LOGIN state -----
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Login Error", err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      // On iOS, signInWithGoogle exchanges the code and returns the user — navigate now.
      // On Android, auth-callback.tsx handles the exchange and navigation — do nothing.
      if (result?.user) {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      if (err.message !== "The user canceled the sign-in flow.") {
        Alert.alert("Google Sign-In Error", err.message);
      }
    }
  };

  const SocialButtons = ({ verb }: { verb: "Sign up" | "Continue" }) => (
    <>
      <View style={styles.dividerRow}>
        <Text style={styles.dividerText}>Or</Text>
      </View>

      <Pressable style={[styles.socialButton, styles.googleButton]} onPress={handleGoogleSignIn}>
        <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
        <Text style={styles.socialButtonText}>{verb} with Google</Text>
      </Pressable>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} translucent={false} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={["#2B4C7E", "#3689C8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 20 }]}
          >
            <Animated.Text style={styles.title}>Get Started Now</Animated.Text>
            <Text style={styles.subtitle}>
              Create an account or log in to explore{"\n"}about our app
            </Text>
          </LinearGradient>

          <View style={styles.formContainer}>
            {/* Toggle */}
            <View
              style={styles.tabToggleContainer}
              onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width)}
            >
              <Animated.View style={[styles.tabIndicator, indicatorStyle]}>
                <LinearGradient
                  colors={["#204886", "#1E88DB"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              <Pressable style={styles.tabButton} onPress={() => setTab("signup")}>
                <Text style={[styles.tabText, tab === "signup" && styles.tabTextActive]}>
                  Sign Up
                </Text>
              </Pressable>

              <Pressable style={styles.tabButton} onPress={() => setTab("login")}>
                <Text style={[styles.tabText, tab === "login" && styles.tabTextActive]}>
                  Log In
                </Text>
              </Pressable>
            </View>

            {/* Sliding pages */}
            <View
              style={styles.pagesViewport}
              onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
            >
              <Animated.View style={[styles.pagesRow, pagesStyle]}>
                {/* SIGNUP page */}
                <View style={[styles.page, viewportWidth ? { width: viewportWidth } : null]}>
                  <View style={styles.rowFields}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>First Name</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter first name"
                          placeholderTextColor={C.muted}
                          value={firstName}
                          onChangeText={setFirstName}
                        />
                      </View>
                    </View>
                    <View style={styles.gap15} />
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Last Name</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter last name"
                          placeholderTextColor={C.muted}
                          value={lastName}
                          onChangeText={setLastName}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter email address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={C.muted}
                        value={email}
                        onChangeText={validateEmail}
                      />
                    </View>
                    {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Date of Birth</Text>
                    <Pressable style={styles.inputWrapper} onPress={openDatePicker}>
                      <Text style={[styles.inputValue, !dob && styles.placeholder]}>
                        {dob || "DD/MM/YYYY"}
                      </Text>
                      <Ionicons name="calendar" size={20} color={C.muted} />
                    </Pressable>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.phoneInputRow}>
                      <Pressable
                        style={styles.countryPickerBox}
                        onPress={() => setPickerVisible(true)}
                      >
                        <Text style={{ fontSize: 20 }}>{selectedCountry.flag}</Text>
                        <Text style={styles.dialText}>{selectedCountry.dial}</Text>
                        <Ionicons
                          name="chevron-down"
                          size={13}
                          color={C.muted}
                          style={{ marginLeft: 4 }}
                        />
                      </Pressable>
                      <View style={styles.gap15} />
                      <View style={[styles.inputWrapper, { flex: 1 }]}>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter 10 digit mobile number"
                          keyboardType="phone-pad"
                          placeholderTextColor={C.muted}
                          value={mobile}
                          onChangeText={handleMobileChange}
                          maxLength={10}
                        />
                      </View>
                    </View>
                    {mobileError ? <Text style={styles.errorText}>{mobileError}</Text> : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Set Password</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="Create a password"
                        secureTextEntry={!showPassword}
                        placeholderTextColor={C.muted}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <Pressable onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? "eye" : "eye-off"} size={18} color={C.muted} />
                      </Pressable>
                    </View>
                  </View>

                  <Pressable style={styles.createButton} onPress={handleRegister}>
                    <LinearGradient
                      colors={["#2D7AB5", "#2CA0E2"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.createButtonText}>Get Started</Text>
                  </Pressable>

                  <SocialButtons verb="Sign up" />
                </View>

                {/* LOGIN page */}
                <View style={[styles.page, viewportWidth ? { width: viewportWidth } : null]}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter email address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={C.muted}
                        value={loginEmail}
                        onChangeText={setLoginEmail}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter password"
                        secureTextEntry={!loginShowPassword}
                        placeholderTextColor={C.muted}
                        value={loginPassword}
                        onChangeText={setLoginPassword}
                      />
                      <Pressable onPress={() => setLoginShowPassword(!loginShowPassword)}>
                        <Ionicons
                          name={loginShowPassword ? "eye" : "eye-off"}
                          size={18}
                          color={C.muted}
                        />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.optionsRow}>
                    <Pressable style={styles.checkboxRow} onPress={() => setRememberMe(!rememberMe)}>
                      <View style={[styles.checkbox, rememberMe && { backgroundColor: C.muted }]}>
                        {rememberMe && <Ionicons name="checkmark" size={14} color="white" />}
                      </View>
                      <Text style={styles.rememberText}>Remember me</Text>
                    </Pressable>
                    <Pressable>
                      <Text style={styles.forgotText}>Forgot Password ?</Text>
                    </Pressable>
                  </View>

                  <Pressable style={styles.createButton} onPress={handleSignIn}>
                    <LinearGradient
                      colors={["#2D7AB5", "#2CA0E2"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.createButtonText}>Login</Text>
                  </Pressable>

                  <SocialButtons verb="Continue" />
                </View>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPickerModal
        visible={pickerVisible}
        onSelect={(c) => setSelectedCountry(c)}
        onClose={() => setPickerVisible(false)}
      />

      {/* Android date picker (native popup) */}
      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={dobDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* iOS date picker (sheet) */}
      {showDatePicker && Platform.OS === "ios" && (
        <Modal transparent animationType="fade" onRequestClose={closeDatePicker}>
          <Pressable style={styles.datePickerOverlay} onPress={closeDatePicker}>
            <Pressable style={[styles.datePickerSheet, { backgroundColor: datePickerBg }]} onPress={() => {}}>
              <View style={[styles.datePickerHeader, { borderBottomColor: datePickerBorder }]}>
                <Pressable onPress={closeDatePicker} hitSlop={10}>
                  <Text style={[styles.datePickerAction, { color: datePickerMuted }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.datePickerTitle, { color: datePickerText }]}>Select date</Text>
                <Pressable onPress={confirmDob} hitSlop={10}>
                  <Text style={[styles.datePickerAction, styles.datePickerActionPrimary]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={dobDraftDate}
                mode="date"
                display={iosDateDisplay}
                themeVariant={isSystemDark ? "dark" : "light"}
                textColor={isSystemDark ? "#FFFFFF" : "#111827"}
                style={styles.dateTimePicker}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, backgroundColor: C.bg },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 60,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  title: {
    fontFamily: "Geist",
    color: "white",
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Geist",
    color: "rgba(255,255,255,0.95)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
  },
  formContainer: {
    marginTop: -25,
    backgroundColor: C.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 50,
  },

  tabToggleContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 30,
    padding: 5,
    marginBottom: 24,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    position: "relative",
    overflow: "hidden",
  },
  tabIndicator: {
    position: "absolute",
    left: 0,
    top: 5,
    bottom: 5,
    width: "50%",
    borderRadius: 25,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  tabButton: {
    flex: 1,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    overflow: "hidden",
  },
  tabText: { fontFamily: "Geist", color: "#8C9AAA", fontSize: 16, fontWeight: "700" },
  tabTextActive: { color: "white" },

  pagesViewport: { overflow: "hidden" },
  pagesRow: { flexDirection: "row" },
  page: { paddingBottom: 4 },

  rowFields: { flexDirection: "row", alignItems: "center" },
  gap15: { width: 15 },
  inputGroup: { marginBottom: 20 },
  label: {
    fontFamily: "Geist",
    fontSize: 14,
    fontWeight: "600",
    color: C.textMain,
    marginBottom: 8,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 24,
    paddingHorizontal: 20,
    height: 55,
    elevation: 0.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  input: { fontFamily: "Geist", flex: 1, height: "100%", fontSize: 15, color: "#1A3050", fontWeight: "500" },
  inputValue: { fontFamily: "Geist", flex: 1, fontSize: 15, color: "#1A3050", fontWeight: "500" },
  phoneInputRow: { flexDirection: "row", alignItems: "center" },
  countryPickerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 55,
    elevation: 0.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    gap: 4,
  },
  dialText: { fontSize: 13, color: "#1A3050", fontWeight: "600" },
  placeholder: { color: C.muted },
  errorText: { color: "#E53935", fontSize: 12, marginTop: 4, marginLeft: 2 },

  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
    marginTop: 5,
    paddingHorizontal: 4,
  },
  checkboxRow: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: C.muted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  rememberText: { fontFamily: "Geist", fontSize: 14, color: C.textMain, fontWeight: "600" },
  forgotText: { fontFamily: "Geist", fontSize: 14, color: C.textMain, fontWeight: "600" },

  createButton: {
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#2891D0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonText: { fontFamily: "Geist", color: "white", fontSize: 18, fontWeight: "700" },

  dividerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginVertical: 18 },
  dividerText: { fontFamily: "Geist", color: "#8C9AAA", fontSize: 14, fontWeight: "500" },
  socialButton: {
    flexDirection: "row",
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginTop: 12,
  },
  socialButtonText: { fontFamily: "Geist", color: "#1A2233", fontSize: 16, fontWeight: "600" },
  googleButton: { backgroundColor: "white" },
  facebookButton: { backgroundColor: "white" },
  appleButton: { backgroundColor: "#000000" },

  datePickerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  datePickerSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 20 },
  datePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  datePickerTitle: { fontSize: 14, fontWeight: "700" },
  datePickerAction: { fontSize: 16, fontWeight: "600" },
  datePickerActionPrimary: { color: C.blueBtn },
  dateTimePicker: { height: 360 },
});
