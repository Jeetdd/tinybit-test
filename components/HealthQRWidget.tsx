import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import * as Crypto from "expo-crypto";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";

// Pure-JS QR matrix generator — no Metro bundler issues
// @ts-ignore — qrcode-generator ships CJS without TS declarations
import qrcode from "qrcode-generator";

const SERVER_URL = API_BASE_URL.replace("/api", "");
const QR_PX = 160;

function QRMatrix({ url }: { url: string }) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const count = qr.getModuleCount();
  const cell = QR_PX / count;
  return (
    <Svg width={QR_PX} height={QR_PX}>
      {Array.from({ length: count }, (_, row) =>
        Array.from({ length: count }, (_, col) =>
          qr.isDark(row, col) ? (
            <Rect
              key={`${row}-${col}`}
              x={col * cell} y={row * cell}
              width={cell + 0.5} height={cell + 0.5}
              fill="#1A3050"
            />
          ) : null
        )
      )}
    </Svg>
  );
}

// ── PDF HTML template ──────────────────────────────────────────────────────────
function buildPDFHtml(params: {
  name: string; bloodGroup: string; emergency: string;
  conditions: string; qrUrl: string; medicines: string;
  date: string;
}) {
  const { name, bloodGroup, emergency, conditions, qrUrl, medicines, date } = params;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #f4f7fb; }
  .card { max-width: 700px; margin: 40px auto; background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
  .top-band { background: linear-gradient(135deg, #1A3050, #2B7FC0); padding: 28px 32px; color: #fff; display: flex; justify-content: space-between; align-items: flex-start; }
  .app-name { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.7; margin-bottom: 6px; }
  .card-title { font-size: 22px; font-weight: bold; }
  .card-sub { font-size: 13px; opacity: 0.7; margin-top: 4px; }
  .red-dot { width: 10px; height: 10px; background: #e53935; border-radius: 50%; display: inline-block; margin-right: 6px; }
  .body { display: flex; gap: 28px; padding: 32px; }
  .info-col { flex: 1; }
  .section-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9aa5b4; margin-bottom: 4px; margin-top: 18px; }
  .section-label:first-child { margin-top: 0; }
  .section-value { font-size: 16px; font-weight: bold; color: #1A3050; }
  .blood-badge { display: inline-block; background: #fff0f0; border: 1px solid #ffcdd2; border-radius: 6px; padding: 4px 14px; font-size: 20px; font-weight: bold; color: #c62828; }
  .qr-col { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .qr-box { background: #fff; border: 1.5px solid #e8edf3; border-radius: 12px; padding: 14px; }
  .qr-img { width: 170px; height: 170px; }
  .qr-hint { font-size: 11px; color: #9aa5b4; text-align: center; }
  .footer { background: #f8fafc; border-top: 1px solid #f0f4f8; padding: 14px 32px; display: flex; justify-content: space-between; align-items: center; }
  .footer-left { font-size: 11px; color: #9aa5b4; }
  .emergency-chip { background: #fef2f2; border: 1px solid #fecaca; border-radius: 20px; padding: 6px 16px; font-size: 12px; color: #dc2626; font-weight: bold; }
  .generated { font-size: 11px; color: #9aa5b4; }
</style>
</head>
<body>
<div class="card">
  <div class="top-band">
    <div>
      <div class="app-name">TinyBit</div>
      <div class="card-title"><span class="red-dot"></span>Emergency Health Card</div>
      <div class="card-sub">Scan QR code for instant health info — no app needed</div>
    </div>
  </div>

  <div class="body">
    <div class="info-col">
      <div class="section-label">Full Name</div>
      <div class="section-value">${name}</div>

      <div class="section-label">Blood Group</div>
      <div class="blood-badge">${bloodGroup}</div>

      ${conditions ? `<div class="section-label">Medical Conditions</div>
      <div class="section-value">${conditions}</div>` : ''}

      <div class="section-label">Emergency Contact</div>
      <div class="section-value">${emergency}</div>

      ${medicines ? `<div class="section-label">Current Medicines</div>
      <div class="section-value" style="font-size:14px">${medicines}</div>` : ''}
    </div>

    <div class="qr-col">
      <div class="qr-box">
        <img src="${qrUrl}" class="qr-img" alt="Health QR Code" />
      </div>
      <div class="qr-hint">Point camera to scan</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">
      <div class="emergency-chip">⚠️ Emergency Health Card</div>
    </div>
    <div class="generated">Generated by TinyBit · ${date}</div>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function HealthQRWidget() {
  const { user, profile } = useAuth();
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadOrCreateToken();
  }, [user?.id]);

  const loadOrCreateToken = async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from("profiles")
        .select("health_qr_token, health_qr_expires_at")
        .eq("id", user!.id)
        .single();

      if (fetchErr) { setError(true); return; }

      let token: string = data?.health_qr_token;
      const expiry: string | null = data?.health_qr_expires_at;
      const expired = expiry && new Date(expiry) < new Date();

      if (!token || expired) {
        token = Crypto.randomUUID();
        const newExpiry = new Date();
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ health_qr_token: token, health_qr_expires_at: newExpiry.toISOString() })
          .eq("id", user!.id);
        if (updateErr) { setError(true); return; }
      }

      setScanUrl(`${SERVER_URL}/api/health-card/${token}`);
    } catch { setError(true); }
  };

  const name = profile?.fullName || profile?.firstName || "—";
  const bloodGroup = profile?.bloodGroup || "—";
  const emergency = profile?.emergencyName
    ? `${profile.emergencyName}${profile.emergencyPhone ? " · " + profile.emergencyPhone : ""}`
    : profile?.emergencyPhone || "Not set";
  const conditions = (profile?.medicalConditions?.length ?? 0) > 0
    ? profile!.medicalConditions!.slice(0, 3).join(", ")
    : "None recorded";

  // ── Generate & download PDF ─────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!scanUrl) {
      Alert.alert("QR Not Ready", "Please wait for the QR code to load first.");
      return;
    }
    setPdfLoading(true);
    try {
      const qrImgUrl = scanUrl;           // we'll embed as link; can use server QR image
      const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

      // Build medicines list
      let medicinesText = "";
      try {
        const { data: meds } = await supabase
          .from("medicines")
          .select("name, dosage, time")
          .eq("user_id", user!.id)
          .limit(10);
        if (meds && meds.length > 0) {
          medicinesText = meds.map((m: any) => `${m.name} (${m.dosage ?? ""}${m.time ? " — " + m.time : ""})`).join(", ");
        }
      } catch { /* ignore */ }

      const html = buildPDFHtml({
        name,
        bloodGroup,
        emergency,
        conditions,
        qrUrl: `${API_BASE_URL.replace("/api", "")}/api/qr-image?url=${encodeURIComponent(scanUrl)}`,
        medicines: medicinesText,
        date,
      });

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save / Share Health Card PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Created", `Your health card PDF has been saved to:\n${uri}`);
      }
    } catch (e: any) {
      Alert.alert("PDF Error", e?.message ?? "Could not generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Share QR scan URL directly ──────────────────────────────────────────────
  const handleShareURL = async () => {
    if (!scanUrl) return;
    try {
      const { Share } = require("react-native");
      await Share.share({
        title: "My TinyBit Emergency Health Card",
        message: `Here is my Emergency Health QR Card:\n${scanUrl}\n\nGenerated by TinyBit`,
      });
    } catch { /* user dismissed */ }
  };

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerDot} />
        <Text style={s.headerText}>Emergency Health QR</Text>
        <Text style={s.headerSub}>Scan for instant health info</Text>
      </View>

      <View style={s.body}>
        {/* Left — health info */}
        <View style={s.infoCol}>
          <Text style={s.infoName} numberOfLines={2}>{name}</Text>

          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Blood</Text>
            <View style={s.bloodBadge}>
              <Text style={s.bloodText}>{bloodGroup}</Text>
            </View>
          </View>

          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Condition</Text>
            <Text style={s.infoValue} numberOfLines={2}>{conditions}</Text>
          </View>

          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Emergency</Text>
            <Text style={s.infoValue} numberOfLines={2}>{emergency}</Text>
          </View>
        </View>

        {/* Right — QR */}
        <View style={s.qrCol}>
          {scanUrl ? (
            <View style={s.qrBox}>
              <QRMatrix url={scanUrl} />
            </View>
          ) : error ? (
            <View style={s.qrBox}>
              <Text style={s.errorText}>Run migration{"\n"}030 first</Text>
            </View>
          ) : (
            <View style={s.qrBox}>
              <ActivityIndicator color="#304B76" />
            </View>
          )}
          <Text style={s.scanHint}>Point camera to scan</Text>
        </View>
      </View>

      {/* ── PDF / Share Action Buttons ── */}
      <View style={s.actionRow}>
        <Pressable
          style={[s.actionBtn, s.pdfBtn, (!scanUrl || pdfLoading) && { opacity: 0.5 }]}
          onPress={handleDownloadPDF}
          disabled={!scanUrl || pdfLoading}
        >
          {pdfLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.actionBtnIcon}>📄</Text>
          }
          <Text style={s.actionBtnText}>{pdfLoading ? "Generating..." : "Download PDF"}</Text>
        </Pressable>

        <Pressable
          style={[s.actionBtn, s.shareBtn, !scanUrl && { opacity: 0.5 }]}
          onPress={handleShareURL}
          disabled={!scanUrl}
        >
          <Text style={s.actionBtnIcon}>🔗</Text>
          <Text style={[s.actionBtnText, { color: "#304B76" }]}>Share QR Link</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, backgroundColor: "white", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#1A3050", paddingHorizontal: 14, paddingVertical: 10,
  },
  headerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e53935" },
  headerText: { flex: 1, fontSize: 13, fontWeight: "700", color: "white", letterSpacing: 0.3 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.6)" },

  body: { flexDirection: "row", padding: 14, gap: 12, alignItems: "center" },

  infoCol: { flex: 1, gap: 8 },
  infoName: { fontSize: 16, fontWeight: "700", color: "#1A3050", marginBottom: 2 },
  infoRow: { gap: 3 },
  infoLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "#9aa5b4", fontWeight: "600" },
  infoValue: { fontSize: 13, color: "#2d3a4a", lineHeight: 17 },
  bloodBadge: {
    alignSelf: "flex-start", backgroundColor: "#fff0f0",
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: "#ffcdd2",
  },
  bloodText: { fontSize: 15, fontWeight: "800", color: "#c62828" },

  qrCol: { alignItems: "center", gap: 6 },
  qrBox: {
    width: QR_PX + 12, height: QR_PX + 12, backgroundColor: "white",
    borderRadius: 10, borderWidth: 1, borderColor: "#e8edf3",
    alignItems: "center", justifyContent: "center", padding: 6,
  },
  scanHint: { fontSize: 10, color: "#9aa5b4", letterSpacing: 0.3 },
  errorText: { fontSize: 11, color: "#9aa5b4", textAlign: "center", lineHeight: 16 },

  // Action buttons
  actionRow: {
    flexDirection: "row", gap: 10, paddingHorizontal: 14,
    paddingBottom: 14, paddingTop: 4,
  },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 11, borderRadius: 12,
  },
  pdfBtn: { backgroundColor: "#1A3050" },
  shareBtn: { backgroundColor: "#EBF4FF", borderWidth: 1.5, borderColor: "#BFDBFE" },
  actionBtnIcon: { fontSize: 15 },
  actionBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});
