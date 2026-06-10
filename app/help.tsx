/**
 * Help & Video Tutorial Screen — TinyBit
 * Tutorial categories with YouTube WebView player
 */

import { useState } from "react";
import {
  Modal, Pressable, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  youtubeId: string;   // YouTube video ID (the part after ?v=)
  thumbnail: string;   // emoji or "yt" for YouTube thumb
  level: "Beginner" | "Intermediate" | "Advanced";
}

interface Category {
  id: string;
  title: string;
  icon: string;
  color: string;
  tutorials: Tutorial[];
}

// ── Tutorial Data ─────────────────────────────────────────────────────────────
// Replace youtubeId with actual video IDs when available
const CATEGORIES: Category[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "🚀",
    color: "#3B82F6",
    tutorials: [
      { id: "gs1", title: "Welcome to TinyBit", description: "Learn what TinyBit can do for you and your family.", duration: "3:45", youtubeId: "dQw4w9WgXcQ", thumbnail: "🏠", level: "Beginner" },
      { id: "gs2", title: "Setting Up Your Profile", description: "Add your health details, emergency contacts, and preferences.", duration: "5:20", youtubeId: "dQw4w9WgXcQ", thumbnail: "👤", level: "Beginner" },
      { id: "gs3", title: "Connecting with Your Guardian", description: "Invite a family member to be your guardian.", duration: "4:10", youtubeId: "dQw4w9WgXcQ", thumbnail: "👨‍👩‍👧", level: "Beginner" },
    ],
  },
  {
    id: "health-tracking",
    title: "Health Tracking",
    icon: "❤️",
    color: "#EF4444",
    tutorials: [
      { id: "ht1", title: "Daily Wellness", description: "How to complete your daily mood and health check-in.", duration: "3:15", youtubeId: "dQw4w9WgXcQ", thumbnail: "📊", level: "Beginner" },
      { id: "ht2", title: "Health Tracking", description: "Track water intake, sleep, blood pressure, and more.", duration: "6:30", youtubeId: "dQw4w9WgXcQ", thumbnail: "💧", level: "Beginner" },
      { id: "ht3", title: "Understanding Your Health Report", description: "Read and understand your health trends and charts.", duration: "5:45", youtubeId: "dQw4w9WgXcQ", thumbnail: "📈", level: "Intermediate" },
      { id: "ht4", title: "Calorie Tracker", description: "Use AI to scan food and track your nutrition.", duration: "4:00", youtubeId: "dQw4w9WgXcQ", thumbnail: "🥗", level: "Intermediate" },
    ],
  },
  {
    id: "medicine",
    title: "Medicine Management",
    icon: "💊",
    color: "#10B981",
    tutorials: [
      { id: "med1", title: "Adding Medicines", description: "Add your daily medicines with dosage and timing.", duration: "4:20", youtubeId: "dQw4w9WgXcQ", thumbnail: "💊", level: "Beginner" },
      { id: "med2", title: "Medicine Reminders", description: "Set up reminders so you never miss a dose.", duration: "3:00", youtubeId: "dQw4w9WgXcQ", thumbnail: "⏰", level: "Beginner" },
      { id: "med3", title: "Medicine Progress", description: "Mark medicines as taken and view your adherence.", duration: "3:30", youtubeId: "dQw4w9WgXcQ", thumbnail: "✅", level: "Beginner" },
    ],
  },
  {
    id: "ai-sathi",
    title: "Talking with Sathi",
    icon: "🤖",
    color: "#8B5CF6",
    tutorials: [
      { id: "ai1", title: "Talking to Sathi", description: "Ask health questions and get AI-powered answers.", duration: "5:00", youtubeId: "dQw4w9WgXcQ", thumbnail: "💬", level: "Beginner" },
      { id: "ai2", title: "Voice Commands", description: "Use your voice to interact with Sathi hands-free.", duration: "3:45", youtubeId: "dQw4w9WgXcQ", thumbnail: "🎤", level: "Intermediate" },
      { id: "ai3", title: "Getting Health Suggestions", description: "Ask Sathi for personalized health recommendations.", duration: "4:15", youtubeId: "dQw4w9WgXcQ", thumbnail: "💡", level: "Intermediate" },
    ],
  },
  {
    id: "emergency",
    title: "Emergency Features",
    icon: "🆘",
    color: "#EF4444",
    tutorials: [
      { id: "em1", title: "Using the SOS Button", description: "How to use the emergency SOS feature safely.", duration: "2:30", youtubeId: "dQw4w9WgXcQ", thumbnail: "🆘", level: "Beginner" },
      { id: "em2", title: "Health ID Card", description: "Generate and share your Emergency Health QR card.", duration: "3:00", youtubeId: "dQw4w9WgXcQ", thumbnail: "🏥", level: "Beginner" },
      { id: "em3", title: "Location Sharing", description: "Share your live location with family for safety.", duration: "3:20", youtubeId: "dQw4w9WgXcQ", thumbnail: "📍", level: "Beginner" },
    ],
  },
  {
    id: "family",
    title: "Family Features",
    icon: "👨‍👩‍👧‍👦",
    color: "#F59E0B",
    tutorials: [
      { id: "fam1", title: "Family Dashboard", description: "How guardians can monitor an elder's health.", duration: "6:00", youtubeId: "dQw4w9WgXcQ", thumbnail: "🛡️", level: "Intermediate" },
      { id: "fam2", title: "Family Messages", description: "Send and receive voice messages from family.", duration: "3:30", youtubeId: "dQw4w9WgXcQ", thumbnail: "💌", level: "Beginner" },
      { id: "fam3", title: "My Calendar", description: "Schedule and manage care events with family.", duration: "4:00", youtubeId: "dQw4w9WgXcQ", thumbnail: "📅", level: "Intermediate" },
    ],
  },
];

