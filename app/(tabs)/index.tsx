import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter , useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GuardianHomeScreen from "../../components/GuardianHomeScreen";
import GuardianInviteCard from "../../components/GuardianInviteCard";
import HealthQRWidget from "../../components/HealthQRWidget";
import SideMenu from "../../components/SideMenu";
import TalkToSathiModal from "../../components/TalkToSathiModal";
import { useAuth } from "../../context/AuthContext";
import type { Language } from "../../context/LanguageContext";
import { useLanguage } from "../../context/LanguageContext";
import { scaleStyles } from "../../utils/scaleStyles";
import { getCountryEmergency } from "../../constants/emergencyNumbers";
import { getPreferredFirstName } from "../../utils/profileName";
import { supabase } from "../../utils/supabase";
import { useUnreadNotifCount } from "../../services/notifications";

type HomeT = {
  hello: string; sathiAiSay: string; voiceCompanion: string;
  talkToSathi: string; stop: string; thinking: string; listening: string;
  todayAtAGlance: string; mood: string; medicine: string; streak: string;
  emergencyHelp: string; guardian: string; medicalService: string; pressFor3Sec: string;
  todaysMedicine: string; viewAll: string; dailyMedicines: string; taken: string; complete: string;
  whatWouldYouLike: string; allFeatures: string;
  healthVault: string; careCalendar: string; memoryJournal: string;
  mindGames: string; moodLift: string; dailyCheckIn: string;
  todaysSurprise: string; memoryPrompt: string; recordYourMemory: string;
  yourStreak: string; dayStreak: string; onTheRightTrack: string;
  voiceMessageFrom: string; tapToListen: string; playRecording: string;
  liveLocation: string; sharingWithFamily: string; canSeeYourLocation: string; active: string;
  dueAt: string; priority: string;
};

