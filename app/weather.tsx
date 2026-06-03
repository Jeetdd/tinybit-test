/**
 * Weather Screen — TinyBit
 *
 * Setup: Add your OpenWeatherMap API key to config/weather.ts
 * Get a free key at: https://openweathermap.org/api
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert,
  Keyboard, Pressable,
  RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config/api";
import { supabase } from "../utils/supabase";

// ── OpenWeatherMap API key — set yours here or in a constants file ────────────
// Get a free key at https://openweathermap.org/api
// Add your OpenWeatherMap key to .env as EXPO_PUBLIC_OWM_API_KEY
// Get a free key at https://openweathermap.org/api
const OWM_API_KEY = process.env.EXPO_PUBLIC_OWM_API_KEY ?? "";
const OWM_BASE = "https://api.openweathermap.org/data/2.5";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  conditionCode: number;
  description: string;
  uvIndex?: number;
  visibility: number;
  pressure: number;
  sunrise: number;
  sunset: number;
}

interface HourlyForecast {
  time: string;
  temp: number;
  icon: string;
  description: string;
  pop: number;
}

interface DailyForecast {
  day: string;
  date: string;
  high: number;
  low: number;
  icon: string;
  description: string;
  pop: number;
}

interface ClothingSuggestion {
  summary: string;
  items: string[];
  healthTips: string[];
  warning: string | null;
  emoji: string;
}

// ── Weather condition → visual mapping ────────────────────────────────────────
function getWeatherEmoji(code: number): string {
  if (code >= 200 && code < 300) return "⛈️";
  if (code >= 300 && code < 400) return "🌦️";
  if (code >= 500 && code < 600) return "🌧️";
  if (code >= 600 && code < 700) return "❄️";
  if (code >= 700 && code < 800) return "🌫️";
  if (code === 800) return "☀️";
  if (code === 801 || code === 802) return "⛅";
  if (code >= 803) return "☁️";
  return "🌤️";
}

function getGradient(code: number): [string, string] {
  if (code >= 200 && code < 400) return ["#4A4E69", "#2D3557"]; // Storm
  if (code >= 400 && code < 600) return ["#4A90D9", "#2C5F8A"]; // Rain
  if (code >= 600 && code < 700) return ["#B8D4E8", "#7BA7C4"]; // Snow
  if (code >= 700 && code < 800) return ["#8B9DAA", "#5A6E7A"]; // Fog
  if (code === 800) return ["#FF8C42", "#E05C00"];               // Clear
  return ["#3A7BD5", "#00D2FF"];                                 // Cloudy
}

function formatTime(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDay(dtTxt: string): string {
  const d = new Date(dtTxt);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function WeatherScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hourly, setHourly] = useState<HourlyForecast[]>([]);
  const [daily, setDaily] = useState<DailyForecast[]>([]);
  const [clothing, setClothing] = useState<ClothingSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clothingLoading, setClothingLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadByLocation(); }, []);

  // ── Fetch by GPS location ─────────────────────────────────────────────────
  const loadByLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied. Please search for a city manually.");
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await fetchWeather(loc.coords.latitude, loc.coords.longitude);
    } catch (e: any) {
      setError(e.message || "Could not get location. Please search for a city.");
    } finally {
      setLoading(false);
    }
  };

  // ── Search by city name ───────────────────────────────────────────────────
  const searchCity = async () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setSearching(true);
    setError(null);
    try {
      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(searchQuery.trim())}&limit=1&appid=${OWM_API_KEY}`
      );
      const geoData = await geoRes.json();
      if (!geoData?.length) {
        Alert.alert("City Not Found", `Could not find "${searchQuery}". Please try another city name.`);
        return;
      }
      const { lat, lon } = geoData[0];
      await fetchWeather(lat, lon);
      setSearchQuery("");
    } catch (e: any) {
      Alert.alert("Search Error", e.message || "Search failed. Check your API key.");
    } finally {
      setSearching(false);
    }
  };

  // ── Core weather fetch ────────────────────────────────────────────────────
  const fetchWeather = async (lat: number, lon: number) => {
    const isDemo = !OWM_API_KEY || OWM_API_KEY.length < 10;
    if (isDemo) {
      // Demo mode with sample data
      setWeather({
        city: "Mumbai", country: "IN", temperature: 32, feelsLike: 36,
        humidity: 72, windSpeed: 18, condition: "Clouds", conditionCode: 803,
        description: "Overcast clouds", uvIndex: 7, visibility: 8000,
        pressure: 1010, sunrise: Date.now() / 1000 - 21600, sunset: Date.now() / 1000 + 21600,
      });
      setHourly(Array.from({ length: 8 }, (_, i) => ({
        time: new Date(Date.now() + i * 3600000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        temp: 30 + Math.round(Math.random() * 5),
        icon: "803",
        description: "Cloudy",
        pop: Math.random() * 0.3,
      })));
      setDaily(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => ({
        day: i === 0 ? "Today" : d,
        date: new Date(Date.now() + i * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        high: 32 + Math.round(Math.random() * 4),
        low: 25 + Math.round(Math.random() * 3),
        icon: "803",
        description: "Partly cloudy",
        pop: Math.random() * 0.4,
      })));
      await fetchClothingSuggestions({ temperature: 32, feelsLike: 36, condition: "Clouds", humidity: 72, windSpeed: 18 });
      return;
    }

    try {
      const [currentRes, forecastRes] = await Promise.all([
        fetch(`${OWM_BASE}/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric`),
        fetch(`${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric`),
      ]);

      const current = await currentRes.json();
      const forecast = await forecastRes.json();

      if (current.cod !== 200) throw new Error(current.message || "Weather fetch failed");

      const weatherData: WeatherData = {
        city: current.name,
        country: current.sys?.country || "",
        temperature: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        humidity: current.main.humidity,
        windSpeed: Math.round((current.wind?.speed ?? 0) * 3.6),
        condition: current.weather[0]?.main || "Clear",
        conditionCode: current.weather[0]?.id || 800,
        description: current.weather[0]?.description || "",
        visibility: current.visibility || 10000,
        pressure: current.main.pressure || 1013,
        sunrise: current.sys?.sunrise || 0,
        sunset: current.sys?.sunset || 0,
      };
      setWeather(weatherData);

      // ── Hourly (next 24h) ──
      const hourlyData: HourlyForecast[] = (forecast.list ?? []).slice(0, 8).map((item: any) => ({
        time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        temp: Math.round(item.main.temp),
        icon: item.weather[0]?.id?.toString() || "800",
        description: item.weather[0]?.description || "",
        pop: item.pop || 0,
      }));
      setHourly(hourlyData);

      // ── Daily (unique days) ──
      const seen = new Set<string>();
      const dailyData: DailyForecast[] = [];
      for (const item of (forecast.list ?? [])) {
        const dateKey = new Date(item.dt * 1000).toDateString();
        if (!seen.has(dateKey) && dailyData.length < 7) {
          seen.add(dateKey);
          dailyData.push({
            day: formatDay(item.dt_txt),
            date: new Date(item.dt * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            high: Math.round(item.main.temp_max),
            low: Math.round(item.main.temp_min),
            icon: item.weather[0]?.id?.toString() || "800",
            description: item.weather[0]?.description || "",
            pop: item.pop || 0,
          });
        }
      }
      setDaily(dailyData);

      // ── AI clothing suggestions ──
      await fetchClothingSuggestions({
        temperature: weatherData.temperature,
        feelsLike: weatherData.feelsLike,
        condition: weatherData.condition,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
      });
    } catch (e: any) {
      setError(e.message || "Failed to fetch weather. Check your API key.");
    }
  };

  const fetchClothingSuggestions = async (params: {
    temperature: number; feelsLike: number; condition: string;
    humidity: number; windSpeed: number;
  }) => {
    setClothingLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { setClothingLoading(false); return; }

      const clothingController = new AbortController();
      const clothingTimeout = setTimeout(() => clothingController.abort(), 20_000);
      const res = await fetch(`${API_BASE_URL}/ai/suggest-clothing`, {
        method: "POST",
        signal: clothingController.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(params),
      });
      clearTimeout(clothingTimeout);

      if (res.ok) {
        const json = await res.json();
        if (json.success) setClothing(json.data);
      }
    } catch { /* fail silently */ }
    finally { setClothingLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadByLocation();
    setRefreshing(false);
  }, []);

  const gradient = weather ? getGradient(weather.conditionCode) : ["#3A7BD5", "#00D2FF"] as [string, string];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        {/* ── Header / Current Weather ── */}
        <LinearGradient colors={gradient} style={[s.hero, { paddingTop: insets.top + 16 }]}>
          {/* Nav */}
          <View style={s.heroNav}>
            <Pressable style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Text style={s.heroNavTitle}>Weather</Text>
            <Pressable style={s.backBtn} onPress={loadByLocation}>
              <Ionicons name="locate-outline" size={22} color="#fff" />
            </Pressable>
          </View>

          {/* Search bar */}
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={s.searchInput}
              placeholder="Search city..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchCity}
              returnKeyType="search"
            />
            {searching
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <Pressable onPress={searchCity}>
                  <Ionicons name="arrow-forward-circle" size={24} color="rgba(255,255,255,0.9)" />
                </Pressable>
              )
            }
          </View>

          {/* Current conditions */}
          {loading ? (
            <View style={s.loadingHero}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={s.loadingText}>Getting your weather...</Text>
            </View>
          ) : error ? (
            <View style={s.errorHero}>
              <Text style={s.errorEmoji}>🌐</Text>
              <Text style={s.errorText}>{error}</Text>
              <Pressable style={s.retryBtn} onPress={loadByLocation}>
                <Text style={s.retryText}>Try Again</Text>
              </Pressable>
            </View>
          ) : weather ? (
            <View style={s.currentWrap}>
              <Text style={s.weatherEmoji}>{getWeatherEmoji(weather.conditionCode)}</Text>
              <Text style={s.temperature}>{weather.temperature}°C</Text>
              <Text style={s.cityName}>{weather.city}{weather.country ? `, ${weather.country}` : ""}</Text>
              <Text style={s.description}>{weather.description}</Text>
              <Text style={s.feelsLike}>Feels like {weather.feelsLike}°C</Text>

              {/* Stats row */}
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Ionicons name="water-outline" size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={s.statValue}>{weather.humidity}%</Text>
                  <Text style={s.statLabel}>Humidity</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Ionicons name="navigate-outline" size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={s.statValue}>{weather.windSpeed} km/h</Text>
                  <Text style={s.statLabel}>Wind</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Ionicons name="speedometer-outline" size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={s.statValue}>{weather.pressure} hPa</Text>
                  <Text style={s.statLabel}>Pressure</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Ionicons name="eye-outline" size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={s.statValue}>{(weather.visibility / 1000).toFixed(1)} km</Text>
                  <Text style={s.statLabel}>Visibility</Text>
                </View>
              </View>

              {/* Sunrise / Sunset */}
              <View style={s.sunRow}>
                <View style={s.sunItem}>
                  <Text style={s.sunEmoji}>🌅</Text>
                  <Text style={s.sunValue}>{formatTime(weather.sunrise)}</Text>
                  <Text style={s.sunLabel}>Sunrise</Text>
                </View>
                <View style={s.sunDivider} />
                <View style={s.sunItem}>
                  <Text style={s.sunEmoji}>🌇</Text>
                  <Text style={s.sunValue}>{formatTime(weather.sunset)}</Text>
                  <Text style={s.sunLabel}>Sunset</Text>
                </View>
              </View>
            </View>
          ) : null}
        </LinearGradient>

        {weather && (
          <View style={s.body}>

            {/* ── Hourly Forecast ── */}
            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>Hourly Forecast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.hourlyRow}>
                  {hourly.map((h, i) => (
                    <View key={i} style={s.hourlyItem}>
                      <Text style={s.hourlyTime}>{h.time}</Text>
                      <Text style={s.hourlyEmoji}>{getWeatherEmoji(parseInt(h.icon))}</Text>
                      <Text style={s.hourlyTemp}>{h.temp}°</Text>
                      {h.pop > 0.1 && (
                        <Text style={s.hourlyPop}>💧{Math.round(h.pop * 100)}%</Text>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* ── 7-Day Forecast ── */}
            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>7-Day Forecast</Text>
              {daily.map((d, i) => (
                <View key={i} style={s.dailyRow}>
                  <Text style={s.dailyDay}>{d.day}</Text>
                  <Text style={s.dailyEmoji}>{getWeatherEmoji(parseInt(d.icon))}</Text>
                  <Text style={s.dailyDesc}>{d.description}</Text>
                  {d.pop > 0.1 && <Text style={s.dailyPop}>💧{Math.round(d.pop * 100)}%</Text>}
                  <Text style={s.dailyHighLow}>
                    <Text style={s.dailyHigh}>{d.high}°</Text>
                    <Text style={s.dailyLow}>  {d.low}°</Text>
                  </Text>
                </View>
              ))}
            </View>

            {/* ── AI Clothing Suggestions ── */}
            <View style={[s.sectionCard, s.clothingCard]}>
              <View style={s.clothingHeader}>
                <Text style={s.clothingEmoji}>{clothing?.emoji || "👗"}</Text>
                <Text style={s.sectionTitle}>AI Clothing Suggestions</Text>
              </View>

              {clothingLoading ? (
                <View style={s.clothingLoading}>
                  <ActivityIndicator color="#2B7FC0" />
                  <Text style={s.clothingLoadingText}>Getting suggestions from AI...</Text>
                </View>
              ) : clothing ? (
                <>
                  <Text style={s.clothingSummary}>{clothing.summary}</Text>

                  <Text style={s.clothingSubtitle}>👔 Recommended Clothing</Text>
                  <View style={s.clothingItems}>
                    {clothing.items.map((item, i) => (
                      <View key={i} style={s.clothingItem}>
                        <Text style={s.clothingItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={s.clothingSubtitle}>💊 Health Tips</Text>
                  {clothing.healthTips.map((tip, i) => (
                    <View key={i} style={s.healthTipRow}>
                      <View style={s.tipDot} />
                      <Text style={s.healthTipText}>{tip}</Text>
                    </View>
                  ))}

                  {clothing.warning && (
                    <View style={s.warningBox}>
                      <Ionicons name="warning-outline" size={18} color="#D97706" />
                      <Text style={s.warningText}>{clothing.warning}</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={s.clothingEmptyWrap}>
                  <Text style={s.clothingEmpty}>AI suggestions unavailable.</Text>
                  <Text style={s.clothingEmptySub}>Make sure the TinyBit server is running.</Text>
                  {weather && (
                    <Pressable
                      style={s.clothingRetryBtn}
                      onPress={() => fetchClothingSuggestions({
                        temperature: weather.temperature,
                        feelsLike: weather.feelsLike,
                        condition: weather.condition,
                        humidity: weather.humidity,
                        windSpeed: weather.windSpeed,
                      })}
                    >
                      <Ionicons name="refresh-outline" size={16} color="#1D4ED8" />
                      <Text style={s.clothingRetryText}>Retry</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>

          </View>
        )}

        {/* Demo mode notice */}
        {(!OWM_API_KEY || OWM_API_KEY.length < 10) && (
          <View style={s.demoNotice}>
            <Ionicons name="information-circle-outline" size={16} color="#D97706" />
            <Text style={s.demoText}>Demo mode. Add your OpenWeatherMap API key in app/weather.tsx to get real weather data.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },

  hero: { paddingHorizontal: 20, paddingBottom: 50, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  heroNavTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, gap: 10, marginBottom: 24 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "600", color: "#fff" },

  loadingHero: { alignItems: "center", paddingVertical: 48, gap: 12 },
  loadingText: { color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: "600" },
  errorHero: { alignItems: "center", paddingVertical: 32, gap: 12 },
  errorEmoji: { fontSize: 40 },
  errorText: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "600", textAlign: "center" },
  retryBtn: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  currentWrap: { alignItems: "center" },
  weatherEmoji: { fontSize: 72, marginBottom: 4 },
  temperature: { fontSize: 72, fontWeight: "900", color: "#fff", lineHeight: 80 },
  cityName: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 4 },
  description: { fontSize: 16, color: "rgba(255,255,255,0.8)", fontWeight: "600", textTransform: "capitalize", marginTop: 4 },
  feelsLike: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4, fontWeight: "600" },

  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18, padding: 16, marginTop: 20, gap: 0 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 13, fontWeight: "900", color: "#fff" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },

  sunRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18, padding: 16, marginTop: 12, gap: 0 },
  sunItem: { flex: 1, alignItems: "center", gap: 4 },
  sunEmoji: { fontSize: 22 },
  sunValue: { fontSize: 16, fontWeight: "900", color: "#fff" },
  sunLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  sunDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 8 },

  body: { paddingHorizontal: 16, paddingTop: 24, marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#F4F7FB" },
  sectionCard: { backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B", marginBottom: 14 },

  hourlyRow: { flexDirection: "row", gap: 16 },
  hourlyItem: { alignItems: "center", gap: 6, minWidth: 60 },
  hourlyTime: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  hourlyEmoji: { fontSize: 24 },
  hourlyTemp: { fontSize: 15, fontWeight: "900", color: "#1E293B" },
  hourlyPop: { fontSize: 11, color: "#3B82F6", fontWeight: "700" },

  dailyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", gap: 10 },
  dailyDay: { width: 90, fontSize: 14, fontWeight: "800", color: "#1E293B" },
  dailyEmoji: { fontSize: 22, width: 32 },
  dailyDesc: { flex: 1, fontSize: 13, color: "#64748B", fontWeight: "600", textTransform: "capitalize" },
  dailyPop: { fontSize: 12, color: "#3B82F6", fontWeight: "700" },
  dailyHighLow: { minWidth: 64, textAlign: "right" },
  dailyHigh: { fontSize: 15, fontWeight: "900", color: "#EF4444" },
  dailyLow: { fontSize: 15, fontWeight: "700", color: "#3B82F6" },

  clothingCard: { backgroundColor: "#EFF6FF" },
  clothingHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 0 },
  clothingEmoji: { fontSize: 28 },
  clothingSummary: { fontSize: 15, fontWeight: "600", color: "#1E3A5F", marginBottom: 16, lineHeight: 22 },
  clothingSubtitle: { fontSize: 14, fontWeight: "900", color: "#1E293B", marginBottom: 10 },
  clothingItems: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  clothingItem: { backgroundColor: "#DBEAFE", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  clothingItemText: { fontSize: 13, fontWeight: "700", color: "#1D4ED8" },
  clothingLoading: { alignItems: "center", paddingVertical: 20, gap: 8 },
  clothingLoadingText: { fontSize: 13, color: "#64748B" },
  healthTipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2B7FC0", marginTop: 6 },
  healthTipText: { flex: 1, fontSize: 14, color: "#334155", fontWeight: "600", lineHeight: 20 },
  warningBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FEF3C7", borderRadius: 12, padding: 12, marginTop: 12 },
  warningText: { flex: 1, fontSize: 13, color: "#92400E", fontWeight: "600", lineHeight: 18 },
  clothingEmpty: { fontSize: 14, color: "#94A3B8", fontWeight: "600", textAlign: "center" },
  clothingEmptyWrap: { alignItems: "center", paddingVertical: 16, gap: 6 },
  clothingEmptySub: { fontSize: 12, color: "#CBD5E1", fontWeight: "500", textAlign: "center" },
  clothingRetryBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, backgroundColor: "#DBEAFE", paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  clothingRetryText: { fontSize: 13, fontWeight: "800", color: "#1D4ED8" },

  demoNotice: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FEF9C3", margin: 16, borderRadius: 12, padding: 14 },
  demoText: { flex: 1, fontSize: 12, color: "#92400E", fontWeight: "600", lineHeight: 18 },
});
