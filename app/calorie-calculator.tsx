import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
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
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

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
  fiber: number;
  healthRating?: string;
  servingInfo?: string;
  supabaseId?: string;
}

interface CalorieGoal {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  dietType: DietType;
  activityLevel: ActivityLevel;
}

interface MealRec {
  name: string;
  description: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  healthScore: number;
  dietaryTags: string[];
  prepTime: string;
  ingredients: string[];
  steps: string[];
}

type TabName = "today" | "eatnext" | "goals";
type DietType = "balanced" | "diabetic" | "heart-healthy" | "high-protein" | "vegetarian" | "low-sodium" | "weight-loss";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very-active";
type MealType = "breakfast" | "lunch" | "dinner" | "snack";

// ── Constants ─────────────────────────────────────────────────────────────────
const CACHE_KEY = "tinybit_calorie_log_v2";
const GOALS_CACHE = "tinybit_calorie_goals_v1";

const DIET_OPTIONS: { key: DietType; label: string; icon: string }[] = [
  { key: "balanced",      label: "Balanced",       icon: "⚖️" },
  { key: "diabetic",      label: "Diabetic",        icon: "🩺" },
  { key: "heart-healthy", label: "Heart-Healthy",   icon: "❤️" },
  { key: "high-protein",  label: "High Protein",    icon: "💪" },
  { key: "vegetarian",    label: "Vegetarian",      icon: "🥦" },
  { key: "low-sodium",    label: "Low Sodium",       icon: "🧂" },
  { key: "weight-loss",   label: "Weight Loss",     icon: "🏃" },
];

const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string; kcal: number }[] = [
  { key: "sedentary",   label: "Sedentary",    kcal: 1600 },
  { key: "light",       label: "Light",        kcal: 1900 },
  { key: "moderate",    label: "Moderate",     kcal: 2200 },
  { key: "active",      label: "Active",       kcal: 2500 },
  { key: "very-active", label: "Very Active",  kcal: 2800 },
];

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: "🌅" },
  { key: "lunch",     label: "Lunch",     icon: "☀️" },
  { key: "dinner",    label: "Dinner",    icon: "🌙" },
  { key: "snack",     label: "Snack",     icon: "🍎" },
];

function todayKey() { return new Date().toISOString().split("T")[0]; }

function getRatingColor(r: string) {
  return r === "Excellent" ? "#10B981" : r === "Good" ? "#3B82F6" : r === "Moderate" ? "#F59E0B" : "#EF4444";
}
function getScoreColor(s: number) {
  return s >= 8 ? "#10B981" : s >= 6 ? "#3B82F6" : s >= 4 ? "#F59E0B" : "#EF4444";
}

