import { StyleSheet } from "react-native";

type StyleValue = Record<string, any>;
type StyleMap  = Record<string, StyleValue>;

/**
 * Takes a plain style-map (the object you'd pass to StyleSheet.create) and
 * returns a memoisation-friendly StyleSheet where every `fontSize` and
 * `lineHeight` value is multiplied by `scale`.
 *
 * Usage inside a component:
 *   const { fontScale } = useLanguage();
 *   const s = useMemo(() => scaleStyles(RAW, fontScale), [fontScale]);
 */
export function scaleStyles<T extends StyleMap>(raw: T, scale: number): T {
  const result: StyleMap = {};
  for (const key of Object.keys(raw)) {
    const style = raw[key];
    result[key] = {
      ...style,
      ...(typeof style.fontSize      === "number" ? { fontSize:      Math.round(style.fontSize      * scale) } : {}),
      ...(typeof style.lineHeight    === "number" ? { lineHeight:    Math.round(style.lineHeight    * scale) } : {}),
      ...(typeof style.letterSpacing === "number" ? { letterSpacing: style.letterSpacing * scale }            : {}),
    };
  }
  return StyleSheet.create(result as T) as unknown as T;
}
