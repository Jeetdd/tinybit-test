import { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import CountryPickerModal from "../../components/CountryPickerModal";
import { DEFAULT_COUNTRY, type Country } from "../../constants/countries";
import { getCountryLanguages, type LangOption } from "../../constants/countryLanguages";
import { useLanguage, type Language } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../utils/supabase";
import { buildFullName } from "../../utils/profileName";

// ── Inline translations ──────────────────────────────────────────────────────
type ScreenT = {
  title: string; subtitle: string;
  age?: string;
  whereFrom: string; whichLang: string;
  bioSex: string; male: string; female: string;
  howTall: string; currentWeight: string;
  bloodGroup: string;
  emergencyContact: string; relationWithContact: string;
  medicalConditions: string; otherCondition: string;
  currentMedications: string; addMedication: string;
  medName: string; dosage: string; timing: string;
  doctorName: string; doctorContact: string;
  relSpouse: string; relSon: string; relDaughter: string;
  relParent: string; relSibling: string; relFriend: string; relOther: string;
  next: string; pleaseWait: string;
};

const T: Record<Language, ScreenT> = {
  English: {
    title: "Tell Us About You",
    subtitle: "Your answers help us personalise your journey\nand create a better experience.",
    age: "How old are you ?",
    whereFrom: "Where are you from ?",
    whichLang: "Which language do you prefer to speak in ?",
    bioSex: "What's your biological sex ?",
    male: "Male", female: "Female",
    howTall: "How tall are you ?", currentWeight: "What's your current weight ?",
    bloodGroup: "Blood Group",
    emergencyContact: "Emergency Contact Number",
    relationWithContact: "Relation with Emergency Contact",
    medicalConditions: "Medical Conditions",
    otherCondition: "Describe other condition...",
    currentMedications: "Current Medications",
    addMedication: "+ Add Medication",
    medName: "Medicine Name", dosage: "Dosage (e.g. 500mg)", timing: "Timing (e.g. Morning)",
    doctorName: "Doctor's Name", doctorContact: "Doctor's Contact Number",
    relSpouse: "Spouse", relSon: "Son", relDaughter: "Daughter",
    relParent: "Parent", relSibling: "Sibling", relFriend: "Friend", relOther: "Other",
    next: "Next", pleaseWait: "Please wait...",
  },
  "हिंदी": {
    title: "अपने बारे में बताएं",
    subtitle: "आपके उत्तर हमें आपकी यात्रा को बेहतर\nबनाने में मदद करते हैं।",
    age: "आपकी उम्र क्या है?",
    whereFrom: "आप कहाँ से हैं?", whichLang: "आप किस भाषा में बात करना पसंद करते हैं?",
    bioSex: "आपका जैविक लिंग क्या है?", male: "पुरुष", female: "महिला",
    howTall: "आपकी लंबाई कितनी है?", currentWeight: "आपका वर्तमान वजन क्या है?",
    bloodGroup: "रक्त समूह",
    emergencyContact: "आपातकालीन संपर्क नंबर",
    relationWithContact: "आपातकालीन संपर्क से संबंध",
    medicalConditions: "चिकित्सीय स्थितियाँ",
    otherCondition: "अन्य स्थिति बताएं...",
    currentMedications: "वर्तमान दवाएं", addMedication: "+ दवा जोड़ें",
    medName: "दवा का नाम", dosage: "खुराक (जैसे 500mg)", timing: "समय (जैसे सुबह)",
    doctorName: "डॉक्टर का नाम", doctorContact: "डॉक्टर का संपर्क नंबर",
    relSpouse: "पति/पत्नी", relSon: "पुत्र", relDaughter: "पुत्री",
    relParent: "माता-पिता", relSibling: "भाई-बहन", relFriend: "मित्र", relOther: "अन्य",
    next: "आगे", pleaseWait: "कृपया प्रतीक्षा करें...",
  },
  "ગુજરાતી": {
    title: "તમારા વિશે જણાવો",
    subtitle: "તમારા જવાબો અમને તમારી યાત્રાને\nવ્યક્તિગત બનાવવામાં મદદ કરે છે।",
    age: "તમારી ઉંમર કેટલી છે?",
    whereFrom: "તમે ક્યાંથી છો?", whichLang: "તમે કઈ ભાષામાં વાત કરવાનું પસંદ કરો છો?",
    bioSex: "તમારું જૈવિક લિંગ શું છે?", male: "પુરુષ", female: "સ્ત્રી",
    howTall: "તમારી ઊંચાઈ કેટલી છે?", currentWeight: "તમારું હાલનું વજન શું છે?",
    bloodGroup: "લોહીનો ગ્રૂપ",
    emergencyContact: "કટોકટી સંપર્ક નંબર",
    relationWithContact: "કટોકટી સંપર્ક સાથે સંબંધ",
    medicalConditions: "તબીબી સ્થિતિઓ",
    otherCondition: "અન્ય સ્થિતિ વર્ણવો...",
    currentMedications: "વર્તમાન દવાઓ", addMedication: "+ દવા ઉમેરો",
    medName: "દવાનું નામ", dosage: "ડોઝ (દા.ત. 500mg)", timing: "સમય (દા.ત. સવારે)",
    doctorName: "ડૉક્ટરનું નામ", doctorContact: "ડૉક્ટરનો સંપર્ક નંબર",
    relSpouse: "જીવનસાથી", relSon: "પુત્ર", relDaughter: "પુત્રી",
    relParent: "માતા-પિતા", relSibling: "ભાઈ-બહેન", relFriend: "મિત્ર", relOther: "અન્ય",
    next: "આગળ", pleaseWait: "કૃपા રાહ જુઓ...",
  },
  "தமிழ்": {
    title: "உங்களைப் பற்றி சொல்லுங்கள்",
    subtitle: "உங்கள் பதில்கள் உங்கள் பயணத்தை\nதனிப்பயனாக்க உதவுகின்றன.",
    age: "உங்கள் வயது என்ன?",
    whereFrom: "நீங்கள் எங்கிருந்து வருகிறீர்கள்?", whichLang: "நீங்கள் எந்த மொழியில் பேச விரும்புகிறீர்கள்?",
    bioSex: "உங்கள் உயிரியல் பாலினம் என்ன?", male: "ஆண்", female: "பெண்",
    howTall: "நீங்கள் எவ்வளவு உயரம்?", currentWeight: "உங்கள் தற்போதைய எடை என்ன?",
    bloodGroup: "இரத்த வகை",
    emergencyContact: "அவசர தொடர்பு எண்",
    relationWithContact: "அவசர தொடர்பு உறவு",
    medicalConditions: "மருத்துவ நிலைகள்",
    otherCondition: "மற்ற நிலையை விவரிக்கவும்...",
    currentMedications: "தற்போதைய மருந்துகள்", addMedication: "+ மருந்து சேர்",
    medName: "மருந்து பெயர்", dosage: "அளவு (எ.கா. 500mg)", timing: "நேரம் (எ.கா. காலை)",
    doctorName: "மருத்துவர் பெயர்", doctorContact: "மருத்துவர் தொடர்பு எண்",
    relSpouse: "வாழ்க்கைத் துணை", relSon: "மகன்", relDaughter: "மகள்",
    relParent: "பெற்றோர்", relSibling: "உடன்பிறந்தவர்", relFriend: "நண்பர்", relOther: "மற்றவர்",
    next: "அடுத்து", pleaseWait: "காத்திருங்கள்...",
  },
  "বাংলা": {
    title: "আপনার সম্পর্কে বলুন",
    subtitle: "আপনার উত্তরগুলি আমাদের আপনার যাত্রা\nব্যক্তিগতকৃত করতে সাহায্য করে।",
    age: "আপনার বয়স কত?",
    whereFrom: "আপনি কোথা থেকে এসেছেন?", whichLang: "আপনি কোন ভাষায় কথা বলতে পছন্দ করেন?",
    bioSex: "আপনার জৈবিক লিঙ্গ কী?", male: "পুরুষ", female: "মহিলা",
    howTall: "আপনি কতটা লম্বা?", currentWeight: "আপনার বর্তমান ওজন কত?",
    bloodGroup: "রক্তের গ্রুপ",
    emergencyContact: "জরুরি যোগাযোগ নম্বর",
    relationWithContact: "জরুরি যোগাযোগের সাথে সম্পর্ক",
    medicalConditions: "চিকিৎসাগত অবস্থা",
    otherCondition: "অন্য অবস্থা বর্ণনা করুন...",
    currentMedications: "বর্তমান ওষুধ", addMedication: "+ ওষুধ যোগ করুন",
    medName: "ওষুধের নাম", dosage: "ডোজ (যেমন 500mg)", timing: "সময় (যেমন সকাল)",
    doctorName: "ডাক্তারের নাম", doctorContact: "ডাক্তারের যোগাযোগ নম্বর",
    relSpouse: "স্বামী/স্ত্রী", relSon: "ছেলে", relDaughter: "মেয়ে",
    relParent: "বাবা-মা", relSibling: "ভাই-বোন", relFriend: "বন্ধু", relOther: "অন্য",
    next: "পরবর্তী", pleaseWait: "অনুগ্রহ করে অপেক্ষা করুন...",
  },
  "मराठी": {
    title: "तुमच्याबद्दल सांगा",
    subtitle: "तुमच्या उत्तरांमुळे आम्हाला तुमचा प्रवास\nवैयक्तिकृत करण्यात मदत होते.",
    age: "तुमचे वय किती आहे?",
    whereFrom: "तुम्ही कुठून आहात?", whichLang: "तुम्हाला कोणत्या भाषेत बोलणे आवडते?",
    bioSex: "तुमचे जैविक लिंग काय आहे?", male: "पुरुष", female: "महिला",
    howTall: "तुमची उंची किती आहे?", currentWeight: "तुमचे सध्याचे वजन काय आहे?",
    bloodGroup: "रक्तगट",
    emergencyContact: "आणीबाणी संपर्क क्रमांक",
    relationWithContact: "आणीबाणी संपर्काशी नाते",
    medicalConditions: "वैद्यकीय स्थिती",
    otherCondition: "इतर स्थिती सांगा...",
    currentMedications: "सध्याची औषधे", addMedication: "+ औषध जोडा",
    medName: "औषधाचे नाव", dosage: "मात्रा (उदा. 500mg)", timing: "वेळ (उदा. सकाळी)",
    doctorName: "डॉक्टरचे नाव", doctorContact: "डॉक्टरचा संपर्क क्रमांक",
    relSpouse: "पती/पत्नी", relSon: "मुलगा", relDaughter: "मुलगी",
    relParent: "आई-बाबा", relSibling: "भाऊ-बहीण", relFriend: "मित्र", relOther: "इतर",
    next: "पुढे", pleaseWait: "कृपया प्रतीक्षा करा...",
  },
  Español: {
    title: "Cuéntanos Sobre Ti",
    subtitle: "Tus respuestas nos ayudan a personalizar\ntu viaje y crear una mejor experiencia.",
    whereFrom: "¿De dónde eres?", whichLang: "¿Qué idioma prefieres hablar?",
    bioSex: "¿Cuál es tu sexo biológico?", male: "Masculino", female: "Femenino",
    howTall: "¿Cuánto mides?", currentWeight: "¿Cuál es tu peso actual?",
    bloodGroup: "Grupo Sanguíneo",
    emergencyContact: "Número de Contacto de Emergencia",
    relationWithContact: "Relación con el Contacto de Emergencia",
    medicalConditions: "Condiciones Médicas",
    otherCondition: "Describir otra condición...",
    currentMedications: "Medicamentos Actuales", addMedication: "+ Agregar Medicamento",
    medName: "Nombre del Medicamento", dosage: "Dosis (ej. 500mg)", timing: "Horario (ej. Mañana)",
    doctorName: "Nombre del Médico", doctorContact: "Número de Contacto del Médico",
    relSpouse: "Cónyuge", relSon: "Hijo", relDaughter: "Hija",
    relParent: "Padre/Madre", relSibling: "Hermano/a", relFriend: "Amigo/a", relOther: "Otro",
    next: "Siguiente", pleaseWait: "Por favor espera...",
  },
  Français: {
    title: "Parlez-nous de vous",
    subtitle: "Vos réponses nous aident à personnaliser\nvotre parcours et créer une meilleure expérience.",
    whereFrom: "D'où venez-vous ?", whichLang: "Quelle langue préférez-vous parler ?",
    bioSex: "Quel est votre sexe biologique ?", male: "Masculin", female: "Féminin",
    howTall: "Quelle est votre taille ?", currentWeight: "Quel est votre poids actuel ?",
    bloodGroup: "Groupe Sanguin",
    emergencyContact: "Numéro de Contact d'Urgence",
    relationWithContact: "Relation avec le Contact d'Urgence",
    medicalConditions: "Conditions Médicales",
    otherCondition: "Décrire une autre condition...",
    currentMedications: "Médicaments Actuels", addMedication: "+ Ajouter un Médicament",
    medName: "Nom du Médicament", dosage: "Dosage (ex. 500mg)", timing: "Horaire (ex. Matin)",
    doctorName: "Nom du Médecin", doctorContact: "Numéro de Contact du Médecin",
    relSpouse: "Conjoint(e)", relSon: "Fils", relDaughter: "Fille",
    relParent: "Parent", relSibling: "Frère/Sœur", relFriend: "Ami(e)", relOther: "Autre",
    next: "Suivant", pleaseWait: "Veuillez patienter...",
  },
  Português: {
    title: "Conte-nos Sobre Você",
    subtitle: "Suas respostas nos ajudam a personalizar\nsua jornada e criar uma melhor experiência.",
    whereFrom: "De onde você é?", whichLang: "Qual idioma você prefere falar?",
    bioSex: "Qual é o seu sexo biológico?", male: "Masculino", female: "Feminino",
    howTall: "Qual é a sua altura?", currentWeight: "Qual é o seu peso atual?",
    bloodGroup: "Tipo Sanguíneo",
    emergencyContact: "Número de Contato de Emergência",
    relationWithContact: "Relação com o Contato de Emergência",
    medicalConditions: "Condições Médicas",
    otherCondition: "Descrever outra condição...",
    currentMedications: "Medicamentos Atuais", addMedication: "+ Adicionar Medicamento",
    medName: "Nome do Medicamento", dosage: "Dosagem (ex. 500mg)", timing: "Horário (ex. Manhã)",
    doctorName: "Nome do Médico", doctorContact: "Número de Contato do Médico",
    relSpouse: "Cônjuge", relSon: "Filho", relDaughter: "Filha",
    relParent: "Pai/Mãe", relSibling: "Irmão/Irmã", relFriend: "Amigo/a", relOther: "Outro",
    next: "Próximo", pleaseWait: "Por favor aguarde...",
  },
  Deutsch: {
    title: "Erzählen Sie uns von sich",
    subtitle: "Ihre Antworten helfen uns, Ihre Reise\nzu personalisieren und ein besseres Erlebnis zu schaffen.",
    whereFrom: "Woher kommen Sie?", whichLang: "Welche Sprache sprechen Sie bevorzugt?",
    bioSex: "Was ist Ihr biologisches Geschlecht?", male: "Männlich", female: "Weiblich",
    howTall: "Wie groß sind Sie?", currentWeight: "Was ist Ihr aktuelles Gewicht?",
    bloodGroup: "Blutgruppe",
    emergencyContact: "Notfallkontakt-Nummer",
    relationWithContact: "Beziehung zum Notfallkontakt",
    medicalConditions: "Medizinische Erkrankungen",
    otherCondition: "Andere Erkrankung beschreiben...",
    currentMedications: "Aktuelle Medikamente", addMedication: "+ Medikament hinzufügen",
    medName: "Medikamentenname", dosage: "Dosierung (z.B. 500mg)", timing: "Einnahmezeit (z.B. Morgens)",
    doctorName: "Name des Arztes", doctorContact: "Kontaktnummer des Arztes",
    relSpouse: "Ehepartner/in", relSon: "Sohn", relDaughter: "Tochter",
    relParent: "Elternteil", relSibling: "Geschwister", relFriend: "Freund/in", relOther: "Andere",
    next: "Weiter", pleaseWait: "Bitte warten...",
  },
  "العربية": {
    title: "أخبرنا عنك",
    subtitle: "تساعدنا إجاباتك على تخصيص رحلتك\nوخلق تجربة أفضل.",
    whereFrom: "من أين أنت؟", whichLang: "ما اللغة التي تفضل التحدث بها؟",
    bioSex: "ما جنسك البيولوجي؟", male: "ذكر", female: "أنثى",
    howTall: "ما طولك؟", currentWeight: "ما وزنك الحالي؟",
    bloodGroup: "فصيلة الدم",
    emergencyContact: "رقم جهة الاتصال الطارئة",
    relationWithContact: "العلاقة بجهة الاتصال الطارئة",
    medicalConditions: "الحالات الطبية",
    otherCondition: "صف حالة أخرى...",
    currentMedications: "الأدوية الحالية", addMedication: "+ إضافة دواء",
    medName: "اسم الدواء", dosage: "الجرعة (مثل 500mg)", timing: "وقت التناول (مثل الصباح)",
    doctorName: "اسم الطبيب", doctorContact: "رقم تواصل الطبيب",
    relSpouse: "الزوج/الزوجة", relSon: "الابن", relDaughter: "الابنة",
    relParent: "الوالد/الوالدة", relSibling: "الأخ/الأخت", relFriend: "صديق/صديقة", relOther: "آخر",
    next: "التالي", pleaseWait: "يرجى الانتظار...",
  },
  "日本語": {
    title: "自己紹介",
    subtitle: "あなたの回答は、旅をパーソナライズし\nより良い体験を作るのに役立ちます。",
    whereFrom: "どこから来ましたか？", whichLang: "どの言語を話すことを好みますか？",
    bioSex: "あなたの生物学的性別は？", male: "男性", female: "女性",
    howTall: "身長はどのくらいですか？", currentWeight: "現在の体重は？",
    bloodGroup: "血液型",
    emergencyContact: "緊急連絡先番号",
    relationWithContact: "緊急連絡先との関係",
    medicalConditions: "医療状態",
    otherCondition: "その他の状態を説明...",
    currentMedications: "現在の薬", addMedication: "+ 薬を追加",
    medName: "薬の名前", dosage: "用量 (例: 500mg)", timing: "服用時間 (例: 朝)",
    doctorName: "医師名", doctorContact: "医師の連絡先番号",
    relSpouse: "配偶者", relSon: "息子", relDaughter: "娘",
    relParent: "親", relSibling: "兄弟/姉妹", relFriend: "友人", relOther: "その他",
    next: "次へ", pleaseWait: "お待ちください...",
  },
  "中文": {
    title: "告诉我们关于您",
    subtitle: "您的回答帮助我们个性化您的旅程\n并创造更好的体验。",
    whereFrom: "您来自哪里？", whichLang: "您更喜欢用哪种语言交流？",
    bioSex: "您的生理性别是？", male: "男性", female: "女性",
    howTall: "您有多高？", currentWeight: "您目前的体重是多少？",
    bloodGroup: "血型",
    emergencyContact: "紧急联系电话",
    relationWithContact: "与紧急联系人的关系",
    medicalConditions: "医疗状况",
    otherCondition: "描述其他状况...",
    currentMedications: "目前用药", addMedication: "+ 添加药物",
    medName: "药物名称", dosage: "剂量 (如 500mg)", timing: "服药时间 (如 早晨)",
    doctorName: "医生姓名", doctorContact: "医生联系电话",
    relSpouse: "配偶", relSon: "儿子", relDaughter: "女儿",
    relParent: "父母", relSibling: "兄弟姐妹", relFriend: "朋友", relOther: "其他",
    next: "下一步", pleaseWait: "请稍候...",
  },
  "한국어": {
    title: "자기소개",
    subtitle: "귀하의 답변은 여정을 개인화하고\n더 나은 경험을 만드는 데 도움이 됩니다.",
    whereFrom: "어디서 오셨나요?", whichLang: "어떤 언어를 선호하시나요?",
    bioSex: "생물학적 성별은 무엇인가요?", male: "남성", female: "여성",
    howTall: "키가 얼마나 되시나요?", currentWeight: "현재 몸무게는 얼마나 되시나요?",
    bloodGroup: "혈액형",
    emergencyContact: "비상 연락처 번호",
    relationWithContact: "비상 연락처와의 관계",
    medicalConditions: "의학적 상태",
    otherCondition: "다른 상태 설명...",
    currentMedications: "현재 복용 약물", addMedication: "+ 약물 추가",
    medName: "약물 이름", dosage: "용량 (예: 500mg)", timing: "복용 시간 (예: 아침)",
    doctorName: "의사 이름", doctorContact: "의사 연락처 번호",
    relSpouse: "배우자", relSon: "아들", relDaughter: "딸",
    relParent: "부모", relSibling: "형제/자매", relFriend: "친구", relOther: "기타",
    next: "다음", pleaseWait: "잠시만 기다려 주세요...",
  },
  Italiano: {
    title: "Parlaci di Te",
    subtitle: "Le tue risposte ci aiutano a personalizzare\nil tuo percorso e creare un'esperienza migliore.",
    whereFrom: "Da dove vieni?", whichLang: "Quale lingua preferisci parlare?",
    bioSex: "Qual è il tuo sesso biologico?", male: "Maschio", female: "Femmina",
    howTall: "Quanto sei alto/a?", currentWeight: "Qual è il tuo peso attuale?",
    bloodGroup: "Gruppo Sanguigno",
    emergencyContact: "Numero di Contatto di Emergenza",
    relationWithContact: "Relazione con il Contatto di Emergenza",
    medicalConditions: "Condizioni Mediche",
    otherCondition: "Descrivere altra condizione...",
    currentMedications: "Farmaci Attuali", addMedication: "+ Aggiungi Farmaco",
    medName: "Nome del Farmaco", dosage: "Dosaggio (es. 500mg)", timing: "Orario (es. Mattina)",
    doctorName: "Nome del Medico", doctorContact: "Numero di Contatto del Medico",
    relSpouse: "Coniuge", relSon: "Figlio", relDaughter: "Figlia",
    relParent: "Genitore", relSibling: "Fratello/Sorella", relFriend: "Amico/a", relOther: "Altro",
    next: "Avanti", pleaseWait: "Attendere prego...",
  },
  "Русский": {
    title: "Расскажите о себе",
    subtitle: "Ваши ответы помогают нам персонализировать\nваш путь и создать лучший опыт.",
    whereFrom: "Откуда вы?", whichLang: "Какой язык вы предпочитаете?",
    bioSex: "Каков ваш биологический пол?", male: "Мужской", female: "Женский",
    howTall: "Какой у вас рост?", currentWeight: "Каков ваш текущий вес?",
    bloodGroup: "Группа Крови",
    emergencyContact: "Номер Экстренного Контакта",
    relationWithContact: "Отношение к Экстренному Контакту",
    medicalConditions: "Медицинские Состояния",
    otherCondition: "Описать другое состояние...",
    currentMedications: "Текущие Лекарства", addMedication: "+ Добавить Лекарство",
    medName: "Название Лекарства", dosage: "Дозировка (напр. 500мг)", timing: "Время приёма (напр. Утро)",
    doctorName: "Имя Врача", doctorContact: "Контактный Номер Врача",
    relSpouse: "Супруг/а", relSon: "Сын", relDaughter: "Дочь",
    relParent: "Родитель", relSibling: "Брат/Сестра", relFriend: "Друг/Подруга", relOther: "Другое",
    next: "Далее", pleaseWait: "Пожалуйста, подождите...",
  },
  "Türkçe": {
    title: "Bize Kendinizden Bahsedin",
    subtitle: "Cevaplarınız yolculuğunuzu kişiselleştirmemize\nve daha iyi bir deneyim yaratmamıza yardımcı olur.",
    whereFrom: "Nerelisiniz?", whichLang: "Hangi dili konuşmayı tercih edersiniz?",
    bioSex: "Biyolojik cinsiyetiniz nedir?", male: "Erkek", female: "Kadın",
    howTall: "Boyunuz ne kadar?", currentWeight: "Mevcut kilonuz ne kadar?",
    bloodGroup: "Kan Grubu",
    emergencyContact: "Acil İletişim Numarası",
    relationWithContact: "Acil İletişim ile İlişki",
    medicalConditions: "Tıbbi Durumlar",
    otherCondition: "Diğer durumu açıklayın...",
    currentMedications: "Mevcut İlaçlar", addMedication: "+ İlaç Ekle",
    medName: "İlaç Adı", dosage: "Doz (örn. 500mg)", timing: "Alım Zamanı (örn. Sabah)",
    doctorName: "Doktor Adı", doctorContact: "Doktor İletişim Numarası",
    relSpouse: "Eş", relSon: "Oğul", relDaughter: "Kız",
    relParent: "Ebeveyn", relSibling: "Kardeş", relFriend: "Arkadaş", relOther: "Diğer",
    next: "İleri", pleaseWait: "Lütfen bekleyin...",
  },
  "Bahasa Indonesia": {
    title: "Ceritakan Tentang Dirimu",
    subtitle: "Jawaban Anda membantu kami mempersonalisasi\nperjalanan Anda dan menciptakan pengalaman lebih baik.",
    whereFrom: "Dari mana Anda berasal?", whichLang: "Bahasa apa yang Anda sukai?",
    bioSex: "Apa jenis kelamin biologis Anda?", male: "Pria", female: "Wanita",
    howTall: "Seberapa tinggi Anda?", currentWeight: "Berapa berat badan Anda saat ini?",
    bloodGroup: "Golongan Darah",
    emergencyContact: "Nomor Kontak Darurat",
    relationWithContact: "Hubungan dengan Kontak Darurat",
    medicalConditions: "Kondisi Medis",
    otherCondition: "Jelaskan kondisi lain...",
    currentMedications: "Obat-obatan Saat Ini", addMedication: "+ Tambah Obat",
    medName: "Nama Obat", dosage: "Dosis (mis. 500mg)", timing: "Waktu Minum (mis. Pagi)",
    doctorName: "Nama Dokter", doctorContact: "Nomor Kontak Dokter",
    relSpouse: "Pasangan", relSon: "Anak Laki-laki", relDaughter: "Anak Perempuan",
    relParent: "Orang Tua", relSibling: "Saudara", relFriend: "Teman", relOther: "Lainnya",
    next: "Selanjutnya", pleaseWait: "Mohon tunggu...",
  },
  Filipino: {
    title: "Sabihin Mo Sa Amin Ang Tungkol Sa Iyo",
    subtitle: "Ang iyong mga sagot ay tumutulong sa amin\nna i-personalize ang iyong paglalakbay.",
    whereFrom: "Saan ka nanggaling?", whichLang: "Anong wika ang gusto mong gamitin?",
    bioSex: "Ano ang iyong biyolohikal na kasarian?", male: "Lalaki", female: "Babae",
    howTall: "Gaano kataas?", currentWeight: "Ano ang iyong kasalukuyang timbang?",
    bloodGroup: "Grupo ng Dugo",
    emergencyContact: "Numero ng Emergency Contact",
    relationWithContact: "Relasyon sa Emergency Contact",
    medicalConditions: "Mga Medikal na Kondisyon",
    otherCondition: "Ilarawan ang ibang kondisyon...",
    currentMedications: "Mga Kasalukuyang Gamot", addMedication: "+ Magdagdag ng Gamot",
    medName: "Pangalan ng Gamot", dosage: "Dosis (hal. 500mg)", timing: "Oras ng Pag-inom (hal. Umaga)",
    doctorName: "Pangalan ng Doktor", doctorContact: "Numero ng Kontak ng Doktor",
    relSpouse: "Asawa", relSon: "Anak na Lalaki", relDaughter: "Anak na Babae",
    relParent: "Magulang", relSibling: "Kapatid", relFriend: "Kaibigan", relOther: "Iba",
    next: "Susunod", pleaseWait: "Mangyaring maghintay...",
  },
  "ภาษาไทย": {
    title: "บอกเราเกี่ยวกับตัวคุณ",
    subtitle: "คำตอบของคุณช่วยให้เราปรับแต่ง\nการเดินทางของคุณให้ดียิ่งขึ้น",
    whereFrom: "คุณมาจากไหน?", whichLang: "คุณชอบพูดภาษาอะไร?",
    bioSex: "เพศทางชีววิทยาของคุณคืออะไร?", male: "ชาย", female: "หญิง",
    howTall: "คุณสูงเท่าไร?", currentWeight: "น้ำหนักปัจจุบันของคุณคือเท่าไร?",
    bloodGroup: "หมู่เลือด",
    emergencyContact: "เบอร์ติดต่อฉุกเฉิน",
    relationWithContact: "ความสัมพันธ์กับผู้ติดต่อฉุกเฉิน",
    medicalConditions: "ภาวะทางการแพทย์",
    otherCondition: "อธิบายภาวะอื่น...",
    currentMedications: "ยาปัจจุบัน", addMedication: "+ เพิ่มยา",
    medName: "ชื่อยา", dosage: "ขนาดยา (เช่น 500mg)", timing: "เวลาทานยา (เช่น เช้า)",
    doctorName: "ชื่อแพทย์", doctorContact: "เบอร์ติดต่อแพทย์",
    relSpouse: "คู่สมรส", relSon: "ลูกชาย", relDaughter: "ลูกสาว",
    relParent: "พ่อแม่", relSibling: "พี่น้อง", relFriend: "เพื่อน", relOther: "อื่น ๆ",
    next: "ถัดไป", pleaseWait: "กรุณารอสักครู่...",
  },
  "Tiếng Việt": {
    title: "Hãy Cho Chúng Tôi Biết Về Bạn",
    subtitle: "Câu trả lời của bạn giúp chúng tôi\ncá nhân hóa hành trình của bạn.",
    whereFrom: "Bạn đến từ đâu?", whichLang: "Bạn thích nói ngôn ngữ nào?",
    bioSex: "Giới tính sinh học của bạn là gì?", male: "Nam", female: "Nữ",
    howTall: "Chiều cao của bạn là bao nhiêu?", currentWeight: "Cân nặng hiện tại của bạn là bao nhiêu?",
    bloodGroup: "Nhóm Máu",
    emergencyContact: "Số Liên Lạc Khẩn Cấp",
    relationWithContact: "Quan Hệ với Người Liên Lạc Khẩn Cấp",
    medicalConditions: "Tình Trạng Y Tế",
    otherCondition: "Mô tả tình trạng khác...",
    currentMedications: "Thuốc Hiện Tại", addMedication: "+ Thêm Thuốc",
    medName: "Tên Thuốc", dosage: "Liều lượng (VD: 500mg)", timing: "Thời gian dùng (VD: Sáng)",
    doctorName: "Tên Bác Sĩ", doctorContact: "Số Liên Lạc Bác Sĩ",
    relSpouse: "Vợ/Chồng", relSon: "Con Trai", relDaughter: "Con Gái",
    relParent: "Bố/Mẹ", relSibling: "Anh/Chị/Em", relFriend: "Bạn Bè", relOther: "Khác",
    next: "Tiếp theo", pleaseWait: "Xin hãy đợi...",
  },
  Kiswahili: {
    title: "Tuambie Kuhusu Wewe",
    subtitle: "Majibu yako yatusaidia kukuandalia\nsafari yako na kuunda uzoefu bora.",
    whereFrom: "Unatoka wapi?", whichLang: "Lugha gani unayopenda kusema?",
    bioSex: "Jinsia yako ya kibiolojia ni nini?", male: "Mwanaume", female: "Mwanamke",
    howTall: "Una urefu gani?", currentWeight: "Uzito wako wa sasa ni nini?",
    bloodGroup: "Kundi la Damu",
    emergencyContact: "Nambari ya Mawasiliano ya Dharura",
    relationWithContact: "Uhusiano na Mawasiliano ya Dharura",
    medicalConditions: "Hali za Kiafya",
    otherCondition: "Eleza hali nyingine...",
    currentMedications: "Dawa za Sasa", addMedication: "+ Ongeza Dawa",
    medName: "Jina la Dawa", dosage: "Kipimo (mf. 500mg)", timing: "Wakati wa Kutumia (mf. Asubuhi)",
    doctorName: "Jina la Daktari", doctorContact: "Nambari ya Daktari",
    relSpouse: "Mke/Mume", relSon: "Mtoto wa Kiume", relDaughter: "Mtoto wa Kike",
    relParent: "Mzazi", relSibling: "Kaka/Dada", relFriend: "Rafiki", relOther: "Nyingine",
    next: "Ifuatayo", pleaseWait: "Tafadhali subiri...",
  },
  "Bahasa Melayu": {
    title: "Ceritakan Tentang Anda",
    subtitle: "Jawapan anda membantu kami memperibadikan\nperjalanan anda dan mencipta pengalaman lebih baik.",
    whereFrom: "Dari mana anda berasal?", whichLang: "Bahasa apa yang anda lebih suka bercakap?",
    bioSex: "Apakah jantina biologi anda?", male: "Lelaki", female: "Perempuan",
    howTall: "Berapakah ketinggian anda?", currentWeight: "Berapakah berat semasa anda?",
    bloodGroup: "Kumpulan Darah",
    emergencyContact: "Nombor Kenalan Kecemasan",
    relationWithContact: "Hubungan dengan Kenalan Kecemasan",
    medicalConditions: "Keadaan Perubatan",
    otherCondition: "Huraikan keadaan lain...",
    currentMedications: "Ubat-ubatan Semasa", addMedication: "+ Tambah Ubat",
    medName: "Nama Ubat", dosage: "Dos (cth. 500mg)", timing: "Masa Pengambilan (cth. Pagi)",
    doctorName: "Nama Doktor", doctorContact: "Nombor Kenalan Doktor",
    relSpouse: "Pasangan", relSon: "Anak Lelaki", relDaughter: "Anak Perempuan",
    relParent: "Ibu Bapa", relSibling: "Adik Beradik", relFriend: "Rakan", relOther: "Lain-lain",
    next: "Seterusnya", pleaseWait: "Sila tunggu...",
  },
  "ਪੰਜਾਬੀ": {
    title: "ਆਪਣੇ ਬਾਰੇ ਦੱਸੋ",
    subtitle: "ਤੁਹਾਡੇ ਜਵਾਬ ਸਾਨੂੰ ਤੁਹਾਡਾ ਸਫ਼ਰ ਬਿਹਤਰ\nਬਣਾਉਣ ਵਿੱਚ ਮਦਦ ਕਰਦੇ ਹਨ।",
    whereFrom: "ਤੁਸੀਂ ਕਿੱਥੋਂ ਹੋ?", whichLang: "ਤੁਸੀਂ ਕਿਹੜੀ ਭਾਸ਼ਾ ਵਿੱਚ ਗੱਲ ਕਰਨਾ ਪਸੰਦ ਕਰਦੇ ਹੋ?",
    bioSex: "ਤੁਹਾਡਾ ਜੈਵਿਕ ਲਿੰਗ ਕੀ ਹੈ?", male: "ਮਰਦ", female: "ਔਰਤ",
    howTall: "ਤੁਹਾਡੀ ਲੰਬਾਈ ਕਿੰਨੀ ਹੈ?", currentWeight: "ਤੁਹਾਡਾ ਮੌਜੂਦਾ ਭਾਰ ਕਿੰਨਾ ਹੈ?",
    bloodGroup: "ਖੂਨ ਦਾ ਗਰੁੱਪ",
    emergencyContact: "ਐਮਰਜੈਂਸੀ ਸੰਪਰਕ ਨੰਬਰ",
    relationWithContact: "ਐਮਰਜੈਂਸੀ ਸੰਪਰਕ ਨਾਲ ਰਿਸ਼ਤਾ",
    medicalConditions: "ਸਿਹਤ ਸਮੱਸਿਆਵਾਂ",
    otherCondition: "ਹੋਰ ਸਮੱਸਿਆ ਦੱਸੋ...",
    currentMedications: "ਮੌਜੂਦਾ ਦਵਾਈਆਂ", addMedication: "+ ਦਵਾਈ ਜੋੜੋ",
    medName: "ਦਵਾਈ ਦਾ ਨਾਮ", dosage: "ਖੁਰਾਕ (ਜਿਵੇਂ 500mg)", timing: "ਸਮਾਂ (ਜਿਵੇਂ ਸਵੇਰੇ)",
    doctorName: "ਡਾਕਟਰ ਦਾ ਨਾਮ", doctorContact: "ਡਾਕਟਰ ਦਾ ਸੰਪਰਕ ਨੰਬਰ",
    relSpouse: "ਪਤੀ/ਪਤਨੀ", relSon: "ਪੁੱਤਰ", relDaughter: "ਧੀ",
    relParent: "ਮਾਤਾ-ਪਿਤਾ", relSibling: "ਭੈਣ-ਭਰਾ", relFriend: "ਦੋਸਤ", relOther: "ਹੋਰ",
    next: "ਅੱਗੇ", pleaseWait: "ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਕਰੋ...",
  },
  "മലയാളം": {
    title: "നിങ്ങളെ കുറിച്ച് പറയൂ",
    subtitle: "നിങ്ങളുടെ ഉത്തരങ്ങൾ നിങ്ങളുടെ\nയാത്ര മികച്ചതാക്കാൻ സഹായിക്കുന്നു.",
    whereFrom: "നിങ്ങൾ എവിടെ നിന്നാണ്?", whichLang: "നിങ്ങൾ ഏത് ഭാഷ സംസാരിക്കാൻ ഇഷ്ടപ്പെടുന്നു?",
    bioSex: "നിങ്ങളുടെ ജൈവ ലിംഗം എന്താണ്?", male: "പുരുഷൻ", female: "സ്ത്രീ",
    howTall: "നിങ്ങളുടെ ഉയരം എത്രയാണ്?", currentWeight: "നിങ്ങളുടെ നിലവിലെ ഭാരം എത്രയാണ്?",
    bloodGroup: "രക്തഗ്രൂപ്പ്",
    emergencyContact: "അടിയന്തര ബന്ധ നമ്പർ",
    relationWithContact: "അടിയന്തര ബന്ധത്തിലെ ബന്ധം",
    medicalConditions: "വൈദ്യ അവസ്ഥകൾ",
    otherCondition: "മറ്റ് അവസ്ഥ വിവരിക്കൂ...",
    currentMedications: "നിലവിലെ മരുന്നുകൾ", addMedication: "+ മരുന്ന് ചേർക്കൂ",
    medName: "മരുന്നിന്റെ പേര്", dosage: "ഡോസ് (ഉദാ. 500mg)", timing: "സമയം (ഉദാ. രാവിലെ)",
    doctorName: "ഡോക്ടറുടെ പേര്", doctorContact: "ഡോക്ടറുടെ ബന്ധ നമ്പർ",
    relSpouse: "ഭർത്താവ്/ഭാര്യ", relSon: "മകൻ", relDaughter: "മകൾ",
    relParent: "മാതാ-പിതാ", relSibling: "സഹോദരൻ/സഹോദരി", relFriend: "സുഹൃത്ത്", relOther: "മറ്റുള്ളവർ",
    next: "അടുത്തത്", pleaseWait: "ദയവായി കാത്തിരിക്കൂ...",
  },
  "తెలుగు": {
    title: "మీ గురించి చెప్పండి",
    subtitle: "మీ సమాధానాలు మీ ప్రయాణాన్ని\nవ్యక్తిగతీకరించడానికి సహాయపడతాయి.",
    whereFrom: "మీరు ఎక్కడ నుండి వచ్చారు?", whichLang: "మీరు ఏ భాషలో మాట్లాడటం ఇష్టపడతారు?",
    bioSex: "మీ జీవసంబంధ లింగం ఏమిటి?", male: "పురుషుడు", female: "స్త్రీ",
    howTall: "మీ ఎత్తు ఎంత?", currentWeight: "మీ ప్రస్తుత బరువు ఎంత?",
    bloodGroup: "రక్తసమూహం",
    emergencyContact: "అత్యవసర సంప్రదింపు నంబర్",
    relationWithContact: "అత్యవసర సంప్రదింపుతో సంబంధం",
    medicalConditions: "వైద్య పరిస్థితులు",
    otherCondition: "మరొక పరిస్థితి వివరించండి...",
    currentMedications: "ప్రస్తుత మందులు", addMedication: "+ మందు జోడించండి",
    medName: "మందు పేరు", dosage: "మోతాదు (ఉదా. 500mg)", timing: "సమయం (ఉదా. ఉదయం)",
    doctorName: "డాక్టర్ పేరు", doctorContact: "డాక్టర్ సంప్రదింపు నంబర్",
    relSpouse: "భర్త/భార్య", relSon: "కొడుకు", relDaughter: "కూతురు",
    relParent: "తల్లిదండ్రులు", relSibling: "సోదరుడు/సోదరి", relFriend: "స్నేహితుడు", relOther: "ఇతరులు",
    next: "తదుపరి", pleaseWait: "దయచేసి వేచి ఉండండి...",
  },
  "हरियाणवी": {
    title: "आपणे बारे में बताओ",
    subtitle: "तेरे जवाबां से हम तेरा सफर\nबिहतर बणा सकां सां।",
    whereFrom: "तू कित्थे के सै?", whichLang: "तू किस बोली में बात करणा पसंद करै?",
    bioSex: "तेरी जैविक जिंस के सै?", male: "मर्द", female: "जणाणी",
    howTall: "तेरी लंबाई कित्ती सै?", currentWeight: "तेरा मौजूदा वजन कित्ता सै?",
    bloodGroup: "खून का ग्रुप",
    emergencyContact: "इमरजेंसी संपर्क नंबर",
    relationWithContact: "इमरजेंसी संपर्क का रिश्ता",
    medicalConditions: "बीमारियां",
    otherCondition: "दूसरी बीमारी बताओ...",
    currentMedications: "दवाईयां", addMedication: "+ दवाई जोड़ो",
    medName: "दवाई का नाम", dosage: "खुराक (जैसे 500mg)", timing: "टैम (जैसे सुबह)",
    doctorName: "डाक्टर का नाम", doctorContact: "डाक्टर का नंबर",
    relSpouse: "घरवाला/घरवाली", relSon: "छोरा", relDaughter: "छोरी",
    relParent: "माँ-बाप", relSibling: "भाई-बहण", relFriend: "यार", relOther: "दूसरा",
    next: "आगे", pleaseWait: "थोड़ा रुको...",
  },
};
// ─────────────────────────────────────────────────────────────────────────────

const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];

