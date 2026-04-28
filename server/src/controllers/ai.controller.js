const { Buffer } = require('buffer');

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

function getOpenAiKey() {
  return process.env.OPENAI_API_KEY;
}

async function openAiFetch(path, init) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.statusCode = 500;
    throw err;
  }

  if (typeof fetch !== 'function') {
    const err = new Error('global fetch is not available in this Node runtime');
    err.statusCode = 500;
    throw err;
  }

  const response = await fetch(`${OPENAI_BASE_URL}${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(25_000),
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return response;
}

const chat = async (req, res) => {
  try {
    const { messages, context } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: '`messages` must be an array' });
    }

    const response = await openAiFetch('/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are Sathi (meaning Companion), an advanced Jarvis-like AI for elders.
You are warm, respectful, and highly intelligent.
Your goal is to help the user manage their health, remember medicines, and stay connected with family.

USER CONTEXT:
${context ?? ''}

INSTRUCTIONS:
- Keep responses concise but very friendly.
- Use a calm, reassuring tone.
- If they ask about medicines or health, use the provided context.
- Never give professional medical advice, remind them you are an AI assistant.
- If a family message is mentioned in context, remind them to check it.`,
          },
          ...messages,
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(502).json({ success: false, message: 'OpenAI error', detail: body });
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content ?? '';

    return res.json({ success: true, data: { content } });
  } catch (error) {
    const status = error?.statusCode || 500;
    return res.status(status).json({ success: false, message: error?.message || 'Server error' });
  }
};

const transcribe = async (req, res) => {
  try {
    const { base64, filename, mimeType } = req.body || {};

    if (typeof base64 !== 'string' || base64.length < 10) {
      return res.status(400).json({ success: false, message: '`base64` audio is required' });
    }

    const safeFilename = typeof filename === 'string' && filename.trim() ? filename.trim() : 'audio.m4a';
    const safeMime = typeof mimeType === 'string' && mimeType.trim() ? mimeType.trim() : 'audio/m4a';

    const bytes = Buffer.from(base64, 'base64');
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: safeMime }), safeFilename);
    form.append('model', 'whisper-1');

    const response = await openAiFetch('/audio/transcriptions', {
      method: 'POST',
      signal: AbortSignal.timeout(35_000),
      body: form,
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(502).json({ success: false, message: 'OpenAI error', detail: body });
    }

    const json = await response.json();
    return res.json({ success: true, data: { text: json?.text ?? '' } });
  } catch (error) {
    const status = error?.statusCode || 500;
    return res.status(status).json({ success: false, message: error?.message || 'Server error' });
  }
};

const tts = async (req, res) => {
  try {
    const { text, voice } = req.body || {};

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: '`text` is required' });
    }

    const response = await openAiFetch('/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(35_000),
      body: JSON.stringify({
        model: 'tts-1',
        voice: typeof voice === 'string' && voice.trim() ? voice.trim() : 'nova',
        input: text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(502).json({ success: false, message: 'OpenAI error', detail: body });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString('base64');

    return res.json({
      success: true,
      data: {
        base64,
        mimeType: 'audio/mpeg',
      },
    });
  } catch (error) {
    const status = error?.statusCode || 500;
    return res.status(status).json({ success: false, message: error?.message || 'Server error' });
  }
};

module.exports = { chat, transcribe, tts };
