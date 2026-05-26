import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n, { LANG_CODES } from "../utils/i18n";

export type Language =
  | "English"
  | "हिंदी"
  | "ગુજરાતી"
  | "தமிழ்"
  | "বাংলা"
  | "मराठी"
  | "Español"
  | "Français"
  | "Português"
  | "Deutsch"
  | "العربية"
  | "日本語"
  | "中文"
  | "한국어"
  | "Italiano"
  | "Русский"
  | "Türkçe"
  | "Bahasa Indonesia"
  | "Filipino"
  | "ภาษาไทย"
  | "Tiếng Việt"
  | "Kiswahili"
  | "Bahasa Melayu"
  | "ਪੰਜਾਬੀ"
  | "മലയാളം"
  | "తెలుగు"
  | "हरियाणवी";

export const FONT_SCALES: Record<string, number> = {
  Small:     0.85,
  Medium:    1.0,
  Large:     1.15,
  "XL Large": 1.3,
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  fontSizeLabel: string;
  setFontSizeLabel: (label: string) => void;
  fontScale: number;
  nightMode: boolean;
  setNightMode: (on: boolean) => void;
  colors: {
    bg: string;
    card: string;
    text: string;
    muted: string;
    border: string;
    white: string;
  };
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("English");
  const [fontSizeLabel, setFontSizeLabelState] = useState("Medium");
  const [nightMode, setNightModeState] = useState(false);

  const colors = useMemo(() => ({
    bg:     nightMode ? "#0D1117" : "#F2F4F8",
    card:   nightMode ? "#161B22" : "#FFFFFF",
    text:   nightMode ? "#E6EDF3" : "#15253E",
    muted:  nightMode ? "#8B949E" : "#7B8AA0",
    border: nightMode ? "#30363D" : "#EEF2F7",
    white:  nightMode ? "#161B22" : "#FFFFFF",
  }), [nightMode]);

  useEffect(() => {
    (async () => {
      const [lang, size, night] = await Promise.all([
        AsyncStorage.getItem("appLanguage"),
        AsyncStorage.getItem("appFontSize"),
        AsyncStorage.getItem("appNightMode"),
      ]);
      if (lang) {
        setLanguageState(lang as Language);
        void i18n.changeLanguage(LANG_CODES[lang] ?? "en");
      }
      if (size) setFontSizeLabelState(size);
      if (night) setNightModeState(night === "true");
    })();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    void i18n.changeLanguage(LANG_CODES[lang] ?? "en");
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
        fontSizeLabel,
        setFontSizeLabel,
        fontScale: FONT_SCALES[fontSizeLabel] ?? 1.0,
        nightMode,
        setNightMode,
        colors,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
