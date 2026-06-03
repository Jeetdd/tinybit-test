import { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withRepeat, withSequence, Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const C = {
  navy:     "#1A2E6A",
  navyDark: "#111D44",
  white:    "#FFFFFF",
  bg:       "#EEF2F7",
  muted:    "#8A9BB0",
  accent:   "#37B1E6",
};

const INHALE_SEC  = 4;
const EXHALE_SEC  = 4;
const CYCLE_TOTAL = INHALE_SEC + EXHALE_SEC;

export default function MoodBreatheScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [active,   setActive]   = useState(false);
  const [phase,    setPhase]    = useState<"inhale" | "exhale">("inhale");
  const [count,    setCount]    = useState(INHALE_SEC);
  const [cycle,    setCycle]    = useState(1);
  const [elapsed,  setElapsed]  = useState(0);

  const ring1Scale = useSharedValue(1);
  const ring2Scale = useSharedValue(1);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ring1Anim = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: 0.25,
  }));
  const ring2Anim = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: 0.45,
  }));

  useEffect(() => {
    if (active) {
      ring1Scale.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: INHALE_SEC * 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1,    { duration: EXHALE_SEC * 1000, easing: Easing.inOut(Easing.ease) }),
        ), -1, false,
      );
      ring2Scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: INHALE_SEC * 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1,   { duration: EXHALE_SEC * 1000, easing: Easing.inOut(Easing.ease) }),
        ), -1, false,
      );
    } else {
      ring1Scale.value = withTiming(1, { duration: 400 });
      ring2Scale.value = withTiming(1, { duration: 400 });
    }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) return;

    let secondsInCycle = 0;
    setPhase("inhale");
    setCount(INHALE_SEC);

    timerRef.current = setInterval(() => {
      secondsInCycle = (secondsInCycle + 1) % CYCLE_TOTAL;
      setElapsed(prev => prev + 1);

      if (secondsInCycle < INHALE_SEC) {
        setPhase("inhale");
        setCount(INHALE_SEC - secondsInCycle);
      } else {
        setPhase("exhale");
        setCount(CYCLE_TOTAL - secondsInCycle);
      }

      if (secondsInCycle === 0) {
        setCycle(prev => prev + 1);
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active]);

  const handleStart = () => {
    setActive(true);
    setElapsed(0);
    setCycle(1);
    setPhase("inhale");
    setCount(INHALE_SEC);
  };

  const handleReset = () => {
    setActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsed(0);
    setCycle(1);
    setPhase("inhale");
    setCount(INHALE_SEC);
  };

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // SVG arc progress
  const SIZE   = 260;
  const RADIUS = 118;
  const STROKE = 8;
  const CIRCUM = 2 * Math.PI * RADIUS;
  const fillRatio = active
    ? phase === "inhale"
      ? (INHALE_SEC - count) / INHALE_SEC
      : 1
    : 0;
  const strokeDash = CIRCUM * fillRatio;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={["#1B3A5C", "#2B7FC0"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => { handleReset(); router.back(); }} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.navyDark} />
        </Pressable>
        <Text style={s.headerTitle}>Breathing Exercise</Text>
      </LinearGradient>

      <View style={s.sheet}>
        {/* Breathing circle */}
        <View style={s.circleArea}>
          {/* Outer rings animate with inhale */}
          <Animated.View style={[s.ring1, ring1Anim]} />
          <Animated.View style={[s.ring2, ring2Anim]} />

          {/* SVG progress arc (only when active) */}
          {active && (
            <Svg width={SIZE} height={SIZE} style={s.svgArc}>
              {/* Background track */}
              <Circle
                cx={SIZE / 2} cy={SIZE / 2}
                r={RADIUS}
                stroke="rgba(200,220,240,0.6)"
                strokeWidth={STROKE}
                fill="none"
              />
              {/* Progress arc */}
              <AnimatedCircle
                cx={SIZE / 2} cy={SIZE / 2}
                r={RADIUS}
                stroke={C.navy}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${CIRCUM}`}
                strokeDashoffset={CIRCUM - strokeDash}
                strokeLinecap="round"
                rotation="-90"
                origin={`${SIZE / 2}, ${SIZE / 2}`}
              />
            </Svg>
          )}

          {/* Inner blue circle */}
          <View style={s.innerCircle}>
            {active ? (
              <>
                <Text style={s.countText}>{count}</Text>
                <Text style={s.phaseText}>{phase === "inhale" ? "Inhale" : "Exhale"}</Text>
              </>
            ) : (
              <Text style={s.idleText}>Breathe In</Text>
            )}
          </View>
        </View>

        {/* Cycle / Timer row (active only) */}
        {active && (
          <View style={s.statsRow}>
            <Text style={s.statLabel}>Cycle  <Text style={s.statValue}>{cycle}</Text></Text>
            <View style={s.statDivider} />
            <Text style={s.statLabel}>Minutes  <Text style={[s.statValue, { color: C.accent }]}>{timeStr}</Text></Text>
          </View>
        )}

        {/* Buttons */}
        {!active ? (
          <View style={s.btnRow}>
            <Pressable style={s.startBtn} onPress={handleStart}>
              <Text style={s.startBtnText}>Start</Text>
            </Pressable>
            <Pressable style={s.resetBtn} onPress={handleReset}>
              <Text style={s.resetBtnText}>Reset</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={s.stopBtn} onPress={handleReset}>
            <Text style={s.startBtnText}>Stop & Reset</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const CIRCLE_SIZE = 200;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingBottom: 28, gap: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "900", color: C.white },

  sheet: {
    flex: 1, marginTop: -22,
    backgroundColor: C.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 40, alignItems: "center",
  },

  circleArea: {
    width: 260, height: 260,
    justifyContent: "center", alignItems: "center",
    marginBottom: 40,
  },

  ring1: {
    position: "absolute",
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: C.accent,
  },
  ring2: {
    position: "absolute",
    width: 210, height: 210, borderRadius: 105,
    backgroundColor: C.accent,
  },
  svgArc: {
    position: "absolute",
  },
  innerCircle: {
    width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: C.accent,
    justifyContent: "center", alignItems: "center",
  },
  countText:  { fontSize: 64, fontWeight: "900", color: C.white, lineHeight: 70 },
  phaseText:  { fontSize: 18, fontWeight: "700", color: C.white, marginTop: 2 },
  idleText:   { fontSize: 22, fontWeight: "800", color: C.white },

  statsRow: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 40, gap: 24,
  },
  statDivider: { width: 1, height: 28, backgroundColor: C.muted },
  statLabel:   { fontSize: 16, fontWeight: "600", color: C.navyDark },
  statValue:   { fontSize: 16, fontWeight: "900", color: C.accent },

  btnRow: {
    flexDirection: "row", gap: 16,
    paddingHorizontal: 24, width: "100%",
  },
  startBtn: {
    flex: 1, height: 56, borderRadius: 30,
    backgroundColor: "#2B7FC0",
    justifyContent: "center", alignItems: "center",
  },
  resetBtn: {
    flex: 1, height: 56, borderRadius: 30,
    backgroundColor: C.white,
    justifyContent: "center", alignItems: "center",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.08)", elevation: 2,
  },
  startBtnText: { fontSize: 17, fontWeight: "800", color: C.white },
  resetBtnText: { fontSize: 17, fontWeight: "800", color: C.navyDark },
  stopBtn: {
    height: 56, borderRadius: 30,
    backgroundColor: "#DC2626",
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: 50,
  },
});
