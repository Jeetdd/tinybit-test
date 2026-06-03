import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddMedicineModal from '../../components/AddMedicineModal';
import EditMedicineModal, { type MedicineRow as EditMedicineRow } from '../../components/EditMedicineModal';
import { useAuth } from '../../context/AuthContext';
import type { Language } from '../../context/LanguageContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../utils/supabase';
import { scaleStyles } from '../../utils/scaleStyles';
import { broadcastElderUpdate, notifyGuardians } from '../../services/pushNotifications';
import { notifyGuardiansOf } from '../../services/notifications';

type MedScreenT = {
  myMedicine: string; todaysProgress: string; of: string; takenLabel: string;
  keepItUp: string; done: string; morning: string; afternoon: string; evening: string;
  dueAt: string; loading: string; refillAlert: string; tabletLeft: string;
  orderNow: string; yourStreak: string; dayStreak: string; onTheRightTrack: string;
  noMedicines: string; addFirst: string; takeNow: string;
};

const MT: Partial<Record<Language, MedScreenT>> = {
  English: {
    myMedicine: "My Medicine", todaysProgress: "Today's Progress", of: "of", takenLabel: "Taken",
    keepItUp: "Keep it up", done: "Done", morning: "Morning", afternoon: "Afternoon", evening: "Night",
    dueAt: "Due at", loading: "Loading medicines…",
    refillAlert: "Refill Alert", tabletLeft: "Tablet left · Order today",
    orderNow: "Order Now", yourStreak: "Your Streak", dayStreak: "Day Streak!", onTheRightTrack: "You are on the right track",
    noMedicines: "No medicines added yet", addFirst: "Tap + to add your first medicine",
    takeNow: "Take Now",
  },
  "हिंदी": {
    myMedicine: "मेरी दवाइयां", todaysProgress: "आज की प्रगति", of: "में से", takenLabel: "ली गई",
    keepItUp: "बढ़िया जा रहे हैं", done: "पूर्ण", morning: "सुबह", afternoon: "दोपहर", evening: "रात",
    dueAt: "समय:", loading: "दवाइयां लोड हो रही हैं…",
    refillAlert: "रिफिल अलर्ट", tabletLeft: "टैबलेट बची · आज ऑर्डर करें",
    orderNow: "अभी ऑर्डर करें", yourStreak: "आपकी स्ट्रीक", dayStreak: "दिन की स्ट्रीक!", onTheRightTrack: "आप सही राह पर हैं",
    noMedicines: "अभी कोई दवा नहीं", addFirst: "पहली दवा जोड़ने के लिए + दबाएं",
    takeNow: "अभी लें",
  },
  "ગુજરાતી": {
    myMedicine: "મારી દવાઓ", todaysProgress: "આજની પ્રગતિ", of: "માંથી", takenLabel: "લીધી",
    keepItUp: "સરસ ચાલી રહ્યા છો", done: "પૂર્ણ", morning: "સવાર", afternoon: "બપોર", evening: "રાત",
    dueAt: "સમય:", loading: "દવાઓ લોડ થઈ રહી છે…",
    refillAlert: "રિફિલ અલર્ટ", tabletLeft: "ટૅબ્લેટ બાકી · આજે ઑર્ડર કરો",
    orderNow: "હમણાં ઑર્ડર કરો", yourStreak: "તમારી સ્ટ્રીક", dayStreak: "દિવસ સ્ટ્રીક!", onTheRightTrack: "તમે સાચા રસ્તે છો",
    noMedicines: "હજુ કોઈ દવા ઉમેરી નથી", addFirst: "+ ટૅપ કરી પ્રથમ દવા ઉમેરો",
    takeNow: "હવે લો",
  },
  "தமிழ்": {
    myMedicine: "என் மருந்துகள்", todaysProgress: "இன்றைய முன்னேற்றம்", of: "இல்", takenLabel: "எடுக்கப்பட்டது",
    keepItUp: "தொடர்ந்து செய்யுங்கள்", done: "முடிந்தது", morning: "காலை", afternoon: "மதியம்", evening: "இரவு",
    dueAt: "நேரம்:", loading: "மருந்துகள் ஏற்றுகிறது…",
    refillAlert: "மீண்டும் நிரப்பு", tabletLeft: "மாத்திரை உள்ளது · இன்று ஆர்டர் செய்யுங்கள்",
    orderNow: "இப்போது ஆர்டர் செய்யுங்கள்", yourStreak: "உங்கள் தொடர்", dayStreak: "நாள் தொடர்!", onTheRightTrack: "நீங்கள் சரியான பாதையில் இருக்கிறீர்கள்",
    noMedicines: "இன்னும் மருந்துகள் இல்லை", addFirst: "முதல் மருந்தை சேர்க்க + தட்டவும்",
    takeNow: "இப்போது எடுக்கவும்",
  },
  "বাংলা": {
    myMedicine: "আমার ওষুধ", todaysProgress: "আজকের অগ্রগতি", of: "এর মধ্যে", takenLabel: "নেওয়া হয়েছে",
    keepItUp: "চালিয়ে যান", done: "সম্পন্ন", morning: "সকাল", afternoon: "দুপুর", evening: "রাত",
    dueAt: "সময়:", loading: "ওষুধ লোড হচ্ছে…",
    refillAlert: "রিফিল অ্যালার্ট", tabletLeft: "ট্যাবলেট বাকি · আজ অর্ডার করুন",
    orderNow: "এখন অর্ডার করুন", yourStreak: "আপনার ধারা", dayStreak: "দিনের ধারা!", onTheRightTrack: "আপনি সঠিক পথে আছেন",
    noMedicines: "এখনো কোনো ওষুধ নেই", addFirst: "প্রথম ওষুধ যোগ করতে + চাপুন",
    takeNow: "এখন নিন",
  },
  "मराठी": {
    myMedicine: "माझी औषधे", todaysProgress: "आजची प्रगती", of: "पैकी", takenLabel: "घेतली",
    keepItUp: "छान चालू आहे", done: "पूर्ण", morning: "सकाळ", afternoon: "दुपार", evening: "रात्र",
    dueAt: "वेळ:", loading: "औषधे लोड होत आहेत…",
    refillAlert: "रिफिल अलर्ट", tabletLeft: "गोळ्या शिल्लक · आज ऑर्डर करा",
    orderNow: "आत्ता ऑर्डर करा", yourStreak: "तुमची स्ट्रीक", dayStreak: "दिवस स्ट्रीक!", onTheRightTrack: "तुम्ही योग्य मार्गावर आहात",
    noMedicines: "अद्याप कोणतीही औषधे नाहीत", addFirst: "पहिली औषध जोडण्यासाठी + दाबा",
    takeNow: "आता घ्या",
  },
};

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Section = 'Morning' | 'Afternoon' | 'Night';
type MedStatus = 'Taken' | 'Pending';

