import React, { useState, useEffect, useRef } from "react";
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
  ScrollView
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

const C = {
  navy: "#1A3050",
  white: "#FFFFFF",
  teal: "#5CB8B2",
  bg: "#F8F9FB",
  border: "#E0EFF2",
  muted: "#7A90A4",
  red: "#FF6B6B",
};

export default function OTPVerify() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mobile } = useLocalSearchParams<{ mobile: string }>();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(38);
  const [error, setError] = useState("");
  const inputs = useRef<TextInput[]>([]);

  const { login } = useAuth();

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (text: string, index: number) => {
    setError("");
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto focus next input
    if (text.length === 1 && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && index > 0 && otp[index] === "") {
      inputs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    if (otp.join("").length === 6) {
      await login({ mobile: mobile || "+919876543210", role: "elder" });
      router.replace("/(tabs)");
    } else {
      setError("Please enter the complete 6-digit OTP.");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <StatusBar barStyle="light-content" backgroundColor={C.navy} translucent={false} />
            <View style={[styles.header, { paddingTop: 30 }]}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={20} color="white" />
              </Pressable>

              <Animated.Text entering={FadeInDown.delay(100)} style={styles.title}>
                Verify your number 📱
              </Animated.Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit OTP to{"\n"}
                <Text style={{ color: 'white', fontWeight: '900' }}>{mobile || "+91 98765 43210"}</Text>
              </Text>
            </View>

            <View style={styles.whiteSection}>
              <View style={styles.content}>
                <View style={styles.otpIconBox}>
                  <View style={styles.otpIconInner}>
                    <Ionicons name="phone-portrait" size={32} color={C.teal} />
                    <View style={styles.otpArrow}>
                      <Ionicons name="arrow-forward" size={14} color="white" />
                    </View>
                  </View>
                </View>

                <Text style={styles.otpTitle}>Enter OTP</Text>
                <Text style={styles.otpSubtitle}>Check your SMS for the code</Text>

                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { inputs.current[index] = ref as TextInput; }}
                      style={styles.otpInput}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      selectionColor={C.teal}
                    />
                  ))}
                </View>

                {error ? <Text style={{ color: C.red, fontSize: 13, marginTop: -20, marginBottom: 20, fontWeight: '700' }}>{error}</Text> : null}

                <Text style={styles.resendText}>
                  Didn't get it? Resend in <Text style={{ color: C.teal, fontWeight: '800' }}>{formatTime(timer)}</Text>
                </Text>

                <View style={styles.buttonContainer}>
                  <Pressable style={styles.verifyBtn} onPress={handleVerify}>
                    <Text style={styles.verifyBtnText}>Verify & Continue →</Text>
                  </Pressable>

                  <Pressable style={styles.resendBtn} disabled={timer > 0}>
                    <Text style={[styles.resendBtnText, timer > 0 && { opacity: 0.5 }]}>Resend OTP</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={styles.termsText}>
                By verifying, you agree to receive service messages on this number
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.navy },
  header: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30
  },
  title: { color: 'white', fontSize: 28, fontWeight: '900', marginBottom: 12 },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600', lineHeight: 22 },

  whiteSection: {
    flex: 1,
    backgroundColor: '#F3F9FA',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'space-between'
  },
  content: { alignItems: 'center' },
  otpIconBox: {
    width: 100,
    height: 100,
    backgroundColor: '#E6F4F3',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25
  },
  otpIconInner: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center'
  },
  otpArrow: {
    position: 'absolute',
    right: -10,
    top: 20,
    backgroundColor: C.teal,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white'
  },
  otpTitle: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 5 },
  otpSubtitle: { fontSize: 14, fontWeight: '600', color: C.muted, marginBottom: 35 },

  otpContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 30
  },
  otpInput: {
    width: (width - 50 - 45) / 6,
    height: 64,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#E8F1F3',
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    color: C.navy,
  },
  resendText: { fontSize: 13, fontWeight: '700', color: '#A0B0C0', marginBottom: 35 },
  buttonContainer: { width: '100%', gap: 15 },
  verifyBtn: {
    backgroundColor: C.teal,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8
  },
  verifyBtnText: { color: 'white', fontSize: 17, fontWeight: '900' },
  resendBtn: {
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8F1F3',
    backgroundColor: 'white'
  },
  resendBtnText: { color: C.navy, fontSize: 16, fontWeight: '800' },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#A0B0C0',
    fontWeight: '600',
    paddingHorizontal: 20
  }
});
