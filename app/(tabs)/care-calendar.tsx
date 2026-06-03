import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, StatusBar,
  Modal, TextInput, Alert, Platform, KeyboardAvoidingView,
  Keyboard, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { supabase } from "../../utils/supabase";
import { tr } from "../../constants/appTranslations";
import { notifyGuardiansOf } from "../../services/notifications";

const C = {
  navy:     "#1A2E6A",
  navyDark: "#111D44",
  white:    "#FFFFFF",
  bg:       "#EEF2F7",
  muted:    "#8A9BB0",
  accent:   "#37B1E6",
  border:   "#E4EBF2",
  medical:  "#DB5461",
  family:   "#5CB8B2",
  therapy:  "#7C5CFC",
  activity: "#F4A46A",
  pastDay:  "#D0D8E4",
};

type EventType = "Doctor" | "Family" | "Therapy" | "Activity";

interface EventItem {
  id: string;
  date: number;
  month: string;
  year: number;
  timestamp: number;
  title: string;
  sub: string;
  time: string;
  type: EventType;
  color: string;
  emoji: string;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS_SHORT = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

const ITEM_H   = 52;
const VISIBLE  = 5;
const PAD      = Math.floor(VISIBLE / 2);
const PICKER_H = ITEM_H * VISIBLE;
const HOURS    = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES  = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const AMPM     = ["AM", "PM"];


function getEventDefaults(type: EventType): { color: string; emoji: string } {
  switch (type) {
    case "Doctor":   return { color: C.medical,  emoji: "🏥" };
    case "Family":   return { color: C.family,   emoji: "🏡" };
    case "Therapy":  return { color: C.therapy,  emoji: "💆" };
    case "Activity": return { color: C.activity, emoji: "🚶" };
  }
}

const EVENT_FORM_CONFIG: Record<EventType, { titleLabel: string; titlePlaceholder: string; subLabel: string; subPlaceholder: string }> = {
  Doctor:   { titleLabel: "Doctor / Appointment",  titlePlaceholder: "e.g. Dr. Mehta Checkup",           subLabel: "Hospital / Location",         subPlaceholder: "e.g. Sterling Hospital, Vadodara"   },
  Family:   { titleLabel: "Who's Visiting",         titlePlaceholder: "e.g. Rahul & Family",              subLabel: "Notes (optional)",            subPlaceholder: "e.g. Coming for lunch, staying 2 hrs" },
  Therapy:  { titleLabel: "Session / Therapist",    titlePlaceholder: "e.g. Physiotherapy with Dr. Shah", subLabel: "Clinic / Location (optional)", subPlaceholder: "e.g. Rehab Center, Floor 2"         },
  Activity: { titleLabel: "Activity",               titlePlaceholder: "e.g. Morning Walk",                subLabel: "Notes (optional)",            subPlaceholder: "e.g. Garden route, 30 mins"         },
};

function monthStr(date: Date) {
  return MONTHS_SHORT[date.getMonth()];
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const T_YEAR  = TODAY.getFullYear();
const T_MONTH = TODAY.getMonth();
const T_DATE  = TODAY.getDate();

export default function CareCalendarScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { colors: themeColors, language } = useLanguage();
  const t = tr(language);

  // Always open on current month / today
  const [viewDate,      setViewDate]      = useState(() => new Date(T_YEAR, T_MONTH, 1));
  const [selectedDate,  setSelectedDate]  = useState(T_DATE);
  const [events,        setEvents]        = useState<EventItem[]>([]);
  const [loading,       setLoading]       = useState(false);

  // Modal state
  const [showModal,     setShowModal]     = useState(false);
  const [selectingTime, setSelectingTime] = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [newEvent,      setNewEvent]      = useState({
    title: "", sub: "", time: "", type: "Doctor" as EventType,
  });

  // Wheel picker state
  const [pickerHour,  setPickerHour]  = useState(8);
  const [pickerMin,   setPickerMin]   = useState(0);
  const [pickerAmPm,  setPickerAmPm]  = useState(0);

  const openTimePicker = () => {
    if (newEvent.time) {
      const m = newEvent.time.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/);
      if (m) {
        setPickerHour(parseInt(m[1]) - 1);
        setPickerMin(parseInt(m[2]));
        setPickerAmPm(m[3] === "AM" ? 0 : 1);
      }
    } else {
      setPickerHour(8); setPickerMin(0); setPickerAmPm(0);
    }
    setSelectingTime(true);
  };

