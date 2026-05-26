import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function NameScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role, firstName: paramFirstName = '', lastName: paramLastName = '', email = '' } = useLocalSearchParams<{
    role?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }>();
  const [firstName, setFirstName] = useState(paramFirstName);
  const [lastName, setLastName] = useState(paramLastName);

  const isGuardian = role === "guardian";
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const canNext = trimmedFirstName.length >= 2 && trimmedLastName.length >= 1;

  const handleNext = () => {
    if (!canNext) return;
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();
    if (isGuardian) {
      router.push({
        pathname: "/onboarding/guardian-about" as any,
        params: { firstName: trimmedFirstName, lastName: trimmedLastName, name: fullName, email },
      });
    } else {
      router.push({
        pathname: "/onboarding/about" as any,
        params: { firstName: trimmedFirstName, lastName: trimmedLastName, name: fullName, email },
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

          {/* Gradient header */}
          <LinearGradient
            colors={["#2A4B8C", "#3EA8D8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.header, { paddingTop: insets.top + 36 }]}
          >
            <Text style={styles.hey}>Hey There !</Text>
            <Text style={styles.headerSub}>
              {isGuardian
                ? "We're glad you're here to look after your loved ones —\nlet's start with a few details."
                : "We're happy that you've taken the first step towards a\nhealthier you — we need a few details to kickstart your journey"}
            </Text>
          </LinearGradient>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.question}>What is your name ?</Text>

            <View style={styles.field}>
              <Text style={styles.label}>First name</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your first name"
                  placeholderTextColor="#B0BBC8"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Last name</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your last name"
                  placeholderTextColor="#B0BBC8"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
              </View>
            </View>

            <Pressable
              onPress={handleNext}
              disabled={!canNext}
              style={{ marginTop: "auto" }}
            >
              <LinearGradient
                colors={canNext ? ["#2A6FAF", "#3EA8D8"] : ["#C2CDD8", "#C2CDD8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtn}
              >
                <Text style={styles.nextBtnText}>Next</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 28,
    paddingBottom: 52,
    alignItems: "center",
  },
  hey: {
    fontSize: 34,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 14,
    textAlign: "center",
  },
  headerSub: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },

  card: {
    flex: 1,
    backgroundColor: "#F2F4F8",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 36,
  },

  question: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1A3050",
    textAlign: "center",
    marginBottom: 36,
  },

  field: { marginBottom: 28 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4A5568",
    marginBottom: 10,
  },
  inputBox: {
    backgroundColor: "#fff",
    borderRadius: 18,
    height: 56,
    paddingHorizontal: 20,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A3050",
  },

  nextBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.3,
  },
});
