/**
 * TinyBit Logger
 * All logs appear in the Metro terminal when running `expo start`.
 * On a physical device: `npx expo start` then press `a` for Android.
 * To stream logs only: `npx react-native log-android` (adb logcat filter).
 */

import { Platform } from 'react-native';

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NETWORK' | 'AUTH' | 'NAV';

const ICONS: Record<Level, string> = {
  DEBUG:   '🔍',
  INFO:    'ℹ️ ',
  WARN:    '⚠️ ',
  ERROR:   '🔴',
  NETWORK: '🌐',
  AUTH:    '🔐',
  NAV:     '🧭',
};

function ts() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function print(level: Level, tag: string, message: string, data?: unknown) {
  const prefix = `${ICONS[level]} [${ts()}][${Platform.OS.toUpperCase()}][${tag}]`;
  if (level === 'ERROR' || level === 'WARN') {
    if (data !== undefined) {
      console.error(`${prefix} ${message}`, data);
    } else {
      console.error(`${prefix} ${message}`);
    }
  } else {
    if (data !== undefined) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
}

export const Logger = {
  debug:   (tag: string, msg: string, data?: unknown) => { if (__DEV__) print('DEBUG',   tag, msg, data); },
  info:    (tag: string, msg: string, data?: unknown) =>               print('INFO',    tag, msg, data),
  warn:    (tag: string, msg: string, data?: unknown) =>               print('WARN',    tag, msg, data),
  error:   (tag: string, msg: string, data?: unknown) =>               print('ERROR',   tag, msg, data),
  network: (tag: string, msg: string, data?: unknown) => { if (__DEV__) print('NETWORK', tag, msg, data); },
  auth:    (tag: string, msg: string, data?: unknown) =>               print('AUTH',    tag, msg, data),
  nav:     (tag: string, msg: string, data?: unknown) => { if (__DEV__) print('NAV',     tag, msg, data); },

  /** Wrap any async fn and log how long it took + any error */
  timed: async <T>(tag: string, label: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      print('DEBUG', tag, `${label} ✓ (${Date.now() - start}ms)`);
      return result;
    } catch (err: any) {
      print('ERROR', tag, `${label} ✗ (${Date.now() - start}ms): ${err?.message ?? err}`);
      throw err;
    }
  },
};

/** Call once from _layout.tsx to catch all unhandled JS errors */
export function setupGlobalErrorHandlers() {
  // Unhandled JS errors (crashes)
  const prev = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    Logger.error(
      'GLOBAL',
      `${isFatal ? '💀 FATAL' : 'Non-fatal'} JS Error: ${error?.message}`,
      { stack: error?.stack?.split('\n').slice(0, 8).join('\n') }
    );
    prev?.(error, isFatal);
  });

  // Unhandled promise rejections
  const origWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('Possible Unhandled Promise Rejection')) {
      Logger.error('PROMISE', 'Unhandled Promise Rejection', args.slice(1));
    }
    origWarn(...args);
  };

  Logger.info('BOOT', `App starting on ${Platform.OS} v${Platform.Version}`);
}
