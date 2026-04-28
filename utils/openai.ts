import { API_BASE_URL } from '../config/api';
import { supabase } from './supabase';

export const sathiAi = {
  chat: async (messages: any[], context: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages,
          context,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI error: ${err}`);
      }

      const json = await response.json();
      return json?.data?.content ?? '';
    } catch (error: any) {
      console.error('Sathi AI chat error:', error.message);
      return "I'm having a little trouble right now. Please try again.";
    }
  },
};
