/**
 * AI Calorie Calculator — TinyBit
 * Uses Claude Vision API via backend to analyze food images
 */

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../utils/supabase";
import { API_BASE_URL } from "../config/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FoodAnalysis {
  detected: boolean;
  foodItems: string[];
  totalCalories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number;
  vitamins: string[];
  healthScore: number;
  healthRating: "Excellent" | "Good" | "Moderate" | "Poor";
  portionSize: string;
  servingInfo: string;
  suggestions: string[];
  dietaryTags?: string[];
  glycemicIndex?: string;
}

interface DailyLog {
  id: string;
  time: string;
  imageUri?: string;
  foodItems: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getRatingColor(rating: string): string {
  switch (rating) {
    case "Excellent": return "#10B981";
    case "Good": return "#3B82F6";
    case "Moderate": return "#F59E0B";
    case "Poor": return "#EF4444";
    default: return "#64748B";
  }
}

function getHealthScoreColor(score: number): string {
  if (score >= 8) return "#10B981";
  if (score >= 6) return "#3B82F6";
  if (score >= 4) return "#F59E0B";
  return "#EF4444";
}

const DAILY_STORAGE_KEY = "tinybit_calorie_log_v1";

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function CalorieCalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dailyLog, setDailyLog] = useState<DailyLog[]>([]);
  const [dailyCalories, setDailyCalories] = useState(0);
  const [dailyGoal] = useState(2000);

  useEffect(() => { loadDailyLog(); }, []);

  const loadDailyLog = async () => {
    try {
      const raw = await AsyncStorage.getItem(`${DAILY_STORAGE_KEY}_${todayKey()}`);
      if (raw) {
        const logs: DailyLog[] = JSON.parse(raw);
        setDailyLog(logs);
        setDailyCalories(logs.reduce((sum, l) => sum + l.calories, 0));
      }
    } catch { /* ignore */ }
  };

  const saveDailyLog = async (newLogs: DailyLog[]) => {
    try {
      await AsyncStorage.setItem(`${DAILY_STORAGE_KEY}_${todayKey()}`, JSON.stringify(newLogs));
    } catch { /* ignore */ }
  };

  // ── Pick from camera or gallery ────────────────────────────────────────────
  const pickImage = async (source: "camera" | "gallery") => {
    try {
      let result;
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera access is needed to scan food.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Photo library access is needed.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
        setAnalysis(null);
        setAnalysisError(null);
        await analyzeFood(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not pick image.");
    }
  };

  // ── Send image to backend for Claude Vision analysis ───────────────────────
  const analyzeFood = async (uri: string) => {
    setLoading(true);
    setAnalysisError(null);

    // AbortSignal.timeout() is unsupported in React Native / Hermes — use controller instead
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const mimeType = uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

      const res = await fetch(`${API_BASE_URL}/ai/analyze-food`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ base64, mimeType }),
      });

      const json = await res.json();

      if (!json.success) throw new Error(json.message || "Analysis failed");
      if (!json.data?.detected) {
        setAnalysisError("no_food");
        return;
      }

      setAnalysis(json.data);
    } catch (e: any) {
      const isTimeout = e?.name === "AbortError";
      const isNetwork = /network|fetch/i.test(e?.message ?? "");
      if (isTimeout) {
        setAnalysisError("Analysis timed out. The server took too long to respond. Please try again.");
      } else if (isNetwork) {
        setAnalysisError("Could not reach the server. Check your internet connection.");
      } else {
        setAnalysisError(e.message || "Analysis failed. Please try again.");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  // ── Add to daily log ───────────────────────────────────────────────────────
  const addToDailyLog = () => {
    if (!analysis) return;
    const entry: DailyLog = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      imageUri: imageUri || undefined,
      foodItems: analysis.foodItems,
      calories: analysis.totalCalories,
      protein: analysis.protein,
      carbs: analysis.carbohydrates,
      fat: analysis.fat,
    };
    const newLogs = [entry, ...dailyLog];
    setDailyLog(newLogs);
    setDailyCalories(prev => prev + analysis.totalCalories);
    saveDailyLog(newLogs);
    Alert.alert("Added! ✅", `${analysis.totalCalories} kcal added to today's log.`);
  };

  const removeFromLog = (id: string) => {
    const entry = dailyLog.find(l => l.id === id);
    const newLogs = dailyLog.filter(l => l.id !== id);
    setDailyLog(newLogs);
    if (entry) setDailyCalories(prev => prev - entry.calories);
    saveDailyLog(newLogs);
  };

  const progressPct = Math.min((dailyCalories / dailyGoal) * 100, 100);
  const remaining = Math.max(dailyGoal - dailyCalories, 0);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={["#2B3C86", "#2E9CD6"]}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>🥗 Calorie Calculator</Text>
          <Text style={s.headerSub}>AI-powered food scanner</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={s.scrollSheet}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* ── Daily Calorie Dashboard ── */}
        <View style={s.dashCard}>
          <Text style={s.dashTitle}>Today's Calories</Text>
          <View style={s.dashMain}>
            <View style={s.dashCircle}>
              <Text style={s.dashCalories}>{dailyCalories}</Text>
              <Text style={s.dashKcal}>kcal</Text>
            </View>
            <View style={s.dashStats}>
              <View style={s.dashStatRow}>
                <Text style={s.dashStatLabel}>Goal</Text>
                <Text style={s.dashStatValue}>{dailyGoal} kcal</Text>
              </View>
              <View style={s.dashStatRow}>
                <Text style={s.dashStatLabel}>Remaining</Text>
                <Text style={[s.dashStatValue, { color: remaining > 0 ? "#16A34A" : "#EF4444" }]}>
                  {remaining} kcal
                </Text>
              </View>
              <View style={s.dashStatRow}>
                <Text style={s.dashStatLabel}>Meals</Text>
                <Text style={s.dashStatValue}>{dailyLog.length}</Text>
              </View>
            </View>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressFill, {
              width: `${progressPct}%` as any,
              backgroundColor: progressPct > 90 ? "#EF4444" : progressPct > 70 ? "#F59E0B" : "#16A34A",
            }]} />
          </View>
          <Text style={s.progressLabel}>{Math.round(progressPct)}% of daily goal</Text>
        </View>

        {/* ── Scan Food ── */}
        <Text style={s.sectionTitle}>📸 Scan Food</Text>
        <View style={s.scanCard}>
          {imageUri ? (
            <View style={s.imagePreview}>
              <Image source={{ uri: imageUri }} style={s.foodImage} resizeMode="cover" />
              {loading && (
                <View style={s.analysisOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={s.analysisOverlayText}>Analyzing with AI...</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={s.scanPlaceholder}>
              <Text style={s.scanPlaceholderEmoji}>🍽️</Text>
              <Text style={s.scanPlaceholderText}>Take or upload a food photo</Text>
              <Text style={s.scanPlaceholderSub}>AI will detect the calories and nutrition</Text>
            </View>
          )}

          {/* ── Inline error card ── */}
          {analysisError && !loading && (
            <View style={s.errorCard}>
              <View style={s.errorIconWrap}>
                <Ionicons name="close-circle" size={32} color="#EF4444" />
              </View>
              <Text style={s.errorTitle}>Food Analysis Failed</Text>
              <Text style={s.errorMessage}>
                {analysisError?.startsWith("network::")
                  ? `Could not reach the server.\n\nURL tried:\n${analysisError.replace("network::", "")}`
                  : analysisError === "no_food"
                  ? "No food detected. Please try again with a clearer food photo."
                  : analysisError}
              </Text>
              {imageUri && (
                <Pressable style={s.errorRetryBtn} onPress={() => analyzeFood(imageUri)}>
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={s.errorRetryText}>Try Again</Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={s.scanActions}>
            <Pressable style={[s.scanBtn, { backgroundColor: "#14532D" }]} onPress={() => pickImage("camera")}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={s.scanBtnText}>Camera</Text>
            </Pressable>
            <Pressable style={[s.scanBtn, { backgroundColor: "#1D4ED8" }]} onPress={() => pickImage("gallery")}>
              <Ionicons name="images-outline" size={20} color="#fff" />
              <Text style={s.scanBtnText}>Gallery</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Analysis Results ── */}
        {analysis && !loading && (
          <>
            <Text style={s.sectionTitle}>🔬 Nutrition Analysis</Text>

            {/* Food items detected */}
            <View style={s.analysisCard}>
              <View style={s.analysisHeader}>
                <View>
                  <Text style={s.analysisTitle}>{analysis.foodItems.join(", ")}</Text>
                  <Text style={s.analysisServing}>{analysis.servingInfo} · {analysis.portionSize} portion</Text>
                </View>
                <View style={[s.ratingBadge, { backgroundColor: getRatingColor(analysis.healthRating) }]}>
                  <Text style={s.ratingText}>{analysis.healthRating}</Text>
                </View>
              </View>

              {/* Calories hero */}
              <View style={s.calorieHero}>
                <Text style={s.calorieNum}>{analysis.totalCalories}</Text>
                <Text style={s.calorieUnit}>kcal</Text>
              </View>

              {/* Health score */}
              <View style={s.scoreRow}>
                <Text style={s.scoreLabel}>Health Score</Text>
                <View style={s.scoreBarBg}>
                  <View style={[s.scoreBarFill, {
                    width: `${analysis.healthScore * 10}%` as any,
                    backgroundColor: getHealthScoreColor(analysis.healthScore),
                  }]} />
                </View>
                <Text style={[s.scoreNum, { color: getHealthScoreColor(analysis.healthScore) }]}>
                  {analysis.healthScore}/10
                </Text>
              </View>
            </View>

            {/* Macros */}
            <View style={s.macrosCard}>
              <Text style={s.macrosTitle}>Macronutrients</Text>
              <View style={s.macrosGrid}>
                {[
                  { label: "Protein", value: analysis.protein, unit: "g", color: "#3B82F6", emoji: "💪" },
                  { label: "Carbs", value: analysis.carbohydrates, unit: "g", color: "#F59E0B", emoji: "🌾" },
                  { label: "Fat", value: analysis.fat, unit: "g", color: "#EF4444", emoji: "🥑" },
                  { label: "Fiber", value: analysis.fiber, unit: "g", color: "#10B981", emoji: "🥦" },
                  ...(analysis.sugar !== undefined ? [{ label: "Sugar", value: analysis.sugar, unit: "g", color: "#EC4899", emoji: "🍬" }] : []),
                  ...(analysis.sodium !== undefined ? [{ label: "Sodium", value: analysis.sodium, unit: "mg", color: "#8B5CF6", emoji: "🧂" }] : []),
                ].map(m => (
                  <View key={m.label} style={s.macroItem}>
                    <Text style={s.macroEmoji}>{m.emoji}</Text>
                    <Text style={[s.macroValue, { color: m.color }]}>{m.value}{m.unit}</Text>
                    <Text style={s.macroLabel}>{m.label}</Text>
                    <View style={s.macroBarBg}>
                      <View style={[s.macroBarFill, { width: `${Math.min((m.value / 100) * 100, 100)}%` as any, backgroundColor: m.color }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Vitamins & Tags */}
            {((analysis.vitamins?.length ?? 0) > 0 || (analysis.dietaryTags?.length ?? 0) > 0) && (
              <View style={s.tagsCard}>
                {(analysis.vitamins?.length ?? 0) > 0 && (
                  <>
                    <Text style={s.macrosTitle}>🌿 Vitamins & Minerals</Text>
                    <View style={s.tagsRow}>
                      {(analysis.vitamins ?? []).map((v, i) => (
                        <View key={i} style={s.vitamingTag}>
                          <Text style={s.vitaminText}>{v}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
                {(analysis.dietaryTags?.length ?? 0) > 0 && (
                  <>
                    <Text style={[s.macrosTitle, { marginTop: 12 }]}>🏷️ Dietary Info</Text>
                    <View style={s.tagsRow}>
                      {(analysis.dietaryTags ?? []).map((t, i) => (
                        <View key={i} style={s.dietTag}>
                          <Text style={s.dietTagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                    {analysis.glycemicIndex && (
                      <Text style={s.glycemicText}>Glycemic Index: {analysis.glycemicIndex}</Text>
                    )}
                  </>
                )}
              </View>
            )}

            {/* AI Suggestions */}
            {analysis.suggestions?.length > 0 && (
              <View style={s.suggestionsCard}>
                <Text style={s.macrosTitle}>💡 AI Suggestions</Text>
                {analysis.suggestions.map((sg, i) => (
                  <View key={i} style={s.suggestionRow}>
                    <View style={s.suggDot} />
                    <Text style={s.suggestionText}>{sg}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Add to log */}
            <Pressable style={s.addLogBtn} onPress={addToDailyLog}>
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={s.addLogText}>Add to Today's Log (+{analysis.totalCalories} kcal)</Text>
            </Pressable>
          </>
        )}

        {/* ── Today's Log ── */}
        {dailyLog.length > 0 && (
          <>
            <Text style={s.sectionTitle}>📋 Today's Meals</Text>
            {dailyLog.map((log) => (
              <View key={log.id} style={s.logCard}>
                {log.imageUri && (
                  <Image source={{ uri: log.imageUri }} style={s.logThumb} resizeMode="cover" />
                )}
                <View style={s.logInfo}>
                  <Text style={s.logFoods} numberOfLines={1}>{log.foodItems.join(", ")}</Text>
                  <Text style={s.logTime}>{log.time}</Text>
                  <View style={s.logMacros}>
                    <Text style={s.logMacroItem}>P: {log.protein}g</Text>
                    <Text style={s.logMacroItem}>C: {log.carbs}g</Text>
                    <Text style={s.logMacroItem}>F: {log.fat}g</Text>
                  </View>
                </View>
                <View style={s.logRight}>
                  <Text style={s.logCalories}>{log.calories}</Text>
                  <Text style={s.logKcal}>kcal</Text>
                  <Pressable onPress={() => removeFromLog(log.id)} style={s.removeBtn}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 50 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600", marginTop: 2 },
  scrollSheet: { flex: 1, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", backgroundColor: "#F8FAFC" },

  content: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B", marginBottom: 12, marginTop: 6 },

  // Dashboard
  dashCard: { backgroundColor: "#fff", borderRadius: 22, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  dashTitle: { fontSize: 14, fontWeight: "800", color: "#64748B", marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  dashMain: { flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 16 },
  dashCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  dashCalories: { fontSize: 28, fontWeight: "900", color: "#16A34A" },
  dashKcal: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
  dashStats: { flex: 1, gap: 8 },
  dashStatRow: { flexDirection: "row", justifyContent: "space-between" },
  dashStatLabel: { fontSize: 13, color: "#64748B", fontWeight: "700" },
  dashStatValue: { fontSize: 14, fontWeight: "900", color: "#1E293B" },
  progressBg: { height: 10, backgroundColor: "#F1F5F9", borderRadius: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5 },
  progressLabel: { fontSize: 12, color: "#64748B", fontWeight: "700", marginTop: 6, textAlign: "right" },

  // Scan
  scanCard: { backgroundColor: "#fff", borderRadius: 22, overflow: "hidden", marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  imagePreview: { width: "100%", height: 240, position: "relative" },
  foodImage: { width: "100%", height: 240 },
  analysisOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", gap: 12 },
  analysisOverlayText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  scanPlaceholder: { alignItems: "center", paddingVertical: 40, gap: 8 },
  scanPlaceholderEmoji: { fontSize: 56 },
  scanPlaceholderText: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  scanPlaceholderSub: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  scanActions: { flexDirection: "row", gap: 12, padding: 16 },
  scanBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  scanBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Analysis
  analysisCard: { backgroundColor: "#fff", borderRadius: 22, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  analysisHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  analysisTitle: { fontSize: 16, fontWeight: "900", color: "#1E293B", flex: 1, marginRight: 10 },
  analysisServing: { fontSize: 12, color: "#64748B", marginTop: 2 },
  ratingBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  ratingText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  calorieHero: { alignItems: "center", paddingVertical: 16 },
  calorieNum: { fontSize: 64, fontWeight: "900", color: "#16A34A", lineHeight: 70 },
  calorieUnit: { fontSize: 16, fontWeight: "700", color: "#64748B" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  scoreLabel: { fontSize: 12, fontWeight: "800", color: "#64748B", minWidth: 80 },
  scoreBarBg: { flex: 1, height: 8, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 4 },
  scoreNum: { fontSize: 13, fontWeight: "900", minWidth: 40, textAlign: "right" },

  // Macros
  macrosCard: { backgroundColor: "#fff", borderRadius: 22, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  macrosTitle: { fontSize: 15, fontWeight: "900", color: "#1E293B", marginBottom: 14 },
  macrosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  macroItem: { width: "30%", alignItems: "center", gap: 4 },
  macroEmoji: { fontSize: 22 },
  macroValue: { fontSize: 18, fontWeight: "900" },
  macroLabel: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  macroBarBg: { width: "100%", height: 4, backgroundColor: "#F1F5F9", borderRadius: 2, overflow: "hidden" },
  macroBarFill: { height: "100%", borderRadius: 2 },

  // Tags
  tagsCard: { backgroundColor: "#fff", borderRadius: 22, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  vitamingTag: { backgroundColor: "#DCFCE7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  vitaminText: { fontSize: 12, fontWeight: "700", color: "#15803D" },
  dietTag: { backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dietTagText: { fontSize: 12, fontWeight: "700", color: "#1D4ED8" },
  glycemicText: { fontSize: 13, color: "#64748B", fontWeight: "700", marginTop: 10 },

  // Suggestions
  suggestionsCard: { backgroundColor: "#FFFBEB", borderRadius: 22, padding: 18, marginBottom: 14 },
  suggestionRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  suggDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D97706", marginTop: 6 },
  suggestionText: { flex: 1, fontSize: 14, color: "#78350F", fontWeight: "600", lineHeight: 20 },

  // Add to log button
  addLogBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#16A34A", borderRadius: 18, paddingVertical: 16, marginBottom: 20 },
  addLogText: { color: "#fff", fontSize: 15, fontWeight: "900" },

  // Daily log
  logCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  logThumb: { width: 70, height: 70 },
  logInfo: { flex: 1, padding: 12, gap: 4 },
  logFoods: { fontSize: 14, fontWeight: "800", color: "#1E293B" },
  logTime: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  logMacros: { flexDirection: "row", gap: 10 },
  logMacroItem: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  logRight: { padding: 12, alignItems: "center", justifyContent: "center" },
  logCalories: { fontSize: 20, fontWeight: "900", color: "#16A34A" },
  logKcal: { fontSize: 10, fontWeight: "700", color: "#64748B" },
  removeBtn: { marginTop: 6 },

  // Inline error card
  errorCard: { backgroundColor: "#FEF2F2", borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 4, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#FECACA" },
  errorIconWrap: { marginBottom: 2 },
  errorTitle: { fontSize: 16, fontWeight: "900", color: "#B91C1C" },
  errorMessage: { fontSize: 13, fontWeight: "600", color: "#7F1D1D", textAlign: "center", lineHeight: 20 },
  errorRetryBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EF4444", paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  errorRetryText: { color: "#fff", fontSize: 14, fontWeight: "900" },
});
