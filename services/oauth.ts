import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../utils/supabase';

// Required so the browser session closes cleanly on redirect back
WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URL = AuthSession.makeRedirectUri({ scheme: 'tinybittest' });

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned from Supabase');

  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);

  if (result.type !== 'success') return null;

  // Extract tokens from the redirect URL fragment
  const fragment = result.url.includes('#')
    ? result.url.split('#')[1]
    : result.url.split('?')[1] ?? '';

  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token') ?? '';

  if (!accessToken) throw new Error('No access token received from Google');

  const { data: session, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) throw sessionError;
  return session;
}

// Facebook and Apple can be added here later when enabled in Supabase dashboard