// ── Level badge ────────────────────────────────────────────────────────────────
function LevelBadge({ level }: { level: Tutorial["level"] }) {
  const colors: Record<Tutorial["level"], { bg: string; text: string }> = {
    Beginner: { bg: "#DCFCE7", text: "#166534" },
    Intermediate: { bg: "#FEF9C3", text: "#92400E" },
    Advanced: { bg: "#FEE2E2", text: "#991B1B" },
  };
  const c = colors[level];
  return (
    <View style={[lb.badge, { backgroundColor: c.bg }]}>
      <Text style={[lb.text, { color: c.text }]}>{level}</Text>
    </View>
  );
}
const lb = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  text: { fontSize: 10, fontWeight: "800" },
});

// ── FAQ data ───────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "How do I reset my password?", a: "Go to Profile → Settings, then tap 'Change Password' and follow the instructions." },
  { q: "Can I use TinyBit in Hindi?", a: "Yes! TinyBit supports 6 languages: English, Hindi, Gujarati, Tamil, Bengali, and Marathi. Change language in Profile → Language." },
  { q: "How does the SOS feature work?", a: "Press the SOS button on the Home screen for 3 seconds. It will call your guardian or local emergency services automatically." },
  { q: "Is my health data private?", a: "Yes, all your health data is encrypted and stored securely. Only you and your connected guardians can see your data." },
  { q: "Can I have multiple guardians?", a: "Yes, you can connect multiple guardians (e.g., son and daughter) from Profile → Guardian Setup." },
  { q: "How do I add medicines?", a: "Go to the Medicine tab, tap the '+' button, and fill in the medicine name, dosage, and timing." },
];

