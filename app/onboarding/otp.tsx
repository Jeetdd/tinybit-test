import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { supabase } from "../../utils/supabase";

const { width } = Dimensions.get("window");

const C = {
  navy: "#2A4B8C",
  teal: "#3EA8D8",
  muted: "#7A90A4",
  red:   "#FF6B6B",
};

export default function OTPVerify() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp,     setOtp]     = useState(["", "", "", "", "", ""]);
  const [timer,   setTimer]   = useState(300);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleOtpChange = (text: string, index: number) => {
    setError("");
    const next = [...otp];
    next[index] = text;
    setOtp(next);
    if (text.length === 1 && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && index > 0 && otp[index] === "")
      inputs.current[index - 1]?.focus();
  };

  const handleVerify = async () => {
    const token = otp.join("");
    if (token.length !== 6) { setError("Please enter the complete 6-digit OTP."); return; }

    setLoading(true);
    try {
      if (__DEV__) {
        // Dev mode: any 6-digit code creates an anonymous session so the full
        // app (including tabs + AuthContext) works without a real SMS provider.
        // Enable "Allow anonymous sign-ins" in Supabase Auth settings.
        const { error: anonErr } = await supabase.auth.signInAnonymously();
        if (anonErr) throw anonErr;
        router.replace("/onboarding/role" as any);
        return;
      }

      const { error: err } = await supabase.auth.verifyOtp({
        phone: phone ?? "",
        token,
        type: "sms",
      });

      if (err) throw err;

      router.replace("/onboarding/role" as any);
    } catch (err: any) {
      setError(err.message ?? "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ phone: phone ?? "" });
      if (err) throw err;
      setTimer(60);
      setOtp(["", "", "", "", "", ""]);
      setError("");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <StatusBar barStyle="light-content" backgroundColor={C.navy} translucent={false} />

            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={20} color="white" />
              </Pressable>
              <Animated.Text entering={FadeInDown.delay(100)} style={styles.title}>
                Verify your number 📱
              </Animated.Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit OTP to{"\n"}
                <Text style={{ color: "white", fontWeight: "900" }}>{phone ?? ""}</Text>
              </Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name="phone-portrait" size={32} color={C.teal} />
                <View style={styles.iconBadge}>
                  <Ionicons name="arrow-forward" size={14} color="white" />
                </View>
              </View>

              <Text style={styles.cardTitle}>Enter OTP</Text>
              <Text style={styles.cardSub}>Check your SMS for the code</Text>

              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => { inputs.current[i] = r as TextInput; }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(t) => handleOtpChange(t, i)}
                    onKeyPress={(e) => handleKeyPress(e, i)}
                    selectionColor={C.teal}
                  />
                ))}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Text style={styles.resendHint}>
                Didn't get it? Resend in{" "}
                <Text style={{ color: C.teal, fontWeight: "800" }}>{fmt(timer)}</Text>
              </Text>

              <Pressable
                style={[styles.verifyBtn, loading && { opacity: 0.7 }]}
                onPress={handleVerify}
                disabled={loading}
              >
                <Text style={styles.verifyBtnText}>
                  {loading ? "Verifying..." : "Verify & Continue →"}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.resendBtn, timer > 0 && { opacity: 0.4 }]}
                onPress={handleResend}
                disabled={timer > 0}
              >
                <Text style={styles.resendBtnText}>Resend OTP</Text>
              </Pressable>
            </View>

            <Text style={styles.terms}>
              By verifying, you agree to receive service messages on this number
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 25, paddingTop: 20, paddingBottom: 40 },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    width: 40, height: 40, borderRadius: 12,
    justifyContent: "center", alignItems: "center", marginBottom: 30,
  },
  title:    { color: "white", fontSize: 28, fontWeight: "900", marginBottom: 12 },
  subtitle: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600", lineHeight: 22 },

  card: {
    flex: 1,
    backgroundColor: "#F2F4F8",
    borderTopLeftRadius: 35, borderTopRightRadius: 35,
    paddingHorizontal: 25, paddingTop: 40, paddingBottom: 32,
    alignItems: "center",
  },
  iconBox: {
    width: 90, height: 90, backgroundColor: "#E8F4FB",
    borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 24,
  },
  iconBadge: {
    position: "absolute", right: -8, top: 22,
    backgroundColor: "#3EA8D8",
    width: 24, height: 24, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "white",
  },
  cardTitle: { fontSize: 20, fontWeight: "900", color: "#1A3050", marginBottom: 4 },
  cardSub:   { fontSize: 14, fontWeight: "600", color: "#7A90A4", marginBottom: 32 },

  otpRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  otpBox: {
    width: (width - 50 - 40) / 6, height: 60,
    backgroundColor: "white", borderWidth: 1.5, borderColor: "#DDE3EC",
    borderRadius: 16, textAlign: "center", fontSize: 22, fontWeight: "900", color: "#1A3050",
  },
  otpBoxFilled: { borderColor: "#3EA8D8" },

  errorText:  { color: "#FF6B6B", fontSize: 13, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  resendHint: { fontSize: 13, fontWeight: "700", color: "#A0B0C0", marginBottom: 32 },

  verifyBtn: {
    width: "100%", backgroundColor: "#3EA8D8", height: 58, borderRadius: 22,
    justifyContent: "center", alignItems: "center", marginBottom: 14,
    shadowColor: "#3EA8D8", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  verifyBtnText: { color: "white", fontSize: 17, fontWeight: "900" },

  resendBtn: {
    width: "100%", height: 58, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: "#DDE3EC", backgroundColor: "white",
  },
  resendBtnText: { color: "#1A3050", fontSize: 16, fontWeight: "800" },

  terms: {
    textAlign: "center", fontSize: 12, color: "#A0B0C0", fontWeight: "600",
    paddingHorizontal: 30, paddingVertical: 20, backgroundColor: "#F2F4F8",
  },
});
