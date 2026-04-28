import { Ionicons } from "@expo/vector-icons";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { sathiAi } from "../../utils/openai";
import { supabase } from "../../utils/supabase";
import SideMenu from "../../components/SideMenu";
import GuardianHomeScreen from "../../components/GuardianHomeScreen";

const { width } = Dimensions.get("window");

const C = {
  navy: "#1A3050",
  blue: "#3FA4DA",
  purple: "#8E94F2",
  white: "#FFFFFF",
  bg: "#F4F5F8",
  muted: "#8A94A6",
  sos: "#FF6B6B",
  success: "#4CAF50",
  warning: "#FFB300",
  accent: "#37B1E6",
  headerGradient: ['#333372', '#36B0E6'] as [string, string],
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  }
};

export default function HomeScreen() {
  const { profile } = useAuth();
  if (profile?.role === "guardian") return <GuardianHomeScreen />;
  return <ElderHomeScreen />;
}

function ElderHomeScreen() {
  const router = useRouter();
  const { profile, streak, user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [showMenu, setShowMenu] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [aiText, setAiText] = useState("");
  const [activeVoiceUri, setActiveVoiceUri] = useState<string | null>(null);
  const aiPlayer = useAudioPlayer(activeVoiceUri);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [medicines, setMedicines] = useState<any[]>([]);
  const [medLoading, setMedLoading] = useState(true);
  const [healthStats, setHealthStats] = useState<any>(null);
  const [dailyPrompt, setDailyPrompt] = useState("What was the most memorable journey of your life?");
  const [latestMessage, setLatestMessage] = useState<any>(null);
  const [todayMood, setTodayMood] = useState<string>("—");

  useEffect(() => {
    if (user) {
      fetchMedicines();
      fetchHealthStats();
      fetchDailyPrompt();
      fetchLatestMessage();
      fetchTodayMood();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setAiText(getAiMessage());
    }
  }, [profile, medicines, healthStats]);

  const fetchMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from('medicines')
        .select(`*, medicine_logs (taken_at, medicine_id)`)
        .eq('user_id', user?.id);
      if (error) throw error;
      setMedicines(data || []);
    } catch (err) {
      console.log('Error fetching medicines', err);
    } finally {
      setMedLoading(false);
    }
  };

  const fetchHealthStats = async () => {
    try {
      const { data, error } = await supabase
        .from('health_stats')
        .select('*')
        .eq('user_id', user?.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      setHealthStats(data);
    } catch (err) {
      console.log('Error fetching health stats', err);
    }
  };

  const fetchDailyPrompt = async () => {
    const prompts = [
      "What was the most memorable journey of your life?",
      "Who was your best friend in childhood?",
      "What is your favorite family recipe and its story?",
      "Describe a place that makes you feel peaceful.",
      "What is the most valuable lesson you've learned?"
    ];
    const day = new Date().getDay();
    setDailyPrompt(prompts[day % prompts.length]);
  };

  const fetchTodayMood = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('moods')
        .select('mood')
        .eq('user_id', user?.id)
        .eq('date', today)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.mood) setTodayMood(data.mood);
    } catch (err) {
      console.log('Error fetching today mood', err);
    }
  };

  const fetchLatestMessage = async () => {
    try {
      const { data, error } = await supabase
        .from('family_messages')
        .select('*, sender:profiles!sender_id (full_name)')
        .eq('receiver_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      setLatestMessage(data);
    } catch (err) {
      console.log('Error fetching latest message', err);
    }
  };

  const userName = profile?.fullName || user?.email?.split('@')[0] || "Friend";

  const takenCount = medicines.filter((m) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return m.medicine_logs?.some((l: any) => {
      if (!l?.taken_at) return false;
      const t = new Date(l.taken_at).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
  }).length;

  const totalCount = medicines.length || 3;
  const progressPercent = medicines.length > 0 ? (takenCount / medicines.length) * 100 : 33;

  const getAiMessage = () => {
    let msg = `Good Morning ${userName}! `;
    if (healthStats?.blood_sugar) {
      msg += `Your blood sugar yesterday was ${healthStats.blood_sugar_status === 'High' ? 'a bit high' : 'normal'}. `;
    } else {
      msg += `Don't forget to check your heart rate today. `;
    }
    msg += `You've taken ${takenCount} medicines so far. Let's focus on your walk!`;
    return msg;
  };

  const handleTalkToSathi = async () => {
    if (isRecording) {
      setIsRecording(false);
      recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;
      setAiText("Thinking...");
      try {
        const text = await sathiAi.transcribe(uri);
        if (!text || text.trim() === "") {
          setAiText("I'm sorry, I couldn't hear that properly. Could you try again?");
          return;
        }
        setAiText(`You said: "${text}"`);
        const context = `User: ${userName}. Stats: ${takenCount}/${totalCount} medicines taken.`;
        const reply = await sathiAi.chat([{ role: 'user', content: text }], context);
        setAiText(reply);
        const voiceUri = await sathiAi.generateSpeech(reply);
        if (voiceUri) {
          setActiveVoiceUri(voiceUri);
          setTimeout(() => { aiPlayer.play(); }, 150);
        }
      } catch (e: any) {
        setAiText("I'm sorry, I'm having a bit of trouble talking right now.");
        console.log("AI Error:", e);
      }
    } else {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return;
      setIsRecording(true);
      setAiText("Listening...");
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      } catch (ae) { console.log("Mode switch error", ae); }
      await recorder.record();
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── FIXED: Gradient Header only ── */}
      <LinearGradient
        colors={C.headerGradient}
        style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>
            Hello, {userName.charAt(0).toUpperCase() + userName.slice(1)}!
          </Text>
          <View style={styles.headerIcons}>
            <Pressable style={styles.headerIconBtn} onPress={() => router.push("/notifications")}>
              <Ionicons name="notifications-outline" size={24} color="white" />
            </Pressable>
            <Pressable style={styles.headerIconBtn} onPress={() => setShowMenu(true)}>
              <Ionicons name="menu-outline" size={26} color="white" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* ── SCROLLABLE SHEET: rounds over gradient ── */}
      <View style={styles.scrollSheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 150, paddingTop: 16 }}
        >
          {/* Sathi AI Card */}
          <Animated.View entering={FadeInUp.delay(200)} style={styles.sathiCard}>
            <View style={styles.sathiMain}>
              <View style={styles.sathiInfo}>
                <Text style={styles.sathiLabel}>Sathi Ai Say...</Text>
                <Text style={styles.sathiSubLabel}>Your Voice Ai companion</Text>
                <Pressable onPress={handleTalkToSathi} style={{ alignSelf: 'flex-start' }}>
                  <LinearGradient
                    colors={isRecording ? [C.sos, '#C0392B'] : ['#1A3558', '#2E6DA4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.talkBtn}
                  >
                    <Ionicons name={isRecording ? "stop" : "mic"} size={17} color="white" style={{ marginRight: 7 }} />
                    <Text style={styles.talkBtnText}>{isRecording ? "Stop" : "Talk to Sathi"}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
              <View style={styles.mascotBg}>
                <Text style={styles.sparkle}>✦</Text>
                <Image source={require('../../assets/images/homescreendrop.png')} style={styles.mascotImg} resizeMode="contain" />
              </View>
            </View>
            <View style={styles.sathiBottom}>
              <Text style={styles.sathiQuote}>{aiText || getAiMessage()}</Text>
            </View>
          </Animated.View>

          {/* Today at a Glance */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today at a Glance</Text>
            <Text style={styles.sectionActionMuted}>{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </View>
          <View style={styles.glanceRow}>
            <GlanceCard title="Mood" color="#3FA4DA" img={require('../../assets/images/Mood.png')} value={todayMood} />
            <GlanceCard title="Medicine" color="#4DB6AC" img={require('../../assets/images/Medicine.png')} value={`${takenCount}/${totalCount}`} />
            <GlanceCard title="Streak" color="#FF8A65" img={require('../../assets/images/Streak.png')} value={streak.toString()} />
          </View>

          {/* Emergency Help */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Help</Text>
          </View>
          <View style={styles.emergencyRow}>
            <View style={styles.contactsCol}>
              <EmergencyContact name="Shivani Shah" sub="Guardian" />
              <EmergencyContact name="Ambulance" sub="Medical Service" />
            </View>
            <View style={styles.sosCol}>
              <Pressable onPress={() => router.push("/sos")} style={styles.sosOuter}>
                <LinearGradient
                  colors={['#FF8A75', '#F05555']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sosInner}
                >
                  <Text style={styles.sosText}>SOS</Text>
                  <Text style={styles.sosSubText}>Press for 3 second</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          {/* Todays Medicine */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Todays Medicine</Text>
            <Pressable onPress={() => router.push("/medicine")}>
              <Text style={styles.sectionActionLink}>View all</Text>
            </Pressable>
          </View>
          <View style={styles.medContainer}>
            <View style={styles.medProgressCardWrap}>
              <View style={styles.medProgressCard}>
                <View style={styles.medRow}>
                  <Text style={styles.medProgressTitle}>Daily Medicines</Text>
                  <LinearGradient
                    colors={C.headerGradient}
                    style={styles.pillCount}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.pillCountText}>{takenCount} of {totalCount} taken</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.medPercent}>
                  <Text style={{ color: C.accent }}>{Math.round(progressPercent)}%</Text>{' Complete'}
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
              </View>
            </View>

            {medicines.length > 0 ? (
              medicines.map((med) => {
                const start = new Date(); start.setHours(0, 0, 0, 0);
                const end = new Date(); end.setHours(23, 59, 59, 999);
                const isTaken = med.medicine_logs?.some((l: any) => {
                  if (!l?.taken_at) return false;
                  const t = new Date(l.taken_at).getTime();
                  return t >= start.getTime() && t <= end.getTime();
                });
                return (
                  <MedicineItem
                    key={med.id}
                    time={med.time}
                    name={med.name}
                    meta={`Due ${med.time}`}
                    priority={med.priority}
                    desc={med.instructions || med.dosage}
                    taken={isTaken}
                  />
                );
              })
            ) : (
              <>
                <MedicineItem time="11:00" name="Metformin Tablet 500mg" meta="Due 11:00 AM" priority="High" desc="Morning - after breakfast" taken />
                <MedicineItem time="14:00" name="Amlodipine 5mg" meta="Due 2:00 PM" priority="High" desc="Afternoon - After Lunch" taken />
                <MedicineItem time="14:00" name="Atorvastatin 10mg" meta="Due 9:00 PM" priority="High" desc="Evening - Before Bedtime" due="9:00" />
              </>
            )}
          </View>

          {/* What would you like? */}
          <View style={[styles.sectionHeader, { marginTop: 25 }]}>
            <Text style={styles.sectionTitle}>What would you like ?</Text>
            <Pressable><Text style={styles.sectionActionLink}>All Features</Text></Pressable>
          </View>
          <View style={styles.grid}>
            <GridItem title="Health Vault" sub="3 Reports" color="#4DB6AC" img={require('../../assets/images/HealthVault.png')} target="/health-vault" />
            <GridItem title="Care Calendear" sub="Doctor: Friday" color="#64B5F6" img={require('../../assets/images/CareCalender.png')} target="/care-calendar" />
            <GridItem title="Memory Journal" sub="5 Days Streak" color="#FF8A65" img={require('../../assets/images/MemoryJournal.png')} target="/journal" />
            <GridItem title="Mind Games" sub="Challenge Ready" color="#546E7A" img={require('../../assets/images/MindGames.png')} target="/mind-games" />
            <GridItem title="Mood Lift" sub="Play a Bhajan" color="#81C784" img={require('../../assets/images/MoodLift.png')} target="/mood-lift" />
            <GridItem title="Daily Check - In" sub="Sathi is ready" color="#BA68C8" img={require('../../assets/images/DailyCheckIn.png')} target="/daily-check-in" />
          </View>

          {/* Today's Surprise — Memory Prompt */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Surprise</Text>
            <Text style={styles.sectionActionMuted}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</Text>
          </View>
          <View style={styles.surpriseCard}>
            <Text style={styles.surpriseLabel}>
              Memory Prompt . {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </Text>
            <Text style={styles.surpriseText}>{'"' + dailyPrompt + '"'}</Text>
            <Pressable onPress={() => router.push('/journal')} style={styles.recordBtnWrap}>
              <LinearGradient
                colors={['#3AAEDF', '#2176AE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.recordBtn}
              >
                <Ionicons name="mic" size={20} color="white" />
                <Text style={styles.recordBtnText}>Record your memory</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Your Streak */}
          <View style={[styles.sectionHeader, { marginTop: 25 }]}>
            <Text style={styles.sectionTitle}>Your Streak</Text>
          </View>
          <View style={styles.streakWrapper}>
            <View style={styles.streakIconCircle}>
              <Image source={require('../../assets/images/Streak.png')} style={{ width: 52, height: 52 }} resizeMode="contain" />
            </View>
            <View style={styles.streakCard}>
              <Text style={styles.streakTitle}>{streak} Day Streak!</Text>
              <Text style={styles.streakSub}>You are on the right track</Text>
              <View style={styles.calendarRow}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const isToday = i === new Date().getDay() - 1;
                  const hasFire = i < streak;
                  return (
                    <View key={day} style={styles.calendarDay}>
                      <Text style={[styles.dayText, isToday && { color: '#E53935', fontWeight: '800' }]}>{day}</Text>
                      {hasFire ? (
                        <Text style={{ fontSize: 22 }}>🔥</Text>
                      ) : (
                        <Text style={[styles.dayNum, isToday && { color: '#E53935' }]}>{i + 6}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Voice Message from Family */}
          <View style={[styles.sectionHeader, { marginTop: 25 }]}>
            <Text style={styles.sectionTitle}>Today's Surprise</Text>
            <Text style={styles.sectionActionMuted}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</Text>
          </View>
          <View style={styles.voiceCard}>
            <View style={styles.voiceHeader}>
              <Image source={require('../../assets/images/IamFamily.png')} style={styles.voiceAvatar} />
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={styles.voiceName}>
                  {latestMessage
                    ? `Voice message from ${latestMessage.sender?.full_name ?? 'Family'}`
                    : 'Voice message from Rahul'}
                </Text>
                <Text style={styles.voiceTime}>
                  {latestMessage
                    ? `Tap to listen . ${Math.round((Date.now() - new Date(latestMessage.created_at).getTime()) / 60000)} min ago`
                    : 'Tap to listen . 2 min ago'}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => router.push('/family-messages')} style={styles.playBtnWrap}>
              <LinearGradient
                colors={['#3AAEDF', '#2176AE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.playBtn}
              >
                <Ionicons name="play" size={18} color="white" />
                <Text style={styles.playBtnText}>Play Recording</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Live Location */}
          <View style={[styles.sectionHeader, { marginTop: 25 }]}>
            <Text style={styles.sectionTitle}>Live Location</Text>
            <Text style={styles.sectionActionMuted}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</Text>
          </View>
          <View style={styles.locationCard}>
            <View style={styles.locationLeft}>
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={26} color="#F44336" />
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={styles.locationTitle}>Sharing with family</Text>
                <Text style={styles.locationSub}>
                  <Text style={{ color: '#37B1E6', fontWeight: '700' }}>Rahul</Text>
                  {' & '}
                  <Text style={{ color: '#37B1E6', fontWeight: '700' }}>Priya</Text>
                  {' can see your location'}
                </Text>
              </View>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Active</Text>
            </View>
          </View>

        </ScrollView>
      </View>

      <SideMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        userName={profile?.fullName || user?.email?.split("@")[0]}
        userEmail={user?.email}
        onLogout={logout}
      />
    </View>
  );
}

function GlanceCard({ title, color, img, value }: any) {
  return (
    <View style={styles.glanceCard}>
      <View style={[styles.glanceBadge, { backgroundColor: color }]}>
        <Text style={styles.glanceBadgeText}>{title}</Text>
      </View>
      <View style={styles.glanceContent}>
        <Image source={img} style={styles.glanceImg} resizeMode="contain" />
        <Text style={[styles.glanceValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

function EmergencyContact({ name, sub }: any) {
  return (
    <Pressable style={styles.contactItem}>
      <View style={styles.contactIconCircle}>
        <Ionicons name="call" size={22} color="#fff" />
      </View>
      <View style={{ marginLeft: 14 }}>
        <Text style={styles.contactName}>{name}</Text>
        <Text style={styles.contactSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function getTagTheme(desc: string) {
  const d = desc?.toLowerCase() || '';
  if (d.includes('morning')) return { bg: '#E0F7FA', text: '#00838F' };
  if (d.includes('afternoon')) return { bg: '#FFF3E0', text: '#E65100' };
  if (d.includes('evening')) return { bg: '#EDE7F6', text: '#6A1B9A' };
  return { bg: '#E8F5E9', text: '#2E7D32' };
}

function MedicineItem({ time, name, meta, priority, desc, taken, due }: any) {
  const tag = getTagTheme(desc);
  return (
    <View style={styles.medItem}>
      <View style={styles.medTimeCol}>
        <Text style={styles.medTimeText}>{time}</Text>
        <View style={styles.medTimeline} />
      </View>
      <View style={styles.medContentCard}>
        <View style={styles.medItemTop}>
          <Text style={styles.medItemName}>{name}</Text>
          {taken ? (
            <View style={styles.takenBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#43A047" />
              <Text style={styles.takenText}>Taken</Text>
            </View>
          ) : due ? (
            <View style={styles.dueBadge}>
              <Text style={styles.dueText}>Due at {due}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.medItemMeta}>
          <Ionicons name="time-outline" size={13} color="#9AA5B4" />
          <Text style={styles.medItemMetaText}>{meta}</Text>
          <Ionicons name="time-outline" size={13} color="#9AA5B4" style={{ marginLeft: 10 }} />
          <Text style={styles.medItemMetaText}>Priority: {priority}</Text>
        </View>
        <View style={[styles.medTag, { backgroundColor: tag.bg }]}>
          <Text style={[styles.medTagText, { color: tag.text }]}>{desc}</Text>
        </View>
      </View>
    </View>
  );
}

function GridItem({ title, sub, color, img, target }: any) {
  const router = useRouter();
  return (
    <Pressable style={styles.gridItem} onPress={() => router.push(target as any)}>
      <View style={[styles.gridTag, { backgroundColor: color }]}>
        <Text style={styles.gridTagText}>{title}</Text>
      </View>
      <View style={styles.gridContent}>
        <Image source={img} style={styles.gridImg} resizeMode="contain" />
        <Text style={styles.gridSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: C.bg },
  scrollSheet: {
    flex: 1,
    marginTop: -28,
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 33,
    fontWeight: '900',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sathiCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    ...C.cardShadow,
  },
  sathiMain: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },
  sathiInfo: { flex: 1, paddingRight: 10 },
  sathiLabel: { fontSize: 28, fontWeight: '900', color: '#0E1B2E', letterSpacing: -0.5 },
  sathiSubLabel: { fontSize: 13, color: '#7A90A4', fontWeight: '500', marginTop: 2, marginBottom: 16 },
  talkBtn: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 50,
    alignItems: 'center',
  },
  talkBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  mascotBg: {
    width: 115,
    height: 115,
    borderRadius: 22,
    backgroundColor: '#D6EAF8',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sparkle: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: 18,
    color: '#37B1E6',
    fontWeight: '900',
  },
  mascotImg: { width: 100, height: 100 },
  sathiBottom: {
    backgroundColor: '#E8F0FB',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sathiQuote: { fontSize: 14, color: '#1A3050', fontWeight: '600', lineHeight: 21 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#1A3050' },
  sectionActionMuted: { fontSize: 14, color: '#36B0E6', fontWeight: '700' },
  sectionActionLink: { fontSize: 14, color: '#36B0E6', fontWeight: '800' },
  glanceRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  glanceCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 22,
    overflow: 'hidden',
    ...C.cardShadow,
    height: 148,
  },
  glanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomRightRadius: 14,
    alignSelf: 'flex-start',
  },
  glanceBadgeText: { color: 'white', fontSize: 12, fontWeight: '800' },
  glanceContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 12 },
  glanceImg: { width: 62, height: 62, marginBottom: 8 },
  glanceValue: { fontSize: 22, fontWeight: '900' },
  emergencyRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 20, alignItems: 'center' },
  contactsCol: { flex: 1, gap: 12 },
  contactItem: {
    backgroundColor: 'white',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...C.cardShadow,
  },
  contactIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#BD3340',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: { fontSize: 16, fontWeight: '800', color: '#1A3050' },
  contactSub: { fontSize: 13, color: '#9AA5B4', fontWeight: '500', marginTop: 2 },
  sosCol: { width: 140, alignItems: 'center' },
  sosOuter: {
    width: 150,
    height: 150,
    borderRadius: 65,
    backgroundColor: '#EEF1F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B0BEC5',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  sosInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: { color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  sosSubText: { color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '600', marginTop: 4 },
  medProgressCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...C.cardShadow,
  },
  medRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medProgressTitle: { fontSize: 16, fontWeight: '700', color: '#1A3050' },
  pillCount: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 30 },
  pillCountText: { color: 'white', fontSize: 13, fontWeight: '700' },
  medPercent: { fontSize: 20, fontWeight: '900', color: '#1A3050', marginTop: 12 },
  progressBarBg: { height: 8, backgroundColor: '#EDF1F6', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#37B1E6', borderRadius: 4 },
  medItem: { flexDirection: 'row', paddingHorizontal: 20 },
  medTimeCol: { width: 56, alignItems: 'flex-start', paddingTop: 4 },
  medTimeText: { fontSize: 15, color: '#9AA5B4', fontWeight: '700' },
  medTimeline: { width: 2, flex: 1, backgroundColor: '#E8EDF3', marginTop: 6, marginLeft: 16 },
  medContentCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    marginLeft: 4,
    ...C.cardShadow,
  },
  medItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  medItemName: { fontSize: 16, fontWeight: '900', color: '#1A3050', flex: 1, marginRight: 8 },
  takenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  takenText: { color: '#43A047', fontSize: 12, fontWeight: '800' },
  dueBadge: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dueText: { color: '#E65100', fontSize: 12, fontWeight: '800' },
  medItemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 2, flexWrap: 'wrap' },
  medItemMetaText: { fontSize: 13, color: '#9AA5B4', fontWeight: '600' },
  medTag: { marginTop: 12, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, alignSelf: 'flex-start' },
  medTagText: { fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 20 },
  gridItem: {
    width: (width - 54) / 2,
    height: 190,
    backgroundColor: 'white',
    borderRadius: 22,
    overflow: 'hidden',
    ...C.cardShadow,
  },
  gridTag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomRightRadius: 18,
    alignSelf: 'flex-start',
  },
  gridTagText: { color: 'white', fontSize: 13, fontWeight: '800' },
  gridContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 14 },
  gridImg: { width: 100, height: 100, marginBottom: 10 },
  gridSub: { fontSize: 13, color: '#8A94A6', fontWeight: '600' },
  surpriseCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 26,
    marginHorizontal: 20,
    ...C.cardShadow,
  },
  surpriseLabel: { fontSize: 13, color: '#9AA5B4', fontWeight: '600', marginBottom: 14 },
  surpriseText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A3050',
    lineHeight: 32,
    marginBottom: 28,
  },
  recordBtnWrap: { borderRadius: 30, overflow: 'hidden' },
  recordBtn: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  recordBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  streakWrapper: {
    marginHorizontal: 20,
    alignItems: 'center',
  },
  streakIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    marginBottom: -36,
    ...C.cardShadow,
  },
  streakCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    ...C.cardShadow,
  },
  streakTitle: { fontSize: 22, fontWeight: '900', color: '#1A3050', marginBottom: 4 },
  streakSub: { fontSize: 13, color: '#9AA5B4', fontWeight: '500', marginBottom: 24 },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  calendarDay: { alignItems: 'center', flex: 1 },
  dayText: { fontSize: 12, color: '#9AA5B4', fontWeight: '600', marginBottom: 10 },
  dayNum: { fontSize: 16, fontWeight: '700', color: '#9AA5B4' },
  voiceCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    ...C.cardShadow,
  },
  voiceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  voiceAvatar: { width: 52, height: 52, borderRadius: 26 },
  voiceName: { fontSize: 15, fontWeight: '800', color: C.navy },
  voiceTime: { fontSize: 12, color: '#9AA5B4', marginTop: 3, fontWeight: '500' },
  playBtnWrap: { borderRadius: 30, overflow: 'hidden' },
  playBtn: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  playBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  locationCard: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    ...C.cardShadow,
  },
  locationLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  locationIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTitle: { fontSize: 17, fontWeight: '800', color: C.navy },
  locationSub: { fontSize: 13, color: '#9AA5B4', marginTop: 4, fontWeight: '500' },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FAF0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#43A047' },
  activeText: { color: '#43A047', fontSize: 13, fontWeight: '800' },
  medContainer: { paddingBottom: 10 },
  medProgressCardWrap: { paddingHorizontal: 20, marginBottom: 8 },
});