  useEffect(() => { if (user) void loadEvents(); }, [user]);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("care_events")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: true });
      if (!error && data) setEvents(data as EventItem[]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.time) {
      Alert.alert("Missing info", "Please add a title and select a time.");
      return;
    }
    const def = getEventDefaults(newEvent.type);
    const mStr = monthStr(viewDate);
    const ev = {
      user_id:   user!.id,
      title:     newEvent.title.trim(),
      sub:       newEvent.sub.trim(),
      time:      newEvent.time,
      type:      newEvent.type,
      color:     def.color,
      emoji:     def.emoji,
      date:      selectedDate,
      month:     mStr,
      year:      viewDate.getFullYear(),
      timestamp: new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDate).getTime(),
    };
    setSaving(true);
    const { data, error } = await supabase.from("care_events").insert([ev]).select().single();
    setSaving(false);
    if (error) { Alert.alert("Error", "Could not save event. Make sure migration 020 has been run."); return; }
    setEvents(prev => [...prev, data as EventItem].sort((a, b) => a.timestamp - b.timestamp));

    // Notify all connected guardians (non-blocking)
    const elderName = profile?.firstName || profile?.fullName || 'Your elder';
    const dateLabel = new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDate)
      .toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    notifyGuardiansOf(
      user!.id, user!.id,
      'care_event_added',
      `${def.emoji} Event Added`,
      `${elderName} · ${newEvent.type}: "${newEvent.title.trim()}" on ${dateLabel} at ${newEvent.time}`,
    );

    closeModal();
  };

  const deleteEvent = (id: string, title: string) => {
    Alert.alert("Delete Event", `Remove "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await supabase.from("care_events").delete().eq("id", id).eq("user_id", user!.id);
          setEvents(prev => prev.filter(e => e.id !== id));
        },
      },
    ]);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectingTime(false);
    setNewEvent({ title: "", sub: "", time: "", type: "Doctor" });
  };

  // ── Calendar logic ─────────────────────────────────────────────

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const mStr  = monthStr(viewDate);

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const daysInPrev   = new Date(year, month, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  // Is this month in the past? (disable back nav)
  const isCurrentMonth  = year === T_YEAR && month === T_MONTH;
  const canGoBack       = year > T_YEAR || (year === T_YEAR && month > T_MONTH);

  const isPastDay = (day: number) => isCurrentMonth && day < T_DATE;
  const isTodayDay = (day: number) => isCurrentMonth && day === T_DATE;

  type Cell = { day: number; cur: boolean; hasEvent: boolean; eventColor: string };
  const cells: Cell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, cur: false, hasEvent: false, eventColor: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const ev = events.find(e => e.date === d && e.month === mStr && e.year === year);
    cells.push({ day: d, cur: true, hasEvent: !!ev, eventColor: ev?.color ?? "" });
  }
  const rem = 7 - (cells.length % 7 === 0 ? 7 : cells.length % 7);
  for (let d = 1; d <= rem; d++)
    cells.push({ day: d, cur: false, hasEvent: false, eventColor: "" });

  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const eventsForDay = events.filter(
    e => e.date === selectedDate && e.month === mStr && e.year === year,
  );

  const navigateMonth = (dir: 1 | -1) => {
    if (dir === -1 && !canGoBack) return;
    const next = new Date(year, month + dir, 1);
    setViewDate(next);
    // When going to current month, snap selection to today; otherwise to 1st
    const nextIsCurrentMonth = next.getFullYear() === T_YEAR && next.getMonth() === T_MONTH;
    setSelectedDate(nextIsCurrentMonth ? T_DATE : 1);
  };

  const selectedLabel = new Date(year, month, selectedDate).toLocaleDateString("en-US", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <View style={[s.root, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <LinearGradient
        colors={["#2B3C86", "#2E9CD6"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.white} />
        </Pressable>
        <Text style={s.headerTitle}>{t.careCalendar}</Text>
        <Pressable
          onPress={() => !isPastDay(selectedDate) && setShowModal(true)}
          style={s.addBtn}
        >
          <Ionicons name="add" size={22} color={C.white} />
        </Pressable>
      </LinearGradient>

      <View style={[s.scrollSheet, { backgroundColor: themeColors.bg }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar Card */}
        <View style={[s.calCard, { backgroundColor: themeColors.card }]}>
          {/* Month nav */}
          <View style={s.monthRow}>
            <Pressable
              onPress={() => navigateMonth(-1)}
              style={[s.navBtn, !canGoBack && s.navBtnDisabled]}
              disabled={!canGoBack}
            >
              <Ionicons name="chevron-back" size={18} color={canGoBack ? C.navyDark : C.pastDay} />
            </Pressable>
            <Text style={[s.monthTitle, { color: themeColors.text }]}>
              {viewDate.toLocaleString("default", { month: "long" })} {year}
            </Text>
            <Pressable onPress={() => navigateMonth(1)} style={s.navBtn}>
              <Ionicons name="chevron-forward" size={18} color={C.navyDark} />
            </Pressable>
          </View>

          {/* Day headers */}
          <View style={s.daysHeader}>
            {DAYS.map(d => (
              <Text key={d} style={[s.dayLabel, d === "Su" && { color: "#E05A7A" }]}>{d}</Text>
            ))}
          </View>

          {/* Date grid */}
          {rows.map((row, ri) => (
            <View key={ri} style={s.weekRow}>
              {row.map((cell, ci) => {
                const past    = cell.cur && isPastDay(cell.day);
                const todayC  = cell.cur && isTodayDay(cell.day);
                const isSel   = cell.cur && cell.day === selectedDate;
                return (
                  <Pressable
                    key={ci}
                    onPress={() => cell.cur && !past && setSelectedDate(cell.day)}
                    style={[
                      s.dateCell,
                      isSel && s.dateCellSel,
                      todayC && !isSel && s.dateCellToday,
                    ]}
                    disabled={!cell.cur || past}
                  >
                    <Text style={[
                      s.dateText,
                      !cell.cur  && s.dateTextOther,
                      past       && s.dateTextPast,
                      isSel      && s.dateTextSel,
                      todayC && !isSel && s.dateTextToday,
                    ]}>
                      {cell.day}
                    </Text>
                    {cell.cur && cell.hasEvent && !isSel && !past && (
                      <View style={[s.eventDot, { backgroundColor: cell.eventColor }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Events for selected date */}
        <View style={s.evtSection}>
          <View style={s.evtHeader}>
            <Text style={[s.evtHeading, { color: themeColors.text }]}>{selectedLabel}</Text>
            {!isPastDay(selectedDate) && (
              <Pressable onPress={() => setShowModal(true)} style={s.addEventBtn}>
                <Ionicons name="add" size={16} color={C.white} />
                <Text style={s.addEventText}>{t.add}</Text>
              </Pressable>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color={C.accent} style={{ paddingVertical: 32 }} />
          ) : eventsForDay.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>📅</Text>
              <Text style={[s.emptyTitle, { color: themeColors.text }]}>{t.noEventsScheduled}</Text>
              {!isPastDay(selectedDate) && (
                <Text style={s.emptySub}>{t.tapToAddEvent}</Text>
              )}
            </View>
          ) : (
            eventsForDay.map(ev =>
              ev.type === "Doctor"
                ? <DoctorCard key={ev.id} event={ev} onDelete={deleteEvent} />
                : <EventCard   key={ev.id} event={ev} onDelete={deleteEvent} />,
            )
          )}
        </View>
      </ScrollView>
      </View>

      {/* Add Event Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); closeModal(); }} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: "100%" }}
            pointerEvents="box-none"
          >
            <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={s.modalSheet}>
                <View style={s.handle} />
                {selectingTime && (
                  <TouchableOpacity onPress={() => setSelectingTime(false)} style={s.modalBack}>
                    <Ionicons name="chevron-back" size={24} color={C.navyDark} />
                  </TouchableOpacity>
                )}
                <Text style={s.modalTitle}>{selectingTime ? t.selectTime : t.addCareEvent}</Text>
                <Text style={s.modalSub}>{selectedLabel}</Text>

                {selectingTime ? (
                  <>
                    {/* Live time preview */}
                    <View style={s.timePreviewBox}>
                      <Text style={s.timePreviewText}>
                        {HOURS[pickerHour]}:{MINUTES[pickerMin]}{" "}
                        <Text style={{ color: C.accent }}>{AMPM[pickerAmPm]}</Text>
                      </Text>
                    </View>

                    {/* Wheel columns */}
                    <View style={s.wheelWrap}>
                      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: "center" }]}>
                        <View style={s.wheelHighlight} />
                      </View>
                      <WheelPicker items={HOURS}   selectedIndex={pickerHour}  onChange={setPickerHour}  width={72} />
                      <Text style={s.wheelColon}>:</Text>
                      <WheelPicker items={MINUTES} selectedIndex={pickerMin}   onChange={setPickerMin}   width={72} />
                      <WheelPicker items={AMPM}    selectedIndex={pickerAmPm}  onChange={setPickerAmPm}  width={64} />
                    </View>

                    {/* Action buttons */}
                    <View style={[s.modalFooter, { marginTop: 20 }]}>
                      <TouchableOpacity style={s.cancelBtn} onPress={() => setSelectingTime(false)}>
                        <Text style={s.cancelText}>{t.cancel}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.confirmTimeBtn}
                        onPress={() => {
                          const timeStr = `${HOURS[pickerHour]}:${MINUTES[pickerMin]} ${AMPM[pickerAmPm]}`;
                          setNewEvent(p => ({ ...p, time: timeStr }));
                          setSelectingTime(false);
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color={C.white} />
                        <Text style={s.saveText}>{t.confirmTime}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Category */}
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>{t.categoryLabel}</Text>
                      <View style={s.typeRow}>
                        {(["Doctor","Family","Therapy","Activity"] as EventType[]).map(evType => {
                          const def = getEventDefaults(evType);
                          return (
                            <TouchableOpacity
                              key={evType}
                              style={[s.typeChip, newEvent.type === evType && { backgroundColor: def.color, borderColor: def.color }]}
                              onPress={() => setNewEvent(p => ({ ...p, type: evType }))}
                            >
                              <Text style={{ fontSize: 16 }}>{def.emoji}</Text>
                              <Text style={[s.typeChipText, newEvent.type === evType && { color: C.white }]}>{evType}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Title */}
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>{EVENT_FORM_CONFIG[newEvent.type].titleLabel} *</Text>
                      <TextInput
                        style={s.input}
                        placeholder={EVENT_FORM_CONFIG[newEvent.type].titlePlaceholder}
                        placeholderTextColor={C.muted}
                        value={newEvent.title}
                        onChangeText={v => setNewEvent(p => ({ ...p, title: v }))}
                      />
                    </View>

                    {/* Time */}
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>{t.eventTime} *</Text>
                      <TouchableOpacity style={s.timePicker} onPress={openTimePicker}>
                        <Text style={[s.timePickerText, !newEvent.time && { color: C.muted }]}>
                          {newEvent.time || t.selectTime}
                        </Text>
                        <Ionicons name="time-outline" size={18} color={C.muted} />
                      </TouchableOpacity>
                    </View>

                    {/* Sub / Notes */}
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>{EVENT_FORM_CONFIG[newEvent.type].subLabel}</Text>
                      <TextInput
                        style={[s.input, { height: 72, textAlignVertical: "top" }]}
                        placeholder={EVENT_FORM_CONFIG[newEvent.type].subPlaceholder}
                        placeholderTextColor={C.muted}
                        multiline
                        value={newEvent.sub}
                        onChangeText={v => setNewEvent(p => ({ ...p, sub: v }))}
                      />
                    </View>

                    <View style={s.modalFooter}>
                      <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
                        <Text style={s.cancelText}>{t.cancel}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.saveBtn} onPress={saveEvent} disabled={saving}>
                        <Text style={s.saveText}>{saving ? t.saving : t.saveEvent}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Event card sub-components ──────────────────────────── */

function DoctorCard({ event, onDelete }: { event: EventItem; onDelete: (id: string, title: string) => void }) {
  return (
    <View style={s.evtCardWrap}>
      <LinearGradient
        colors={["#2B3C86", "#2E9CD6"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.doctorCard}
      >
        <View style={s.doctorAvatarWrap}>
          <Ionicons name="person" size={52} color="rgba(255,255,255,0.7)" />
        </View>
        <View style={s.doctorInfo}>
          <Text style={s.doctorName}>{event.title}</Text>
          <View style={s.doctorTimePill}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.85)" />
            <Text style={s.doctorTime}>{event.time}</Text>
          </View>
          {!!event.sub && (
            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={s.locationText}>{event.sub}</Text>
            </View>
          )}
        </View>
        <Pressable onPress={() => onDelete(event.id, event.title)} style={s.evtDeleteBtn} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </LinearGradient>
    </View>
  );
}

function EventCard({ event, onDelete }: { event: EventItem; onDelete: (id: string, title: string) => void }) {
  const { colors: tc } = useLanguage();
  return (
    <View style={[s.eventCard, { borderLeftColor: event.color, backgroundColor: tc.card }]}>
      <View style={[s.eventIconWrap, { backgroundColor: event.color + "20" }]}>
        <Text style={{ fontSize: 22 }}>{event.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.eventTitle, { color: tc.text }]}>{event.title}</Text>
        <View style={s.eventTimeRow}>
          <Ionicons name="time-outline" size={12} color={tc.muted} />
          <Text style={[s.eventTime, { color: tc.muted }]}>{event.time}</Text>
          {!!event.sub && <Text style={[s.eventSub, { color: tc.muted }]} numberOfLines={1}> · {event.sub}</Text>}
        </View>
      </View>
      <View style={[s.eventTypeBadge, { backgroundColor: event.color + "20" }]}>
        <Text style={[s.eventTypeText, { color: event.color }]}>{event.type}</Text>
      </View>
      <Pressable onPress={() => onDelete(event.id, event.title)} hitSlop={8} style={{ marginLeft: 4 }}>
        <Ionicons name="trash-outline" size={16} color={C.muted} />
      </Pressable>
    </View>
  );
}


/* ─── Wheel picker ───────────────────────────────────────── */

function WheelPicker({ items, selectedIndex, onChange, width = 80 }: {
  items: string[];
  selectedIndex: number;
  onChange: (i: number) => void;
  width?: number;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ScrollView
      ref={ref}
      style={{ height: PICKER_H, width }}
      contentContainerStyle={{ paddingVertical: PAD * ITEM_H }}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onMomentumScrollEnd={e => {
        const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
        onChange(Math.max(0, Math.min(i, items.length - 1)));
      }}
      onScrollEndDrag={e => {
        const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
        onChange(Math.max(0, Math.min(i, items.length - 1)));
      }}
    >
      {items.map((item, i) => (
        <View key={i} style={{ height: ITEM_H, justifyContent: "center", alignItems: "center" }}>
          <Text style={[
            { fontSize: 20, fontWeight: "600", color: C.muted },
            i === selectedIndex && { fontSize: 28, fontWeight: "900", color: C.navyDark },
          ]}>
            {item}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingBottom: 50, gap: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: "800", color: C.white },
  scrollSheet: { flex: 1, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },

  scroll: { paddingTop: 16 },

  /* Calendar */
  calCard: {
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 20,
    borderRadius: 22, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  navBtn:         { padding: 8, borderRadius: 10 },
  navBtnDisabled: { opacity: 0.3 },
  monthTitle: { fontSize: 17, fontWeight: "800", color: C.navyDark },

  daysHeader: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
  dayLabel: { width: 36, textAlign: "center", fontSize: 12, fontWeight: "700", color: C.muted },

  weekRow:  { flexDirection: "row", justifyContent: "space-around", marginBottom: 6 },
  dateCell: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  dateCellSel:   { backgroundColor: C.navy },
  dateCellToday: { borderWidth: 2, borderColor: C.accent },

  dateText:      { fontSize: 14, fontWeight: "700", color: C.navyDark },
  dateTextOther: { color: "#C2CBD8" },
  dateTextPast:  { color: C.pastDay },
  dateTextSel:   { color: C.white },
  dateTextToday: { color: C.accent, fontWeight: "900" },

  eventDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },

  /* Events section */
  evtSection:  { paddingHorizontal: 16 },
  evtHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  evtHeading:  { fontSize: 16, fontWeight: "900", color: C.navyDark, flex: 1 },
  addEventBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.navy, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addEventText: { fontSize: 13, fontWeight: "800", color: C.white },

  emptyBox: { paddingVertical: 40, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: C.navyDark },
  emptySub:   { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

  /* Doctor card */
  evtCardWrap: { marginBottom: 12 },
  doctorCard: {
    borderRadius: 20, paddingTop: 20, paddingBottom: 20, paddingRight: 16,
    flexDirection: "row", alignItems: "center",
    overflow: "hidden",
  },
  doctorAvatarWrap: { width: 90, justifyContent: "center", alignItems: "center" },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 18, fontWeight: "900", color: C.white, marginBottom: 6 },
  doctorTimePill: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  doctorTime:  { fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: "700" },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  locationText: { flex: 1, color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500", lineHeight: 17 },
  evtDeleteBtn: { padding: 8, position: "absolute", top: 10, right: 8 },

  /* Generic event card */
  eventCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  eventIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  eventTitle:   { fontSize: 15, fontWeight: "800", color: C.navyDark },
  eventTimeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  eventTime:    { fontSize: 12, fontWeight: "700", color: C.muted },
  eventSub:     { fontSize: 12, color: C.muted, flex: 1 },
  eventTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  eventTypeText:  { fontSize: 11, fontWeight: "800" },

  /* Modal */
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
  },
  handle:    { width: 38, height: 5, backgroundColor: "#D8E4EC", borderRadius: 3, alignSelf: "center", marginBottom: 16 },
  modalTitle:{ fontSize: 20, fontWeight: "900", color: C.navyDark, textAlign: "center" },
  modalSub:  { fontSize: 13, color: C.muted, textAlign: "center", marginTop: 4, marginBottom: 20 },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: C.muted, marginBottom: 7, marginLeft: 2 },
  input: {
    backgroundColor: C.bg, borderRadius: 14, padding: 14,
    fontSize: 15, fontWeight: "600", color: C.navyDark,
    borderWidth: 1, borderColor: C.border,
  },
  timePicker: {
    backgroundColor: C.bg, borderRadius: 14, padding: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: C.border,
  },
  timePickerText: { fontSize: 15, fontWeight: "600", color: C.navyDark },

  modalBack: { position: "absolute", top: 24, left: 24 },

  timePreviewBox: {
    alignSelf: "center", marginBottom: 4,
    backgroundColor: C.navy + "0D",
    paddingHorizontal: 28, paddingVertical: 10, borderRadius: 18,
  },
  timePreviewText: { fontSize: 36, fontWeight: "900", color: C.navyDark, letterSpacing: 1 },

  confirmTimeBtn: {
    flex: 2, height: 54, borderRadius: 16, backgroundColor: C.accent,
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8,
  },

  wheelWrap: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: PICKER_H, overflow: "hidden", marginTop: 8,
  },
  wheelHighlight: {
    height: ITEM_H,
    backgroundColor: C.accent + "18",
    borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: C.accent,
    marginHorizontal: 12, borderRadius: 10,
  },
  wheelColon: {
    fontSize: 28, fontWeight: "900", color: C.navyDark,
    marginBottom: 4, paddingHorizontal: 2,
  },

  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: C.bg, alignItems: "center", borderWidth: 1.5, borderColor: C.border, gap: 4,
  },
  typeChipText: { fontSize: 11, fontWeight: "800", color: C.muted },

  modalFooter: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, height: 54, borderRadius: 16, backgroundColor: C.bg,
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.border,
  },
  cancelText: { fontSize: 15, fontWeight: "800", color: C.muted },
  saveBtn:    { flex: 2, height: 54, borderRadius: 16, backgroundColor: C.navy, justifyContent: "center", alignItems: "center" },
  saveText:   { fontSize: 15, fontWeight: "800", color: C.white },
});