// ═══════════════════════════════════════════════════════════════════════════════
export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<Tutorial | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"tutorials" | "faq">("tutorials");

  // ── Search filter ──────────────────────────────────────────────────────────
  const filteredCategories = CATEGORIES.map(cat => ({
    ...cat,
    tutorials: cat.tutorials.filter(t =>
      searchQuery === "" ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(cat => cat.tutorials.length > 0);

  const allTutorialCount = CATEGORIES.reduce((sum, c) => sum + c.tutorials.length, 0);

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
          <Text style={s.headerTitle}>Help & Guide</Text>
          <Text style={s.headerSub}>{allTutorialCount} video tutorials available</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={s.sheet}>
        {/* ── Search ── */}
        <View style={s.searchContainer}>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={s.searchInput}
              placeholder="Search tutorials..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Tab switcher ── */}
        <View style={s.tabRow}>
          {(["tutorials", "faq"] as const).map(tab => (
            <Pressable
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab === "tutorials" ? "📺 Tutorials" : "❓ FAQ"}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 100 }]}
        >
          {activeTab === "tutorials" ? (
            <>
              {/* ── Category filter chips ── */}
              {searchQuery === "" && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={s.chipsRow}>
                    <Pressable
                      style={[s.chip, selectedCategory === null && s.chipActive]}
                      onPress={() => setSelectedCategory(null)}
                    >
                      <Text style={[s.chipText, selectedCategory === null && s.chipTextActive]}>All</Text>
                    </Pressable>
                    {CATEGORIES.map(cat => (
                      <Pressable
                        key={cat.id}
                        style={[s.chip, selectedCategory === cat.id && s.chipActive, { borderColor: cat.color }]}
                        onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                      >
                        <Text>{cat.icon}</Text>
                        <Text style={[s.chipText, selectedCategory === cat.id && s.chipTextActive]}>{cat.title}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* ── Tutorial categories ── */}
              {filteredCategories
                .filter(cat => selectedCategory === null || cat.id === selectedCategory)
                .map(cat => (
                  <View key={cat.id} style={s.categorySection}>
                    <View style={s.catHeaderRow}>
                      <Text style={s.catIcon}>{cat.icon}</Text>
                      <Text style={s.catTitle}>{cat.title}</Text>
                      <View style={[s.catCount, { backgroundColor: cat.color + "22" }]}>
                        <Text style={[s.catCountText, { color: cat.color }]}>{cat.tutorials.length}</Text>
                      </View>
                    </View>

                    {cat.tutorials.map(tutorial => (
                      <Pressable
                        key={tutorial.id}
                        style={s.tutorialCard}
                        onPress={() => setPlayingVideo(tutorial)}
                      >
                        <View style={[s.tutorialThumb, { backgroundColor: cat.color + "22" }]}>
                          <Text style={s.tutorialEmoji}>{tutorial.thumbnail}</Text>
                          <View style={s.playOverlay}>
                            <Ionicons name="play-circle" size={28} color={cat.color} />
                          </View>
                        </View>
                        <View style={s.tutorialInfo}>
                          <Text style={s.tutorialTitle}>{tutorial.title}</Text>
                          <Text style={s.tutorialDesc} numberOfLines={2}>{tutorial.description}</Text>
                          <View style={s.tutorialMeta}>
                            <LevelBadge level={tutorial.level} />
                            <View style={s.durationBadge}>
                              <Ionicons name="time-outline" size={12} color="#64748B" />
                              <Text style={s.durationText}>{tutorial.duration}</Text>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ))}

              {filteredCategories.length === 0 && (
                <View style={s.emptySearch}>
                  <Text style={s.emptySearchEmoji}>🔍</Text>
                  <Text style={s.emptySearchText}>No tutorials found for "{searchQuery}"</Text>
                  <Pressable onPress={() => setSearchQuery("")} style={s.clearSearchBtn}>
                    <Text style={s.clearSearchText}>Clear Search</Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : (
            /* ── FAQ Section ── */
            <>
              <Text style={s.faqTitle}>Frequently Asked Questions</Text>
              {FAQS.map((faq, i) => (
                <Pressable
                  key={i}
                  style={s.faqItem}
                  onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
                >
                  <View style={s.faqHeader}>
                    <Text style={s.faqQ}>{faq.q}</Text>
                    <Ionicons
                      name={expandedFaq === i ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#64748B"
                    />
                  </View>
                  {expandedFaq === i && (
                    <Text style={s.faqA}>{faq.a}</Text>
                  )}
                </Pressable>
              ))}

              {/* Contact support */}
              <View style={s.supportCard}>
                <Text style={s.supportEmoji}>💬</Text>
                <Text style={s.supportTitle}>Still need help?</Text>
                <Text style={s.supportSub}>Talk to Sathi AI — your personal health assistant available 24/7</Text>
                <Pressable style={s.supportBtn} onPress={() => router.push("/(tabs)/ai" as any)}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                  <Text style={s.supportBtnText}>Chat with Sathi</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>

      {/* ── Video Player Modal ── */}
      <Modal
        visible={playingVideo !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPlayingVideo(null)}
      >
        <View style={s.playerModal}>
          <View style={s.playerHeader}>
            <Pressable style={s.playerClose} onPress={() => setPlayingVideo(null)}>
              <Ionicons name="close" size={22} color="#1E293B" />
            </Pressable>
            <Text style={s.playerTitle} numberOfLines={1}>{playingVideo?.title}</Text>
            <View style={{ width: 40 }} />
          </View>

          {playingVideo && (
            <>
              <WebView
                style={s.webview}
                source={{
                  uri: `https://www.youtube.com/embed/${playingVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`,
                }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />

              <ScrollView style={s.playerBody} contentContainerStyle={{ padding: 20 }}>
                <Text style={s.playerVideoTitle}>{playingVideo.title}</Text>
                <Text style={s.playerDesc}>{playingVideo.description}</Text>
                <View style={s.playerMeta}>
                  <LevelBadge level={playingVideo.level} />
                  <View style={s.durationBadge}>
                    <Ionicons name="time-outline" size={14} color="#64748B" />
                    <Text style={s.durationText}>{playingVideo.duration}</Text>
                  </View>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
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

  sheet: { flex: 1, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#F8FAFC", overflow: "hidden" },

  searchContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15, color: "#1E293B", fontWeight: "600" },

  tabRow: { flexDirection: "row", marginHorizontal: 16, marginVertical: 12, backgroundColor: "#F1F5F9", borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 14, fontWeight: "800", color: "#94A3B8" },
  tabTextActive: { color: "#1E293B" },

  content: { paddingHorizontal: 16 },

  chipsRow: { flexDirection: "row", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0" },
  chipActive: { backgroundColor: "#2B3C86", borderColor: "#2B3C86" },
  chipText: { fontSize: 12, fontWeight: "800", color: "#475569" },
  chipTextActive: { color: "#fff" },

  categorySection: { marginBottom: 24 },
  catHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  catIcon: { fontSize: 20 },
  catTitle: { flex: 1, fontSize: 16, fontWeight: "900", color: "#1E293B" },
  catCount: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  catCountText: { fontSize: 12, fontWeight: "900" },

  tutorialCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1, gap: 14 },
  tutorialThumb: { width: 88, height: 88, alignItems: "center", justifyContent: "center", position: "relative" },
  tutorialEmoji: { fontSize: 32 },
  playOverlay: { position: "absolute", bottom: 6, right: 6 },
  tutorialInfo: { flex: 1, paddingVertical: 12, paddingRight: 12 },
  tutorialTitle: { fontSize: 14, fontWeight: "900", color: "#1E293B", marginBottom: 4 },
  tutorialDesc: { fontSize: 12, color: "#64748B", fontWeight: "600", lineHeight: 17, marginBottom: 8 },
  tutorialMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  durationBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  durationText: { fontSize: 11, fontWeight: "700", color: "#64748B" },

  emptySearch: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptySearchEmoji: { fontSize: 48 },
  emptySearchText: { fontSize: 15, color: "#64748B", fontWeight: "700" },
  clearSearchBtn: { backgroundColor: "#EFF6FF", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  clearSearchText: { fontSize: 14, fontWeight: "800", color: "#3B82F6" },

  // FAQ
  faqTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B", marginBottom: 16 },
  faqItem: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  faqHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: "800", color: "#1E293B", lineHeight: 20 },
  faqA: { fontSize: 14, color: "#475569", fontWeight: "600", lineHeight: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },

  supportCard: { backgroundColor: "#EFF6FF", borderRadius: 20, padding: 24, alignItems: "center", gap: 8, marginTop: 8 },
  supportEmoji: { fontSize: 36 },
  supportTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B" },
  supportSub: { fontSize: 14, color: "#64748B", fontWeight: "600", textAlign: "center", lineHeight: 20 },
  supportBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#2B3C86", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 8 },
  supportBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Player modal
  playerModal: { flex: 1, backgroundColor: "#fff" },
  playerHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F4F8" },
  playerClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  playerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "800", color: "#1E293B" },
  webview: { height: 240, backgroundColor: "#000" },
  playerBody: { flex: 1 },
  playerVideoTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B", marginBottom: 8 },
  playerDesc: { fontSize: 14, color: "#64748B", fontWeight: "600", lineHeight: 22, marginBottom: 14 },
  playerMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
});
