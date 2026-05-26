import { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  useWindowDimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { supabase } from "../../utils/supabase";
import { tr } from "../../constants/appTranslations";
import { getTodaysMindChallenge } from "../../utils/daily";

const C = {
  navy:    "#1A2E6A",
  navyDark:"#111D44",
  white:   "#FFFFFF",
  bg:      "#EEF2F7",
  muted:   "#8A9BB0",
  accent:  "#37B1E6",
  border:  "#E4EBF2",
};

const WORD_PAIRS = [
  { left: 'Sun',    right: 'Light'    },
  { left: 'Apple',  right: 'Fruit'    },
  { left: 'River',  right: 'Water'    },
  { left: 'Doctor', right: 'Hospital' },
  { left: 'Sleep',  right: 'Rest'     },
  { left: 'Bird',   right: 'Sky'      },
  { left: 'Book',   right: 'Read'     },
  { left: 'Rain',   right: 'Cloud'    },
];

const QUIZ_Q = [
  { q: 'Who is the "Iron Man of India"?',      opts: ['Jawaharlal Nehru', 'Mahatma Gandhi', 'Sardar Patel', 'Subhas Bose'],    ans: 'Sardar Patel'        },
  { q: 'What is the national flower of India?', opts: ['Rose', 'Lotus', 'Jasmine', 'Marigold'],                                 ans: 'Lotus'               },
  { q: "Who wrote India's national anthem?",    opts: ['Bankim Chandra', 'Rabindranath Tagore', 'Subramania', 'Mirza Ghalib'], ans: 'Rabindranath Tagore' },
  { q: 'Which planet is nearest the Sun?',      opts: ['Earth', 'Venus', 'Mercury', 'Mars'],                                   ans: 'Mercury'             },
  { q: 'How many days are in a leap year?',     opts: ['365', '366', '364', '367'],                                            ans: '366'                 },
];

const COLOR_LIST = [
  { name: 'Red',    hex: '#E74C3C' },
  { name: 'Blue',   hex: '#3498DB' },
  { name: 'Green',  hex: '#2ECC71' },
  { name: 'Yellow', hex: '#F1C40F' },
  { name: 'Purple', hex: '#9B59B6' },
  { name: 'Orange', hex: '#E67E22' },
];

/* ── Game Illustrations ──────────────────────────────────── */

function NumberMemoryIllustration() {
  return (
    <View style={{ width: 100, height: 74, position: "relative" }}>
       <View style={[illus.numTile, { backgroundColor: "#9B59B6", top: 8, left: 0 }]}><Text style={illus.numText}>2</Text></View>
       <View style={[illus.numTile, { backgroundColor: "#F4A261", top: 28, left: 28 }]}><Text style={illus.numText}>1</Text></View>
       <View style={[illus.numTile, { backgroundColor: "#27AE60", top: 8, left: 56 }]}><Text style={illus.numText}>3</Text></View>
    </View>
  );
}

function WordMatchIllustration() {
  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: "row", gap: 3 }}>
        <View style={illus.wordTile}><Text style={illus.wordText}>C</Text></View>
        <View style={illus.wordTile}><Text style={illus.wordText}>O</Text></View>
        <View style={illus.wordTile}><Text style={illus.wordText}>N</Text></View>
      </View>
      <View style={{ flexDirection: "row", gap: 3 }}>
        <View style={illus.wordTile}><Text style={illus.wordText}>T</Text></View>
        <View style={illus.wordTile}><Text style={illus.wordText}>E</Text></View>
        <View style={illus.wordTile}><Text style={illus.wordText}>N</Text></View>
      </View>
    </View>
  );
}

function ColourRecallIllustration() {
  return (
    <View style={{ width: 80, height: 80, position: "relative" }}>
      <View style={[illus.colorDot, { backgroundColor: '#E74C3C', top: 0, left: 31 }]} />
      <View style={[illus.colorDot, { backgroundColor: '#3498DB', top: 31, left: 0 }]} />
      <View style={[illus.colorDot, { backgroundColor: '#2ECC71', top: 31, left: 62 }]} />
      <View style={[illus.colorDot, { backgroundColor: '#F1C40F', top: 62, left: 31 }]} />
      <View style={illus.colorCenter} />
    </View>
  );
}

