import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Language =
  | "English"
  | "हिंदी"
  | "ગુજરાતી"
  | "தமிழ்"
  | "বাংলা"
  | "मराठी";

export type Translations = {
  myLanguage: string;
  sathiSpeaksYourLanguage: string;
  textSize: string;
  chooseComfortable: string;
  myHealthInfo: string;
  bloodSugarTarget: string;
  manageTargetRange: string;
  bloodPressureTarget: string;
  setNormalRange: string;
  myDoctor: string;
  appSettings: string;
  remindersAlerts: string;
  medicineCheckIn: string;
  voiceNavigation: string;
  navigateByVoice: string;
  nightMode: string;
  easierOnEyes: string;
  vibrationAlerts: string;
  vibrateForAlerts: string;
  privacyData: string;
  whatSathiCollects: string;
  myPlan: string;
  editProfile: string;
  logOut: string;
  deleteAccount: string;
  save: string;
  cancel: string;
  name: string;
  age: string;
  location: string;
  doctorName: string;
  hospital: string;
  edit: string;
  areYouSure: string;
  logOutConfirm: string;
  deleteConfirm: string;
  deleteWarning: string;
};

export const translations: Record<Language, Translations> = {
  English: {
    myLanguage: "My Language",
    sathiSpeaksYourLanguage: "Sathi speaks your language",
    textSize: "Text Size",
    chooseComfortable: "Choose what is comfortable for your eyes",
    myHealthInfo: "My Health Info",
    bloodSugarTarget: "Blood Sugar Target",
    manageTargetRange: "Manage your target range",
    bloodPressureTarget: "Blood Pressure Target",
    setNormalRange: "Set your normal range",
    myDoctor: "My Doctor",
    appSettings: "App Settings",
    remindersAlerts: "Reminders & Alerts",
    medicineCheckIn: "Medicine, check-in, games",
    voiceNavigation: "Voice Navigation",
    navigateByVoice: "Navigate app by voice",
    nightMode: "Night Mode",
    easierOnEyes: "Easier on eyes at night",
    vibrationAlerts: "Vibration Alerts",
    vibrateForAlerts: "Vibrate for important alerts",
    privacyData: "Privacy & Data",
    whatSathiCollects: "What Sathi collects",
    myPlan: "My Plan",
    editProfile: "Edit Profile",
    logOut: "Log Out",
    deleteAccount: "Delete Account",
    save: "Save",
    cancel: "Cancel",
    name: "Full Name",
    age: "Age",
    location: "Location",
    doctorName: "Doctor's Name",
    hospital: "Hospital / Clinic",
    edit: "Edit",
    areYouSure: "Are you sure?",
    logOutConfirm: "You will be logged out of your account.",
    deleteConfirm: "This will permanently delete your account and all your data.",
    deleteWarning: "This action cannot be undone.",
  },
  हिंदी: {
    myLanguage: "मेरी भाषा",
    sathiSpeaksYourLanguage: "साथी आपकी भाषा बोलता है",
    textSize: "टेक्स्ट का आकार",
    chooseComfortable: "अपनी आँखों के लिए सुविधाजनक चुनें",
    myHealthInfo: "मेरी स्वास्थ्य जानकारी",
    bloodSugarTarget: "ब्लड शुगर लक्ष्य",
    manageTargetRange: "अपनी लक्ष्य सीमा प्रबंधित करें",
    bloodPressureTarget: "ब्लड प्रेशर लक्ष्य",
    setNormalRange: "अपनी सामान्य सीमा निर्धारित करें",
    myDoctor: "मेरे डॉक्टर",
    appSettings: "ऐप सेटिंग्स",
    remindersAlerts: "रिमाइंडर और अलर्ट",
    medicineCheckIn: "दवाई, चेक-इन, खेल",
    voiceNavigation: "वॉइस नेविगेशन",
    navigateByVoice: "आवाज़ से ऐप चलाएं",
    nightMode: "नाइट मोड",
    easierOnEyes: "रात में आँखों के लिए आसान",
    vibrationAlerts: "वाइब्रेशन अलर्ट",
    vibrateForAlerts: "महत्वपूर्ण अलर्ट के लिए वाइब्रेट",
    privacyData: "गोपनीयता और डेटा",
    whatSathiCollects: "साथी क्या एकत्र करता है",
    myPlan: "मेरी योजना",
    editProfile: "प्रोफाइल संपादित करें",
    logOut: "लॉग आउट",
    deleteAccount: "खाता हटाएं",
    save: "सहेजें",
    cancel: "रद्द करें",
    name: "पूरा नाम",
    age: "उम्र",
    location: "स्थान",
    doctorName: "डॉक्टर का नाम",
    hospital: "अस्पताल / क्लिनिक",
    edit: "संपादित करें",
    areYouSure: "क्या आप सुनिश्चित हैं?",
    logOutConfirm: "आप अपने खाते से लॉग आउट हो जाएंगे।",
    deleteConfirm: "यह आपके खाते और सारे डेटा को हमेशा के लिए हटा देगा।",
    deleteWarning: "यह क्रिया पूर्ववत नहीं की जा सकती।",
  },
  ગુજરાતી: {
    myLanguage: "મારી ભાષા",
    sathiSpeaksYourLanguage: "સાથી તમારી ભાષા બોલે છે",
    textSize: "ટેક્સ્ટ સાઇઝ",
    chooseComfortable: "તમારી આંખો માટે આરામદાયક પસંદ કરો",
    myHealthInfo: "મારી આરોગ્ય માહિતી",
    bloodSugarTarget: "બ્લડ સુગર ટાર્ગેટ",
    manageTargetRange: "તમારી ટાર્ગેટ રેન્જ મેનેજ કરો",
    bloodPressureTarget: "બ્લડ પ્રેશર ટાર્ગેટ",
    setNormalRange: "તમારી સામાન્ય રેન્જ સેટ કરો",
    myDoctor: "મારા ડૉક્ટર",
    appSettings: "એપ સેટિંગ્સ",
    remindersAlerts: "રિમાઇન્ડર અને અલર્ટ",
    medicineCheckIn: "દવા, ચેક-ઇન, રમતો",
    voiceNavigation: "વૉઇસ નેવિગેશન",
    navigateByVoice: "અવાજ દ્વારા ઍપ ચલાવો",
    nightMode: "નાઇટ મોડ",
    easierOnEyes: "રાત્રે આંખો માટે સરળ",
    vibrationAlerts: "વાઇબ્રેશન અલર્ટ",
    vibrateForAlerts: "મહત્વના અલર્ટ માટે વાઇબ્રેટ",
    privacyData: "ગોપનીયતા અને ડેટા",
    whatSathiCollects: "સાથી શું એકત્ર કરે છે",
    myPlan: "મારી પ્લાન",
    editProfile: "પ્રોફાઇલ સંપાદિત કરો",
    logOut: "લૉગ આઉટ",
    deleteAccount: "ખાતું કાઢી નાખો",
    save: "સાચવો",
    cancel: "રદ્દ કરો",
    name: "પૂરું નામ",
    age: "ઉંમર",
    location: "સ્થાન",
    doctorName: "ડૉક્ટરનું નામ",
    hospital: "હૉસ્પિટલ / ક્લિનિક",
    edit: "સંપાદિત કरો",
    areYouSure: "શું તમે ખાતરી કરો છો?",
    logOutConfirm: "તમે તમારા ખાતામાંથી લૉગ આઉટ થઈ જશો.",
    deleteConfirm: "આ તમારું ખાતું અને બધો ડેટા કાયમ માટે કાઢી નાખશે.",
    deleteWarning: "આ ક્રિયા પૂર્વવત કરી શકાતી નથી.",
  },
  தமிழ்: {
    myLanguage: "என் மொழி",
    sathiSpeaksYourLanguage: "சாதி உங்கள் மொழி பேசுகிறது",
    textSize: "உரை அளவு",
    chooseComfortable: "உங்கள் கண்களுக்கு வசதியானதை தேர்ந்தெடுக்கவும்",
    myHealthInfo: "என் சுகாதார தகவல்",
    bloodSugarTarget: "இரத்த சர்க்கரை இலக்கு",
    manageTargetRange: "உங்கள் இலக்கு வரம்பை நிர்வகிக்கவும்",
    bloodPressureTarget: "இரத்த அழுத்த இலக்கு",
    setNormalRange: "உங்கள் சாதாரண வரம்பை அமைக்கவும்",
    myDoctor: "என் மருத்துவர்",
    appSettings: "ஆப் அமைப்புகள்",
    remindersAlerts: "நினைவூட்டல்கள் & எச்சரிக்கைகள்",
    medicineCheckIn: "மருந்து, செக்-இன், விளையாட்டு",
    voiceNavigation: "குரல் வழிசெலுத்தல்",
    navigateByVoice: "குரலால் ஆப்பை இயக்கவும்",
    nightMode: "இரவு முறை",
    easierOnEyes: "இரவில் கண்களுக்கு எளிது",
    vibrationAlerts: "அதிர்வு எச்சரிக்கைகள்",
    vibrateForAlerts: "முக்கிய எச்சரிக்கைகளுக்கு அதிர்வு",
    privacyData: "தனியுரிமை & தரவு",
    whatSathiCollects: "சாதி சேகரிப்பது என்ன",
    myPlan: "என் திட்டம்",
    editProfile: "சுயவிவரத்தை திருத்தவும்",
    logOut: "வெளியேறு",
    deleteAccount: "கணக்கை நீக்கு",
    save: "சேமி",
    cancel: "ரத்துசெய்",
    name: "முழு பெயர்",
    age: "வயது",
    location: "இடம்",
    doctorName: "மருத்துவர் பெயர்",
    hospital: "மருத்துவமனை / கிளினிக்",
    edit: "திருத்தவும்",
    areYouSure: "நீங்கள் உறுதியாக இருக்கிறீர்களா?",
    logOutConfirm: "நீங்கள் உங்கள் கணக்கிலிருந்து வெளியேறுவீர்கள்.",
    deleteConfirm: "இது உங்கள் கணக்கையும் அனைத்து தரவையும் நிரந்தரமாக நீக்கும்.",
    deleteWarning: "இந்த செயலை மீட்டெடுக்க முடியாது.",
  },
  বাংলা: {
    myLanguage: "আমার ভাষা",
    sathiSpeaksYourLanguage: "সাথি আপনার ভাষায় কথা বলে",
    textSize: "টেক্সট সাইজ",
    chooseComfortable: "আপনার চোখের জন্য আরামদায়ক বেছে নিন",
    myHealthInfo: "আমার স্বাস্থ্য তথ্য",
    bloodSugarTarget: "রক্তে শর্করার লক্ষ্য",
    manageTargetRange: "আপনার লক্ষ্য পরিসর পরিচালনা করুন",
    bloodPressureTarget: "রক্তচাপের লক্ষ্য",
    setNormalRange: "আপনার স্বাভাবিক পরিসর নির্ধারণ করুন",
    myDoctor: "আমার ডাক্তার",
    appSettings: "অ্যাপ সেটিংস",
    remindersAlerts: "রিমাইন্ডার এবং অ্যালার্ট",
    medicineCheckIn: "ওষুধ, চেক-ইন, গেমস",
    voiceNavigation: "ভয়েস নেভিগেশন",
    navigateByVoice: "ভয়েস দিয়ে অ্যাপ চালান",
    nightMode: "নাইট মোড",
    easierOnEyes: "রাতে চোখের জন্য সহজ",
    vibrationAlerts: "ভাইব্রেশন অ্যালার্ট",
    vibrateForAlerts: "গুরুত্বপূর্ণ অ্যালার্টের জন্য ভাইব্রেট",
    privacyData: "গোপনীয়তা এবং ডেটা",
    whatSathiCollects: "সাথি কী সংগ্রহ করে",
    myPlan: "আমার পরিকল্পনা",
    editProfile: "প্রোফাইল সম্পাদনা করুন",
    logOut: "লগ আউট",
    deleteAccount: "অ্যাকাউন্ট মুছুন",
    save: "সংরক্ষণ করুন",
    cancel: "বাতিল করুন",
    name: "পুরো নাম",
    age: "বয়স",
    location: "অবস্থান",
    doctorName: "ডাক্তারের নাম",
    hospital: "হাসপাতাল / ক্লিনিক",
    edit: "সম্পাদনা করুন",
    areYouSure: "আপনি কি নিশ্চিত?",
    logOutConfirm: "আপনি আপনার অ্যাকাউন্ট থেকে লগ আউট হয়ে যাবেন।",
    deleteConfirm: "এটি আপনার অ্যাকাউন্ট এবং সমস্ত ডেটা স্থায়ীভাবে মুছে দেবে।",
    deleteWarning: "এই ক্রিয়াটি পূর্বাবস্থায় ফেরানো যাবে না।",
  },
  मराठी: {
    myLanguage: "माझी भाषा",
    sathiSpeaksYourLanguage: "साथी तुमची भाषा बोलतो",
    textSize: "मजकूर आकार",
    chooseComfortable: "तुमच्या डोळ्यांसाठी आरामदायक निवडा",
    myHealthInfo: "माझी आरोग्य माहिती",
    bloodSugarTarget: "रक्त शर्करा लक्ष्य",
    manageTargetRange: "तुमची लक्ष्य श्रेणी व्यवस्थापित करा",
    bloodPressureTarget: "रक्तदाब लक्ष्य",
    setNormalRange: "तुमची सामान्य श्रेणी सेट करा",
    myDoctor: "माझे डॉक्टर",
    appSettings: "ॲप सेटिंग्ज",
    remindersAlerts: "स्मरणपत्रे आणि सूचना",
    medicineCheckIn: "औषध, चेक-इन, खेळ",
    voiceNavigation: "व्हॉइस नेव्हिगेशन",
    navigateByVoice: "आवाजाने ॲप चालवा",
    nightMode: "नाइट मोड",
    easierOnEyes: "रात्री डोळ्यांसाठी सोपे",
    vibrationAlerts: "व्हायब्रेशन सूचना",
    vibrateForAlerts: "महत्त्वाच्या सूचनांसाठी व्हायब्रेट",
    privacyData: "गोपनीयता आणि डेटा",
    whatSathiCollects: "साथी काय गोळा करतो",
    myPlan: "माझी योजना",
    editProfile: "प्रोफाइल संपादित करा",
    logOut: "लॉग आउट",
    deleteAccount: "खाते हटवा",
    save: "जतन करा",
    cancel: "रद्द करा",
    name: "पूर्ण नाव",
    age: "वय",
    location: "स्थान",
    doctorName: "डॉक्टरचे नाव",
    hospital: "रुग्णालय / दवाखाना",
    edit: "संपादित करा",
    areYouSure: "तुम्हाला खात्री आहे का?",
    logOutConfirm: "तुम्ही तुमच्या खात्यातून लॉग आउट व्हाल.",
    deleteConfirm: "हे तुमचे खाते आणि सर्व डेटा कायमचे हटवेल.",
    deleteWarning: "ही क्रिया पूर्ववत करता येणार नाही.",
  },
};

