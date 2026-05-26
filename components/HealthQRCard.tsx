import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import ViewShot from "react-native-view-shot";
import { supabase } from "../utils/supabase";
import { API_BASE_URL } from "../config/api";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type QRState = {
  qrDataUrl: string;
  scanUrl: string;
  expiresAt: string;
} | null;

export default function HealthQRCard({ visible, onClose }: Props) {
  const [qrData, setQrData] = useState<QRState>(null);
  const [loading, setLoading] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const fetchQR = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${API_BASE_URL}/health-card/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load QR");
      setQrData(json.data);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not load health card. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const shareQR = async () => {
    if (!qrData) return;
    try {
      if ((await Sharing.isAvailableAsync()) && viewShotRef.current) {
        const uri = await (viewShotRef.current as any).capture();
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share Health QR Card" });
      } else {
        await Share.share({ message: `My TinyBit Emergency Health Card: ${qrData.scanUrl}` });
      }
    } catch {
      // user dismissed — no-op
    }
  };

  const formatExpiry = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    } catch {
      return iso;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Emergency Health Card</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color="#1A3050" />
          </TouchableOpacity>
        </View>

        <View style={s.body}>
          {/* Info banner */}
          <View style={s.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#3EA0DC" />
            <Text style={s.infoText}>
              Scan this QR code in an emergency to instantly view your health details — no app needed.
            </Text>
          </View>

          {loading ? (
            <View style={s.centered}>
              <ActivityIndicator size="large" color="#3EA0DC" />
              <Text style={s.loadingText}>Loading your health card…</Text>
            </View>
          ) : qrData ? (
            <>
              {/* QR Code image */}
              <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }} style={s.qrWrapper}>
                <View style={s.qrInner}>
                  <View style={s.qrLabelRow}>
                    <Ionicons name="medkit" size={16} color="#e53935" />
                    <Text style={s.qrLabel}>TinyBit Health — Emergency Card</Text>
                  </View>
                  <Image
                    source={{ uri: qrData.qrDataUrl }}
                    style={s.qrImage}
                    resizeMode="contain"
                  />
                  <Text style={s.qrHint}>Point camera to scan</Text>
                </View>
              </ViewShot>

              {/* Expiry */}
              <View style={s.expiryRow}>
                <Ionicons name="time-outline" size={14} color="#6b7a8d" />
                <Text style={s.expiryText}>Valid until {formatExpiry(qrData.expiresAt)}</Text>
              </View>

              {/* Actions */}
              <View style={s.actions}>
                <TouchableOpacity style={s.shareBtn} onPress={shareQR}>
                  <Ionicons name="share-outline" size={18} color="white" />
                  <Text style={s.shareBtnText}>Share QR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.refreshBtn} onPress={fetchQR}>
                  <Ionicons name="refresh-outline" size={18} color="#1A3050" />
                  <Text style={s.refreshBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {/* Security note */}
              <View style={s.securityNote}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#27ae60" />
                <Text style={s.securityText}>
                  A unique private link is used — no personal data is stored in the QR itself.
                </Text>
              </View>
            </>
          ) : (
            <View style={s.generateArea}>
              <View style={s.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={80} color="#B2BDCE" />
              </View>
              <Text style={s.generateTitle}>Generate Your Health QR</Text>
              <Text style={s.generateSub}>
                Creates a secure, scannable card with your blood group, emergency contacts, conditions, and medications.
              </Text>
              <TouchableOpacity style={s.generateBtn} onPress={fetchQR}>
                <Ionicons name="qr-code" size={20} color="white" />
                <Text style={s.generateBtnText}>Generate Health QR</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A3050" },

  body: { flex: 1, padding: 16 },

  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EBF6FF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, color: "#1A3050", lineHeight: 18 },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#6b7a8d" },

  qrWrapper: { alignSelf: "center", borderRadius: 16, overflow: "hidden" },
  qrInner: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  qrLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  qrLabel: { fontSize: 12, fontWeight: "600", color: "#e53935", letterSpacing: 0.5 },
  qrImage: { width: 220, height: 220 },
  qrHint: { fontSize: 11, color: "#aab0bb", marginTop: 12, letterSpacing: 0.5 },

  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    justifyContent: "center",
    marginTop: 14,
  },
  expiryText: { fontSize: 12, color: "#6b7a8d" },

  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#304B76",
    borderRadius: 12,
    paddingVertical: 13,
  },
  shareBtnText: { color: "white", fontWeight: "600", fontSize: 15 },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F0F4F8",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  refreshBtnText: { color: "#1A3050", fontWeight: "600", fontSize: 15 },

  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 16,
    backgroundColor: "#f0faf3",
    borderRadius: 8,
    padding: 10,
  },
  securityText: { flex: 1, fontSize: 12, color: "#2d6a4f", lineHeight: 17 },

  generateArea: { alignItems: "center", paddingTop: 10 },
  qrPlaceholder: {
    width: 180,
    height: 180,
    backgroundColor: "white",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 24,
  },
  generateTitle: { fontSize: 18, fontWeight: "700", color: "#1A3050", marginBottom: 8 },
  generateSub: {
    fontSize: 14,
    color: "#6b7a8d",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e53935",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 24,
    shadowColor: "#e53935",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
});