const SECTION_CONFIG = {
  Morning: {
    icon: '🌅',
    label: 'Morning',
    accentColor: '#FF8C42',
    bgColor: '#FFF9F4',
    chipBg: '#FFF0E0',
    chipText: '#D97706',
    gradient: ['#FF8C42', '#FFA96A'] as [string, string],
  },
  Afternoon: {
    icon: '☀️',
    label: 'Afternoon',
    accentColor: '#1F7BD7',
    bgColor: '#F4F9FF',
    chipBg: '#E0EEFF',
    chipText: '#1F7BD7',
    gradient: ['#1F7BD7', '#4FA3E0'] as [string, string],
  },
  Night: {
    icon: '🌙',
    label: 'Night',
    accentColor: '#6B5CD9',
    bgColor: '#F7F5FF',
    chipBg: '#EDE8FF',
    chipText: '#5B4FBD',
    gradient: ['#4A3A8C', '#6B5CD9'] as [string, string],
  },
};

const C = {
  bg: '#F2F4F8',
  headerStart: '#2B3C86',
  headerEnd: '#2E9CD6',
  white: '#FFFFFF',
  text: '#15253E',
  muted: '#7B8AA0',
  blue: '#1F7BD7',
  arcBg: '#E8EEF6',
  arcFg: '#2A79D8',
  blackPill: '#1E1F24',
  greenDot: '#35C26B',
  takenBg: '#D4EDDA',
  takenText: '#1D9B50',
  cardBorder: '#EEF2F7',
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
};

const SECTION_TIMES: Record<Section, string> = {
  Morning: '8:00 AM',
  Afternoon: '2:00 PM',
  Night: '9:00 PM',
};

type MedicineRow = EditMedicineRow & { stock?: number | null };

type MedicineUI = {
  id: string;
  name: string;
  detail: string;
  dueTime: string;
  section: Section;
  days: DayOfWeek[];
  stock: number;
};

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 7);
  d.setMilliseconds(-1);
  return d;
}