const DEFAULT_GOAL: CalorieGoal = {
  dailyCalories: 2000, proteinG: 60, carbsG: 250, fatG: 65,
  dietType: "balanced", activityLevel: "light",
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function CalorieCalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { colors: tc, nightMode } = useLanguage();

  const [tab, setTab] = useState<TabName>("today");

  // Today tab state
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [analysis, setAnalysis]       = useState<FoodAnalysis | null>(null);
  const [scanError, setScanError]     = useState<string | null>(null);
  const [scanning, setScanning]       = useState(false);
  const [dailyLog, setDailyLog]       = useState<DailyLog[]>([]);

  // Eat Next tab state
  const [mealType, setMealType]       = useState<MealType>("breakfast");
  const [recs, setRecs]               = useState<MealRec[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [expandedRec, setExpandedRec] = useState<number | null>(null);

  // Goals tab state
  const [goal, setGoal]               = useState<CalorieGoal>(DEFAULT_GOAL);
  const [goalDraft, setGoalDraft]     = useState<CalorieGoal>(DEFAULT_GOAL);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalSaving, setGoalSaving]   = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);

  // Weekly insights (last 7 days totals for bar chart)
  const [weeklyData, setWeeklyData]   = useState<{ date: string; cal: number }[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const dailyCalories = useMemo(() => dailyLog.reduce((s, l) => s + l.calories, 0), [dailyLog]);
  const dailyProtein  = useMemo(() => dailyLog.reduce((s, l) => s + l.protein, 0), [dailyLog]);
  const dailyCarbs    = useMemo(() => dailyLog.reduce((s, l) => s + l.carbs, 0), [dailyLog]);
  const dailyFat      = useMemo(() => dailyLog.reduce((s, l) => s + l.fat, 0), [dailyLog]);

  const calPct     = Math.min((dailyCalories / goal.dailyCalories) * 100, 100);
  const remaining  = Math.max(goal.dailyCalories - dailyCalories, 0);

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadGoal();
    loadTodayLog();
    loadWeeklyData();
  }, []);

  // ── Goal ──────────────────────────────────────────────────────────────────
  const loadGoal = async () => {
    try {
      // Try Supabase first
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data } = await supabase
          .from("calorie_goals")
          .select("daily_calories,protein_g,carbs_g,fat_g,diet_type,activity_level")
          .eq("user_id", session.user.id)
          .single();
        if (data) {
          const g: CalorieGoal = {
            dailyCalories: data.daily_calories,
            proteinG: data.protein_g,
            carbsG: data.carbs_g,
            fatG: data.fat_g,
            dietType: data.diet_type as DietType,
            activityLevel: data.activity_level as ActivityLevel,
          };
          setGoal(g);
          setGoalDraft(g);
          await AsyncStorage.setItem(GOALS_CACHE, JSON.stringify(g));
          return;
        }
      }
    } catch { /* ignore */ }
    // Fallback: AsyncStorage cache
    try {
      const raw = await AsyncStorage.getItem(GOALS_CACHE);
      if (raw) {
        const g = JSON.parse(raw) as CalorieGoal;
        setGoal(g);
        setGoalDraft(g);
      }
    } catch { /* ignore */ }
  };

  const saveGoal = async (g: CalorieGoal) => {
    setGoalSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from("calorie_goals").upsert({
          user_id: session.user.id,
          daily_calories: g.dailyCalories,
          protein_g: g.proteinG,
          carbs_g: g.carbsG,
          fat_g: g.fatG,
          diet_type: g.dietType,
          activity_level: g.activityLevel,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
      await AsyncStorage.setItem(GOALS_CACHE, JSON.stringify(g));
      setGoal(g);
      setGoalEditing(false);
    } catch (e: any) {
      Alert.alert("Error", "Could not save goal. Please try again.");
    } finally {
      setGoalSaving(false);
    }
  };

  // AI-suggest goal based on user profile
  const suggestGoalWithAI = async () => {
    setAiSuggesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      // Use latest health stats for weight
      const { data: stats } = await supabase
        .from("health_stats")
        .select("weight, weight_unit")
        .eq("user_id", session.user.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .single();

      const age   = profile?.age ?? 65;
      const gender = profile?.biologicalSex ?? "unknown";
      const weight = stats?.weight ? `${stats.weight} ${stats.weight_unit || "kg"}` : "unknown";
      const conditions = (profile?.medicalConditions ?? []).filter(Boolean).join(", ") || "none";
      const activity = goalDraft.activityLevel;

      const prompt = `Calculate recommended daily calorie and macro targets for:
Age: ${age}, Gender: ${gender}, Weight: ${weight}
Activity level: ${activity}
Medical conditions: ${conditions}

Respond ONLY with valid JSON:
{"dailyCalories": 1800, "proteinG": 65, "carbsG": 220, "fatG": 60, "dietType": "balanced"}
dietType must be one of: balanced, diabetic, heart-healthy, high-protein, vegetarian, low-sodium, weight-loss
All values must be realistic integers.`;

      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });
      const json = await res.json();
      const text = (json?.data?.content ?? "").trim().replace(/```json|```/g, "").trim();
      const suggested = JSON.parse(text);
      setGoalDraft(prev => ({
        ...prev,
        dailyCalories: suggested.dailyCalories ?? prev.dailyCalories,
        proteinG:       suggested.proteinG       ?? prev.proteinG,
        carbsG:         suggested.carbsG         ?? prev.carbsG,
        fatG:           suggested.fatG           ?? prev.fatG,
        dietType:       (suggested.dietType as DietType) ?? prev.dietType,
      }));
      Alert.alert("Goal Suggested! ✨", "Based on your health profile. Review and save.");
    } catch (e: any) {
      Alert.alert("Could not suggest goal", "Please set manually below.");
    } finally {
      setAiSuggesting(false);
    }
  };

  // ── Daily log ─────────────────────────────────────────────────────────────
  const loadTodayLog = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data } = await supabase
          .from("calorie_logs")
          .select("id,food_items,total_calories,protein,carbs,fat,fiber,health_rating,image_uri,serving_info,logged_at")
          .eq("user_id", session.user.id)
          .eq("logged_date", todayKey())
          .order("logged_at", { ascending: false });
        if (data && data.length > 0) {
          const logs: DailyLog[] = data.map(r => ({
            id: r.id,
            supabaseId: r.id,
            time: new Date(r.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            imageUri: r.image_uri ?? undefined,
            foodItems: r.food_items ?? [],
            calories: r.total_calories,
            protein: Number(r.protein),
            carbs: Number(r.carbs),
            fat: Number(r.fat),
            fiber: Number(r.fiber),
            healthRating: r.health_rating ?? undefined,
            servingInfo: r.serving_info ?? undefined,
          }));
          setDailyLog(logs);
          return;
        }
      }
    } catch { /* ignore */ }
    // Fallback: AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_KEY}_${todayKey()}`);
      if (raw) setDailyLog(JSON.parse(raw));
    } catch { /* ignore */ }
  };

  const addToDailyLog = useCallback(async () => {
    if (!analysis) return;
    const entry: DailyLog = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      imageUri: imageUri ?? undefined,
      foodItems: analysis.foodItems,
      calories: analysis.totalCalories,
      protein: analysis.protein,
      carbs: analysis.carbohydrates,
      fat: analysis.fat,
      fiber: analysis.fiber,
      healthRating: analysis.healthRating,
      servingInfo: analysis.servingInfo,
    };
    // Persist to Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: inserted } = await supabase.from("calorie_logs").insert({
          user_id: session.user.id,
          logged_date: todayKey(),
          food_items: analysis.foodItems,
          total_calories: analysis.totalCalories,
          protein: analysis.protein,
          carbs: analysis.carbohydrates,
          fat: analysis.fat,
          fiber: analysis.fiber,
          sugar: analysis.sugar ?? null,
          health_score: analysis.healthScore,
          health_rating: analysis.healthRating,
          image_uri: imageUri ?? null,
          serving_info: analysis.servingInfo,
        }).select("id").single();
        if (inserted?.id) entry.supabaseId = inserted.id;
      }
    } catch { /* fallback to local */ }

    const newLogs = [entry, ...dailyLog];
    setDailyLog(newLogs);
    AsyncStorage.setItem(`${CACHE_KEY}_${todayKey()}`, JSON.stringify(newLogs)).catch(() => {});
    Alert.alert("Added!", `+${analysis.totalCalories} kcal logged for today.`);
  }, [analysis, imageUri, dailyLog]);

  const removeFromLog = useCallback(async (id: string, supabaseId?: string) => {
    setDailyLog(prev => prev.filter(l => l.id !== id));
    if (supabaseId) {
      try {
        await supabase.from("calorie_logs").delete().eq("id", supabaseId);
      } catch { /* ignore */ }
    }
  }, []);

  // ── Weekly data ───────────────────────────────────────────────────────────
  const loadWeeklyData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("calorie_logs")
        .select("logged_date,total_calories")
        .eq("user_id", session.user.id)
        .gte("logged_date", since)
        .order("logged_date", { ascending: true });
      if (data) {
        const grouped: Record<string, number> = {};
        data.forEach(r => { grouped[r.logged_date] = (grouped[r.logged_date] ?? 0) + r.total_calories; });
        const out = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(Date.now() - (6 - i) * 86400000);
          const key = d.toISOString().split("T")[0];
          return { date: d.toLocaleDateString("en-IN", { weekday: "short" }), cal: grouped[key] ?? 0 };
        });
        setWeeklyData(out);
      }
    } catch { /* ignore */ }
  };

  // ── Food scanner ──────────────────────────────────────────────────────────
  const pickImage = async (source: "camera" | "gallery") => {
    try {
      let result;
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed."); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true, aspect: [4, 3] });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission Required", "Photo library access is needed."); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true, aspect: [4, 3] });
      }
      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
        setAnalysis(null);
        setScanError(null);
        await scanFood(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not pick image.");
    }
  };

  const scanFood = async (uri: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const tid = setTimeout(() => ctrl.abort(), 60_000);
    setScanning(true);
    setScanError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const mimeType = uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      const res = await fetch(`${API_BASE_URL}/ai/analyze-food`, {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ base64, mimeType }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Analysis failed");
      if (!json.data?.detected) { setScanError("no_food"); return; }
      setAnalysis(json.data);
    } catch (e: any) {
      if (e?.name === "AbortError") setScanError("Analysis timed out. Please try again.");
      else if (/network|fetch/i.test(e?.message ?? "")) setScanError("Could not reach the server. Check your connection.");
      else setScanError(e.message || "Analysis failed. Please try again.");
    } finally {
      clearTimeout(tid);
      setScanning(false);
    }
  };

  // ── Meal recommendations ──────────────────────────────────────────────────
  const fetchRecommendations = async () => {
    setRecsLoading(true);
    setRecs([]);
    setExpandedRec(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const remainingProtein = Math.max(goal.proteinG - dailyProtein, 0);
      const remainingCarbs   = Math.max(goal.carbsG   - dailyCarbs,   0);
      const remainingFat     = Math.max(goal.fatG     - dailyFat,     0);

      const res = await fetch(`${API_BASE_URL}/ai/meal-recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          remainingCalories: remaining,
          totalCalories: goal.dailyCalories,
          mealType,
          dietType: goal.dietType,
          macroTargets: { protein: remainingProtein, carbs: remainingCarbs, fat: remainingFat },
        }),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.recommendations)) {
        setRecs(json.data.recommendations);
      } else {
        throw new Error(json.message || "No recommendations returned");
      }
    } catch (e: any) {
      Alert.alert("Recommendations unavailable", e.message || "Please try again.");
    } finally {
      setRecsLoading(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const progressColor = calPct > 95 ? "#EF4444" : calPct > 75 ? "#F59E0B" : "#16A34A";

  const MacroBar = ({ label, current, target, color }: { label: string; current: number; target: number; color: string }) => {
    const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    return (
      <View style={s.macroBarRow}>
        <Text style={[s.macroBarLabel, { color: tc.muted }]}>{label}</Text>
        <View style={[s.macroBarTrack, { backgroundColor: nightMode ? "#2A3A52" : "#F1F5F9" }]}>
          <View style={[s.macroBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
        <Text style={[s.macroBarVal, { color: tc.text }]}>{Math.round(current)}<Text style={{ color: tc.muted }}>/{target}g</Text></Text>
      </View>
    );
  };

  // ── TODAY TAB ─────────────────────────────────────────────────────────────
  const renderToday = () => (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={[s.tabContent, { paddingBottom: insets.bottom + 100 }]}>

      {/* Daily progress card */}
      <View style={[s.card, { backgroundColor: tc.card }]}>
        <Text style={[s.cardLabel, { color: tc.muted }]}>TODAY'S INTAKE</Text>
        <View style={s.progressRow}>
          <View style={[s.calorieCircle, { backgroundColor: progressColor + "18" }]}>
            <Text style={[s.calorieNum, { color: progressColor }]}>{dailyCalories}</Text>
            <Text style={[s.calorieUnit, { color: progressColor }]}>kcal</Text>
          </View>
          <View style={s.progressStats}>
            <View style={s.statRow}>
              <Text style={[s.statLabel, { color: tc.muted }]}>Goal</Text>
              <Text style={[s.statVal, { color: tc.text }]}>{goal.dailyCalories} kcal</Text>
            </View>
            <View style={s.statRow}>
              <Text style={[s.statLabel, { color: tc.muted }]}>Remaining</Text>
              <Text style={[s.statVal, { color: remaining > 0 ? "#16A34A" : "#EF4444" }]}>{remaining} kcal</Text>
            </View>
            <View style={s.statRow}>
              <Text style={[s.statLabel, { color: tc.muted }]}>Meals</Text>
              <Text style={[s.statVal, { color: tc.text }]}>{dailyLog.length}</Text>
            </View>
          </View>
        </View>
        <View style={[s.progressTrack, { backgroundColor: nightMode ? "#2A3A52" : "#F1F5F9" }]}>
          <View style={[s.progressFill, { width: `${calPct}%` as any, backgroundColor: progressColor }]} />
        </View>
        <Text style={[s.progressPct, { color: tc.muted }]}>{Math.round(calPct)}% of daily goal</Text>

        <View style={s.macrosSection}>
          <MacroBar label="Protein" current={dailyProtein} target={goal.proteinG} color="#3B82F6" />
          <MacroBar label="Carbs"   current={dailyCarbs}   target={goal.carbsG}   color="#F59E0B" />
          <MacroBar label="Fat"     current={dailyFat}     target={goal.fatG}     color="#EF4444" />
        </View>
      </View>

      {/* Scan section */}
      <Text style={[s.sectionTitle, { color: tc.text }]}>📸 Scan Food</Text>
      <View style={[s.card, { backgroundColor: tc.card, overflow: "hidden", padding: 0 }]}>
        {imageUri ? (
          <View style={s.imageWrap}>
            <Image source={{ uri: imageUri }} style={s.foodImg} resizeMode="cover" />
            {scanning && (
              <View style={s.scanOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={s.scanOverlayText}>Analysing with AI...</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={s.scanEmpty}>
            <Text style={s.scanEmoji}>🍽️</Text>
            <Text style={[s.scanEmptyText, { color: tc.text }]}>Take or upload a food photo</Text>
            <Text style={[s.scanEmptySub, { color: tc.muted }]}>AI will detect calories & nutrition</Text>
          </View>
        )}
        {scanError && !scanning && (
          <View style={s.errorBox}>
            <Ionicons name="close-circle" size={28} color="#EF4444" />
            <Text style={s.errorTitle}>Scan Failed</Text>
            <Text style={s.errorMsg}>
              {scanError === "no_food" ? "No food detected. Try a clearer photo." : scanError}
            </Text>
            {imageUri && (
              <Pressable style={s.retryBtn} onPress={() => scanFood(imageUri)}>
                <Ionicons name="refresh" size={15} color="#fff" />
                <Text style={s.retryText}>Try Again</Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={s.scanBtns}>
          <Pressable style={[s.scanBtn, { backgroundColor: "#14532D" }]} onPress={() => pickImage("camera")}>
            <Ionicons name="camera" size={18} color="#fff" />
            <Text style={s.scanBtnTxt}>Camera</Text>
          </Pressable>
          <Pressable style={[s.scanBtn, { backgroundColor: "#1D4ED8" }]} onPress={() => pickImage("gallery")}>
            <Ionicons name="images-outline" size={18} color="#fff" />
            <Text style={s.scanBtnTxt}>Gallery</Text>
          </Pressable>
        </View>
      </View>

      {/* Analysis results */}
      {analysis && !scanning && (
        <>
          <Text style={[s.sectionTitle, { color: tc.text }]}>🔬 Nutrition Analysis</Text>
          <View style={[s.card, { backgroundColor: tc.card }]}>
            <View style={s.analysisTop}>
              <View style={{ flex: 1 }}>
                <Text style={[s.analysisName, { color: tc.text }]}>{analysis.foodItems.join(", ")}</Text>
                <Text style={[s.analysisServing, { color: tc.muted }]}>{analysis.servingInfo} · {analysis.portionSize}</Text>
              </View>
              <View style={[s.ratingBadge, { backgroundColor: getRatingColor(analysis.healthRating) }]}>
                <Text style={s.ratingTxt}>{analysis.healthRating}</Text>
              </View>
            </View>
            <View style={s.calorieHero}>
              <Text style={[s.bigCalNum, { color: "#16A34A" }]}>{analysis.totalCalories}</Text>
              <Text style={[s.bigCalUnit, { color: tc.muted }]}>kcal</Text>
            </View>
            <View style={s.scoreRow}>
              <Text style={[s.scoreLabel, { color: tc.muted }]}>Health Score</Text>
              <View style={[s.scoreTrack, { backgroundColor: nightMode ? "#2A3A52" : "#F1F5F9" }]}>
                <View style={[s.scoreFill, { width: `${analysis.healthScore * 10}%` as any, backgroundColor: getScoreColor(analysis.healthScore) }]} />
              </View>
              <Text style={[s.scoreNum, { color: getScoreColor(analysis.healthScore) }]}>{analysis.healthScore}/10</Text>
            </View>
          </View>

          {/* Macros grid */}
          <View style={[s.card, { backgroundColor: tc.card }]}>
            <Text style={[s.cardLabel, { color: tc.muted }]}>MACRONUTRIENTS</Text>
            <View style={s.macroGrid}>
              {[
                { label: "Protein",  val: analysis.protein,        unit: "g",  color: "#3B82F6", emoji: "💪" },
                { label: "Carbs",    val: analysis.carbohydrates,   unit: "g",  color: "#F59E0B", emoji: "🌾" },
                { label: "Fat",      val: analysis.fat,             unit: "g",  color: "#EF4444", emoji: "🥑" },
                { label: "Fiber",    val: analysis.fiber,           unit: "g",  color: "#10B981", emoji: "🥦" },
                ...(analysis.sugar  != null ? [{ label: "Sugar",  val: analysis.sugar,  unit: "g",  color: "#EC4899", emoji: "🍬" }] : []),
                ...(analysis.sodium != null ? [{ label: "Sodium", val: analysis.sodium, unit: "mg", color: "#8B5CF6", emoji: "🧂" }] : []),
              ].map(m => (
                <View key={m.label} style={s.macroCell}>
                  <Text style={s.macroEmoji}>{m.emoji}</Text>
                  <Text style={[s.macroVal, { color: m.color }]}>{m.val}{m.unit}</Text>
                  <Text style={[s.macroName, { color: tc.muted }]}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Vitamins + dietary tags */}
          {((analysis.vitamins?.length ?? 0) > 0 || (analysis.dietaryTags?.length ?? 0) > 0) && (
            <View style={[s.card, { backgroundColor: tc.card }]}>
              {(analysis.vitamins?.length ?? 0) > 0 && (
                <>
                  <Text style={[s.cardLabel, { color: tc.muted }]}>VITAMINS & MINERALS</Text>
                  <View style={s.tagsRow}>
                    {analysis.vitamins.map((v, i) => (
                      <View key={i} style={s.vitTag}><Text style={s.vitTagTxt}>{v}</Text></View>
                    ))}
                  </View>
                </>
              )}
              {(analysis.dietaryTags?.length ?? 0) > 0 && (
                <>
                  <Text style={[s.cardLabel, { color: tc.muted, marginTop: 12 }]}>DIETARY INFO</Text>
                  <View style={s.tagsRow}>
                    {(analysis.dietaryTags ?? []).map((t, i) => (
                      <View key={i} style={s.dietTag}><Text style={s.dietTagTxt}>{t}</Text></View>
                    ))}
                  </View>
                  {analysis.glycemicIndex && (
                    <Text style={[s.glycemic, { color: tc.muted }]}>Glycemic Index: {analysis.glycemicIndex}</Text>
                  )}
                </>
              )}
            </View>
          )}

          {/* AI suggestions */}
          {(analysis.suggestions?.length ?? 0) > 0 && (
            <View style={s.suggestCard}>
              <Text style={s.suggestTitle}>💡 AI Suggestions</Text>
              {analysis.suggestions.map((sg, i) => (
                <View key={i} style={s.suggestRow}>
                  <View style={s.suggestDot} />
                  <Text style={s.suggestTxt}>{sg}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable style={s.addLogBtn} onPress={addToDailyLog}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={s.addLogTxt}>Add to Today's Log (+{analysis.totalCalories} kcal)</Text>
          </Pressable>
        </>
      )}

      {/* Today's log */}
      {dailyLog.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { color: tc.text }]}>📋 Today's Meals</Text>
          {dailyLog.map(log => (
            <View key={log.id} style={[s.logCard, { backgroundColor: tc.card }]}>
              {log.imageUri && <Image source={{ uri: log.imageUri }} style={s.logThumb} resizeMode="cover" />}
              <View style={s.logBody}>
                <Text style={[s.logFoods, { color: tc.text }]} numberOfLines={1}>{log.foodItems.join(", ")}</Text>
                <Text style={[s.logTime, { color: tc.muted }]}>{log.time}{log.healthRating ? ` · ${log.healthRating}` : ""}</Text>
                <View style={s.logMacros}>
                  <Text style={[s.logMacroItem, { color: tc.muted }]}>P: {log.protein}g</Text>
                  <Text style={[s.logMacroItem, { color: tc.muted }]}>C: {log.carbs}g</Text>
                  <Text style={[s.logMacroItem, { color: tc.muted }]}>F: {log.fat}g</Text>
                </View>
              </View>
              <View style={s.logRight}>
                <Text style={[s.logCal, { color: "#16A34A" }]}>{log.calories}</Text>
                <Text style={[s.logKcal, { color: tc.muted }]}>kcal</Text>
                <Pressable onPress={() => removeFromLog(log.id, log.supabaseId)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );

  // ── EAT NEXT TAB ──────────────────────────────────────────────────────────
  const renderEatNext = () => (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={[s.tabContent, { paddingBottom: insets.bottom + 100 }]}>

      {/* Remaining calories banner */}
      <View style={[s.card, { backgroundColor: tc.card }]}>
        <Text style={[s.cardLabel, { color: tc.muted }]}>REMAINING TODAY</Text>
        <View style={s.remainRow}>
          <View>
            <Text style={[s.remainNum, { color: remaining > 200 ? "#16A34A" : "#F59E0B" }]}>{remaining}</Text>
            <Text style={[s.remainUnit, { color: tc.muted }]}>kcal left</Text>
          </View>
          <View style={s.remainMacros}>
            <Text style={[s.remainMacro, { color: "#3B82F6" }]}>P {Math.max(goal.proteinG - dailyProtein, 0)}g</Text>
            <Text style={[s.remainMacro, { color: "#F59E0B" }]}>C {Math.max(goal.carbsG - dailyCarbs, 0)}g</Text>
            <Text style={[s.remainMacro, { color: "#EF4444" }]}>F {Math.max(goal.fatG - dailyFat, 0)}g</Text>
          </View>
        </View>
      </View>

      {/* Meal type selector */}
      <Text style={[s.sectionTitle, { color: tc.text }]}>What are you planning?</Text>
      <View style={s.mealTypeRow}>
        {MEAL_TYPES.map(m => (
          <Pressable key={m.key}
            style={[s.mealTypeBtn, mealType === m.key && s.mealTypeBtnActive, { borderColor: mealType === m.key ? "#4AA5D9" : tc.border, backgroundColor: mealType === m.key ? "#4AA5D9" + "18" : tc.card }]}
            onPress={() => setMealType(m.key)}>
            <Text style={s.mealTypeIcon}>{m.icon}</Text>
            <Text style={[s.mealTypeTxt, { color: mealType === m.key ? "#4AA5D9" : tc.muted }]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Get recommendations button */}
      <Pressable style={[s.fetchRecsBtn, recsLoading && { opacity: 0.7 }]} onPress={fetchRecommendations} disabled={recsLoading}>
        {recsLoading
          ? <ActivityIndicator color="#fff" size="small" />
          : <><Ionicons name="sparkles" size={18} color="#fff" /><Text style={s.fetchRecsTxt}>Get AI Meal Suggestions</Text></>}
      </Pressable>

      {/* Recommendation cards */}
      {recs.length > 0 && recs.map((rec, i) => (
        <View key={i} style={[s.recCard, { backgroundColor: tc.card }]}>
          <Pressable onPress={() => setExpandedRec(expandedRec === i ? null : i)}>
            <View style={s.recTop}>
              <View style={{ flex: 1 }}>
                <Text style={[s.recName, { color: tc.text }]}>{rec.name}</Text>
                <Text style={[s.recDesc, { color: tc.muted }]}>{rec.description}</Text>
              </View>
              <Ionicons name={expandedRec === i ? "chevron-up" : "chevron-down"} size={18} color={tc.muted} />
            </View>
            <View style={s.recStats}>
              <View style={s.recStatItem}>
                <Text style={[s.recStatVal, { color: "#16A34A" }]}>{rec.calories}</Text>
                <Text style={[s.recStatLabel, { color: tc.muted }]}>kcal</Text>
              </View>
              <View style={s.recStatItem}>
                <Text style={[s.recStatVal, { color: "#3B82F6" }]}>{rec.protein}g</Text>
                <Text style={[s.recStatLabel, { color: tc.muted }]}>protein</Text>
              </View>
              <View style={s.recStatItem}>
                <Text style={[s.recStatVal, { color: "#F59E0B" }]}>{rec.carbs}g</Text>
                <Text style={[s.recStatLabel, { color: tc.muted }]}>carbs</Text>
              </View>
              <View style={s.recStatItem}>
                <Text style={[s.recStatVal, { color: "#EF4444" }]}>{rec.fat}g</Text>
                <Text style={[s.recStatLabel, { color: tc.muted }]}>fat</Text>
              </View>
              {rec.prepTime && (
                <View style={s.recStatItem}>
                  <Ionicons name="time-outline" size={14} color={tc.muted} />
                  <Text style={[s.recStatLabel, { color: tc.muted }]}>{rec.prepTime}</Text>
                </View>
              )}
            </View>
            {rec.dietaryTags?.length > 0 && (
              <View style={s.tagsRow}>
                {rec.dietaryTags.slice(0, 3).map((t, j) => (
                  <View key={j} style={s.dietTag}><Text style={s.dietTagTxt}>{t}</Text></View>
                ))}
              </View>
            )}
          </Pressable>

          {/* Expanded recipe */}
          {expandedRec === i && (
            <View style={[s.recipeSection, { borderTopColor: tc.border }]}>
              <Text style={[s.recipeHeading, { color: tc.text }]}>Ingredients</Text>
              {rec.ingredients.map((ing, j) => (
                <View key={j} style={s.recipeRow}>
                  <View style={[s.recipeDot, { backgroundColor: "#4AA5D9" }]} />
                  <Text style={[s.recipeTxt, { color: tc.text }]}>{ing}</Text>
                </View>
              ))}
              <Text style={[s.recipeHeading, { color: tc.text, marginTop: 12 }]}>Steps</Text>
              {rec.steps.map((step, j) => (
                <View key={j} style={s.recipeRow}>
                  <Text style={[s.recipeStepNum, { color: "#4AA5D9" }]}>{j + 1}.</Text>
                  <Text style={[s.recipeTxt, { color: tc.text }]}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {recs.length === 0 && !recsLoading && (
        <View style={[s.emptyRecs, { backgroundColor: tc.card }]}>
          <Text style={s.emptyRecsEmoji}>🍳</Text>
          <Text style={[s.emptyRecsText, { color: tc.muted }]}>Tap the button above to get personalised meal suggestions based on your health profile and remaining calories.</Text>
        </View>
      )}
    </ScrollView>
  );

  // ── GOALS TAB ─────────────────────────────────────────────────────────────
  const renderGoals = () => (
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={[s.tabContent, { paddingBottom: insets.bottom + 100 }]}>

      {/* Current goal card */}
      <View style={[s.card, { backgroundColor: tc.card }]}>
        <View style={s.goalHeaderRow}>
          <Text style={[s.cardLabel, { color: tc.muted }]}>DAILY CALORIE GOAL</Text>
          <Pressable style={s.editGoalBtn} onPress={() => { setGoalDraft({ ...goal }); setGoalEditing(true); }}>
            <Ionicons name="pencil" size={15} color="#4AA5D9" />
            <Text style={s.editGoalTxt}>Edit</Text>
          </Pressable>
        </View>
        <Text style={[s.goalBigNum, { color: "#16A34A" }]}>{goal.dailyCalories} <Text style={[s.goalKcalLabel, { color: tc.muted }]}>kcal / day</Text></Text>
        <View style={s.goalMacroRow}>
          <View style={s.goalMacroItem}>
            <Text style={[s.goalMacroVal, { color: "#3B82F6" }]}>{goal.proteinG}g</Text>
            <Text style={[s.goalMacroLabel, { color: tc.muted }]}>Protein</Text>
          </View>
          <View style={s.goalMacroItem}>
            <Text style={[s.goalMacroVal, { color: "#F59E0B" }]}>{goal.carbsG}g</Text>
            <Text style={[s.goalMacroLabel, { color: tc.muted }]}>Carbs</Text>
          </View>
          <View style={s.goalMacroItem}>
            <Text style={[s.goalMacroVal, { color: "#EF4444" }]}>{goal.fatG}g</Text>
            <Text style={[s.goalMacroLabel, { color: tc.muted }]}>Fat</Text>
          </View>
        </View>
        <View style={s.dietActivityRow}>
          <View style={[s.dietPill, { backgroundColor: "#4AA5D9" + "18" }]}>
            <Text style={[s.dietPillTxt, { color: "#4AA5D9" }]}>{DIET_OPTIONS.find(d => d.key === goal.dietType)?.icon} {DIET_OPTIONS.find(d => d.key === goal.dietType)?.label}</Text>
          </View>
          <View style={[s.dietPill, { backgroundColor: "#2B3C86" + "18" }]}>
            <Text style={[s.dietPillTxt, { color: "#2B3C86" }]}>⚡ {goal.activityLevel.charAt(0).toUpperCase() + goal.activityLevel.slice(1)}</Text>
          </View>
        </View>
      </View>

      {/* Weekly bar chart */}
      {weeklyData.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { color: tc.text }]}>📊 This Week's Intake</Text>
          <View style={[s.card, { backgroundColor: tc.card }]}>
            <View style={s.barChart}>
              {weeklyData.map((d, i) => {
                const maxCal = Math.max(...weeklyData.map(w => w.cal), goal.dailyCalories);
                const pct = maxCal > 0 ? (d.cal / maxCal) * 100 : 0;
                const barColor = d.cal > goal.dailyCalories ? "#EF4444" : d.cal > 0 ? "#4AA5D9" : (nightMode ? "#2A3A52" : "#E2E8F0");
                const isToday = i === weeklyData.length - 1;
                return (
                  <View key={i} style={s.barCol}>
                    {d.cal > 0 && <Text style={[s.barCalLabel, { color: tc.muted }]}>{d.cal >= 1000 ? `${(d.cal / 1000).toFixed(1)}k` : d.cal}</Text>}
                    <View style={[s.barTrack, { backgroundColor: nightMode ? "#2A3A52" : "#F1F5F9" }]}>
                      <View style={[s.barFill, { height: `${Math.max(pct, d.cal > 0 ? 4 : 0)}%` as any, backgroundColor: barColor }]} />
                    </View>
                    <Text style={[s.barDay, { color: isToday ? "#4AA5D9" : tc.muted, fontWeight: isToday ? "900" : "700" }]}>{d.date}</Text>
                  </View>
                );
              })}
            </View>
            <View style={[s.goalLine, { borderTopColor: tc.border }]}>
              <Text style={[s.goalLineTxt, { color: tc.muted }]}>Goal: {goal.dailyCalories} kcal / day</Text>
            </View>
          </View>
        </>
      )}

      {/* Nutrition tips */}
      <Text style={[s.sectionTitle, { color: tc.text }]}>💡 Nutrition Tips</Text>
      {[
        { icon: "🥛", tip: "Drink at least 8 glasses of water daily. Dehydration can feel like hunger." },
        { icon: "🕐", tip: "Eat meals at regular times to maintain stable blood sugar levels." },
        { icon: "🥗", tip: "Fill half your plate with vegetables for fibre, vitamins, and minerals." },
        { icon: "🚶", tip: "A short walk after meals improves digestion and blood sugar control." },
      ].map((t, i) => (
        <View key={i} style={[s.tipCard, { backgroundColor: tc.card }]}>
          <Text style={s.tipIcon}>{t.icon}</Text>
          <Text style={[s.tipTxt, { color: tc.text }]}>{t.tip}</Text>
        </View>
      ))}
    </ScrollView>
  );

  // ── Goal Edit Modal ───────────────────────────────────────────────────────
  const renderGoalModal = () => (
    <Modal visible={goalEditing} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={[s.modalSheet, { backgroundColor: tc.card }]}>
          <View style={s.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
            <Text style={[s.modalTitle, { color: tc.text }]}>Set Your Calorie Goal</Text>

            {/* AI Suggest button */}
            <Pressable style={[s.aiSuggestBtn, aiSuggesting && { opacity: 0.7 }]} onPress={suggestGoalWithAI} disabled={aiSuggesting}>
              {aiSuggesting
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="sparkles" size={16} color="#fff" /><Text style={s.aiSuggestTxt}>AI Suggest Based on My Profile</Text></>}
            </Pressable>

            {/* Daily calories */}
            <Text style={[s.modalLabel, { color: tc.muted }]}>Daily Calories (kcal)</Text>
            <View style={s.stepperRow}>
              <Pressable style={s.stepBtn} onPress={() => setGoalDraft(p => ({ ...p, dailyCalories: Math.max(800, p.dailyCalories - 50) }))}>
                <Ionicons name="remove" size={20} color="#fff" />
              </Pressable>
              <TextInput style={[s.stepInput, { color: tc.text, borderColor: tc.border }]}
                keyboardType="numeric" value={String(goalDraft.dailyCalories)}
                onChangeText={v => { const n = parseInt(v); if (!isNaN(n) && n > 0) setGoalDraft(p => ({ ...p, dailyCalories: n })); }} />
              <Pressable style={s.stepBtn} onPress={() => setGoalDraft(p => ({ ...p, dailyCalories: Math.min(5000, p.dailyCalories + 50) }))}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>

            {/* Protein */}
            <Text style={[s.modalLabel, { color: tc.muted }]}>Protein Target (g)</Text>
            <View style={s.stepperRow}>
              <Pressable style={s.stepBtn} onPress={() => setGoalDraft(p => ({ ...p, proteinG: Math.max(10, p.proteinG - 5) }))}>
                <Ionicons name="remove" size={20} color="#fff" /></Pressable>
              <TextInput style={[s.stepInput, { color: tc.text, borderColor: tc.border }]}
                keyboardType="numeric" value={String(goalDraft.proteinG)}
                onChangeText={v => { const n = parseInt(v); if (!isNaN(n)) setGoalDraft(p => ({ ...p, proteinG: n })); }} />
              <Pressable style={s.stepBtn} onPress={() => setGoalDraft(p => ({ ...p, proteinG: p.proteinG + 5 }))}>
                <Ionicons name="add" size={20} color="#fff" /></Pressable>
            </View>

            {/* Carbs */}
            <Text style={[s.modalLabel, { color: tc.muted }]}>Carbohydrate Target (g)</Text>
            <View style={s.stepperRow}>
              <Pressable style={s.stepBtn} onPress={() => setGoalDraft(p => ({ ...p, carbsG: Math.max(20, p.carbsG - 10) }))}>
                <Ionicons name="remove" size={20} color="#fff" /></Pressable>
              <TextInput style={[s.stepInput, { color: tc.text, borderColor: tc.border }]}
                keyboardType="numeric" value={String(goalDraft.carbsG)}
                onChangeText={v => { const n = parseInt(v); if (!isNaN(n)) setGoalDraft(p => ({ ...p, carbsG: n })); }} />
              <Pressable style={s.stepBtn} onPress={() => setGoalDraft(p => ({ ...p, carbsG: p.carbsG + 10 }))}>
                <Ionicons name="add" size={20} color="#fff" /></Pressable>
            </View>

            {/* Fat */}
            <Text style={[s.modalLabel, { color: tc.muted }]}>Fat Target (g)</Text>
            <View style={s.stepperRow}>
              <Pressable style={s.stepBtn} onPress={() => setGoalDraft(p => ({ ...p, fatG: Math.max(10, p.fatG - 5) }))}>
                <Ionicons name="remove" size={20} color="#fff" /></Pressable>
              <TextInput style={[s.stepInput, { color: tc.text, borderColor: tc.border }]}
                keyboardType="numeric" value={String(goalDraft.fatG)}
                onChangeText={v => { const n = parseInt(v); if (!isNaN(n)) setGoalDraft(p => ({ ...p, fatG: n })); }} />
              <Pressable style={s.stepBtn} onPress={() => setGoalDraft(p => ({ ...p, fatG: p.fatG + 5 }))}>
                <Ionicons name="add" size={20} color="#fff" /></Pressable>
            </View>

            {/* Diet type */}
            <Text style={[s.modalLabel, { color: tc.muted }]}>Diet Type</Text>
            <View style={s.chipWrap}>
              {DIET_OPTIONS.map(d => (
                <Pressable key={d.key}
                  style={[s.chip, goalDraft.dietType === d.key && s.chipActive, { borderColor: goalDraft.dietType === d.key ? "#4AA5D9" : tc.border }]}
                  onPress={() => setGoalDraft(p => ({ ...p, dietType: d.key }))}>
                  <Text style={[s.chipTxt, { color: goalDraft.dietType === d.key ? "#4AA5D9" : tc.text }]}>{d.icon} {d.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Activity level */}
            <Text style={[s.modalLabel, { color: tc.muted }]}>Activity Level</Text>
            <View style={s.chipWrap}>
              {ACTIVITY_OPTIONS.map(a => (
                <Pressable key={a.key}
                  style={[s.chip, goalDraft.activityLevel === a.key && s.chipActive, { borderColor: goalDraft.activityLevel === a.key ? "#2B3C86" : tc.border }]}
                  onPress={() => setGoalDraft(p => ({ ...p, activityLevel: a.key, dailyCalories: a.kcal }))}>
                  <Text style={[s.chipTxt, { color: goalDraft.activityLevel === a.key ? "#2B3C86" : tc.text }]}>{a.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Actions */}
            <View style={s.modalActions}>
              <Pressable style={s.cancelBtn} onPress={() => setGoalEditing(false)}>
                <Text style={[s.cancelTxt, { color: tc.muted }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.saveBtn, goalSaving && { opacity: 0.7 }]} onPress={() => saveGoal(goalDraft)} disabled={goalSaving}>
                {goalSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveTxt}>Save Goal</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ── Root render ────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: tc.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={["#2B3C86", "#2E9CD6"]} style={[s.header, { paddingTop: insets.top + 16 }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>🥗 Calorie Tracker</Text>
          <Text style={s.headerSub}>AI-powered nutrition</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Tabs */}
      <View style={[s.tabBar, { backgroundColor: tc.card, borderBottomColor: tc.border }]}>
        {([
          { key: "today",   label: "Today",    icon: "today-outline" },
          { key: "eatnext", label: "Eat Next",  icon: "restaurant-outline" },
          { key: "goals",   label: "My Goals",  icon: "flag-outline" },
        ] as { key: TabName; label: string; icon: any }[]).map(t => (
          <Pressable key={t.key} style={s.tabItem} onPress={() => setTab(t.key)}>
            <Ionicons name={t.icon} size={18} color={tab === t.key ? "#4AA5D9" : tc.muted} />
            <Text style={[s.tabLabel, { color: tab === t.key ? "#4AA5D9" : tc.muted, fontWeight: tab === t.key ? "900" : "700" }]}>{t.label}</Text>
            {tab === t.key && <View style={s.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      <View style={[s.sheet, { backgroundColor: tc.bg }]}>
        {tab === "today"   && renderToday()}
        {tab === "eatnext" && renderEatNext()}
        {tab === "goals"   && renderGoals()}
      </View>

      {renderGoalModal()}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 18 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600", marginTop: 2 },

  // Tab bar
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 3, position: "relative" },
  tabLabel: { fontSize: 12 },
  tabUnderline: { position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2, backgroundColor: "#4AA5D9", borderRadius: 1 },

  sheet: { flex: 1 },
  tabContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Card
  card: { borderRadius: 20, padding: 18, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "900", marginBottom: 12, marginTop: 4 },

  // Progress
  progressRow: { flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 14 },
  calorieCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  calorieNum: { fontSize: 26, fontWeight: "900", lineHeight: 30 },
  calorieUnit: { fontSize: 12, fontWeight: "700" },
  progressStats: { flex: 1, gap: 7 },
  statRow: { flexDirection: "row", justifyContent: "space-between" },
  statLabel: { fontSize: 13, fontWeight: "700" },
  statVal: { fontSize: 13, fontWeight: "900" },
  progressTrack: { height: 9, borderRadius: 5, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: "100%", borderRadius: 5 },
  progressPct: { fontSize: 11, fontWeight: "700", textAlign: "right" },
  macrosSection: { marginTop: 14, gap: 8 },
  macroBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  macroBarLabel: { fontSize: 12, fontWeight: "700", width: 50 },
  macroBarTrack: { flex: 1, height: 7, borderRadius: 4, overflow: "hidden" },
  macroBarFill: { height: "100%", borderRadius: 4 },
  macroBarVal: { fontSize: 12, fontWeight: "800", minWidth: 72, textAlign: "right" },

  // Scan
  imageWrap: { width: "100%", height: 230, position: "relative" },
  foodImg: { width: "100%", height: 230 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", gap: 10 },
  scanOverlayText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  scanEmpty: { alignItems: "center", paddingVertical: 36, gap: 8 },
  scanEmoji: { fontSize: 50 },
  scanEmptyText: { fontSize: 15, fontWeight: "800" },
  scanEmptySub: { fontSize: 12, fontWeight: "600" },
  scanBtns: { flexDirection: "row", gap: 10, padding: 14 },
  scanBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 13 },
  scanBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
  errorBox: { backgroundColor: "#FEF2F2", borderRadius: 14, margin: 14, padding: 16, alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#FECACA" },
  errorTitle: { fontSize: 15, fontWeight: "900", color: "#B91C1C" },
  errorMsg: { fontSize: 13, color: "#7F1D1D", textAlign: "center", lineHeight: 18 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EF4444", paddingHorizontal: 18, paddingVertical: 9, borderRadius: 18, marginTop: 4 },
  retryText: { color: "#fff", fontSize: 13, fontWeight: "900" },

  // Analysis
  analysisTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  analysisName: { fontSize: 15, fontWeight: "900", flex: 1, marginRight: 10 },
  analysisServing: { fontSize: 11, marginTop: 2 },
  ratingBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 18 },
  ratingTxt: { color: "#fff", fontSize: 11, fontWeight: "900" },
  calorieHero: { alignItems: "center", paddingVertical: 14 },
  bigCalNum: { fontSize: 58, fontWeight: "900", lineHeight: 64 },
  bigCalUnit: { fontSize: 15, fontWeight: "700" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreLabel: { fontSize: 12, fontWeight: "800", minWidth: 80 },
  scoreTrack: { flex: 1, height: 7, borderRadius: 4, overflow: "hidden" },
  scoreFill: { height: "100%", borderRadius: 4 },
  scoreNum: { fontSize: 13, fontWeight: "900", minWidth: 36, textAlign: "right" },

  // Macros
  macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  macroCell: { width: "30%", alignItems: "center", gap: 3 },
  macroEmoji: { fontSize: 20 },
  macroVal: { fontSize: 17, fontWeight: "900" },
  macroName: { fontSize: 11, fontWeight: "700" },

  // Tags
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  vitTag: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  vitTagTxt: { fontSize: 11, fontWeight: "700", color: "#15803D" },
  dietTag: { backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dietTagTxt: { fontSize: 11, fontWeight: "700", color: "#1D4ED8" },
  glycemic: { fontSize: 12, fontWeight: "700", marginTop: 8 },

  // AI Suggestions
  suggestCard: { backgroundColor: "#FFFBEB", borderRadius: 18, padding: 16, marginBottom: 14 },
  suggestTitle: { fontSize: 14, fontWeight: "900", color: "#92400E", marginBottom: 10 },
  suggestRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  suggestDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D97706", marginTop: 6 },
  suggestTxt: { flex: 1, fontSize: 13, color: "#78350F", fontWeight: "600", lineHeight: 19 },
  addLogBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#16A34A", borderRadius: 16, paddingVertical: 15, marginBottom: 20 },
  addLogTxt: { color: "#fff", fontSize: 14, fontWeight: "900" },

  // Daily log
  logCard: { flexDirection: "row", borderRadius: 16, overflow: "hidden", marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  logThumb: { width: 66, height: 66 },
  logBody: { flex: 1, padding: 10, gap: 3 },
  logFoods: { fontSize: 13, fontWeight: "800" },
  logTime: { fontSize: 11, fontWeight: "600" },
  logMacros: { flexDirection: "row", gap: 8 },
  logMacroItem: { fontSize: 11, fontWeight: "700" },
  logRight: { padding: 10, alignItems: "center", justifyContent: "center", gap: 2 },
  logCal: { fontSize: 19, fontWeight: "900" },
  logKcal: { fontSize: 10, fontWeight: "700" },

  // Eat Next
  remainRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  remainNum: { fontSize: 44, fontWeight: "900" },
  remainUnit: { fontSize: 13, fontWeight: "700" },
  remainMacros: { gap: 4, alignItems: "flex-end" },
  remainMacro: { fontSize: 14, fontWeight: "800" },
  mealTypeRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  mealTypeBtn: { flex: 1, minWidth: "22%", alignItems: "center", paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, gap: 3 },
  mealTypeBtnActive: {},
  mealTypeIcon: { fontSize: 20 },
  mealTypeTxt: { fontSize: 11, fontWeight: "800" },
  fetchRecsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#2B3C86", borderRadius: 16, paddingVertical: 15, marginBottom: 16 },
  fetchRecsTxt: { color: "#fff", fontSize: 14, fontWeight: "900" },
  recCard: { borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  recTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  recName: { fontSize: 15, fontWeight: "900", marginBottom: 3 },
  recDesc: { fontSize: 12, lineHeight: 17 },
  recStats: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginBottom: 8 },
  recStatItem: { alignItems: "center", gap: 1 },
  recStatVal: { fontSize: 14, fontWeight: "900" },
  recStatLabel: { fontSize: 10, fontWeight: "700" },
  recipeSection: { borderTopWidth: 1, marginTop: 12, paddingTop: 14 },
  recipeHeading: { fontSize: 13, fontWeight: "900", marginBottom: 8 },
  recipeRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  recipeDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  recipeStepNum: { fontSize: 13, fontWeight: "900", minWidth: 20 },
  recipeTxt: { flex: 1, fontSize: 13, lineHeight: 19 },
  emptyRecs: { borderRadius: 20, padding: 30, alignItems: "center", gap: 12 },
  emptyRecsEmoji: { fontSize: 44 },
  emptyRecsText: { fontSize: 14, textAlign: "center", lineHeight: 21 },

  // Goals
  goalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  editGoalBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  editGoalTxt: { fontSize: 13, color: "#4AA5D9", fontWeight: "800" },
  goalBigNum: { fontSize: 36, fontWeight: "900", marginBottom: 14 },
  goalKcalLabel: { fontSize: 16, fontWeight: "700" },
  goalMacroRow: { flexDirection: "row", gap: 20, marginBottom: 14 },
  goalMacroItem: { alignItems: "center", gap: 2 },
  goalMacroVal: { fontSize: 20, fontWeight: "900" },
  goalMacroLabel: { fontSize: 11, fontWeight: "700" },
  dietActivityRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  dietPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  dietPillTxt: { fontSize: 12, fontWeight: "800" },

  // Bar chart
  barChart: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 120 },
  barCol: { flex: 1, alignItems: "center", gap: 3 },
  barCalLabel: { fontSize: 9, fontWeight: "700" },
  barTrack: { flex: 1, width: "80%", borderRadius: 6, overflow: "hidden", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 6 },
  barDay: { fontSize: 10 },
  goalLine: { borderTopWidth: 1, marginTop: 10, paddingTop: 8 },
  goalLineTxt: { fontSize: 11, fontWeight: "700", textAlign: "center" },

  // Nutrition tips
  tipCard: { flexDirection: "row", borderRadius: 16, padding: 14, marginBottom: 10, alignItems: "flex-start", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  tipIcon: { fontSize: 24, marginTop: 1 },
  tipTxt: { flex: 1, fontSize: 13, lineHeight: 20 },

  // Goal modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: "90%", minHeight: "60%" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "900", marginBottom: 16 },
  aiSuggestBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#2B3C86", borderRadius: 14, paddingVertical: 13, marginBottom: 20 },
  aiSuggestTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
  modalLabel: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#4AA5D9", alignItems: "center", justifyContent: "center" },
  stepInput: { flex: 1, height: 44, borderWidth: 1.5, borderRadius: 12, textAlign: "center", fontSize: 18, fontWeight: "900" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipActive: {},
  chipTxt: { fontSize: 13, fontWeight: "700" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  cancelTxt: { fontSize: 15, fontWeight: "800" },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#16A34A" },
  saveTxt: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
