import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_REDIRECT_URL = AuthSession.makeRedirectUri({
  scheme: 'tinybittest',
  path: 'auth-callback',
});
console.log('[OAuth] Redirect URL:', GOOGLE_REDIRECT_URL);

export async function signInWithGoogle(): Promise<{ user: User } | null> {
  console.log('[OAuth] Starting Google sign-in...');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: GOOGLE_REDIRECT_URL, skipBrowserRedirect: true },
  });
  if (error) { console.error('[OAuth] signInWithOAuth error:', error.message); throw error; }
  if (!data.url) throw new Error('[OAuth] No URL returned from Supabase');
  console.log('[OAuth] Supabase authorize URL:', data.url);
  try {
    const parsed = new URL(data.url);
    const rt = parsed.searchParams.get('redirect_to');
    console.log('[OAuth] redirect_to param:', rt);
  } catch {}
  console.log('[OAuth] Opening browser...');

  // ── iOS ──────────────────────────────────────────────────────────────────
  // ASWebAuthenticationSession intercepts the custom-scheme redirect and
  // returns the full callback URL directly to us — no deep link involved.
  if (Platform.OS === 'ios') {
    const result = await WebBrowser.openAuthSessionAsync(data.url, GOOGLE_REDIRECT_URL);
    console.log('[OAuth] iOS result type:', result.type);
    if (result.type !== 'success') return null;

    const qs   = (result.url.split('?')[1] ?? '').split('#')[0];
    const code = new URLSearchParams(qs).get('code');
    if (!code) throw new Error('[OAuth] No code in iOS callback URL');

    console.log('[OAuth] Exchanging PKCE code (iOS)...');
    const { data: ex, error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) throw exErr;
    const user = ex?.user ?? ex?.session?.user ?? null;
    console.log('[OAuth] iOS done. user:', user?.email ?? 'null');
    return user ? { user } : null;
  }

  // ── Android ──────────────────────────────────────────────────────────────
  // Chrome Custom Tabs cannot return the redirect URL to the caller.
  // Instead the OS routes tinybittest://auth-callback?code=… as a deep link.
  // Expo Router picks it up and navigates to app/auth-callback.tsx, which
  // performs exchangeCodeForSession and the subsequent navigation.
  //
  // Here we only need to:
  //   1. Open the browser.
  //   2. Detect whether the user completed OAuth (Linking event fires) or
  //      cancelled (browser closes with no Linking event).
  //   3. Return null either way — auth-callback.tsx owns the rest.
  const completed = await new Promise<boolean>((resolve) => {
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      linkingSub.remove();
      resolve(ok);
    };

    // Linking fires with the callback URL before openAuthSessionAsync resolves.
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('code=') || url.includes('access_token=') || url.includes('error=')) {
        console.log('[OAuth] Android Linking callback received');
        finish(true);
      }
    });

    WebBrowser.openAuthSessionAsync(data.url, GOOGLE_REDIRECT_URL)
      .then(() => {
        // Give Linking 1 s to fire before treating the session as cancelled.
        setTimeout(() => finish(false), 1000);
      })
      .catch(() => finish(false));
  });

  console.log('[OAuth] Android completed:', completed);
  if (!completed) return null; // user pressed back / dismissed browser

  // auth-callback.tsx is now processing the code. Return null so that
  // navigateAfterSocialAuth in login.tsx short-circuits (getSession will
  // return null at this instant since the exchange hasn't finished yet).
  return null;
}

export async function signInWithApple(): Promise<{ user: User } | null> {
  console.log('[OAuth] Starting Apple sign-in...');

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) throw new Error('Apple sign-in failed: no identity token');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) { console.error('[OAuth] Apple signInWithIdToken error:', error.message); throw error; }

  console.log('[OAuth] Apple done. user:', data.user?.email);
  return data.user ? { user: data.user } : null;
}
