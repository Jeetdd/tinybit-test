import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../utils/supabase";

const RELATION_OPTIONS = ["Son", "Daughter", "Spouse", "Sibling", "Caregiver", "Other"];

export default function AddParentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useLocalSearchParams<{ guardianName: string }>();

  const [parentName, setParentName] = useState("");
  const [relation, setRelation] = useState("");
  const [elderEmail, setElderEmail] = useState("");
  const [relationPickerVisible, setRelationPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    parentName.trim().length >= 2 &&
    relation !== "" &&
    elderEmail.trim().includes("@");

  const handleFollowOn = async () => {
    if (!canSubmit) return;
    
    // Dismiss keyboard to prevent layout shift during navigation
    Keyboard.dismiss();

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const email = elderEmail.trim().toLowerCase();

      // Check for existing pending invite
      const { data: existing } = await supabase
        .from("guardian_elder_links")
        .select("id")
        .eq("guardian_id", user.id)
        .eq("elder_email", email)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) throw new Error("A pending invitation already exists for this email");

      // Try to find if the elder already has a TinyBit account
      const { data: elderProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      const { error } = await supabase.from("guardian_elder_links").insert({
        guardian_id: user.id,
        parent_name: parentName.trim(),
        relation,
        elder_email: email,
        elder_id:    elderProfile?.id ?? null,
        status: "pending",
      });

      if (error) throw error;

      // Delay navigation on Android for stability
      if (Platform.OS === 'android') {
        setTimeout(() => {
          router.replace("/(tabs)" as any);
        }, 100);
      } else {
        router.replace("/(tabs)" as any);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={["#333372", "#36B0E6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 28 }]}
      >
        <Text style={styles.title}>Add Your Parent</Text>
        <Text style={styles.subtitle}>
          We'll send them an invitation to connect{"\n"}so you can monitor their well-being.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Parent Name */}
          <Text style={styles.fieldLabel}>Parent's Name</Text>
          <View style={styles.inputBox}>
            <Ionicons name="person-outline" size={18} color="#8A94A6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#B0BBC8"
              value={parentName}
              onChangeText={setParentName}
              autoCapitalize="words"
            />
          </View>

          {/* Relation */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Relation with Parent</Text>
          <Pressable style={styles.rowBtn} onPress={() => setRelationPickerVisible(true)}>
            <Ionicons name="people-outline" size={18} color="#8A94A6" />
            <Text style={[styles.rowBtnText, !relation && styles.rowBtnPlaceholder]}>
              {relation || "Select relation"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#8A94A6" />
          </Pressable>

          {/* Elder Email */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Parent's Email ID</Text>
          <View style={styles.inputBox}>
            <Ionicons name="mail-outline" size={18} color="#8A94A6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="parent@email.com"
              placeholderTextColor="#B0BBC8"
              value={elderEmail}
              onChangeText={setElderEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color="#36B0E6" />
            <Text style={styles.infoText}>
              Your parent will receive a notification asking them to accept your connection request.
            </Text>
          </View>

          {/* Follow On button */}
          <Pressable
            onPress={handleFollowOn}
            disabled={!canSubmit || loading}
            style={{ marginTop: 32 }}
          >
            <LinearGradient
              colors={canSubmit && !loading ? ["#333372", "#36B0E6"] : ["#C2CDD8", "#C2CDD8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtn}
            >
              <Text style={styles.nextBtnText}>
                {loading ? "Sending invitation..." : "Follow On"}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(tabs)" as any)}
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Relation picker modal */}
      <Modal
        visible={relationPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRelationPickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRelationPickerVisible(false)}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Relation</Text>
            {RELATION_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[
                  styles.modalOption,
                  relation === opt && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setRelation(opt);
                  setRelationPickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    relation === opt && styles.modalOptionTextActive,
                  ]}
                >
                  {opt}
                </Text>
                {relation === opt && (
                  <Ionicons name="checkmark-circle" size={20} color="#333372" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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

  inputBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 14, height: 52, paddingHorizontal: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1A3050" },

  rowBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 14, height: 52, paddingHorizontal: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  rowBtnText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1A3050" },
  rowBtnPlaceholder: { color: "#B0BBC8", fontWeight: "400" },

  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EBF5FF", borderRadius: 14, padding: 14, marginTop: 24,
    borderWidth: 1, borderColor: "#BDE0F8",
  },
  infoText: { flex: 1, fontSize: 13, fontWeight: "500", color: "#2C3E8C", lineHeight: 20 },

  nextBtn: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  nextBtnText: { fontSize: 17, fontWeight: "900", color: "#fff", letterSpacing: 0.3 },

  skipBtn: { alignItems: "center", paddingVertical: 16 },
  skipText: { fontSize: 14, fontWeight: "600", color: "#8A94A6" },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#DDE3EC",
    alignSelf: "center", marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1A3050", marginBottom: 12 },
  modalOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: "#F2F4F8",
  },
  modalOptionActive: { backgroundColor: "#F0F4FF", borderRadius: 10, paddingHorizontal: 10 },
  modalOptionText: { fontSize: 15, fontWeight: "600", color: "#4A5568" },
  modalOptionTextActive: { color: "#333372", fontWeight: "700" },
});