function StoryQuizIllustration() {
  return (
    <View style={illus.phoneWrap}>
      <View style={illus.phoneInner}>
        <Text style={{ fontSize: 16 }}>❓</Text>
        <Text style={{ fontSize: 16 }}>✅</Text>
      </View>
    </View>
  );
}

const illus = StyleSheet.create({
  numTile: { position: "absolute", width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", elevation: 4 },
  numText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  wordTile: { width: 26, height: 26, borderRadius: 6, backgroundColor: "#B0BEC5", justifyContent: "center", alignItems: "center" },
  wordText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  colorDot: { position: "absolute", width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#fff" },
  colorCenter: { position: "absolute", width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", top: 26, left: 26 },
  phoneWrap: { width: 56, height: 76, borderRadius: 10, borderWidth: 3, borderColor: "#4CAF50", backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center" },
  phoneInner: { alignItems: "center", gap: 2 },
});

/* ── Quick Games (pure RN) ───────────────────────────────── */

const QUICK_GAMES = [
  { id: "reaction",     title: "Reaction Time", badge: "#E87C22", emoji: "⚡" },
  { id: "memory_tiles", title: "Memory Tiles",  badge: "#0BBDB6", emoji: "🧠" },
  { id: "typing_speed", title: "Typing Speed",  badge: "#7B3FC4", emoji: "⌨️" },
];

const TILE_EMOJIS = ['🍎','🍊','🍋','🍇','🍓','🫐','🥝','🍒'];
const TYPING_SENTENCES = [
  "The quick brown fox jumps over the lazy dog",
  "Health is wealth and happiness",
  "A stitch in time saves nine",
  "Practice makes a man perfect",
  "Every day is a new beginning",
];

/* ── Main Screen ─────────────────────────────────────────── */

export default function MindGamesScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, streak } = useAuth();
  const { colors: themeColors, language } = useLanguage();
  const t = tr(language);

  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [activeHtmlGame, setActiveHtmlGame] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myTotalScore, setMyTotalScore] = useState(0);
  const [loadingLb, setLoadingLb] = useState(true);

  const challenge = useMemo(() => getTodaysMindChallenge(), []);
  const cardW = (width - 16 * 2 - 12) / 2;

  useEffect(() => {
     loadLeaderboard();
     loadMyScore();
  }, [user]);

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('mind_games_scores')
        .select('user_id, score, profiles(full_name)')
        .order('score', { ascending: false });
      
      if (error) throw error;
      const users: Record<string, any> = {};
      data?.forEach(row => {
        if (!users[row.user_id]) {
          const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          users[row.user_id] = { name: prof?.full_name || "User", score: 0 };
        }
        users[row.user_id].score += row.score;
      });
      const lb = Object.entries(users).map(([id, u]: any) => ({ 
        id, ...u, 
        initial: u.name[0].toUpperCase(),
        color: ["#E8A87C", "#9B6FCC", "#5CB8B2", "#E87C22", "#0BBDB6"][Math.floor(Math.random()*5)]
      })).sort((a,b) => b.score - a.score).slice(0, 5);
      setLeaderboard(lb);
    } catch (e) { console.error(e); } finally { setLoadingLb(false); }
  };

  const loadMyScore = async () => {
    if (!user) return;
    const { data } = await supabase.from('mind_games_scores').select('score').eq('user_id', user.id);
    setMyTotalScore(data?.reduce((acc, curr) => acc + curr.score, 0) || 0);
  };

  const saveScore = async (type: string, score: number) => {
    if (!user) return;
    await supabase.from('mind_games_scores').insert({ user_id: user.id, game_type: type, score });
    loadMyScore(); loadLeaderboard();
  };

  const GAMES = [
    { id: "number_memory", title: "Number Memory", badgeBg: "#0BBDB6", illustration: <NumberMemoryIllustration /> },
    { id: "word_match",    title: "Word Match",    badgeBg: "#7B3FC4", illustration: <WordMatchIllustration /> },
    { id: "color_recall",  title: "Colour Recall", badgeBg: "#1B7A4A", illustration: <ColourRecallIllustration /> },
    { id: "story_quiz",    title: "Story Quiz",    badgeBg: "#E87C22", illustration: <StoryQuizIllustration /> },
  ];

  return (
    <View style={[s.root, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#1B3A5C", "#2B7FC0"]} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.backBtn}><Ionicons name="chevron-back" size={20} color={C.navyDark} /></Pressable>
        <Text style={s.headerTitle}>{t.mindGames}</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(80)} style={[s.card, { backgroundColor: themeColors.card }]}>
          <Text style={[s.cardLabel, { color: themeColors.muted }]}>{t.yourBrainHealth}</Text>
          <Text style={[s.cardBig, { color: themeColors.text }]}>{t.activateMind}</Text>
          <View style={s.statsRow}>
            <Stat n={myTotalScore} label={t.totalScore} />
            <View style={s.divider} />
            <Stat n={streak} label={t.streak} />
            <View style={s.divider} />
            <Stat n={leaderboard.findIndex(u => u.id === user?.id) + 1 || "--"} label={t.rank} />
            <View style={s.divider} />
            <Stat n={15}  label={t.timeMinutes} />
          </View>
        </Animated.View>
        <View style={s.secHeader}><Text style={[s.secTitle, { color: themeColors.text }]}>{t.todaysChallenge}</Text></View>
        <Animated.View entering={FadeInDown.delay(160)} style={[s.challengeCard, { backgroundColor: themeColors.card }]}>
           <Ionicons name="bulb" size={24} color="#F59E0B" />
           <Text style={s.challengeText}>{challenge}</Text>
        </Animated.View>
        <View style={s.secHeader}><Text style={[s.secTitle, { color: themeColors.text }]}>{t.playGames}</Text></View>
        <View style={s.gamesGrid}>
          {GAMES.map((g, i) => (
            <Animated.View key={g.id} entering={FadeInDown.delay(240 + i * 60)}>
              <Pressable style={[s.gameCard, { width: cardW, backgroundColor: themeColors.card }]} onPress={() => setActiveGame(g.id)}>
                <View style={[s.gameBadge, { backgroundColor: g.badgeBg }]}><Text style={s.gameBadgeText}>{g.title}</Text></View>
                <View style={s.gameIllus}>{g.illustration}</View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
        {/* ── Quick Games ── */}
        <View style={s.secHeader}><Text style={[s.secTitle, { color: themeColors.text }]}>{t.quickGames}</Text></View>
        <View style={s.gamesGrid}>
          {QUICK_GAMES.map((g, i) => (
            <Animated.View key={g.id} entering={FadeInDown.delay(420 + i * 60)}>
              <Pressable
                style={[s.gameCard, { width: cardW, backgroundColor: themeColors.card }]}
                onPress={() => setActiveHtmlGame(g.id)}
              >
                <View style={[s.gameBadge, { backgroundColor: g.badge }]}>
                  <Text style={s.gameBadgeText}>{g.title}</Text>
                </View>
                <View style={s.gameIllus}>
                  <Text style={{ fontSize: 44 }}>{g.emoji}</Text>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        <View style={s.secHeader}><Text style={[s.secTitle, { color: themeColors.text }]}>{t.leaderboard}</Text></View>
        <Animated.View entering={FadeInDown.delay(480)} style={[s.lbCard, { backgroundColor: themeColors.card }]}>
          {loadingLb ? <ActivityIndicator style={{ margin: 20 }} /> : 
            leaderboard.map((p, i) => (
              <View key={p.id} style={s.lbRow}>
                <View style={[s.lbAvatar, { backgroundColor: p.color }]}><Text style={s.lbInitial}>{p.initial}</Text></View>
                <View style={s.lbInfo}><Text style={[s.lbName, { color: themeColors.text }]}>{p.name}</Text><Text style={[s.lbSub, { color: themeColors.muted }]}>{p.score} pts</Text></View>
                <Text style={s.rankText}>#{i+1}</Text>
              </View>
            ))
          }
        </Animated.View>
      </ScrollView>
      {activeGame === "number_memory" && <NumberMemoryGame onClose={() => setActiveGame(null)} onWin={(s: number) => saveScore("number_memory", s)} />}
      {activeGame === "word_match" && <WordMatchGame onClose={() => setActiveGame(null)} onWin={(s: number) => saveScore("word_match", s)} />}
      {activeGame === "color_recall" && <ColorRecallGame onClose={() => setActiveGame(null)} onWin={(s: number) => saveScore("color_recall", s)} />}
      {activeGame === "story_quiz" && <StoryQuizGame onClose={() => setActiveGame(null)} onWin={(s: number) => saveScore("quiz", s)} />}
      {activeHtmlGame === "reaction" && <ReactionTimeGame onClose={() => setActiveHtmlGame(null)} onWin={(s: number) => saveScore("reaction", s)} />}
      {activeHtmlGame === "memory_tiles" && <MemoryTilesGame onClose={() => setActiveHtmlGame(null)} onWin={(s: number) => saveScore("memory_tiles", s)} />}
      {activeHtmlGame === "typing_speed" && <TypingSpeedGame onClose={() => setActiveHtmlGame(null)} onWin={(s: number) => saveScore("typing_speed", s)} />}
    </View>
  );
}

function NumberMemoryGame({ onClose, onWin }: any) {
  const [step, setStep] = useState<'show' | 'input'>('show');
  const [num, setNum] = useState("");
  const [input, setInput] = useState("");
  useEffect(() => {
    const val = Math.floor(1000 + Math.random() * 9000).toString();
    setNum(val);
    setTimeout(() => setStep('input'), 3000);
  }, []);
  const check = () => {
    if (input === num) { onWin(10); Alert.alert("Correct!", "+10 pts", [{ text: "Ok", onPress: onClose }]); }
    else { Alert.alert("Wrong", `It was ${num}`, [{ text: "Ok", onPress: onClose }]); }
  };
  return (
    <Modal transparent animationType="fade">
      <View style={game.overlay}><View style={game.content}>
          <Text style={game.title}>Number Memory</Text>
          {step === 'show' ? <Text style={game.bigNum}>{num}</Text> : <View style={{ width: '100%' }}>
              <TextInput style={game.input} keyboardType="number-pad" value={input} onChangeText={setInput} autoFocus maxLength={4} />
              <TouchableOpacity style={game.btn} onPress={check}><Text style={game.btnText}>Check</Text></TouchableOpacity>
            </View>}
          <TouchableOpacity style={game.close} onPress={onClose}><Ionicons name="close" size={24} color="#000" /></TouchableOpacity>
      </View></View>
    </Modal>
  );
}

function WordMatchGame({ onClose, onWin }: any) {
  const [gd] = useState(() => {
    const sel = [...WORD_PAIRS].sort(() => Math.random() - 0.5).slice(0, 4);
    return {
      pairs: sel,
      lefts:  sel.map(p => p.left).sort(() => Math.random() - 0.5),
      rights: sel.map(p => p.right).sort(() => Math.random() - 0.5),
    };
  });
  const [selL, setSelL] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  const pairRight = (l: string) => gd.pairs.find(p => p.left === l)?.right;
  const isDoneRight = (r: string) => done.some(l => pairRight(l) === r);

  const onRight = (r: string) => {
    if (!selL) return;
    if (pairRight(selL) === r) {
      const nd = [...done, selL];
      setDone(nd); setSelL(null);
      if (nd.length === gd.pairs.length) {
        onWin(20); Alert.alert('All Matched!', '+20 pts', [{ text: 'OK', onPress: onClose }]);
      }
    } else {
      Alert.alert('No match!', 'Try again.'); setSelL(null);
    }
  };

  return (
    <Modal transparent animationType="fade">
      <View style={game.overlay}><View style={game.content}>
        <TouchableOpacity style={game.close} onPress={onClose}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
        <Text style={game.title}>Word Match</Text>
        <Text style={game.subText}>{done.length}/{gd.pairs.length} matched · Tap left then right</Text>
        <View style={game.matchGrid}>
          <View style={{ flex: 1, gap: 8 }}>
            {gd.lefts.map(l => (
              <TouchableOpacity key={l} disabled={done.includes(l)} onPress={() => setSelL(l)}
                style={[game.matchBtn, done.includes(l) && { backgroundColor: '#D1FADF' }, selL === l && { backgroundColor: C.accent }]}>
                <Text style={[game.matchBtnText, done.includes(l) && { color: '#16A34A' }, selL === l && { color: '#fff' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            {gd.rights.map(r => (
              <TouchableOpacity key={r} disabled={isDoneRight(r)} onPress={() => onRight(r)}
                style={[game.matchBtn, isDoneRight(r) && { backgroundColor: '#D1FADF' }]}>
                <Text style={[game.matchBtnText, isDoneRight(r) && { color: '#16A34A' }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View></View>
    </Modal>
  );
}

function ColorRecallGame({ onClose, onWin }: any) {
  const [gd] = useState(() => {
    const cols = [...COLOR_LIST].sort(() => Math.random() - 0.5).slice(0, 4);
    const tgt  = Math.floor(Math.random() * 4);
    const correct = cols[tgt];
    const opts = [...COLOR_LIST.filter(c => c.name !== correct.name)]
      .sort(() => Math.random() - 0.5).slice(0, 3);
    opts.push(correct);
    return { cols, tgt, opts: opts.sort(() => Math.random() - 0.5) };
  });
  const [phase, setPhase] = useState<'show' | 'recall'>('show');
  const [secs, setSecs]   = useState(4);

  useEffect(() => {
    if (phase !== 'show') return;
    const t = setInterval(() => {
      setSecs((s: number) => {
        if (s <= 1) { clearInterval(t); setPhase('recall'); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const guess = (name: string) => {
    if (name === gd.cols[gd.tgt].name) {
      onWin(15); Alert.alert('Correct! ✓', '+15 pts', [{ text: 'OK', onPress: onClose }]);
    } else {
      Alert.alert('Wrong!', `It was ${gd.cols[gd.tgt].name}`, [{ text: 'OK', onPress: onClose }]);
    }
  };

  return (
    <Modal transparent animationType="fade">
      <View style={game.overlay}><View style={game.content}>
        <TouchableOpacity style={game.close} onPress={onClose}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
        <Text style={game.title}>Colour Recall</Text>
        {phase === 'show' ? (
          <>
            <Text style={game.subText}>Memorize these colors! ({secs}s)</Text>
            <View style={game.colorGrid}>
              {gd.cols.map((c, i) => (
                <View key={i} style={game.colorItem}>
                  <View style={[game.colorBox, { backgroundColor: c.hex, width: 68, height: 68 }]} />
                  <Text style={game.spotLabel}>Spot {i + 1}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={game.subText}>Which color was in Spot {gd.tgt + 1}?</Text>
            <View style={game.colorGrid}>
              {gd.opts.map(c => (
                <TouchableOpacity key={c.name} onPress={() => guess(c.name)} style={game.colorItem}>
                  <View style={[game.colorBox, { backgroundColor: c.hex, width: 68, height: 68 }]} />
                  <Text style={game.spotLabel}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View></View>
    </Modal>
  );
}

function StoryQuizGame({ onClose, onWin }: any) {
  const [idx,      setIdx]      = useState(0);
  const [score,    setScore]    = useState(0);
  const [pick,     setPick]     = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const q = QUIZ_Q[idx];

  const answer = (opt: string) => {
    if (pick) return;
    setPick(opt);
    const ns = opt === q.ans ? score + 10 : score;
    setScore(ns);
    setTimeout(() => {
      if (idx + 1 >= QUIZ_Q.length) { setFinished(true); onWin(ns); }
      else { setIdx(idx + 1); setPick(null); }
    }, 900);
  };

  return (
    <Modal transparent animationType="fade">
      <View style={game.overlay}><View style={game.content}>
        <TouchableOpacity style={game.close} onPress={onClose}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
        {finished ? (
          <>
            <Text style={game.title}>Quiz Done!</Text>
            <Text style={game.bigNum}>{score}</Text>
            <Text style={game.subText}>points earned</Text>
            <TouchableOpacity style={[game.btn, { marginTop: 20, width: '100%' }]} onPress={onClose}>
              <Text style={game.btnText}>Finish</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={game.subText}>Q {idx + 1} / {QUIZ_Q.length}</Text>
            <Text style={[game.title, { fontSize: 16, lineHeight: 22, marginBottom: 20 }]}>{q.q}</Text>
            <View style={{ gap: 10, width: '100%' }}>
              {q.opts.map(opt => {
                let bg = '#F0F4F8', txtC = C.navyDark;
                if (pick) {
                  if (opt === q.ans)  { bg = '#D1FADF'; txtC = '#16A34A'; }
                  else if (opt === pick) { bg = '#FECACA'; txtC = '#DC2626'; }
                }
                return (
                  <TouchableOpacity key={opt} disabled={!!pick} onPress={() => answer(opt)}
                    style={[game.btn, { backgroundColor: bg }]}>
                    <Text style={[game.btnText, { color: txtC }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View></View>
    </Modal>
  );
}

/* ── Reaction Time Game ──────────────────────────────────── */

function ReactionTimeGame({ onClose, onWin }: any) {
  const [phase, setPhase] = useState<'wait' | 'go' | 'early' | 'done'>('wait');
  const [result, setResult] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);

  const scheduleGo = () => {
    setPhase('wait');
    const delay = 1500 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      startRef.current = Date.now();
      setPhase('go');
    }, delay);
  };

  useEffect(() => {
    scheduleGo();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleTap = () => {
    if (phase === 'wait') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase('early');
      setTimeout(scheduleGo, 1200);
    } else if (phase === 'go') {
      const rt = Date.now() - startRef.current;
      setResult(rt);
      setPhase('done');
      onWin(rt < 300 ? 20 : rt < 500 ? 10 : 5);
    } else if (phase === 'done') {
      scheduleGo();
    }
  };

  const boxColor = phase === 'go' ? '#22C55E' : phase === 'early' ? '#F59E0B' : '#EF4444';
  const boxLabel = phase === 'go' ? 'TAP!' : phase === 'early' ? 'Too Early!' : phase === 'done' ? `${result}ms` : 'Wait…';
  const msg = phase === 'done'
    ? (result < 250 ? '⚡ Excellent!' : result < 400 ? '👍 Good!' : '💪 Keep practicing!')
    : phase === 'early' ? 'Wait for GREEN before tapping'
    : 'Tap when the box turns GREEN';

  return (
    <Modal transparent animationType="fade">
      <View style={game.overlay}><View style={game.content}>
        <TouchableOpacity style={game.close} onPress={onClose}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
        <Text style={game.title}>Reaction Time</Text>
        <Text style={game.subText}>{msg}</Text>
        <TouchableOpacity onPress={handleTap} style={[reactionS.box, { backgroundColor: boxColor }]}>
          <Text style={reactionS.boxLabel}>{boxLabel}</Text>
        </TouchableOpacity>
        {phase === 'done' && (
          <TouchableOpacity style={[game.btn, { marginTop: 16, width: '100%' }]} onPress={scheduleGo}>
            <Text style={game.btnText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View></View>
    </Modal>
  );
}

const reactionS = StyleSheet.create({
  box: { width: 180, height: 180, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginVertical: 20 },
  boxLabel: { fontSize: 26, fontWeight: '900', color: '#fff' },
});

/* ── Memory Tiles Game ───────────────────────────────────── */

function MemoryTilesGame({ onClose, onWin }: any) {
  const [tiles, setTiles] = useState(() =>
    [...TILE_EMOJIS, ...TILE_EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const matchedCount = tiles.filter(t => t.matched).length;

  const flip = (id: number) => {
    if (locked) return;
    const tile = tiles.find(t => t.id === id);
    if (!tile || tile.flipped || tile.matched) return;
    const next = tiles.map(t => t.id === id ? { ...t, flipped: true } : t);
    setTiles(next);
    const newSel = [...selected, id];
    if (newSel.length === 2) {
      setLocked(true);
      const [a, b] = newSel.map(sid => next.find(t => t.id === sid)!);
      setTimeout(() => {
        if (a.emoji === b.emoji) {
          setTiles(prev => prev.map(t => newSel.includes(t.id) ? { ...t, matched: true } : t));
          if (matchedCount + 2 === tiles.length) onWin(30);
        } else {
          setTiles(prev => prev.map(t => newSel.includes(t.id) ? { ...t, flipped: false } : t));
        }
        setSelected([]);
        setLocked(false);
      }, 800);
    } else {
      setSelected(newSel);
    }
  };

  return (
    <Modal transparent animationType="fade">
      <View style={game.overlay}><View style={[game.content, { paddingHorizontal: 16 }]}>
        <TouchableOpacity style={game.close} onPress={onClose}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
        <Text style={game.title}>Memory Tiles</Text>
        <Text style={game.subText}>{matchedCount / 2}/{TILE_EMOJIS.length} pairs matched</Text>
        {matchedCount === tiles.length ? (
          <>
            <Text style={game.bigNum}>🎉</Text>
            <Text style={[game.subText, { fontSize: 16 }]}>All matched! +30 pts</Text>
            <TouchableOpacity style={[game.btn, { marginTop: 16, width: '100%' }]} onPress={onClose}>
              <Text style={game.btnText}>Finish</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={tilesS.grid}>
            {tiles.map(t => (
              <TouchableOpacity key={t.id} onPress={() => flip(t.id)} disabled={t.matched || t.flipped}
                style={[tilesS.tile, t.matched && tilesS.matched, t.flipped && !t.matched && tilesS.flipped]}>
                <Text style={tilesS.emoji}>{t.flipped || t.matched ? t.emoji : '?'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View></View>
    </Modal>
  );
}

const tilesS = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  tile: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#1F3A6E', justifyContent: 'center', alignItems: 'center' },
  flipped: { backgroundColor: '#37B1E6' },
  matched: { backgroundColor: '#22C55E' },
  emoji: { fontSize: 24 },
});

/* ── Typing Speed Game ───────────────────────────────────── */

function TypingSpeedGame({ onClose, onWin }: any) {
  const [sentence] = useState(() => TYPING_SENTENCES[Math.floor(Math.random() * TYPING_SENTENCES.length)]);
  const [input, setInput] = useState('');
  const startRef = useRef<number | null>(null);
  const [done, setDone] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const handleChange = (text: string) => {
    if (done) return;
    if (!startRef.current) startRef.current = Date.now();
    setInput(text);
    if (text === sentence) {
      const sec = (Date.now() - startRef.current) / 1000;
      const calcWpm = Math.round((sentence.split(' ').length / sec) * 60);
      setWpm(calcWpm);
      setElapsed(parseFloat(sec.toFixed(1)));
      setDone(true);
      onWin(calcWpm >= 30 ? 20 : calcWpm >= 15 ? 10 : 5);
    }
  };

  return (
    <Modal transparent animationType="fade">
      <View style={game.overlay}><View style={game.content}>
        <TouchableOpacity style={game.close} onPress={onClose}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
        <Text style={game.title}>Typing Speed</Text>
        <View style={typingS.prompt}>
          <Text style={typingS.promptText}>{sentence}</Text>
        </View>
        {done ? (
          <>
            <Text style={game.bigNum}>{wpm} WPM</Text>
            <Text style={game.subText}>Done in {elapsed}s · {wpm >= 30 ? 'Excellent!' : wpm >= 15 ? 'Good!' : 'Keep practicing!'}</Text>
            <TouchableOpacity style={[game.btn, { marginTop: 16, width: '100%' }]} onPress={onClose}>
              <Text style={game.btnText}>Finish</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TextInput style={typingS.input} value={input} onChangeText={handleChange}
            placeholder="Type the sentence above…" placeholderTextColor={C.muted}
            autoFocus multiline />
        )}
      </View></View>
    </Modal>
  );
}

const typingS = StyleSheet.create({
  prompt: { backgroundColor: '#F0F4F8', borderRadius: 14, padding: 16, marginBottom: 16, width: '100%' },
  promptText: { fontSize: 16, fontWeight: '700', color: C.navyDark, lineHeight: 24 },
  input: { width: '100%', borderRadius: 14, padding: 14, fontSize: 15, backgroundColor: '#F0F4F8', color: C.navyDark, borderWidth: 2, borderColor: C.accent, minHeight: 80, textAlignVertical: 'top' },
});

function Stat({ n, label }: any) {
  return <View style={s.statItem}><Text style={s.statN}>{n}</Text><Text style={s.statLabel}>{label}</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 18, gap: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.white, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: C.white },
  scroll: { paddingTop: 16 },
  card: { backgroundColor: C.white, marginHorizontal: 16, marginBottom: 20, borderRadius: 22, padding: 20, elevation: 3 },
  cardLabel: { fontSize: 13, fontWeight: "600", color: C.muted },
  cardBig:   { fontSize: 28, fontWeight: "900", color: C.navyDark, marginTop: 4 },
  statsRow:  { flexDirection: "row", alignItems: "center", marginTop: 20 },
  statItem:  { flex: 1, alignItems: "center" },
  statN:     { fontSize: 18, fontWeight: "900", color: C.accent },
  statLabel: { fontSize: 9, fontWeight: "600", color: C.muted, marginTop: 3 },
  divider:   { width: 1, height: 30, backgroundColor: "#D8E4EC" },
  secHeader: { paddingHorizontal: 16, marginBottom: 12 },
  secTitle: { fontSize: 18, fontWeight: "900", color: C.navyDark },
  challengeCard: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 20, borderRadius: 22, padding: 20, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  challengeText: { flex: 1, fontSize: 15, fontWeight: "700", color: C.navyDark },
  gamesGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 16, gap: 12, marginBottom: 20 },
  gameCard: { backgroundColor: C.white, borderRadius: 20, padding: 14, elevation: 3, minHeight: 148 },
  gameBadge: { alignSelf: "flex-start", borderRadius: 30, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  gameBadgeText: { color: C.white, fontSize: 12, fontWeight: "800" },
  gameIllus: { flex: 1, alignItems: "center", justifyContent: "center" },
  lbCard: { backgroundColor: C.white, marginHorizontal: 16, borderRadius: 22, elevation: 3, overflow: "hidden" },
  lbRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14 },
  lbAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12 },
  lbInitial: { color: C.white, fontSize: 16, fontWeight: "900" },
  lbInfo:    { flex: 1 },
  lbName:    { fontSize: 15, fontWeight: "800", color: C.navyDark },
  lbSub:     { fontSize: 12, fontWeight: "500", color: C.muted },
  rankText:  { fontSize: 16, fontWeight: "900", color: C.accent },
});

const game = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  content: { backgroundColor: '#fff', borderRadius: 30, padding: 30, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: C.navyDark, marginBottom: 20 },
  bigNum: { fontSize: 48, fontWeight: '900', color: C.accent, marginBottom: 10 },
  input: { borderBottomWidth: 2, borderBottomColor: C.accent, width: '100%', fontSize: 32, textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: C.accent, paddingVertical: 15, borderRadius: 30, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  close: { position: 'absolute', top: 20, right: 20 },
  colorBox:     { width: 100, height: 100, borderRadius: 20, marginBottom: 20 },
  subText:      { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 12, textAlign: 'center' },
  colorGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%', marginBottom: 10 },
  colorItem:    { alignItems: 'center', gap: 6 },
  spotLabel:    { fontSize: 11, fontWeight: '700', color: C.navyDark },
  matchGrid:    { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  matchBtn:     { backgroundColor: '#F0F4F8', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  matchBtnText: { fontWeight: '800', color: C.navyDark, fontSize: 13 },
});
