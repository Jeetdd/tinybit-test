import { File as FSFile } from 'expo-file-system';
import { API_BASE_URL } from '../config/api';
import { supabase } from './supabase';

export const sathiAi = {
  chat: async (messages: any[], _context?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) throw new Error(await response.text());
      const json = await response.json();
      return json?.data?.content ?? '';
    } catch (error: any) {
      console.error('Sathi AI chat error:', error.message);
      return "I'm having a little trouble right now. Please try again.";
    }
  },

  clearHistory: async (): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      await fetch(`${API_BASE_URL}/ai/conversation`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error: any) {
      console.error('Sathi AI clearHistory error:', error.message);
    }
  },

  transcribe: async (uri: string): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const base64 = await new FSFile(uri).base64();
      const filename = uri.split('/').pop() ?? 'audio.m4a';
      const mimeType = filename.endsWith('.wav') ? 'audio/wav' : 'audio/m4a';

      const response = await fetch(`${API_BASE_URL}/ai/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ base64, filename, mimeType }),
      });
      if (!response.ok) throw new Error(await response.text());
      const json = await response.json();
      return json?.data?.text ?? '';
    } catch (error: any) {
      console.error('Sathi AI transcribe error:', error.message);
      return '';
    }
  },

  generateSpeech: async (text: string): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/ai/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(await response.text());
      const json = await response.json();
      return json?.data?.uri ?? null;
    } catch (error: any) {
      console.error('Sathi AI speech error:', error.message);
      return null;
    }
  },
};