/** Font scale options mapped to a numeric multiplier */
export const FONT_SCALES: Record<string, number> = {
  Small: 0.85,
  Medium: 1.0,
  Large: 1.15,
  "Extra Large": 1.3,
};

type AppSettingsContextType = {
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  // Font size
  fontSizeLabel: string;
  setFontSizeLabel: (label: string) => void;
  fontScale: number;
  // Night mode
  nightMode: boolean;
  setNightMode: (on: boolean) => void;
};

const LanguageContext = createContext<AppSettingsContextType | undefined>(undefined);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("English");
  const [fontSizeLabel, setFontSizeLabelState] = useState("Medium");
  const [nightMode, setNightModeState] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    (async () => {
      const [lang, size, night] = await Promise.all([
        AsyncStorage.getItem("appLanguage"),
        AsyncStorage.getItem("appFontSize"),
        AsyncStorage.getItem("appNightMode"),
      ]);
      if (lang) setLanguageState(lang as Language);
      if (size) setFontSizeLabelState(size);
      if (night) setNightModeState(night === "true");
    })();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem("appLanguage", lang);
  };

  const setFontSizeLabel = async (label: string) => {
    setFontSizeLabelState(label);
    await AsyncStorage.setItem("appFontSize", label);
  };

  const setNightMode = async (on: boolean) => {
    setNightModeState(on);
    await AsyncStorage.setItem("appNightMode", on ? "true" : "false");
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
        fontSizeLabel,
        setFontSizeLabel,
        fontScale: FONT_SCALES[fontSizeLabel] ?? 1.0,
        nightMode,
        setNightMode,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