export default function AboutScreen() {
  const insets                    = useSafeAreaInsets();
  const router                    = useRouter();
  const { name, firstName = "", lastName = "", email: paramEmail = "" } = useLocalSearchParams<{
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }>();
  const { language, setLanguage } = useLanguage();
  const { refreshProfile, user, profile } = useAuth();

  const t = T[language] ?? T.English;

  const [email,             setEmail]             = useState(paramEmail);
  const [age,               setAge]               = useState("");
  const [country,           setCountry]           = useState<Country>(DEFAULT_COUNTRY);
  const [pickerVisible,     setPickerVisible]      = useState(false);
  const [emergencyCountry,  setEmergencyCountry]   = useState<Country>(DEFAULT_COUNTRY);
  const [emergencyPickerVisible, setEmergencyPickerVisible] = useState(false);
  const [selectedLang,      setSelectedLang]       = useState<LangOption>(getCountryLanguages(DEFAULT_COUNTRY.code)[0]);
  const [sex,               setSex]               = useState<"male" | "female" | null>(null);
  const [heightUnit,        setHeightUnit]         = useState<"ft" | "cm">("ft");
  const [height,            setHeight]             = useState("");
  const [weightUnit,        setWeightUnit]         = useState<"kg" | "lb">("kg");
  const [weight,            setWeight]             = useState("");
  const [bloodGroup,        setBloodGroup]         = useState<string | null>(null);
  const [emergencyPhone,    setEmergencyPhone]     = useState("");
  const [emergencyRelation, setEmergencyRelation]  = useState("");
  const [loading,           setLoading]            = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const emergencyFieldY = useRef(0);

  const langs = useMemo(() => getCountryLanguages(country.code), [country.code]);

  // Pre-fill email: params (social) → auth user email → saved profile email (phone auth)
  useEffect(() => {
    if (paramEmail) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setEmail(data.user.email);
      } else if (profile?.email) {
        setEmail(profile.email);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const relationOptions = [
    t.relSpouse, t.relSon, t.relDaughter, t.relParent, t.relSibling, t.relFriend, t.relOther,
  ];

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    const newLangs = getCountryLanguages(c.code);
    setSelectedLang(newLangs[0]);
    setLanguage(newLangs[0].appLang);
  };

  const handleHeightUnitChange = (newUnit: "ft" | "cm") => {
    if (newUnit === heightUnit) return;
    const val = parseFloat(height);
    if (!isNaN(val) && val > 0) {
      if (newUnit === "cm") {
        setHeight(Math.round(val * 30.48).toString());
      } else {
        setHeight((Math.round((val / 30.48) * 10) / 10).toString());
      }
    }
    setHeightUnit(newUnit);
  };

  const handleLangSelect = (lang: LangOption) => {
    setSelectedLang(lang);
    setLanguage(lang.appLang);
  };

  const canNext = email.trim() !== "" && age.trim() !== "" && sex !== null && height.trim() !== "" && weight.trim() !== "" && emergencyPhone.trim() !== "" && emergencyRelation !== "";

  const handleNext = async () => {
    if (!canNext) return;

    // Dismiss keyboard to prevent layout shift during navigation
    Keyboard.dismiss();

    const emailTrimmed = email.trim();
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      Alert.alert("Invalid Age", "Please enter a valid age between 1 and 120.");
      return;
    }

    const heightNum = parseFloat(height);
    if (isNaN(heightNum) || heightNum <= 0 ||
        (heightUnit === "cm" && (heightNum < 50 || heightNum > 280)) ||
        (heightUnit === "ft" && (heightNum < 1.5 || heightNum > 9.5))) {
      Alert.alert("Invalid Height", heightUnit === "cm"
        ? "Height must be between 50 and 280 cm."
        : "Height must be between 1.5 and 9.5 ft.");
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0 ||
        (weightUnit === "kg" && (weightNum < 10 || weightNum > 500)) ||
        (weightUnit === "lb" && (weightNum < 22 || weightNum > 1100))) {
      Alert.alert("Invalid Weight", weightUnit === "kg"
        ? "Weight must be between 10 and 500 kg."
        : "Weight must be between 22 and 1100 lb.");
      return;
    }

    if (emergencyPhone.replace(/\D/g, "").length < 6) {
      Alert.alert("Invalid Phone", "Emergency contact number must have at least 6 digits.");
      return;
    }

    setLoading(true);
    try {
      if (user) {
        const fullName = buildFullName(firstName, lastName) || (name?.trim() ?? "");
        const { error: upsertErr } = await supabase.from("profiles").upsert({
          id:                 user.id,
          first_name:         firstName.trim(),
          last_name:          lastName.trim(),
          full_name:          fullName,
          email:              email.trim().toLowerCase(),
          age:                ageNum,
          country:            country.name,
          country_code:       country.code,
          preferred_language: selectedLang.appLang,
          biological_sex:     sex ?? "",
          height,
          height_unit:        heightUnit,
          weight,
          weight_unit:        weightUnit,
          blood_group:        bloodGroup ?? "",
          emergency_phone:    emergencyPhone.trim() ? `${emergencyCountry.dial} ${emergencyPhone.trim()}` : "",
          emergency_relation: emergencyRelation,
          role:               "elder",
        }, { onConflict: 'id' });
        if (upsertErr) throw upsertErr;
      }
      await refreshProfile();
      
      // Delay navigation on Android for stability
      if (Platform.OS === 'android') {
        setTimeout(() => {
          router.push("/onboarding/medical" as any);
        }, 100);
      } else {
        router.push("/onboarding/medical" as any);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={["#2A4B8C", "#3EA8D8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 28 }]}
      >
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </LinearGradient>

      <View style={styles.card}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Email ── */}
          <Text style={styles.fieldLabel}>Your Email ID</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor="#B0BBC8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* ── Age ── */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t.age ?? "How old are you ?"}</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 65"
              placeholderTextColor="#B0BBC8"
              keyboardType="number-pad"
              maxLength={3}
              value={age}
              onChangeText={setAge}
            />
          </View>

          {/* ── Country ── */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t.whereFrom}</Text>
          <Pressable style={styles.rowBtn} onPress={() => setPickerVisible(true)}>
            <Text style={styles.countryFlag}>{country.flag}</Text>
            <Text style={styles.rowBtnText}>{country.name}</Text>
            <Ionicons name="chevron-down" size={16} color="#8A94A6" />
          </Pressable>

          {/* ── Language chips ── */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t.whichLang}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {langs.map((l) => {
              const active = selectedLang.appLang === l.appLang;
              return (
                <Pressable
                  key={l.appLang}
                  onPress={() => handleLangSelect(l)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{l.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Biological Sex ── */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t.bioSex}</Text>
          <View style={styles.sexRow}>
            {(["male", "female"] as const).map((s) => (
              <Pressable
                key={s}
                style={[styles.sexCard, sex === s && styles.sexCardActive]}
                onPress={() => setSex(s)}
              >
                <Ionicons
                  name={s}
                  size={28}
                  color={sex === s ? "#fff" : s === "male" ? "#3EA8D8" : "#E91E8C"}
                />
                <Text style={[styles.sexLabel, sex === s && styles.sexLabelActive]}>
                  {s === "male" ? t.male : t.female}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Blood Group ── */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t.bloodGroup}</Text>
          <View style={styles.wrapRow}>
            {BLOOD_GROUPS.map((bg) => {
              const active = bloodGroup === bg;
              return (
                <Pressable
                  key={bg}
                  onPress={() => setBloodGroup(active ? null : bg)}
                  style={[styles.chip, styles.chipWide, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{bg}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Height ── */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t.howTall}</Text>
          <View style={styles.measureRow}>
            <View style={styles.unitToggle}>
              {(["ft", "cm"] as const).map((u) => (
                <Pressable
                  key={u}
                  style={[styles.unitBtn, heightUnit === u && styles.unitBtnActive]}
                  onPress={() => handleHeightUnitChange(u)}
                >
                  <Text style={[styles.unitBtnText, heightUnit === u && styles.unitBtnTextActive]}>
                    {u.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.inputBox, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                placeholder={heightUnit === "ft" ? "e.g. 5.7" : "e.g. 170"}
                placeholderTextColor="#B0BBC8"
                keyboardType="decimal-pad"
                value={height}
                onChangeText={setHeight}
              />
            </View>
            <Text style={styles.unitHint}>{heightUnit === "ft" ? "Ft" : "Cm"}</Text>
          </View>

          {/* ── Weight ── */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t.currentWeight}</Text>
          <View style={styles.measureRow}>
            <View style={styles.unitToggle}>
              {(["kg", "lb"] as const).map((u) => (
                <Pressable
                  key={u}
                  style={[styles.unitBtn, weightUnit === u && styles.unitBtnActive]}
                  onPress={() => setWeightUnit(u)}
                >
                  <Text style={[styles.unitBtnText, weightUnit === u && styles.unitBtnTextActive]}>
                    {u.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.inputBox, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                placeholder={weightUnit === "kg" ? "e.g. 65" : "e.g. 143"}
                placeholderTextColor="#B0BBC8"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
            <Text style={styles.unitHint}>{weightUnit === "kg" ? "Kg" : "Lb"}</Text>
          </View>

          {/* ── Emergency Contact ── */}
          <View
            onLayout={(e) => { emergencyFieldY.current = e.nativeEvent.layout.y; }}
          >
            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>{t.emergencyContact}</Text>
            <View style={styles.phoneRow}>
              <Pressable style={styles.countryDialBtn} onPress={() => setEmergencyPickerVisible(true)}>
                <Text style={styles.countryFlag}>{emergencyCountry.flag}</Text>
                <Text style={styles.countryDialText}>{emergencyCountry.dial}</Text>
                <Ionicons name="chevron-down" size={16} color="#8A94A6" />
              </Pressable>
              <View style={[styles.inputBox, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="98765 43210"
                  placeholderTextColor="#B0BBC8"
                  keyboardType="phone-pad"
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current?.scrollTo({ y: emergencyFieldY.current - 20, animated: true });
                    }, 300);
                  }}
                />
              </View>
            </View>
          </View>

          {/* ── Relation ── */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t.relationWithContact}</Text>
          <View style={styles.wrapRow}>
            {relationOptions.map((rel) => {
              const active = emergencyRelation === rel;
              return (
                <Pressable
                  key={rel}
                  onPress={() => setEmergencyRelation(active ? "" : rel)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{rel}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Next ── */}
          <Pressable onPress={handleNext} disabled={!canNext || loading} style={{ marginTop: 32 }}>
            <LinearGradient
              colors={canNext && !loading ? ["#2A6FAF", "#3EA8D8"] : ["#C2CDD8", "#C2CDD8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtn}
            >
              <Text style={styles.nextBtnText}>{loading ? t.pleaseWait : t.next}</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </View>

      <CountryPickerModal
        visible={pickerVisible}
        onSelect={handleCountrySelect}
        onClose={() => setPickerVisible(false)}
        showDial={false}
      />
      <CountryPickerModal
        visible={emergencyPickerVisible}
        onSelect={setEmergencyCountry}
        onClose={() => setEmergencyPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:   { paddingHorizontal: 24, paddingBottom: 52, alignItems: "center" },
  title:    { fontSize: 28, fontWeight: "900", color: "#fff", marginBottom: 12, textAlign: "center" },
  subtitle: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 20 },

  card: {
    flex: 1, backgroundColor: "#F2F4F8",
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -28, overflow: "hidden",
  },
  scroll: { paddingHorizontal: 20, paddingTop: 28 },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#4A5568", marginBottom: 10 },

  rowBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 14, height: 52, paddingHorizontal: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  countryFlag: { fontSize: 22 },
  rowBtnText:  { flex: 1, fontSize: 15, fontWeight: "600", color: "#1A3050" },

  chipRow: { flexDirection: "row" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#DDE3EC",
  },
  chipWide:         { minWidth: 52, alignItems: "center" },
  chipActive:       { backgroundColor: "#2A4B8C", borderColor: "#2A4B8C" },
  chipActiveTeal:   { backgroundColor: "#3EA8D8", borderColor: "#3EA8D8" },
  chipText:         { fontSize: 13, fontWeight: "700", color: "#4A5568" },
  chipTextActive:   { color: "#fff" },

  sexRow: { flexDirection: "row", gap: 14 },
  sexCard: {
    flex: 1, height: 80, borderRadius: 18, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: "#DDE3EC",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sexCardActive:  { backgroundColor: "#3EA8D8", borderColor: "#3EA8D8" },
  sexLabel:       { fontSize: 14, fontWeight: "700", color: "#4A5568" },
  sexLabelActive: { color: "#fff" },

  measureRow:        { flexDirection: "row", alignItems: "center", gap: 10 },
  phoneRow:          { flexDirection: "row", alignItems: "center", gap: 10 },
  unitToggle:        { flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 3, borderWidth: 1, borderColor: "#DDE3EC" },
  unitBtn:           { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  unitBtnActive:     { backgroundColor: "#3EA8D8" },
  unitBtnText:       { fontSize: 12, fontWeight: "700", color: "#7A90A4" },
  unitBtnTextActive: { color: "#fff" },
  unitHint:          { fontSize: 13, fontWeight: "600", color: "#7A90A4", width: 28 },

  inputBox: {
    backgroundColor: "#fff", borderRadius: 14, height: 50, paddingHorizontal: 16,
    justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  countryDialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#DDE3EC",
  },
  countryDialText: { fontSize: 14, fontWeight: "700", color: "#1A3050" },
  input: { fontSize: 15, fontWeight: "600", color: "#1A3050" },

  medCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  medCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  medCardTitle:  { fontSize: 13, fontWeight: "700", color: "#4A5568" },
  removeBtn:     { padding: 2 },
  medRow:        { flexDirection: "row", gap: 10 },

  addMedBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 4, marginTop: 4,
  },
  addMedText: { fontSize: 14, fontWeight: "700", color: "#2A4B8C" },

  nextBtn:     { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  nextBtnText: { fontSize: 17, fontWeight: "900", color: "#fff", letterSpacing: 0.3 },
});
