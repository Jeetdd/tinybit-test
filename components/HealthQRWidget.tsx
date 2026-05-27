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

// ── Condition display labels ──────────────────────────────────────────────────
const CONDITION_LABELS: Record<string, string> = {
  none: "",
  diabetes: "Diabetes",
  pre_diabetes: "Pre-Diabetes",
  cholesterol: "High Cholesterol",
  hypertension: "Hypertension",
  pcos: "PCOS",
  thyroid: "Thyroid Disorder",
  physical_injury: "Physical Injury",
  stress_anxiety: "Stress / Anxiety",
  sleep_issues: "Sleep Issues",
  depression: "Depression",
  anger_issues: "Anger Issues",
  loneliness: "Loneliness",
  relationship_stress: "Relationship Stress",
  others: "Other",
};

function esc(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── QR widget rendered in-app ─────────────────────────────────────────────────
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

// ── PDF HTML builder — matches the reference design ──────────────────────────
function buildPDFHtml(params: {
  profileData: Record<string, any>;
  medicines: Array<Record<string, any>>;
  qrDataUrl: string | null;
  date: string;
  cardId: string;
}) {
  const { profileData: p, medicines, qrDataUrl, date, cardId } = params;

  // ── Basic patient info ──
  const name =
    p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    "Unknown";
  const bloodGroup = p.blood_group || "—";
  const age    = p.age ? String(p.age) : "";
  const gender = p.biological_sex
    ? p.biological_sex.charAt(0).toUpperCase() + p.biological_sex.slice(1)
    : "";
  const dob = p.date_of_birth
    ? new Date(p.date_of_birth).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : "";

  // Avatar: use stored URL or a reliable text-based placeholder
  const avatarInitial = (name.trim()[0] || "?").toUpperCase();
  const avatarHtml = p.avatar_url
    ? `<img src="${esc(p.avatar_url)}" width="64" height="64"
          style="width:64px;height:64px;border-radius:50%;border:2px solid #e8edf3;object-fit:cover;" alt="${esc(avatarInitial)}" />`
    : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#304b76,#4b99ca);
          display:flex;align-items:center;justify-content:center;
          font-size:26px;font-weight:900;color:#fff;flex-shrink:0;">${esc(avatarInitial)}</div>`;

  // ── Conditions ──
  const rawConditions: string[] = Array.isArray(p.medical_conditions) ? p.medical_conditions : [];
  const conditionLabels = rawConditions
    .filter((c) => c !== "none")
    .map((c) => CONDITION_LABELS[c] ?? c)
    .filter(Boolean);
  if (p.other_condition?.trim()) conditionLabels.push(p.other_condition.trim());

  const condChips =
    conditionLabels.length > 0
      ? conditionLabels
          .map(
            (c) =>
              `<span style="display:inline-block;background:#dbeafe;color:#1e40af;border-radius:20px;
                padding:5px 13px;font-size:12px;font-weight:700;margin:3px 3px 0 0;">${esc(c)}</span>`
          )
          .join("")
      : `<span style="color:#b0bcc8;font-style:italic;font-size:12px;">None on file</span>`;

  // ── Allergies ──
  const allergies: string[] = Array.isArray(p.allergies) ? p.allergies : [];
  const allergyChips =
    allergies.length > 0
      ? allergies
          .map(
            (a) =>
              `<span style="display:inline-block;background:#fee2e2;color:#dc2626;border-radius:20px;
                padding:5px 13px;font-size:12px;font-weight:700;margin:3px 3px 0 0;">${esc(a)}</span>`
          )
          .join("")
      : `<span style="color:#b0bcc8;font-style:italic;font-size:12px;">None on file</span>`;

  // ── Emergency contact ──
  const emergencyName     = p.emergency_name     || "";
  const emergencyRelation = p.emergency_relation || "";
  const emergencyPhone    = p.emergency_phone    || "";
  const hasEmergency = emergencyName || emergencyPhone;

  const emergencySection = hasEmergency
    ? `<div style="margin:0 20px 16px;background:#fff;border:1px solid #e8edf3;border-radius:14px;padding:16px;">
        <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;color:#6b7a8d;text-transform:uppercase;margin-bottom:12px;">
          &#128682; Emergency Contact
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div>
            <div style="font-size:16px;font-weight:800;color:#1a2030;">${esc(emergencyName)}</div>
            ${emergencyRelation ? `<div style="font-size:13px;color:#6b7a8d;margin-top:2px;">${esc(emergencyRelation)}</div>` : ""}
          </div>
          ${emergencyPhone
            ? `<div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:16px;">&#128222;</span>
                <span style="font-size:14px;font-weight:700;color:#2563eb;">${esc(emergencyPhone)}</span>
               </div>`
            : ""}
        </div>
      </div>`
    : "";

  // ── Medications ──
  const medCards =
    medicines.length > 0
      ? medicines
          .map((m) => {
            const doseStr = [m.dosage, m.dosage_unit].filter(Boolean).join(" ");
            const freqMap: Record<string, string> = {
              once: "Daily", twice: "Twice Daily", thrice: "Three Times Daily",
              four_times: "Four Times Daily", as_needed: "As Needed",
              weekly: "Weekly", monthly: "Monthly",
            };
            const freq = freqMap[m.frequency] ?? m.frequency ?? "Daily";
            const timeStr =
              m.time ||
              (m.schedule_time === "Morning" ? "8:00 AM"
                : m.schedule_time === "Afternoon" ? "12:00 PM"
                : m.schedule_time === "Night" ? "8:00 PM"
                : "");
            return `<div style="display:flex;align-items:center;justify-content:space-between;
                      background:#fff;border:1px solid #e8edf3;border-radius:12px;
                      padding:14px 16px;margin-bottom:10px;">
              <div>
                <div style="font-size:15px;font-weight:700;color:#1a2030;">${esc(m.name)}</div>
                <div style="font-size:12px;color:#6b7a8d;margin-top:4px;">${esc(doseStr ? doseStr + " — " + freq : freq)}</div>
              </div>
              ${timeStr
                ? `<div style="background:#f0f4f8;border-radius:8px;padding:8px 13px;
                    font-size:13px;font-weight:700;color:#1a2030;white-space:nowrap;">${esc(timeStr)}</div>`
                : ""}
            </div>`;
          })
          .join("")
      : `<p style="color:#b0bcc8;font-style:italic;text-align:center;padding:16px 0;font-size:13px;">
          No active medications on file</p>`;

  // ── QR code image ──
  const qrSection = qrDataUrl
    ? `<img src="${qrDataUrl}" style="width:180px;height:180px;display:block;" alt="QR Code" />`
    : `<div style="width:180px;height:180px;background:#f0f4f8;display:flex;align-items:center;
        justify-content:center;font-size:12px;color:#9aa5b4;">QR unavailable</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Emergency Health Card</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #f7f9fc;
      color: #1a2030;
    }
    .page {
      max-width: 480px;
      margin: 0 auto;
      background: #fff;
    }
    /* Header bar */
    .top-bar {
      background: #fff;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #f0f4f8;
    }
    .logo-row { display: flex; align-items: center; gap: 8px; }
    .logo-circle {
      width: 32px; height: 32px; border-radius: 50%;
      background: #1a3050;
      display: flex; align-items: center; justify-content: center;
    }
    .logo-inner {
      width: 14px; height: 14px;
      border: 2.5px solid #fff; border-radius: 50%;
    }
    .logo-name { font-size: 16px; font-weight: 800; color: #1a2030; }
    .print-icon { font-size: 20px; color: #6b7a8d; }

    /* Title block */
    .title-block {
      background: #fff;
      padding: 20px 20px 16px;
      text-align: center;
      border-bottom: 1px solid #f0f4f8;
    }
    .emergency-badge {
      display: inline-block;
      background: #dc2626; color: #fff;
      font-size: 11px; font-weight: 800;
      letter-spacing: 1.5px; text-transform: uppercase;
      padding: 5px 16px; border-radius: 4px;
      margin-bottom: 12px;
    }
    .card-title { font-size: 22px; font-weight: 800; color: #1a2030; margin-bottom: 5px; }
    .card-subtitle { font-size: 13px; color: #6b7a8d; margin-bottom: 14px; }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px; color: #9aa5b4;
    }

    /* Patient card */
    .patient-card {
      margin: 16px 20px;
      background: #fff;
      border: 1px solid #e8edf3;
      border-radius: 16px;
      padding: 16px;
    }
    .patient-inner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .patient-info { flex: 1; }
    .patient-name { font-size: 17px; font-weight: 800; color: #1a2030; }
    .patient-detail { font-size: 13px; color: #6b7a8d; margin-top: 3px; }
    .blood-badge {
      background: #dc2626; color: #fff;
      border-radius: 8px; padding: 6px 10px;
      text-align: center; flex-shrink: 0;
    }
    .blood-label { font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
    .blood-value { font-size: 20px; font-weight: 900; line-height: 1.1; margin-top: 2px; }

    /* Conditions & Allergies */
    .cond-allergy-row { display: flex; margin: 0 20px 16px; }
    .conditions-col {
      flex: 1;
      background: #eff6ff;
      border-radius: 12px 0 0 12px;
      padding: 14px;
      border: 1px solid #bfdbfe;
      border-right: none;
    }
    .allergies-col {
      flex: 1;
      background: #fef2f2;
      border-radius: 0 12px 12px 0;
      padding: 14px;
      border: 1px solid #fecaca;
    }
    .col-label {
      font-size: 9px; font-weight: 800; letter-spacing: 1.2px;
      text-transform: uppercase; margin-bottom: 8px;
    }
    .conditions-col .col-label { color: #3b82f6; }
    .allergies-col  .col-label { color: #dc2626; }

    /* Medications */
    .section-wrap { margin: 0 20px 16px; }
    .section-label-head {
      font-size: 10px; font-weight: 800; letter-spacing: 1.2px;
      color: #6b7a8d; text-transform: uppercase; margin-bottom: 12px;
    }

    /* QR section */
    .qr-section { margin: 0 20px 20px; text-align: center; }
    .qr-frame {
      display: inline-block;
      position: relative;
      padding: 20px;
      border: 2px dashed #d1d5db;
      border-radius: 16px;
      background: #fff;
    }
    .qr-caption { font-size: 13px; font-weight: 700; color: #1a2030; margin: 10px 0 4px; }
    .qr-hints { display: flex; justify-content: center; gap: 20px; font-size: 11px; color: #6b7a8d; }

    /* Footer */
    .footer {
      border-top: 1px solid #f0f4f8;
      padding: 16px 20px;
      text-align: center;
    }
    .footer-brand { font-size: 13px; font-weight: 700; color: #2563eb; margin-bottom: 8px; }
    .footer-note { font-size: 11px; color: #6b7a8d; line-height: 1.6; margin-bottom: 6px; }
    .footer-disclaimer { font-size: 11px; color: #dc2626; line-height: 1.6; margin-bottom: 10px; }
    .footer-links { font-size: 11px; color: #9aa5b4; }
    .footer-links a { color: #9aa5b4; text-decoration: underline; }
  </style>
</head>
<body>
<div class="page">

  <!-- Top bar -->
  <div class="top-bar">
    <div class="logo-row">
      <div class="logo-circle"><div class="logo-inner"></div></div>
      <span class="logo-name">TinyBit</span>
    </div>
    <span class="print-icon">&#128424;</span>
  </div>

  <!-- Title block -->
  <div class="title-block">
    <div class="emergency-badge">EMERGENCY</div>
    <div class="card-title">Emergency Health Card</div>
    <div class="card-subtitle">Instant access to critical medical information</div>
    <div class="meta-row">
      <span>Generated: ${esc(date)}</span>
      <span>ID: ${esc(cardId)}</span>
    </div>
  </div>

  <!-- Patient card -->
  <div class="patient-card">
    <div class="patient-inner">
      ${avatarHtml}
      <div class="patient-info">
        <div class="patient-name">${esc(name)}</div>
        ${age    ? `<div class="patient-detail">Age: ${esc(age)}</div>`    : ""}
        ${gender ? `<div class="patient-detail">Gender: ${esc(gender)}</div>` : ""}
        ${dob    ? `<div class="patient-detail">DOB: ${esc(dob)}</div>`    : ""}
      </div>
      <div class="blood-badge">
        <div class="blood-label">BLOOD</div>
        <div class="blood-value">${esc(bloodGroup)}</div>
      </div>
    </div>
  </div>

  <!-- Conditions & Allergies -->
  <div class="cond-allergy-row">
    <div class="conditions-col">
      <div class="col-label">Conditions</div>
      <div>${condChips}</div>
    </div>
    <div class="allergies-col">
      <div class="col-label">Allergies</div>
      <div>${allergyChips}</div>
    </div>
  </div>

  <!-- Emergency Contact -->
  ${emergencySection}

  <!-- Active Medications -->
  <div class="section-wrap">
    <div class="section-label-head">Active Medications</div>
    ${medCards}
  </div>

  <!-- QR Code -->
  <div class="qr-section">
    <div class="qr-frame">
      ${qrSection}
    </div>
    <div class="qr-caption">Scan to access medical profile</div>
    <div class="qr-hints">
      <span>&#128241; No app required</span>
      <span>&#128274; Secure access</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">Generated by TinyBit</div>
    <div class="footer-note">
      Privacy protected note: This document contains sensitive medical information.
      Only share with authorized emergency personnel.
    </div>
    <div class="footer-disclaimer">
      Emergency use disclaimer: TinyBit is an information system
      and does not provide medical advice.
    </div>
    <div class="footer-links">
      Privacy Policy &nbsp;|&nbsp; Terms of Service
    </div>
  </div>

</div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function HealthQRWidget() {
  const { user, profile } = useAuth();
  const [scanUrl, setScanUrl]     = useState<string | null>(null);
  const [error, setError]         = useState(false);
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

  const name        = profile?.fullName || profile?.firstName || "—";
  const bloodGroup  = profile?.bloodGroup || "—";
  const emergency   = profile?.emergencyName
    ? `${profile.emergencyName}${profile.emergencyPhone ? " · " + profile.emergencyPhone : ""}`
    : profile?.emergencyPhone || "Not set";
  const conditions  = (profile?.medicalConditions?.length ?? 0) > 0
    ? profile!.medicalConditions!.slice(0, 3).map(c => CONDITION_LABELS[c] || c).join(", ")
    : "None recorded";

  // ── Generate & download PDF ─────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!user?.id) {
      Alert.alert("Not signed in", "Please sign in to download your health card.");
      return;
    }
    setPdfLoading(true);
    try {
      // 1. Auth token for server call
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // 2. Get QR as base64 data URL from server
      let qrDataUrl: string | null = null;
      if (authToken) {
        try {
          const qrRes = await fetch(`${API_BASE_URL}/health-card/qr`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          const qrJson = await qrRes.json();
          qrDataUrl = qrJson?.data?.qrDataUrl ?? null;
        } catch { /* non-fatal */ }
      }

      // 3. Full profile from Supabase (includes allergies, date_of_birth, biological_sex etc.)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      // 4. Active medicines
      const { data: meds } = await supabase
        .from("medicines")
        .select("name, dosage, dosage_unit, time, schedule_time, frequency")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .limit(10);

      // 5. Build card metadata
      const date   = new Date().toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
      const rawId  = user!.id.replace(/-/g, "").toUpperCase();
      const cardId = `TBIT-${rawId.slice(0, 4)}-${rawId.slice(4, 5)}`;

      // 6. Generate HTML + print to PDF
      const html = buildPDFHtml({
        profileData: profileData ?? {},
        medicines:   meds ?? [],
        qrDataUrl,
        date,
        cardId,
      });

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save or Share Health Card PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Created", "Your health card PDF has been generated successfully.");
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
          style={[s.actionBtn, s.pdfBtn, pdfLoading && { opacity: 0.6 }]}
          onPress={handleDownloadPDF}
          disabled={pdfLoading}
        >
          {pdfLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.actionBtnIcon}>📄</Text>
          }
          <Text style={s.actionBtnText}>{pdfLoading ? "Generating…" : "Download PDF"}</Text>
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

// ── Styles ────────────────────────────────────────────────────────────────────
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
  headerDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e53935" },
  headerText: { flex: 1, fontSize: 13, fontWeight: "700", color: "white", letterSpacing: 0.3 },
  headerSub:  { fontSize: 11, color: "rgba(255,255,255,0.6)" },

  body: { flexDirection: "row", padding: 14, gap: 12, alignItems: "center" },

  infoCol:   { flex: 1, gap: 8 },
  infoName:  { fontSize: 16, fontWeight: "700", color: "#1A3050", marginBottom: 2 },
  infoRow:   { gap: 3 },
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
  scanHint:  { fontSize: 10, color: "#9aa5b4", letterSpacing: 0.3 },
  errorText: { fontSize: 11, color: "#9aa5b4", textAlign: "center", lineHeight: 16 },

  actionRow: {
    flexDirection: "row", gap: 10, paddingHorizontal: 14,
    paddingBottom: 14, paddingTop: 4,
  },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 11, borderRadius: 12,
  },
  pdfBtn:       { backgroundColor: "#1A3050" },
  shareBtn:     { backgroundColor: "#EBF4FF", borderWidth: 1.5, borderColor: "#BFDBFE" },
  actionBtnIcon: { fontSize: 15 },
  actionBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});