const HT: Partial<Record<Language, HomeT>> = {
  English: {
    hello: "Hello,", sathiAiSay: "Sathi Ai Say...", voiceCompanion: "Your Voice AI companion",
    talkToSathi: "Talk to Sathi", stop: "Stop", thinking: "Thinking...", listening: "Listening...",
    todayAtAGlance: "Today at a Glance", mood: "Mood", medicine: "Medicine", streak: "Streak",
    emergencyHelp: "Emergency Help", guardian: "Guardian", medicalService: "Medical Service", pressFor3Sec: "Press for 3 seconds",
    todaysMedicine: "Today's Medicine", viewAll: "View all", dailyMedicines: "Daily Medicines", taken: "taken", complete: "Complete",
    whatWouldYouLike: "What would you like?", allFeatures: "All Features",
    healthVault: "Health Vault", careCalendar: "Care Calendar", memoryJournal: "Memory Journal",
    mindGames: "Mind Games", moodLift: "Mood Lift", dailyCheckIn: "Daily Check-In",
    todaysSurprise: "Today's Surprise", memoryPrompt: "Memory Prompt", recordYourMemory: "Record your memory",
    yourStreak: "Your Streak", dayStreak: "Day Streak!", onTheRightTrack: "You are on the right track",
    voiceMessageFrom: "Voice message from", tapToListen: "Tap to listen", playRecording: "Play Recording",
    liveLocation: "Live Location", sharingWithFamily: "Sharing with family", canSeeYourLocation: "can see your location", active: "Active",
    dueAt: "Due at", priority: "Priority:",
  },
  "हिंदी": {
    hello: "नमस्ते,", sathiAiSay: "साथी AI कहता है...", voiceCompanion: "आपका वॉइस AI साथी",
    talkToSathi: "साथी से बात करें", stop: "रोकें", thinking: "सोच रहा है...", listening: "सुन रहा है...",
    todayAtAGlance: "आज की झलक", mood: "मूड", medicine: "दवाई", streak: "स्ट्रीक",
    emergencyHelp: "आपातकालीन सहायता", guardian: "अभिभावक", medicalService: "चिकित्सा सेवा", pressFor3Sec: "3 सेकंड दबाएं",
    todaysMedicine: "आज की दवाइयां", viewAll: "सभी देखें", dailyMedicines: "दैनिक दवाइयां", taken: "ली गई", complete: "पूर्ण",
    whatWouldYouLike: "आप क्या चाहते हैं?", allFeatures: "सभी सुविधाएं",
    healthVault: "स्वास्थ्य वॉल्ट", careCalendar: "केयर कैलेंडर", memoryJournal: "यादों की डायरी",
    mindGames: "मानसिक खेल", moodLift: "मूड लिफ्ट", dailyCheckIn: "दैनिक चेक-इन",
    todaysSurprise: "आज का सरप्राइज", memoryPrompt: "यादों का संकेत", recordYourMemory: "अपनी याद रिकॉर्ड करें",
    yourStreak: "आपकी स्ट्रीक", dayStreak: "दिन की स्ट्रीक!", onTheRightTrack: "आप सही राह पर हैं",
    voiceMessageFrom: "से वॉइस संदेश", tapToListen: "सुनने के लिए टैप करें", playRecording: "रिकॉर्डिंग चलाएं",
    liveLocation: "लाइव लोकेशन", sharingWithFamily: "परिवार के साथ साझा", canSeeYourLocation: "आपकी लोकेशन देख सकते हैं", active: "सक्रिय",
    dueAt: "समय:", priority: "प्राथमिकता:",
  },
  "ગુજરાતી": {
    hello: "નમસ્તે,", sathiAiSay: "સાથી AI કહે છે...", voiceCompanion: "તમારો વૉઇસ AI સાથી",
    talkToSathi: "સાથી સાથે વાત કરો", stop: "બંધ", thinking: "વિચારી રહ્યો છે...", listening: "સાંભળી રહ્યો છે...",
    todayAtAGlance: "આજની ઝલક", mood: "મૂડ", medicine: "દવા", streak: "સ્ટ્રીક",
    emergencyHelp: "કટોકટી સહાય", guardian: "વાલી", medicalService: "તબીબી સેવા", pressFor3Sec: "3 સેકન્ડ દબાવો",
    todaysMedicine: "આજની દવાઓ", viewAll: "બધું જુઓ", dailyMedicines: "દૈનિક દવાઓ", taken: "લીધી", complete: "પૂર્ણ",
    whatWouldYouLike: "તમે શું ઇચ્છો છો?", allFeatures: "બધી સુવિધાઓ",
    healthVault: "સ્વાસ્થ્ય વૉલ્ટ", careCalendar: "કૅર કૅલેન્ડર", memoryJournal: "યાદો ડાયરી",
    mindGames: "મનોરંજક રમતો", moodLift: "મૂડ લિફ્ટ", dailyCheckIn: "દૈનિક ચેક-ઇન",
    todaysSurprise: "આજનો સરપ્રાઇઝ", memoryPrompt: "યાદ સૂચના", recordYourMemory: "તમારી યાદ રેકૉર્ડ કરો",
    yourStreak: "તમારી સ્ટ્રીક", dayStreak: "દિવસ સ્ટ્રીક!", onTheRightTrack: "તમે સાચા રસ્તે છો",
    voiceMessageFrom: "તરફથી વૉઇસ સંદેશ", tapToListen: "સાંભળવા ટૅપ કરો", playRecording: "રેકૉર્ડિંગ ચલાવો",
    liveLocation: "લાઇવ લોકેશન", sharingWithFamily: "પરિવાર સાથે શૅર", canSeeYourLocation: "તમારું સ્થાન જોઈ શકે છે", active: "સક્રિય",
    dueAt: "સમય:", priority: "પ્રાથમિકતા:",
  },
  "தமிழ்": {
    hello: "வணக்கம்,", sathiAiSay: "சாதி AI சொல்கிறது...", voiceCompanion: "உங்கள் குரல் AI தோழர்",
    talkToSathi: "சாதியிடம் பேசுங்கள்", stop: "நிறுத்து", thinking: "சிந்திக்கிறது...", listening: "கேட்கிறது...",
    todayAtAGlance: "இன்றைய பார்வை", mood: "மனநிலை", medicine: "மருந்து", streak: "தொடர்",
    emergencyHelp: "அவசர உதவி", guardian: "பாதுகாவலர்", medicalService: "மருத்துவ சேவை", pressFor3Sec: "3 வினாடி அழுத்துங்கள்",
    todaysMedicine: "இன்றைய மருந்துகள்", viewAll: "அனைத்தும் காண்க", dailyMedicines: "தினசரி மருந்துகள்", taken: "எடுக்கப்பட்டது", complete: "முடிந்தது",
    whatWouldYouLike: "நீங்கள் என்ன விரும்புகிறீர்கள்?", allFeatures: "அனைத்து அம்சங்கள்",
    healthVault: "சுகாதார பெட்டகம்", careCalendar: "பராமரிப்பு நாட்காட்டி", memoryJournal: "நினைவு நாட்குறிப்பு",
    mindGames: "மன விளையாட்டு", moodLift: "மனநிலை உயர்வு", dailyCheckIn: "தினசரி சரிபார்ப்பு",
    todaysSurprise: "இன்றைய ஆச்சரியம்", memoryPrompt: "நினைவு தூண்டுதல்", recordYourMemory: "உங்கள் நினைவை பதிவு செய்யுங்கள்",
    yourStreak: "உங்கள் தொடர்", dayStreak: "நாள் தொடர்!", onTheRightTrack: "நீங்கள் சரியான பாதையில் இருக்கிறீர்கள்",
    voiceMessageFrom: "இலிருந்து குரல் செய்தி", tapToListen: "கேட்க தட்டுங்கள்", playRecording: "பதிவை இயக்கு",
    liveLocation: "நேரடி இருப்பிடம்", sharingWithFamily: "குடும்பத்துடன் பகிர்வு", canSeeYourLocation: "உங்கள் இருப்பிடத்தை பார்க்கலாம்", active: "செயலில்",
    dueAt: "நேரம்:", priority: "முன்னுரிமை:",
  },
  "বাংলা": {
    hello: "নমস্কার,", sathiAiSay: "সাথি AI বলছে...", voiceCompanion: "আপনার ভয়েস AI সঙ্গী",
    talkToSathi: "সাথির সাথে কথা বলুন", stop: "থামান", thinking: "ভাবছে...", listening: "শুনছে...",
    todayAtAGlance: "আজকের একনজর", mood: "মেজাজ", medicine: "ওষুধ", streak: "ধারা",
    emergencyHelp: "জরুরী সাহায্য", guardian: "অভিভাবক", medicalService: "চিকিৎসা সেবা", pressFor3Sec: "৩ সেকেন্ড চাপুন",
    todaysMedicine: "আজকের ওষুধ", viewAll: "সব দেখুন", dailyMedicines: "দৈনিক ওষুধ", taken: "নেওয়া হয়েছে", complete: "সম্পন্ন",
    whatWouldYouLike: "আপনি কী চান?", allFeatures: "সব বৈশিষ্ট্য",
    healthVault: "স্বাস্থ্য ভল্ট", careCalendar: "যত্ন ক্যালেন্ডার", memoryJournal: "স্মৃতি ডায়েরি",
    mindGames: "মস্তিষ্কের খেলা", moodLift: "মেজাজ উন্নতি", dailyCheckIn: "দৈনিক চেক-ইন",
    todaysSurprise: "আজকের বিস্ময়", memoryPrompt: "স্মৃতির ইঙ্গিত", recordYourMemory: "আপনার স্মৃতি রেকর্ড করুন",
    yourStreak: "আপনার ধারা", dayStreak: "দিনের ধারা!", onTheRightTrack: "আপনি সঠিক পথে আছেন",
    voiceMessageFrom: "থেকে ভয়েস বার্তা", tapToListen: "শুনতে ট্যাপ করুন", playRecording: "রেকর্ডিং চালান",
    liveLocation: "লাইভ লোকেশন", sharingWithFamily: "পরিবারের সাথে শেয়ার", canSeeYourLocation: "আপনার অবস্থান দেখতে পারবেন", active: "সক্রিয়",
    dueAt: "সময়:", priority: "অগ্রাধিকার:",
  },
  "मराठी": {
    hello: "नमस्कार,", sathiAiSay: "साथी AI म्हणतो...", voiceCompanion: "तुमचा व्हॉइस AI साथी",
    talkToSathi: "साथीशी बोला", stop: "थांबवा", thinking: "विचार करत आहे...", listening: "ऐकत आहे...",
    todayAtAGlance: "आजचा आढावा", mood: "मनःस्थिती", medicine: "औषध", streak: "स्ट्रीक",
    emergencyHelp: "आपत्कालीन मदत", guardian: "पालक", medicalService: "वैद्यकीय सेवा", pressFor3Sec: "3 सेकंद दाबा",
    todaysMedicine: "आजची औषधे", viewAll: "सर्व पाहा", dailyMedicines: "दैनंदिन औषधे", taken: "घेतली", complete: "पूर्ण",
    whatWouldYouLike: "तुम्हाला काय हवे आहे?", allFeatures: "सर्व वैशिष्ट्ये",
    healthVault: "आरोग्य व्हॉल्ट", careCalendar: "काळजी कॅलेंडर", memoryJournal: "आठवणी डायरी",
    mindGames: "मनाचे खेळ", moodLift: "मनःस्थिती उन्नती", dailyCheckIn: "दैनंदिन चेक-इन",
    todaysSurprise: "आजचा आश्चर्य", memoryPrompt: "आठवणीचे संकेत", recordYourMemory: "तुमची आठवण रेकॉर्ड करा",
    yourStreak: "तुमची स्ट्रीक", dayStreak: "दिवस स्ट्रीक!", onTheRightTrack: "तुम्ही योग्य मार्गावर आहात",
    voiceMessageFrom: "कडून व्हॉइस संदेश", tapToListen: "ऐकण्यासाठी टॅप करा", playRecording: "रेकॉर्डिंग चालवा",
    liveLocation: "लाइव्ह स्थान", sharingWithFamily: "कुटुंबासोबत शेअर", canSeeYourLocation: "तुमचे स्थान पाहू शकतात", active: "सक्रिय",
    dueAt: "वेळ:", priority: "प्राधान्य:",
  },
};

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
  headerGradient: ['#2B3C86', '#2E9CD6'] as [string, string],
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
  const { language, fontScale, colors: themeColors } = useLanguage();
  const ht = (HT[language] ?? HT.English) as HomeT;
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);

  const unreadCount = useUnreadNotifCount(user?.id);

  const [showMenu, setShowMenu] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showSathiModal, setShowSathiModal] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const sosTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [medicines, setMedicines] = useState<any[]>([]);
  const [medLoading, setMedLoading] = useState(true);
  const [, setHealthStats] = useState<any>(null);
  const [dailyPrompt] = useState("");
  const [latestMessage, setLatestMessage] = useState<any>(null);
  const [todayMood, setTodayMood] = useState<string>("—");
  const [locationSharing, setLocationSharing] = useState<boolean | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    supabase.from('elder_locations').select('is_sharing').eq('elder_id', user.id).maybeSingle().then(({ data }) => {
      setLocationSharing(data?.is_sharing ?? false);
    });
  }, [user]));

  useEffect(() => {
    if (user) {
      fetchHealthStats();
      fetchLatestMessage();
      fetchTodayMood();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch medicines and mood every time the tab comes into focus.
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchMedicines();
        fetchTodayMood();
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])
  );

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

  const fetchTodayMood = async () => {
    const MOOD_LABEL: Record<string, string> = {
      Great: 'Happy',
      Good:  'Calm',
      Okay:  'Tired',
      Low:   'Low',
    };
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('moods')
        .select('mood')
        .eq('user_id', user?.id)
        .eq('date', today)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.mood) setTodayMood(MOOD_LABEL[data.mood] ?? data.mood);
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

  const firstName = getPreferredFirstName({
    firstName: profile?.firstName,
    fullName: profile?.fullName,
    email: profile?.email || user?.email,
  });
  const userName = profile?.fullName || firstName || user?.email?.split('@')[0] || "there";
  const guardianEmergencyNumber = profile?.emergencyPhone?.trim() || "";
  const guardianEmergencyLabel = profile?.emergencyRelation?.trim() || ht.guardian;
  const countryEmergency = getCountryEmergency(profile?.countryCode || "");

  const openSOSModal = () => {
    setSosCountdown(5);
    setShowSOSModal(true);
    sosTimerRef.current = setInterval(() => {
      setSosCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(sosTimerRef.current!);
          if (guardianEmergencyNumber) {
            Linking.openURL(`tel:${guardianEmergencyNumber}`).catch(() => {});
          } else {
            Linking.openURL(`tel:${countryEmergency.number}`).catch(() => {});
          }
          setShowSOSModal(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const closeSOSModal = () => {
    if (sosTimerRef.current) clearInterval(sosTimerRef.current);
    setShowSOSModal(false);
    setSosCountdown(5);
  };

  const callContact = (number: string) => {
    if (sosTimerRef.current) clearInterval(sosTimerRef.current);
    setShowSOSModal(false);
    setSosCountdown(5);
    Linking.openURL(`tel:${number}`).catch(() => {});
  };

  const takenCount = medicines.filter((m) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return m.medicine_logs?.some((l: any) => {
      if (!l?.taken_at) return false;
      const t = new Date(l.taken_at).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
  }).length;

  const totalCount = medicines.length;
  const progressPercent = medicines.length > 0 ? (takenCount / medicines.length) * 100 : 0;

  const streakToday = new Date();
  const streakDow = streakToday.getDay();
  const mondayOffset = streakDow === 0 ? -6 : 1 - streakDow;
  const monday = new Date(streakToday);
  monday.setDate(streakToday.getDate() + mondayOffset);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayLabel, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { dayLabel, dayNum: d.getDate(), isToday: d.toDateString() === streakToday.toDateString() };
  });

  const pendingMedicines = medicines.filter((med) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return !med.medicine_logs?.some((l: any) => {
      if (!l?.taken_at) return false;
      const t = new Date(l.taken_at).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
  });

  return (
    <View style={[s.mainContainer, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── FIXED: Gradient Header only ── */}
      <LinearGradient
        colors={C.headerGradient}
        style={[s.headerGradient, { paddingTop: insets.top + 16 }]}
      >
        <View style={s.headerTop}>
          <View style={s.headerBrand}>
            <View style={s.brandRow}>
              <View style={s.brandIconWrap}>
                <Image
                  source={require('../../assets/images/TinyBit_LOGO_New.png')}
                  style={s.brandIcon}
                  resizeMode="contain"
                  accessibilityLabel="TinyBit"
                />
              </View>
              <Text style={s.brandTitle}>TinyBit</Text>
            </View>
          </View>
          <View style={s.headerIcons}>
            <Pressable style={s.headerIconBtn} onPress={() => router.push("/notifications")}>
              <Ionicons name="notifications-outline" size={24} color="white" />
              {unreadCount > 0 && (
                <View style={s.notifBadge}>
                  <Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={s.headerIconBtn} onPress={() => setShowMenu(true)}>
              <Ionicons name="menu-outline" size={26} color="white" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* ── SCROLLABLE SHEET: rounds over gradient ── */}
      <View style={[s.scrollSheet, { backgroundColor: themeColors.bg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 150, paddingTop: 18 }}
        >
          {/* Guardian connection requests */}
          <GuardianInviteCard />

          {/* 1 — SOS / Emergency Help */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]}>{ht.emergencyHelp}</Text>
            <TouchableOpacity onPress={() => router.push("/sos")} style={s.sosScreenLink}>
              <Text style={s.sosScreenLinkText}>SOS Screen</Text>
              <Ionicons name="chevron-forward" size={13} color="#E05555" />
            </TouchableOpacity>
          </View>
          <View style={s.emergencyRow}>
            <View style={s.contactsCol}>
              <EmergencyContact
                name={guardianEmergencyNumber || "Add contact"}
                sub={guardianEmergencyLabel}
              />
              <EmergencyContact
                name={countryEmergency.number}
                sub={countryEmergency.label}
              />
            </View>
            <View style={s.sosCol}>
              <Pressable onPress={openSOSModal} style={s.sosOuter}>
                <LinearGradient
                  colors={['#FF8A75', '#F05555']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.sosInner}
                >
                  <Text style={s.sosText}>SOS</Text>
                  <Text style={s.sosSubText}>{ht.pressFor3Sec}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          {/* SOS Call Modal */}
          <Modal visible={showSOSModal} transparent animationType="fade" onRequestClose={closeSOSModal}>
            <View style={s.sosModalOverlay}>
              <View style={[s.sosModalCard, { backgroundColor: themeColors.card }]}>
                <View style={s.sosModalHeader}>
                  <Text style={s.sosModalTitle}>🆘 Emergency SOS</Text>
                  <TouchableOpacity onPress={closeSOSModal} style={s.sosModalClose}>
                    <Ionicons name="close" size={20} color="#15253E" />
                  </TouchableOpacity>
                </View>
                <Text style={s.sosModalSubtitle}>
                  Calling in <Text style={{ color: "#D03050", fontWeight: "900" }}>{sosCountdown}s</Text>
                  {guardianEmergencyNumber ? ` → ${guardianEmergencyLabel}` : ` → ${countryEmergency.label}`}
                </Text>
                <View style={s.sosCountdownBar}>
                  <View style={[s.sosCountdownFill, { width: `${(sosCountdown / 5) * 100}%` }]} />
                </View>
                <Text style={s.sosModalPickText}>Or select who to call:</Text>

                {guardianEmergencyNumber ? (
                  <TouchableOpacity style={s.sosContactRow} onPress={() => callContact(guardianEmergencyNumber)}>
                    <View style={s.sosContactAvatar}>
                      <Ionicons name="person" size={20} color="#3FA4DA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sosContactName}>{guardianEmergencyLabel}</Text>
                      <Text style={s.sosContactNum}>{guardianEmergencyNumber}</Text>
                    </View>
                    <View style={s.sosCallBtn}>
                      <Ionicons name="call" size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity style={s.sosContactRow} onPress={() => callContact(countryEmergency.number)}>
                  <View style={[s.sosContactAvatar, { backgroundColor: "#FFF0EE" }]}>
                    <Ionicons name="medical" size={20} color="#D03050" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sosContactName}>{countryEmergency.label}</Text>
                    <Text style={s.sosContactNum}>{countryEmergency.number}</Text>
                  </View>
                  <View style={[s.sosCallBtn, { backgroundColor: "#D03050" }]}>
                    <Ionicons name="call" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={s.sosCancelBtn} onPress={closeSOSModal}>
                  <Text style={s.sosCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* 2 — Today's Medicine (pending only) */}
          <View style={[s.sectionHeader, { marginTop: 20 }]}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]}>{ht.todaysMedicine}</Text>
            <Pressable onPress={() => router.push("/medicine" as any)}>
              <Text style={s.sectionActionLink}>{ht.viewAll}</Text>
            </Pressable>
          </View>
          <View style={s.medContainer}>
            <View style={s.medProgressCardWrap}>
              <View style={[s.medProgressCard, { backgroundColor: themeColors.card }]}>
                <View style={s.medRow}>
                  <Text style={[s.medProgressTitle, { color: themeColors.text }]}>{ht.dailyMedicines}</Text>
                  <LinearGradient
                    colors={C.headerGradient}
                    style={s.pillCount}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={s.pillCountText}>{takenCount} of {totalCount} {ht.taken}</Text>
                  </LinearGradient>
                </View>
                <Text style={[s.medPercent, { color: themeColors.text }]}>
                  <Text style={{ color: C.accent }}>{Math.round(progressPercent)}%</Text>{' '}{ht.complete}
                </Text>
                <View style={s.progressBarBg}>
                  <View style={[s.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
              </View>
            </View>

            {medLoading ? (
              <View style={s.allTakenCard}>
                <Ionicons name="time-outline" size={28} color="#2B7FC0" />
                <Text style={[s.allTakenText, { color: '#2B7FC0' }]}>Loading today's medicines...</Text>
              </View>
            ) : medicines.length === 0 ? (
              <View style={s.allTakenCard}>
                <Ionicons name="medkit-outline" size={28} color="#7A90A4" />
                <Text style={[s.allTakenText, { color: '#5F6C7B' }]}>No medicines added yet. View all to manage your full list.</Text>
              </View>
            ) : pendingMedicines.length === 0 ? (
              <View style={s.allTakenCard}>
                <Ionicons name="checkmark-circle" size={28} color="#43A047" />
                <Text style={s.allTakenText}>All pending medicines are completed for today.</Text>
              </View>
            ) : (
              pendingMedicines.slice(0, 3).map((med) => (
                <MedicineItem
                  key={med.id}
                  time={med.time}
                  name={med.name}
                  meta={`Due ${med.time}`}
                  priority={med.priority}
                  desc={med.instructions || med.dosage}
                  taken={false}
                />
              ))
            )}
          </View>

          {/* 4 — Voice Message from Family */}
          <View style={[s.sectionHeader, { marginTop: 25 }]}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]}>{ht.voiceMessageFrom}</Text>
          </View>
          <View style={[s.voiceCard, { backgroundColor: themeColors.card }]}>
            {latestMessage ? (
              <>
                <View style={s.voiceHeader}>
                  <Image source={require('../../assets/images/IamFamily.png')} style={s.voiceAvatar} />
                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text style={[s.voiceName, { color: themeColors.text }]}>
                      {`${ht.voiceMessageFrom} ${latestMessage.sender?.full_name ?? ''}`.trim()}
                    </Text>
                    <Text style={s.voiceTime}>
                      {`${ht.tapToListen} · ${Math.round((Date.now() - new Date(latestMessage.created_at).getTime()) / 60000)} min ago`}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => router.push('/family-messages')} style={s.playBtnWrap}>
                  <LinearGradient
                    colors={['#3AAEDF', '#2176AE']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.playBtn}
                  >
                    <Ionicons name="play" size={18} color="white" />
                    <Text style={s.playBtnText}>{ht.playRecording}</Text>
                  </LinearGradient>
                </Pressable>
              </>
            ) : (
              <View style={[s.emptyPanel, { backgroundColor: themeColors.card }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#7A90A4" />
                <Text style={s.emptyPanelText}>No voice messages yet.</Text>
              </View>
            )}
          </View>

          {/* 5 — Today at a Glance */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]}>{ht.todayAtAGlance}</Text>
            <Text style={s.sectionActionMuted}>{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </View>
          <View style={s.glanceRow}>
            <GlanceCard title={ht.mood} color="#3FA4DA" img={require('../../assets/images/Mood.png')} value={todayMood} onPress={() => router.push('/mood-lift')} />
            <GlanceCard title={ht.medicine} color="#4DB6AC" img={require('../../assets/images/Medicine.png')} value={`${takenCount}/${totalCount}`} onPress={() => router.push('/(tabs)/medicine')} />
            <GlanceCard title={ht.streak} color="#FF8A65" img={require('../../assets/images/Streak.png')} value={streak.toString()} onPress={() => router.push('/streak' as any)} />
          </View>

          {/* 6 — What would you like? */}
          <View style={[s.sectionHeader, { marginTop: 25 }]}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]}>{ht.whatWouldYouLike}</Text>
            <Pressable><Text style={s.sectionActionLink}>{ht.allFeatures}</Text></Pressable>
          </View>
          <View style={s.grid}>
            <GridItem title={ht.healthVault} sub="" color="#4DB6AC" img={require('../../assets/images/HealthVault.png')} target="/health-vault" />
            <GridItem title={ht.careCalendar} sub="" color="#64B5F6" img={require('../../assets/images/CareCalender.png')} target="/care-calendar" />
            <GridItem title={ht.memoryJournal} sub="" color="#FF8A65" img={require('../../assets/images/MemoryJournal.png')} target="/journal" />
            <GridItem title={ht.mindGames} sub="" color="#546E7A" img={require('../../assets/images/MindGames.png')} target="/mind-games" />
            <GridItem title={ht.moodLift} sub="" color="#81C784" img={require('../../assets/images/MoodLift.png')} target="/mood-lift" />
            <GridItem title={ht.dailyCheckIn} sub="" color="#BA68C8" img={require('../../assets/images/DailyCheckIn.png')} target="/daily-check-in" />
          </View>

          {/* 6b — Health Tools Row */}
          <View style={[s.sectionHeader, { marginTop: 22 }]}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]}>Health Tools</Text>
          </View>
          <View style={s.toolsGrid}>
            <ToolCard emoji="🏥" title="Health Log" sub="Medicine, mood, vitals" color="#1E3A5F" target="/(tabs)/health-log" />
            <ToolCard emoji="🌤️" title="Weather" sub="Clothing suggestions" color="#F59E0B" target="/weather" />
            <ToolCard emoji="🥗" title="Calorie Scan" sub="AI food scanner" color="#16A34A" target="/calorie-calculator" />
            <ToolCard emoji="🎓" title="Help & Tutorials" sub="Learn how to use" color="#8B5CF6" target="/help" />
          </View>

          {/* 7 — Record your Memory */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]}>{ht.recordYourMemory}</Text>
          </View>
          <View style={[s.surpriseCard, { backgroundColor: themeColors.card }]}>
            <Text style={[s.surpriseLabel, { color: themeColors.muted }]}>{ht.memoryPrompt}</Text>
            <Text style={[s.surpriseText, { color: themeColors.text }]}>
              {dailyPrompt ? `"${dailyPrompt}"` : "Open your journal to record a new memory."}
            </Text>
            <Pressable onPress={() => router.push('/journal')} style={s.recordBtnWrap}>
              <LinearGradient
                colors={['#3AAEDF', '#2176AE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.recordBtn}
              >
                <Ionicons name="mic" size={20} color="white" />
                <Text style={s.recordBtnText}>Open Journal</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* 8 — Your Streak */}
          <View style={[s.sectionHeader, { marginTop: 25 }]}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]}>{ht.yourStreak}</Text>
          </View>
          <View style={s.streakWrapper}>
            <View style={s.streakIconCircle}>
              <Image source={require('../../assets/images/Streak.png')} style={{ width: 52, height: 52 }} resizeMode="contain" />
            </View>
            <View style={[s.streakCard, { backgroundColor: themeColors.card }]}>
              <Text style={[s.streakTitle, { color: themeColors.text }]}>{streak} {ht.dayStreak}</Text>
              <Text style={[s.streakSub, { color: themeColors.muted }]}>{ht.onTheRightTrack}</Text>
              <View style={s.calendarRow}>
                {weekDays.map(({ dayLabel, dayNum, isToday }, i) => {
                  const hasFire = i < streak;
                  return (
                    <View key={dayLabel} style={s.calendarDay}>
                      <Text style={[s.dayText, isToday && { color: '#E53935', fontWeight: '800' }]}>{dayLabel}</Text>
                      {hasFire ? (
                        <Text style={{ fontSize: 22 }}>🔥</Text>
                      ) : (
                        <Text style={[s.dayNum, isToday && { color: '#E53935' }]}>{dayNum}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 9 — Live Location */}
          <View style={[s.sectionHeader, { marginTop: 25 }]}>
            <Text style={[s.sectionTitle, { color: themeColors.text }]}>{ht.liveLocation}</Text>
            <Text style={s.sectionActionMuted}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</Text>
          </View>
          <Pressable
            style={[s.locationCard, { backgroundColor: themeColors.card }]}
            onPress={() => router.push('/location' as any)}
          >
            <View style={s.locationLeft}>
              <View style={[s.locationIcon, { backgroundColor: locationSharing ? '#FFF0F0' : '#F4F6FA' }]}>
                <Ionicons name="location" size={26} color={locationSharing ? '#F44336' : '#B0BEC5'} />
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={[s.locationTitle, { color: themeColors.text }]}>{ht.liveLocation}</Text>
                <Text style={[s.locationSub, { color: themeColors.muted }]}>
                  {locationSharing === null
                    ? 'Loading...'
                    : locationSharing
                    ? 'Your family can see your location'
                    : 'Tap to start sharing with family'}
                </Text>
              </View>
            </View>
            <View style={[s.activeBadge, { backgroundColor: locationSharing ? '#D1FADF' : '#F1F5F9' }]}>
              <View style={[s.activeDot, { backgroundColor: locationSharing ? '#16A34A' : '#B0BEC5' }]} />
              <Text style={[s.activeText, { color: locationSharing ? '#16A34A' : '#8A9BB0' }]}>
                {locationSharing ? 'On' : 'Off'}
              </Text>
            </View>
          </Pressable>

          {/* 10 — Emergency Health QR */}
          <HealthQRWidget />

        </ScrollView>
      </View>

      <SideMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        userName={profile?.fullName || user?.email?.split("@")[0]}
        userEmail={user?.email}
        onLogout={logout}
      />

      <TalkToSathiModal
        visible={showSathiModal}
        onClose={() => setShowSathiModal(false)}
        userName={userName}
        context={`User: ${userName}. Medicines taken today: ${takenCount} of ${totalCount}.`}
      />
    </View>
  );
}

function GlanceCard({ title, color, img, value, onPress }: any) {
  const { fontScale, colors: tc } = useLanguage();
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.glanceCard, { backgroundColor: tc.card, opacity: pressed ? 0.82 : 1 }]}
    >
      <View style={[s.glanceBadge, { backgroundColor: color }]}>
        <Text style={s.glanceBadgeText}>{title}</Text>
      </View>
      <View style={s.glanceContent}>
        <Image source={img} style={s.glanceImg} resizeMode="contain" />
        <Text style={[s.glanceValue, { color }]}>{value}</Text>
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

function EmergencyContact({ name, sub }: any) {
  const { fontScale, colors: tc } = useLanguage();
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);
  return (
    <View style={[s.contactItem, { backgroundColor: tc.card }]}>
      <View style={s.contactIconCircle}>
        <Ionicons name="call" size={22} color="#fff" />
      </View>
      <View style={{ marginLeft: 14, flex: 1 }}>
        <Text style={[s.contactName, { color: tc.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[s.contactSub, { color: tc.muted }]} numberOfLines={1}>{sub}</Text>
      </View>
    </View>
  );
}

function MedicineItem({ time, name, meta, priority, desc, taken, due }: any) {
  const { language, fontScale, colors: tc } = useLanguage();
  const ht = (HT[language] ?? HT.English) as HomeT;
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);
  const tag = getTagTheme(desc);
  return (
    <View style={s.medItem}>
      <View style={s.medTimeCol}>
        <Text style={[s.medTimeText, { color: tc.muted }]}>{time}</Text>
        <View style={s.medTimeline} />
      </View>
      <View style={[s.medContentCard, { backgroundColor: tc.card }]}>
        <View style={s.medItemTop}>
          <Text style={[s.medItemName, { color: tc.text }]}>{name}</Text>
          {taken ? (
            <View style={s.takenBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#43A047" />
              <Text style={s.takenText}>{ht.taken}</Text>
            </View>
          ) : due ? (
            <View style={s.dueBadge}>
              <Text style={s.dueText}>{ht.dueAt} {due}</Text>
            </View>
          ) : null}
        </View>
        <View style={s.medItemMeta}>
          <Ionicons name="time-outline" size={13} color="#9AA5B4" />
          <Text style={s.medItemMetaText}>{meta}</Text>
          <Ionicons name="time-outline" size={13} color="#9AA5B4" style={{ marginLeft: 10 }} />
          <Text style={s.medItemMetaText}>{ht.priority} {priority}</Text>
        </View>
        <View style={[s.medTag, { backgroundColor: tag.bg }]}>
          <Text style={[s.medTagText, { color: tag.text }]}>{desc}</Text>
        </View>
      </View>
    </View>
  );
}

function GridItem({ title, sub, color, img, target }: any) {
  const router = useRouter();
  const { fontScale, colors: tc } = useLanguage();
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);
  return (
    <Pressable style={[s.gridItem, { backgroundColor: tc.card }]} onPress={() => router.push(target as any)}>
      <View style={[s.gridTag, { backgroundColor: color }]}>
        <Text style={s.gridTagText}>{title}</Text>
      </View>
      <View style={s.gridContent}>
        <Image source={img} style={s.gridImg} resizeMode="contain" />
        <Text style={s.gridSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function ToolCard({ emoji, title, sub, color, target }: { emoji: string; title: string; sub: string; color: string; target: string }) {
  const router = useRouter();
  const { colors: tc } = useLanguage();
  return (
    <Pressable
      style={[RAW_STYLES.toolCard, { backgroundColor: tc.card }]}
      onPress={() => router.push(target as any)}
    >
      <View style={[RAW_STYLES.toolEmojiBg, { backgroundColor: color + '18' }]}>
        <Text style={RAW_STYLES.toolEmoji}>{emoji}</Text>
      </View>
      <Text style={[RAW_STYLES.toolTitle, { color: tc.text }]}>{title}</Text>
      <Text style={RAW_STYLES.toolSub}>{sub}</Text>
    </Pressable>
  );
}

const RAW_STYLES = StyleSheet.create({
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
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -6,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 33,
    fontWeight: '900',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerBrand: {
    flex: 1,
    paddingRight: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandIcon: {
    width: 42,
    height: 42,
  },
  brandTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.2,
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
  notifBadge: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)',
  },
  notifBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },
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
  sathiPrompt: { fontSize: 18, color: '#7A90A4', fontWeight: '700', marginBottom: 4 },
  sathiName: { fontSize: 30, fontWeight: '900', color: '#0E1B2E', letterSpacing: -0.6, marginBottom: 16 },
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
  emptyPanel: {
    backgroundColor: 'white',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...C.cardShadow,
  },
  emptyPanelText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#5F6C7B' },
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
  // Health Tools grid
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
  toolCard: {
    width: (width - 54) / 2,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    ...C.cardShadow,
  },
  toolEmojiBg: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  toolEmoji:  { fontSize: 28 },
  toolTitle:  { fontSize: 14, fontWeight: '900', color: '#1A3050', textAlign: 'center' },
  toolSub:    { fontSize: 11, color: '#8A94A6', fontWeight: '600', textAlign: 'center' },
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
  gridSub: { fontSize: 13, color: '#8A94A6', fontWeight: '600', minHeight: 16 },
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
  allTakenCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#E8F5E9', borderRadius: 20,
    padding: 20, marginHorizontal: 20, marginBottom: 16,
  },
  allTakenText: { fontSize: 16, fontWeight: '700', color: '#2E7D32', flex: 1 },

  // SOS screen link
  sosScreenLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sosScreenLinkText: { fontSize: 13, fontWeight: '700', color: '#E05555' },

  // SOS call modal
  sosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,20,40,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  sosModalCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
  },
  sosModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sosModalTitle: { fontSize: 20, fontWeight: '900', color: '#15253E' },
  sosModalClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F0F3F8', alignItems: 'center', justifyContent: 'center',
  },
  sosModalSubtitle: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 10 },
  sosCountdownBar: {
    height: 5, backgroundColor: '#F0F3F8', borderRadius: 3,
    overflow: 'hidden', marginBottom: 20,
  },
  sosCountdownFill: { height: '100%', backgroundColor: '#D03050', borderRadius: 3 },
  sosModalPickText: { fontSize: 13, fontWeight: '700', color: '#8A94A6', marginBottom: 12 },
  sosContactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F3F8',
  },
  sosContactAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EEF6FC', alignItems: 'center', justifyContent: 'center',
  },
  sosContactName: { fontSize: 14, fontWeight: '800', color: '#15253E' },
  sosContactNum: { fontSize: 12, fontWeight: '500', color: '#8A94A6', marginTop: 2 },
  sosCallBtn: {
    width: 38, height: 38, borderRadius: 13,
    backgroundColor: '#3FA4DA', alignItems: 'center', justifyContent: 'center',
  },
  sosCancelBtn: {
    marginTop: 18, alignItems: 'center', paddingVertical: 14,
    backgroundColor: '#F0F3F8', borderRadius: 16,
  },
  sosCancelText: { fontSize: 15, fontWeight: '800', color: '#8A94A6' },
});