function dateForWeekday(base: Date, weekday: DayOfWeek) {
  const s = startOfWeek(base);
  const d = new Date(s);
  d.setDate(s.getDate() + weekday);
  return d;
}

function formatWeekdayLabel(weekday: DayOfWeek) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekday];
}

function resolveSection(value: unknown): Section {
  if (value === 'Morning' || value === 'Afternoon' || value === 'Night') return value;
  return 'Morning';
}

function buildDetail(dosage?: string | null, instruction?: string | null) {
  const parts = [dosage?.trim(), instruction?.trim()].filter(Boolean) as string[];
  return parts.length ? parts.join(' · ') : '—';
}

// ── Semi-circular gauge ──────────────────────────────────────────────────────
function SemiGauge({ progress, doneLabel }: { progress: number; doneLabel: string }) {
  const { fontScale } = useLanguage();
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);
  const pct = clamp01(progress / 100);
  const w = 126, h = 78, stroke = 12;
  const r = (w - stroke) / 2;
  const cx = w / 2, cy = 68;
  const bg = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const angle = Math.PI - Math.PI * pct;
  const endX = cx + r * Math.cos(angle);
  const endY = cy - r * Math.sin(angle);
  const fg = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${endX} ${endY}`;

  return (
    <View style={s.gaugeWrap}>
      <Svg width={w} height={h}>
        <Path d={bg} stroke={C.arcBg} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        {pct > 0 && <Path d={fg} stroke={C.arcFg} strokeWidth={stroke} fill="none" strokeLinecap="round" />}
      </Svg>
      <View style={s.gaugeCenter}>
        <Text style={s.gaugePct}>{Math.round(progress)}%</Text>
        <Text style={s.gaugeDone}>{doneLabel}</Text>
      </View>
    </View>
  );
}

// ── Section Header (styled per time of day) ──────────────────────────────────
function SectionHeader({ section, time, label }: { section: Section; time: string; label: string }) {
  const { fontScale } = useLanguage();
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);
  const cfg = SECTION_CONFIG[section];
  return (
    <View style={s.sectionHeaderRow}>
      <View style={s.sectionHeaderLeft}>
        <LinearGradient
          colors={cfg.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.sectionIconPill}
        >
          <Text style={s.sectionIcon}>{cfg.icon}</Text>
          <Text style={s.sectionIconLabel}>{label}</Text>
        </LinearGradient>
      </View>
      <Text style={[s.sectionTime, { color: cfg.accentColor }]}>{time}</Text>
    </View>
  );
}

// ── Medicine Card (styled per section) ───────────────────────────────────────
function MedicineCard({
  name, detail, dueTime, status, section, stock, onToggle, onEdit,
}: {
  name: string;
  detail: string;
  dueTime: string;
  status: MedStatus;
  section: Section;
  stock: number;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const { language, fontScale, colors: tc, nightMode } = useLanguage();
  const mt = (MT[language] ?? MT.English) as MedScreenT;
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);
  const isTaken = status === 'Taken';
  const cfg = SECTION_CONFIG[section];

  return (
    <View style={[s.medCard, { backgroundColor: nightMode ? tc.card : cfg.bgColor, borderLeftColor: cfg.accentColor, borderColor: tc.border }]}>
      {/* Left accent bar */}
      <View style={[s.medAccentBar, { backgroundColor: cfg.accentColor }]} />

      <View style={s.medBody}>
        <View style={s.medHeaderRow}>
          {/* Medicine icon + info */}
          <View style={[s.medIconWrap, { backgroundColor: cfg.chipBg }]}>
            <Ionicons name="medical" size={18} color={cfg.accentColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[s.medName, { color: tc.text }]} numberOfLines={1}>{name}</Text>
            <Text style={[s.medDetail, { color: tc.muted }]} numberOfLines={2}>{detail}</Text>
          </View>
          <TouchableOpacity onPress={onEdit} hitSlop={8} style={s.editBtn}>
            <Ionicons name="create-outline" size={18} color={tc.muted} />
          </TouchableOpacity>
        </View>

        {/* Due time + toggle */}
        <View style={s.medFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.dueTimePill}>
              <Ionicons name="time-outline" size={13} color={tc.muted} />
              <Text style={[s.dueTimeText, { color: tc.muted }]}>{dueTime}</Text>
            </View>
            {stock < 99 && (
              <View style={[s.dueTimePill, { backgroundColor: stock <= 7 ? '#FFF0E0' : '#E8F3FF', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }]}>
                <Ionicons name="cube-outline" size={12} color={stock <= 7 ? '#F59E0B' : C.blue} />
                <Text style={[s.dueTimeText, { color: stock <= 7 ? '#F59E0B' : C.blue, fontSize: 11 }]}>{stock} left</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={onToggle}
            activeOpacity={0.8}
            style={[s.toggleBtn, isTaken ? s.toggleBtnTaken : { borderColor: cfg.accentColor }]}
          >
            {isTaken ? (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={s.toggleBtnTextTaken}>{mt.takenLabel}</Text>
              </>
            ) : (
              <>
                <Ionicons name="ellipse-outline" size={16} color={cfg.accentColor} />
                <Text style={[s.toggleBtnTextPending, { color: cfg.accentColor }]}>{mt.takeNow}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  const { fontScale } = useLanguage();
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyIconCircle}>
        <Ionicons name="medkit-outline" size={40} color="#B0BBC8" />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{subtitle}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MedicineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, streak } = useAuth();
  const { language, fontScale, colors: themeColors } = useLanguage();
  const mt = (MT[language] ?? MT.English) as MedScreenT;
  const s = useMemo(() => scaleStyles(RAW_STYLES, fontScale), [fontScale]);

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(new Date().getDay() as DayOfWeek);
  const [medicines, setMedicines] = useState<MedicineUI[]>([]);
  const [medStatuses, setMedStatuses] = useState<Record<string, MedStatus>>({});
  const [dayDone, setDayDone] = useState<Record<DayOfWeek, boolean>>({
    0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false,
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [rawMedicinesMap, setRawMedicinesMap] = useState<Record<string, MedicineRow>>({});
  const [editingMedicine, setEditingMedicine] = useState<MedicineRow | null>(null);

  const weekDays = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, idx) => {
      const id = idx as DayOfWeek;
      const d = dateForWeekday(base, id);
      return { id, label: formatWeekdayLabel(id), date: d.getDate() };
    });
  }, []);

  useEffect(() => {
    if (user) void loadWeek();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time: reload when guardian adds/edits/deletes a medicine for this elder,
  // and when any medicine_log row changes (own toggle from another device).
  useEffect(() => {
    if (!user?.id) return;

    // postgres_changes: fires on any DB write to this elder's rows
    const dbChannel = supabase
      .channel(`medicine-db-elder-${user.id}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'medicines', filter: `user_id=eq.${user.id}` },
        () => { void loadWeek(true); },
      )
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'medicine_logs', filter: `user_id=eq.${user.id}` },
        () => { void loadWeek(true); },
      )
      .subscribe();

    // Guardian broadcast channel: immediate signal sent by broadcastGuardianUpdate
    const guardianCh = supabase
      .channel(`guardian-${user.id}`)
      .on('broadcast', { event: 'medicine-add' },    () => { void loadWeek(true); })
      .on('broadcast', { event: 'medicine-update' }, () => { void loadWeek(true); })
      .on('broadcast', { event: 'medicine-delete' }, () => { void loadWeek(true); })
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(guardianCh);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWeek = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data: meds, error: medsError } = await supabase
        .from('medicines')
        .select('*')
        .eq('user_id', user?.id);

      if (medsError) throw medsError;

      const base = new Date();
      const { data: logs, error: logsError } = await supabase
        .from('medicine_logs')
        .select('medicine_id,taken_at')
        .eq('user_id', user?.id)
        .gte('taken_at', startOfWeek(base).toISOString())
        .lte('taken_at', endOfWeek(base).toISOString());

      if (logsError) throw logsError;

      const formattedMeds: MedicineUI[] = (meds as MedicineRow[] | null ?? []).map((m) => {
        const section = resolveSection(m.schedule_time);
        const days = (m.days_of_week ?? [0, 1, 2, 3, 4, 5, 6]).filter(
          (d): d is DayOfWeek => d >= 0 && d <= 6
        );
        return {
          id: m.id,
          name: (m.name ?? 'Medicine').toString(),
          detail: buildDetail(m.dosage, m.instruction),
          dueTime: (m.time ?? SECTION_TIMES[section]).toString(),
          section,
          days,
          stock: Number.isFinite(m.stock as number) ? (m.stock as number) : 99,
        };
      });

      const takenByDay: Record<DayOfWeek, Set<string>> = {
        0: new Set(), 1: new Set(), 2: new Set(), 3: new Set(),
        4: new Set(), 5: new Set(), 6: new Set(),
      };
      (logs ?? []).forEach((l: any) => {
        if (!l?.taken_at || !l?.medicine_id) return;
        const day = new Date(l.taken_at).getDay() as DayOfWeek;
        takenByDay[day].add(String(l.medicine_id));
      });

      const statuses: Record<string, MedStatus> = {};
      formattedMeds.forEach((m) => {
        m.days.forEach((day) => {
          statuses[`${day}-${m.id}`] = takenByDay[day].has(m.id) ? 'Taken' : 'Pending';
        });
      });

      const done: Record<DayOfWeek, boolean> = {
        0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false,
      };
      weekDays.forEach((d) => {
        const dayMeds = formattedMeds.filter((m) => m.days.includes(d.id));
        done[d.id] = dayMeds.length > 0 && dayMeds.every((m) => statuses[`${d.id}-${m.id}`] === 'Taken');
      });

      const rawMap: Record<string, MedicineRow> = {};
      (meds as MedicineRow[] | null ?? []).forEach((m) => { rawMap[m.id] = m; });

      setRawMedicinesMap(rawMap);
      setMedicines(formattedMeds);
      setMedStatuses(statuses);
      setDayDone(done);
    } catch (e) {
      console.error('Load medicine error', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const selectedDate = useMemo(() => dateForWeekday(new Date(), selectedDay), [selectedDay]);

  const toggleMedicine = async (medicineId: string) => {
    const key = `${selectedDay}-${medicineId}`;
    const isCurrentlyTaken = medStatuses[key] === 'Taken';
    const dayStart = new Date(selectedDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate); dayEnd.setHours(23, 59, 59, 999);
    const med = medicines.find((m) => m.id === medicineId);

    // Optimistic update — instant visual feedback
    setMedStatuses((prev) => {
      const next = { ...prev, [key]: isCurrentlyTaken ? 'Pending' : 'Taken' } as Record<string, MedStatus>;
      const dayMeds = medicines.filter((m) => m.days.includes(selectedDay));
      setDayDone((prevDone) => ({
        ...prevDone,
        [selectedDay]: dayMeds.length > 0 && dayMeds.every((m) => next[`${selectedDay}-${m.id}`] === 'Taken'),
      }));
      return next;
    });

    try {
      if (isCurrentlyTaken) {
        const { error: delErr } = await supabase
          .from('medicine_logs')
          .delete()
          .eq('user_id', user?.id)
          .eq('medicine_id', medicineId)
          .gte('taken_at', dayStart.toISOString())
          .lte('taken_at', dayEnd.toISOString());
        if (delErr) throw delErr;

        // Restore stock when unmarking
        if (med && med.stock < 99) {
          const newStock = med.stock + 1;
          await supabase.from('medicines').update({ stock: newStock }).eq('id', medicineId).eq('user_id', user?.id);
          setMedicines((prev) => prev.map((m) => m.id === medicineId ? { ...m, stock: newStock } : m));
        }
      } else {
        const takenAt = new Date(selectedDate);
        const now = new Date();
        takenAt.setHours(now.getHours(), now.getMinutes(), 0, 0);

        const { error: insErr } = await supabase.from('medicine_logs').insert({
          user_id: user?.id,
          medicine_id: medicineId,
          taken_at: takenAt.toISOString(),
        });
        if (insErr) throw insErr;

        // Broadcast + push + DB notify guardians (non-blocking)
        if (user?.id) {
          broadcastElderUpdate(user.id, 'medicine-update');
          if (med) {
            const elderName = profile?.firstName || 'Your elder';
            notifyGuardians(
              user.id,
              `${elderName} took their medicine`,
              `${med.name} marked as taken`,
              { screen: 'guardian-summary' },
            );
            notifyGuardiansOf(
              user.id, user.id,
              'medicine_taken',
              `💊 Medicine Taken`,
              `${elderName} took ${med.name}`,
            );
          }
        }

        // Decrement stock when marking taken (never below 0)
        if (med && med.stock < 99) {
          const newStock = Math.max(0, med.stock - 1);
          await supabase.from('medicines').update({ stock: newStock }).eq('id', medicineId).eq('user_id', user?.id);
          setMedicines((prev) => prev.map((m) => m.id === medicineId ? { ...m, stock: newStock } : m));
        }
      }

    } catch (err: any) {
      // Revert optimistic update — DB operation failed
      setMedStatuses((prev) => ({
        ...prev,
        [key]: isCurrentlyTaken ? 'Taken' : 'Pending',
      }));
      const msg = err?.message ?? JSON.stringify(err);
      console.error('Toggle medicine error', msg);
      Alert.alert('Error', `Could not save: ${msg}`);
    }
  };

  const currentMeds = useMemo(
    () => medicines.filter((m) => m.days.includes(selectedDay)),
    [medicines, selectedDay]
  );

  const takenCount = currentMeds.filter((m) => medStatuses[`${selectedDay}-${m.id}`] === 'Taken').length;
  const totalCount = currentMeds.length;
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  const lowStockMeds = useMemo(
    () => medicines.filter((m) => m.stock < 99 && m.stock <= 7),
    [medicines]
  );

  const handleOrderNow = (med: MedicineUI) => {
    const raw = rawMedicinesMap[med.id];
    const stockText = med.stock <= 0
      ? 'No tablets left'
      : `${med.stock} tablet${med.stock === 1 ? '' : 's'} left`;
    const buttons: any[] = [{ text: 'OK', style: 'cancel' }];
    if (raw?.doctor_phone) {
      buttons.unshift({
        text: 'Call Doctor',
        onPress: () => Linking.openURL(`tel:${raw.doctor_phone}`).catch(() => {}),
      });
    }
    Alert.alert('💊 Refill Needed', `${med.name}\n${stockText} — please contact your pharmacy to refill.`, buttons);
  };

  const titleName = profile?.fullName?.split(' ')[0] || 'there';

  return (
    <View style={[s.container, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={[C.headerStart, C.headerEnd] as [string, string]}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={s.headerRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.backBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </Pressable>
          <Text style={s.headerTitle}>{mt.myMedicine}</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <View style={[s.scrollSheet, { backgroundColor: themeColors.bg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {/* Progress card */}
          <View style={[s.progressCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={s.progressTop}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[s.progressLabel, { color: themeColors.text }]}>{mt.todaysProgress}</Text>
                <Text style={s.progressTitle}>
                  <Text style={[s.progressStrong, { color: themeColors.text }]}>{takenCount}</Text>
                  <Text style={[s.progressMuted, { color: themeColors.muted }]}> {mt.of} {totalCount} </Text>
                  <Text style={s.progressBlue}>{mt.takenLabel}</Text>
                </Text>
                <Text style={[s.progressSub, { color: themeColors.muted }]}>{mt.keepItUp} {titleName}!</Text>
                <View style={s.progressBarBg}>
                  <View style={[s.progressBarFg, { width: `${progressPercent}%` }]} />
                </View>
              </View>
              <SemiGauge progress={progressPercent} doneLabel={mt.done} />
            </View>

            {/* Section legend chips */}
            <View style={s.legendRow}>
              {(['Morning', 'Afternoon', 'Night'] as Section[]).map((sec) => {
                const cfg = SECTION_CONFIG[sec];
                return (
                  <View key={sec} style={[s.legendChip, { backgroundColor: cfg.chipBg }]}>
                    <Text style={{ fontSize: 11 }}>{cfg.icon}</Text>
                    <Text style={[s.legendChipText, { color: cfg.chipText }]}>{cfg.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Week day strip */}
          <View style={s.weekRow}>
            {weekDays.map((d) => {
              const active = selectedDay === d.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setSelectedDay(d.id)}
                  style={[s.dayPill, active ? s.dayPillActive : s.dayPillInactive]}
                >
                  <Text style={[s.dayLabel, active && s.dayLabelActive]}>{d.label}</Text>
                  <Text style={s.dayDate}>{d.date}</Text>
                  {!active && dayDone[d.id] ? <View style={s.dayDot} /> : null}
                </Pressable>
              );
            })}
          </View>

          {/* Medicine sections */}
          {loading ? (
            <Text style={s.loadingText}>{mt.loading}</Text>
          ) : currentMeds.length === 0 ? (
            <EmptyState title={mt.noMedicines} subtitle={mt.addFirst} />
          ) : (
            (['Morning', 'Afternoon', 'Night'] as Section[]).map((section) => {
              const items = currentMeds.filter((m) => m.section === section);
              if (!items.length) return null;
              const sLabel = section === 'Morning' ? mt.morning : section === 'Afternoon' ? mt.afternoon : mt.evening;
              return (
                <View key={section} style={s.sectionWrap}>
                  <SectionHeader section={section} time={SECTION_TIMES[section]} label={sLabel} />
                  <View style={s.sectionList}>
                    {items.map((m) => (
                      <MedicineCard
                        key={m.id}
                        name={m.name}
                        detail={m.detail}
                        dueTime={m.dueTime}
                        section={section}
                        stock={m.stock}
                        status={medStatuses[`${selectedDay}-${m.id}`] ?? 'Pending'}
                        onToggle={() => toggleMedicine(m.id)}
                        onEdit={() => setEditingMedicine(rawMedicinesMap[m.id] ?? null)}
                      />
                    ))}
                  </View>
                </View>
              );
            })
          )}

          {/* Refill alert */}
          {lowStockMeds.length > 0 && (
            <View style={s.block}>
              <Text style={[s.blockTitle, { color: themeColors.text }]}>{mt.refillAlert}</Text>
              <View style={{ gap: 10 }}>
                {lowStockMeds.map((med) => {
                  const stock = Math.max(0, med.stock);
                  const stockLabel = stock === 0
                    ? 'No tablets left · Order today'
                    : `${stock} tablet${stock === 1 ? '' : 's'} left · Order today`;
                  return (
                    <View key={med.id} style={[s.refillCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={[s.refillName, { color: themeColors.text }]} numberOfLines={1}>{med.name}</Text>
                        <Text style={[s.refillSub, { color: themeColors.muted }]}>{stockLabel}</Text>
                      </View>
                      <Pressable style={s.orderNowBtn} onPress={() => handleOrderNow(med)}>
                        <Text style={s.orderNowText}>{mt.orderNow}</Text>
                        <Ionicons name="arrow-forward" size={16} color={C.white} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Streak card */}
          <View style={[s.block, { marginBottom: 12 }]}>
            <Text style={[s.blockTitle, { color: themeColors.text }]}>{mt.yourStreak}</Text>
            <View style={s.streakWrapper}>
              <View style={s.streakIconWrap}>
                <Ionicons name="flame" size={32} color={streak > 0 ? "#FF8C42" : "#C8D0DC"} />
              </View>
              <View style={[s.streakCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[s.streakTitle, { color: themeColors.text }]}>{streak} {mt.dayStreak}</Text>
                <Text style={[s.streakSub, { color: themeColors.muted }]}>{mt.onTheRightTrack}</Text>
                <View style={s.streakDays}>
                  {weekDays.map((d) => (
                    <View key={d.id} style={s.streakDay}>
                      <Text style={[s.streakDayLabel, { color: themeColors.muted }, d.id === 0 && { color: '#E84545' }]}>{d.label}</Text>
                      {dayDone[d.id]
                        ? <Ionicons name="flame" size={18} color="#FF8C42" style={{ marginTop: 4 }} />
                        : <Text style={[s.streakDayNumber, { color: themeColors.text }]}>{d.date}</Text>}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* FAB — Add Medicine */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        style={[s.fab, { bottom: insets.bottom + 90 }]}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[C.headerStart, C.headerEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <AddMedicineModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={loadWeek}
      />

      <EditMedicineModal
        visible={!!editingMedicine}
        medicine={editingMedicine}
        onClose={() => setEditingMedicine(null)}
        onUpdated={loadWeek}
      />
    </View>
  );
}

const RAW_STYLES = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  header:      { paddingHorizontal: 18, paddingBottom: 54 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: C.white, fontSize: 22, fontWeight: '800' },

  scrollSheet: {
    flex: 1, marginTop: -34,
    backgroundColor: C.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden',
  },

  // Progress card
  progressCard: {
    margin: 16, padding: 16, borderRadius: 18,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.cardBorder,
    ...C.shadow,
  },
  progressTop:    { flexDirection: 'row', alignItems: 'center' },
  progressLabel:  { color: C.text, fontSize: 16, fontWeight: '700' },
  progressTitle:  { marginTop: 8, fontSize: 28, fontWeight: '800', color: C.text },
  progressStrong: { fontWeight: '900', color: C.text },
  progressMuted:  { fontWeight: '700', color: C.text },
  progressBlue:   { fontWeight: '900', color: C.blue },
  progressSub:    { marginTop: 6, color: C.muted, fontSize: 13, fontWeight: '600' },
  progressBarBg:  { height: 6, backgroundColor: '#E6EBF2', borderRadius: 6, marginTop: 18, overflow: 'hidden' },
  progressBarFg:  { height: '100%', backgroundColor: C.blue, borderRadius: 6 },
  legendRow:      { flexDirection: 'row', gap: 8, marginTop: 18 },
  legendChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  legendChipText: { fontSize: 11, fontWeight: '700' },

  gaugeWrap:   { width: 126, alignItems: 'center', justifyContent: 'center' },
  gaugeCenter: { position: 'absolute', top: 30, alignItems: 'center' },
  gaugePct:    { fontSize: 22, fontWeight: '900', color: C.text },
  gaugeDone:   { marginTop: 2, fontSize: 12, fontWeight: '700', color: C.muted },

  // Week strip
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 4 },
  dayPill:        { width: 44, height: 84, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dayPillInactive: { backgroundColor: '#1E1F24' },
  dayPillActive:   { backgroundColor: C.blue },
  dayLabel:        { fontSize: 12, fontWeight: '700', color: '#898D9E' },
  dayLabelActive:  { color: C.white },
  dayDate:         { marginTop: 4, fontSize: 18, fontWeight: '900', color: C.white },
  dayDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: '#35C26B', marginTop: 8 },

  // Section header
  sectionWrap:      { marginTop: 20, marginHorizontal: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionHeaderLeft: {},
  sectionIconPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  sectionIcon:      { fontSize: 16 },
  sectionIconLabel: { color: '#fff', fontSize: 14, fontWeight: '800' },
  sectionTime:      { fontSize: 14, fontWeight: '700' },
  sectionList:      { gap: 12 },

  // Medicine card
  medCard: {
    flexDirection: 'row', borderRadius: 16,
    borderWidth: 1, borderColor: C.cardBorder,
    overflow: 'hidden', ...C.shadow,
  },
  medAccentBar: { width: 4 },
  medBody:      { flex: 1, padding: 14 },
  medHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  medIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  medName:   { fontSize: 15, fontWeight: '800', color: C.text },
  medDetail: { marginTop: 3, fontSize: 12, fontWeight: '600', color: C.muted, lineHeight: 17 },
  medFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  dueTimePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueTimeText: { fontSize: 12, fontWeight: '700', color: C.muted },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22,
    borderWidth: 1.5,
  },
  editBtn:              { padding: 4, marginLeft: 4 },
  toggleBtnTaken:       { backgroundColor: '#35C26B', borderColor: '#35C26B' },
  toggleBtnTextTaken:   { color: '#fff', fontSize: 12, fontWeight: '800' },
  toggleBtnTextPending: { fontSize: 12, fontWeight: '800' },

  // Empty state
  emptyWrap:       { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEF2F7',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 6 },
  emptySub:   { fontSize: 13, fontWeight: '500', color: C.muted, textAlign: 'center' },

  loadingText: { marginTop: 24, marginHorizontal: 16, color: C.muted, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Refill + streak
  block:      { marginTop: 20, marginHorizontal: 16 },
  blockTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 10 },
  refillCard: {
    backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder,
    padding: 14, flexDirection: 'row', alignItems: 'center', ...C.shadow,
  },
  refillName: { fontSize: 16, fontWeight: '800', color: C.text },
  refillSub:  { marginTop: 4, fontSize: 12, fontWeight: '700', color: C.muted },
  orderNowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#101116', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
  },
  orderNowText: { color: C.white, fontSize: 12, fontWeight: '800' },

  streakWrapper: {
    alignItems: 'center',
  },
  streakIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#E6F3FF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: C.white,
    zIndex: 1, marginBottom: -36,
    ...C.shadow,
  },
  streakCard: {
    width: '100%',
    backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder,
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, alignItems: 'center', ...C.shadow,
  },
  streakIcon:       { fontSize: 26 },
  streakTitle:      { marginTop: 10, fontSize: 20, fontWeight: '900', color: C.text },
  streakSub:        { marginTop: 4, fontSize: 12, fontWeight: '700', color: C.muted },
  streakDays:       { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 14 },
  streakDay:        { alignItems: 'center', width: 44 },
  streakDayIcon:    { fontSize: 16, marginTop: 6 },
  streakDayNumber:  { marginTop: 6, fontSize: 14, fontWeight: '800', color: '#222B3B' },
  streakDayLabel:   { fontSize: 12, fontWeight: '700', color: C.muted },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    borderRadius: 32,
    ...C.shadow,
    shadowOpacity: 0.25,
    elevation: 8,
  },
  fabGradient: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
});
