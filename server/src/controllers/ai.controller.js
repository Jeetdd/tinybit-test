const { Buffer } = require('buffer');
const { buildUserContext, loadConversationHistory, saveConversationTurns, clearConversationHistory } = require('../services/rag.service');

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL_TEXT   = 'gemini-2.0-flash';   // fast text + vision
const GEMINI_MODEL_VISION = 'gemini-2.0-flash';   // supports image input

// ── Key helpers ───────────────────────────────────────────────────────────────
function getOpenAiKey()  { return process.env.OPENAI_API_KEY; }
function getGeminiKey()  { return process.env.GEMINI_API_KEY; }

// ── OpenAI fetch helper (Whisper + TTS + fallback chat/vision) ────────────────
async function openAiFetch(path, init) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.statusCode = 500;
    throw err;
  }
  return fetch(`${OPENAI_BASE_URL}${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(25_000),
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${apiKey}` },
  });
}

// ── Gemini text helper ────────────────────────────────────────────────────────
// systemPrompt is folded into the first user turn (Gemini supports systemInstruction
// in v1beta but folding is simpler and equally effective for these tasks).
async function geminiFetch(model, body, timeoutMs = 25_000) {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured. Add it to server/.env');
    err.statusCode = 500;
    throw err;
  }
  return fetch(`${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Extract text from a Gemini response JSON
function geminiText(json) {
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ── Sathi AI system prompt ────────────────────────────────────────────────────
const SATHI_SYSTEM = `You are Sathi (meaning Companion), a warm, intelligent AI health assistant for elderly users built into the TinyBit app.
Your role is to help users manage their health, remember medicines, stay connected with family, and feel supported.

CORE GUIDELINES:
- Keep responses concise, warm, and reassuring — never clinical or overwhelming.
- Use a calm, caring tone suitable for elderly users.
- If asked about medicines or health data, reference the USER CONTEXT provided.
- Never diagnose or replace professional medical advice — always suggest consulting a doctor for serious concerns.
- LANGUAGE RULE (highest priority): Detect the script/language of the user's most recent message and respond in that exact language.
  Hindi → Devanagari | Tamil → Tamil script | Bengali → Bengali script | Gujarati → Gujarati script | Marathi → Devanagari | English → English
  Never respond in a different language than the one used, regardless of any other instruction.`;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CHAT — RAG-augmented, Gemini (primary) → OpenAI GPT-4o-mini (fallback)
//    Flow: load DB history → fetch user health context → call LLM → persist turns
// ═══════════════════════════════════════════════════════════════════════════════
const chat = async (req, res) => {
  try {
    const { messages: clientMessages } = req.body || {};
    const userId = req.supabase?.userId;

    // Latest user message — prefer from client payload, required
    const latestUserMsg = Array.isArray(clientMessages) && clientMessages.length > 0
      ? clientMessages[clientMessages.length - 1]
      : null;

    if (!latestUserMsg?.content?.trim()) {
      return res.status(400).json({ success: false, message: 'No user message provided' });
    }

    // ── Build RAG context and load conversation history in parallel ───────────
    const [ragContext, dbHistory] = await Promise.allSettled([
      userId ? buildUserContext(userId) : Promise.resolve(''),
      userId ? loadConversationHistory(userId, 20) : Promise.resolve([]),
    ]);

    const healthContext = ragContext.status === 'fulfilled' ? ragContext.value : '';
    const history = dbHistory.status === 'fulfilled' ? dbHistory.value : [];

    // Merge DB history with any new client-side turns not yet in DB
    // DB history is the authoritative source; we just append the current user message
    const conversationHistory = history.length > 0
      ? history
      : (Array.isArray(clientMessages) ? clientMessages.slice(0, -1) : []); // fallback to client history

    const systemPrompt = healthContext
      ? `${SATHI_SYSTEM}\n\n--- USER HEALTH DATA ---\n${healthContext}\n--- END HEALTH DATA ---`
      : SATHI_SYSTEM;

    // Build messages for LLM: system context + conversation history + current message
    const allMessages = [
      ...conversationHistory,
      { role: 'user', content: latestUserMsg.content },
    ];

    // ── Try Gemini first ──────────────────────────────────────────────────────
    let replyContent = '';
    let provider = '';

    try {
      // Gemini: fold system prompt into first user turn
      const contents = allMessages.map((m, i) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: i === 0 ? `${systemPrompt}\n\n${m.content}` : String(m.content ?? '') }],
      }));

      const geminiResp = await geminiFetch(GEMINI_MODEL_TEXT, {
        contents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      });

      if (geminiResp.ok) {
        const json = await geminiResp.json();
        const text = geminiText(json);
        if (text) { replyContent = text; provider = 'gemini'; }
      } else {
        const errBody = await geminiResp.text();
        console.warn('[Sathi] Gemini error:', geminiResp.status, errBody);
      }
    } catch (geminiErr) {
      console.warn('[Sathi] Gemini failed, falling back to OpenAI:', geminiErr.message);
    }

    // ── Fallback: OpenAI GPT-4o-mini ─────────────────────────────────────────
    if (!replyContent) {
      const oaiResp = await openAiFetch('/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, ...allMessages],
          temperature: 0.7,
        }),
      });

      if (!oaiResp.ok) {
        const body = await oaiResp.text();
        return res.status(502).json({ success: false, message: 'AI service error', detail: body });
      }

      const oaiJson = await oaiResp.json();
      replyContent = oaiJson?.choices?.[0]?.message?.content ?? '';
      provider = 'openai';
    }

    if (!replyContent) {
      return res.status(502).json({ success: false, message: 'AI returned empty response' });
    }

    // ── Persist the new turn to Supabase in the background ───────────────────
    if (userId) {
      saveConversationTurns(userId, latestUserMsg.content, replyContent).catch(() => {});
    }

    return res.json({ success: true, data: { content: replyContent }, provider });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Server error' });
  }
};

// ── Clear conversation history ────────────────────────────────────────────────
const clearConversation = async (req, res) => {
  try {
    const userId = req.supabase?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    await clearConversationHistory(userId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error?.message || 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TRANSCRIBE — OpenAI Whisper (Gemini audio transcription not used here)
// ═══════════════════════════════════════════════════════════════════════════════
const transcribe = async (req, res) => {
  try {
    const { base64, filename, mimeType } = req.body || {};
    if (typeof base64 !== 'string' || base64.length < 10) {
      return res.status(400).json({ success: false, message: '`base64` audio is required' });
    }

    const safeFilename = filename?.trim() || 'audio.m4a';
    const safeMime = mimeType?.trim() || 'audio/m4a';

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
      return res.status(502).json({ success: false, message: 'Transcription error', detail: body });
    }

    const json = await response.json();
    return res.json({ success: true, data: { text: json?.text ?? '' } });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TTS — OpenAI TTS (Gemini doesn't support audio output)
// ═══════════════════════════════════════════════════════════════════════════════
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
        voice: voice?.trim() || 'nova',
        input: text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(502).json({ success: false, message: 'TTS error', detail: body });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return res.json({ success: true, data: { base64: buffer.toString('base64'), mimeType: 'audio/mpeg' } });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ANALYZE REPORT — Gemini Vision (primary) → OpenAI GPT-4o-mini (fallback)
// ═══════════════════════════════════════════════════════════════════════════════
const REPORT_PROMPT = `Classify this as a medical document. Respond ONLY with valid JSON, no markdown:
{"isReport": true, "category": "Reports"}

Use true for: doctor prescriptions, X-ray/MRI/CT, blood/lab tests, ECG, discharge summaries, medical certificates.
Use false for: ID cards, resumes, school certificates, bank statements, personal photos, food photos.
category must be one of: "Reports", "Prescriptions", "X-Rays", "Blood Tests", or null.
When in doubt, use false.`;

const analyzeReport = async (req, res) => {
  try {
    const { base64, mimeType } = req.body || {};
    if (typeof base64 !== 'string' || base64.length < 100) {
      return res.status(400).json({ success: false, message: '`base64` image is required' });
    }

    const safeMime = mimeType?.trim() || 'image/jpeg';
    const isImage = safeMime.startsWith('image/');

    // ── Try Gemini Vision for images ─────────────────────────────────────────
    if (isImage) {
      try {
        const geminiResp = await geminiFetch(GEMINI_MODEL_VISION, {
          contents: [{
            parts: [
              { inlineData: { mimeType: safeMime, data: base64 } },
              { text: REPORT_PROMPT },
            ],
          }],
          generationConfig: { maxOutputTokens: 100, temperature: 0 },
        }, 20_000);

        if (geminiResp.ok) {
          const json = await geminiResp.json();
          const content = geminiText(json).trim().replace(/```json|```/g, '').trim();
          try {
            const result = JSON.parse(content);
            return res.json({ success: true, data: { isReport: !!result.isReport, category: result.category ?? null } });
          } catch {
            const isReport = /\"isReport\"\s*:\s*true/i.test(content);
            return res.json({ success: true, data: { isReport, category: isReport ? 'Reports' : null } });
          }
        }
      } catch (geminiErr) {
        console.warn('[analyzeReport] Gemini failed, falling back to OpenAI:', geminiErr.message);
      }
    }

    // ── Fallback: OpenAI GPT-4o-mini (supports PDFs too) ────────────────────
    const oaiResp = await openAiFetch('/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            safeMime === 'application/pdf'
              ? { type: 'file', file: { filename: 'document.pdf', file_data: `data:application/pdf;base64,${base64}` } }
              : { type: 'image_url', image_url: { url: `data:${safeMime};base64,${base64}`, detail: 'low' } },
            { type: 'text', text: 'Classify as medical document. Respond ONLY JSON: {"isReport":true/false,"category":"Reports"|"Prescriptions"|"X-Rays"|"Blood Tests"|null}' },
          ],
        }],
        max_tokens: 60,
      }),
    });

    const oaiJson = await oaiResp.json();
    const content = (oaiJson?.choices?.[0]?.message?.content ?? '').trim().replace(/```json|```/g, '').trim();
    try {
      const result = JSON.parse(content);
      return res.json({ success: true, data: { isReport: !!result.isReport, category: result.category ?? null } });
    } catch {
      const isReport = /\"isReport\"\s*:\s*true/i.test(content);
      return res.json({ success: true, data: { isReport, category: isReport ? 'Reports' : null } });
    }
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ANALYZE FOOD — Gemini Vision (primary) → OpenAI GPT-4o-mini (fallback)
// ═══════════════════════════════════════════════════════════════════════════════
const FOOD_PROMPT = `You are a certified nutrition expert AI. Carefully analyze this specific food photo and calculate REAL nutritional values for exactly what you see in the image.

IMPORTANT: Do NOT copy the example values below — they are only showing the required JSON format. Calculate actual nutrition based on the real food items visible in this photo.

Respond with ONLY valid JSON (no markdown, no extra text) using this exact structure:
{
  "detected": true,
  "foodItems": ["<actual food item 1>", "<actual food item 2>"],
  "totalCalories": <calculated integer for this specific meal>,
  "protein": <grams of protein as number>,
  "carbohydrates": <grams of carbs as number>,
  "fat": <grams of fat as number>,
  "fiber": <grams of fiber as number>,
  "sugar": <grams of sugar as number>,
  "sodium": <milligrams of sodium as number>,
  "vitamins": ["<vitamin 1>", "<vitamin 2>"],
  "healthScore": <1-10 integer>,
  "healthRating": "<Excellent|Good|Moderate|Poor>",
  "portionSize": "<small|medium|large>",
  "servingInfo": "<description of portion, e.g. '1 plate (~400g)'>",
  "suggestions": ["<health tip 1>", "<health tip 2>"],
  "dietaryTags": ["<e.g. vegetarian, high-protein, low-carb>"],
  "glycemicIndex": "<low|medium|high>"
}

Rules:
- Identify every visible food item accurately — do NOT guess generically.
- Calculate totalCalories by summing estimated calories for each item at the visible portion size.
- All numeric fields must be actual numbers (integers or decimals), NOT the example placeholders.
- healthRating must be exactly one of: "Excellent", "Good", "Moderate", or "Poor".
- If no food is detected in the image, respond with ONLY: {"detected": false}`;

const analyzeFood = async (req, res) => {
  try {
    const { base64, mimeType } = req.body || {};
    if (typeof base64 !== 'string' || base64.length < 100) {
      return res.status(400).json({ success: false, message: '`base64` image is required' });
    }

    const safeMime = mimeType?.trim() || 'image/jpeg';

    // ── Try Gemini Vision first ───────────────────────────────────────────────
    try {
      const geminiResp = await geminiFetch(GEMINI_MODEL_VISION, {
        contents: [{
          parts: [
            { inlineData: { mimeType: safeMime, data: base64 } },
            { text: FOOD_PROMPT },
          ],
        }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.4 },
      }, 35_000);

      if (geminiResp.ok) {
        const json = await geminiResp.json();
        const content = geminiText(json).trim().replace(/```json|```/g, '').trim();
        try {
          const result = JSON.parse(content);
          return res.json({ success: true, data: result, provider: 'gemini' });
        } catch { /* fall through to OpenAI */ }
      } else {
        const errBody = await geminiResp.text();
        console.warn('[analyzeFood] Gemini error:', geminiResp.status, errBody);
      }
    } catch (geminiErr) {
      console.warn('[analyzeFood] Gemini failed, falling back to OpenAI:', geminiErr.message);
    }

    // ── Fallback: OpenAI GPT-4o-mini Vision ──────────────────────────────────
    const oaiResp = await openAiFetch('/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(35_000),
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${safeMime};base64,${base64}`, detail: 'high' } },
            { type: 'text', text: FOOD_PROMPT },
          ],
        }],
        max_tokens: 800,
        temperature: 0.4,
      }),
    });

    if (!oaiResp.ok) {
      const body = await oaiResp.text();
      return res.status(502).json({ success: false, message: 'Food analysis failed. Both AI providers unavailable.', detail: body });
    }

    const oaiJson = await oaiResp.json();
    const content = (oaiJson?.choices?.[0]?.message?.content ?? '').trim().replace(/```json|```/g, '').trim();
    try {
      const result = JSON.parse(content);
      return res.json({ success: true, data: result, provider: 'openai' });
    } catch {
      return res.json({ success: false, message: 'Could not parse nutrition data. Please try with a clearer food photo.' });
    }
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SUGGEST CLOTHING — Gemini (primary) → OpenAI (fallback) → static defaults
// ═══════════════════════════════════════════════════════════════════════════════
const CLOTHING_DEFAULTS = {
  summary: "Dress comfortably for today's weather.",
  items: ['Comfortable clothing', 'Appropriate footwear', 'Carry water'],
  healthTips: ['Stay hydrated', 'Rest if feeling tired'],
  warning: null,
  emoji: '🌤️',
};

const suggestClothing = async (req, res) => {
  try {
    const { temperature, feelsLike, condition, humidity, windSpeed, uvIndex } = req.body || {};

    const prompt = `You are a caring health advisor for elderly users. Based on today's weather, suggest appropriate clothing and health precautions.

Current Weather:
- Temperature: ${temperature ?? 'unknown'}°C (Feels like: ${feelsLike ?? temperature ?? 'unknown'}°C)
- Condition: ${condition ?? 'Clear'}
- Humidity: ${humidity ?? 'unknown'}%
- Wind Speed: ${windSpeed ?? 'unknown'} km/h
- UV Index: ${uvIndex ?? 'unknown'}

Respond with ONLY valid JSON (no markdown):
{
  "summary": "1-sentence clothing summary tailored for elderly users",
  "items": ["item1", "item2", "item3", "item4"],
  "healthTips": ["tip1", "tip2", "tip3"],
  "warning": "important health warning for elderly if extreme weather, or null",
  "emoji": "🌤️"
}`;

    // ── Try Gemini first ──────────────────────────────────────────────────────
    try {
      const geminiResp = await geminiFetch(GEMINI_MODEL_TEXT, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.5 },
      }, 15_000);

      if (geminiResp.ok) {
        const json = await geminiResp.json();
        const content = geminiText(json).trim().replace(/```json|```/g, '').trim();
        try {
          const result = JSON.parse(content);
          return res.json({ success: true, data: result, provider: 'gemini' });
        } catch { /* fall through */ }
      }
    } catch (geminiErr) {
      console.warn('[suggestClothing] Gemini failed, falling back to OpenAI:', geminiErr.message);
    }

    // ── Fallback: OpenAI GPT-4o-mini ─────────────────────────────────────────
    try {
      const oaiResp = await openAiFetch('/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
        }),
      });

      if (oaiResp.ok) {
        const oaiJson = await oaiResp.json();
        const content = (oaiJson?.choices?.[0]?.message?.content ?? '').trim().replace(/```json|```/g, '').trim();
        try {
          const result = JSON.parse(content);
          return res.json({ success: true, data: result, provider: 'openai' });
        } catch { /* fall through to defaults */ }
      }
    } catch (oaiErr) {
      console.warn('[suggestClothing] OpenAI also failed:', oaiErr.message);
    }

    // ── Static defaults ───────────────────────────────────────────────────────
    return res.json({ success: true, data: CLOTHING_DEFAULTS });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. WELLNESS SUMMARY — Gemini (primary) → OpenAI (fallback) → static defaults
// ═══════════════════════════════════════════════════════════════════════════════
const WELLNESS_DEFAULTS = {
  overallStatus: 'Fair',
  headline: 'Keep tracking your health!',
  summary: 'Regular health tracking helps you and your family stay informed about your wellbeing.',
  highlights: ["You're taking steps to monitor your health"],
  suggestions: ['Continue logging daily', 'Drink plenty of water', 'Get regular rest'],
  alertLevel: 'normal',
};

const wellnessSummary = async (req, res) => {
  try {
    const { logs, profile } = req.body || {};

    const logsText = Array.isArray(logs) && logs.length > 0
      ? logs.map(l => `${l.type}: ${l.value} ${l.unit ?? ''} (${l.logged_at ?? 'recent'})`).join('\n')
      : 'No recent logs available.';

    const prompt = `You are a compassionate health wellness advisor for elderly users. Analyze these recent health logs and provide a gentle, encouraging summary.

User Profile: ${profile?.fullName ?? 'Elder'}, Age: ${profile?.age ?? 'unknown'}
Recent Health Logs:
${logsText}

Respond with ONLY valid JSON (no markdown):
{
  "overallStatus": "Good",
  "headline": "short encouraging headline",
  "summary": "2-3 sentences about their health trends",
  "highlights": ["positive observation 1", "positive observation 2"],
  "suggestions": ["actionable health tip 1", "actionable health tip 2", "actionable health tip 3"],
  "alertLevel": "normal"
}
overallStatus must be: "Good", "Fair", or "Needs Attention". alertLevel must be: "normal", "caution", or "alert".`;

    // ── Try Gemini first ──────────────────────────────────────────────────────
    try {
      const geminiResp = await geminiFetch(GEMINI_MODEL_TEXT, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.5 },
      }, 20_000);

      if (geminiResp.ok) {
        const json = await geminiResp.json();
        const content = geminiText(json).trim().replace(/```json|```/g, '').trim();
        try {
          const result = JSON.parse(content);
          return res.json({ success: true, data: result, provider: 'gemini' });
        } catch { /* fall through */ }
      }
    } catch (geminiErr) {
      console.warn('[wellnessSummary] Gemini failed, falling back to OpenAI:', geminiErr.message);
    }

    // ── Fallback: OpenAI GPT-4o-mini ─────────────────────────────────────────
    try {
      const oaiResp = await openAiFetch('/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600,
        }),
      });

      if (oaiResp.ok) {
        const oaiJson = await oaiResp.json();
        const content = (oaiJson?.choices?.[0]?.message?.content ?? '').trim().replace(/```json|```/g, '').trim();
        try {
          const result = JSON.parse(content);
          return res.json({ success: true, data: result, provider: 'openai' });
        } catch { /* fall through to defaults */ }
      }
    } catch (oaiErr) {
      console.warn('[wellnessSummary] OpenAI also failed:', oaiErr.message);
    }

    // ── Static defaults ───────────────────────────────────────────────────────
    return res.json({ success: true, data: WELLNESS_DEFAULTS });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. HEALTH FORECAST — Gemini Vision (primary) → OpenAI GPT-4o-mini (fallback)
//    Extracts health metrics from a report image/PDF and returns structured
//    insights + recommendations tailored for elderly users.
// ═══════════════════════════════════════════════════════════════════════════════
const FORECAST_PROMPT = `You are a medical AI assistant analyzing a health document for an elderly patient. Extract every health metric and provide a clear, simple forecast.

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "reportType": "Blood Test|Prescription|X-Ray|Scan|General Report|Unknown",
  "summary": "1-2 sentences summarizing the overall health status from this report",
  "alertLevel": "normal|caution|alert",
  "metrics": [
    {
      "name": "Metric name (e.g. Hemoglobin, Blood Sugar, Cholesterol)",
      "value": "Measured value with unit (e.g. 11.2 g/dL)",
      "status": "normal|low|high|borderline",
      "normalRange": "Normal reference range (e.g. 12-17 g/dL)",
      "insight": "1 simple sentence relevant to elderly health"
    }
  ],
  "riskFactors": ["Risk 1 identified from this report"],
  "recommendations": ["Clear, actionable recommendation for elderly patient"],
  "followUp": "When and what type of follow-up is suggested"
}

Rules:
- Extract ALL numeric values visible (blood counts, glucose, cholesterol, BP, etc.)
- For X-ray/MRI/CT: describe findings as metrics (e.g. name:"Bone Density", value:"Mild reduction")
- For prescriptions: list key medications (name: drug name, value: dosage + frequency)
- alertLevel: "normal"=all values in range, "caution"=borderline/mild abnormal, "alert"=significantly abnormal
- Recommendations must be simple and appropriate for elderly users (65+)
- If unreadable or no metrics found, respond: {"reportType":"Unknown","summary":"Could not extract health data from this document.","alertLevel":"normal","metrics":[],"riskFactors":[],"recommendations":["Please share a clearer image of your report"],"followUp":"Consult your doctor for interpretation"}`;

const FORECAST_FALLBACK = {
  reportType: 'Unknown',
  summary: 'AI analysis is currently unavailable. Please try again later.',
  alertLevel: 'normal',
  metrics: [],
  riskFactors: [],
  recommendations: ['Consult your doctor for a detailed interpretation of this report.'],
  followUp: 'Schedule a visit with your doctor to review this document.',
};

const healthForecast = async (req, res) => {
  try {
    const { base64, mimeType, category, title } = req.body || {};

    if (typeof base64 !== 'string' || base64.length < 100) {
      return res.status(400).json({ success: false, message: 'base64 document content is required' });
    }

    const safeMime = mimeType?.trim() || 'image/jpeg';
    const isImage  = safeMime.startsWith('image/');
    // Gemini supports both images and PDFs via inlineData
    const geminiSupported = isImage || safeMime === 'application/pdf';

    const contextNote = [
      title    ? `Document title: ${title}` : '',
      category ? `Document category: ${category}` : '',
    ].filter(Boolean).join('. ');
    const prompt = contextNote ? `${FORECAST_PROMPT}\n\nContext: ${contextNote}` : FORECAST_PROMPT;

    // ── Try Gemini Vision (images + PDFs) ─────────────────────────────────────
    if (geminiSupported) {
      try {
        const geminiResp = await geminiFetch(GEMINI_MODEL_VISION, {
          contents: [{
            parts: [
              { inlineData: { mimeType: safeMime, data: base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.2 },
        }, 20_000);   // keep under Railway's ~30 s proxy timeout

        if (geminiResp.ok) {
          const json    = await geminiResp.json();
          const content = geminiText(json).trim().replace(/```json|```/g, '').trim();
          try {
            const result = JSON.parse(content);
            return res.json({ success: true, data: result, provider: 'gemini' });
          } catch { /* fall through to OpenAI */ }
        } else {
          const errBody = await geminiResp.text();
          console.warn('[healthForecast] Gemini error:', geminiResp.status, errBody);
        }
      } catch (geminiErr) {
        console.warn('[healthForecast] Gemini failed, falling back to OpenAI:', geminiErr.message);
      }
    }

    // ── Fallback: OpenAI GPT-4o-mini (images only — PDFs not supported inline) ─
    // For PDFs we already tried Gemini above; skip OpenAI if it's a PDF.
    if (safeMime === 'application/pdf') {
      return res.json({ success: true, data: FORECAST_FALLBACK });
    }

    try {
      const contentParts = [
        { type: 'image_url', image_url: { url: `data:${safeMime};base64,${base64}`, detail: 'high' } },
        { type: 'text', text: prompt },
      ];

      const oaiResp = await openAiFetch('/chat/completions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  AbortSignal.timeout(35_000),
        body: JSON.stringify({
          model:       'gpt-4o-mini',
          messages:    [{ role: 'user', content: contentParts }],
          max_tokens:  1200,
          temperature: 0.2,
        }),
      });

      if (oaiResp.ok) {
        const oaiJson = await oaiResp.json();
        const content = (oaiJson?.choices?.[0]?.message?.content ?? '').trim().replace(/```json|```/g, '').trim();
        try {
          const result = JSON.parse(content);
          return res.json({ success: true, data: result, provider: 'openai' });
        } catch { /* fall through to fallback */ }
      } else {
        const errBody = await oaiResp.text();
        console.warn('[healthForecast] OpenAI error:', oaiResp.status, errBody);
      }
    } catch (oaiErr) {
      console.warn('[healthForecast] OpenAI also failed:', oaiErr.message);
    }

    return res.json({ success: true, data: FORECAST_FALLBACK });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. HEALTH FORECAST MULTI — analyse several reports together in one Gemini call
// ═══════════════════════════════════════════════════════════════════════════════
const MULTI_FORECAST_PROMPT = `You are a medical AI performing a comprehensive cross-report health analysis for an elderly patient. Multiple health documents are provided. Identify trends, improvements, and deteriorations across them.

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "reportType": "Multi-Report Analysis",
  "summary": "2-3 sentences summarising overall health trends across ALL provided documents",
  "alertLevel": "normal|caution|alert",
  "metrics": [
    {
      "name": "Metric name",
      "value": "Latest or trended value with unit",
      "status": "normal|low|high|borderline",
      "normalRange": "Reference range",
      "insight": "How this metric changed across the reports (improving / stable / worsening)"
    }
  ],
  "riskFactors": ["Risk factor identified from cross-report comparison"],
  "recommendations": ["Actionable recommendation based on multi-report trends for elderly patient"],
  "followUp": "Specific follow-up suggested based on trends seen across the documents"
}

Rules:
- Compare values across reports chronologically — always note if improving, stable, or declining.
- alertLevel: "normal" = trends positive, "caution" = some borderline trends, "alert" = significant worsening.
- If only one document is readable, still analyse it and note limited trend data.`;

const healthForecastMulti = async (req, res) => {
  try {
    const { records } = req.body || {};
    if (!Array.isArray(records) || records.length < 1) {
      return res.status(400).json({ success: false, message: 'At least one record is required' });
    }

    // Build Gemini content parts — one inlineData block per document
    const parts = [];
    for (const rec of records) {
      if (typeof rec.base64 !== 'string' || rec.base64.length < 100) continue;
      parts.push({ inlineData: { mimeType: rec.mimeType || 'image/jpeg', data: rec.base64 } });
      parts.push({ text: `[${rec.category || 'Document'}: "${rec.title || 'Record'}" — ${rec.date || 'Date unknown'}]` });
    }

    if (parts.length === 0) {
      return res.status(400).json({ success: false, message: 'No readable documents found in the selection' });
    }

    parts.push({ text: MULTI_FORECAST_PROMPT });

    // ── Try Gemini Vision ────────────────────────────────────────────────────
    try {
      const geminiResp = await geminiFetch(GEMINI_MODEL_VISION, {
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.2 },
      }, 40_000);   // keep under Railway's ~60 s proxy timeout even with N documents

      if (geminiResp.ok) {
        const json    = await geminiResp.json();
        const content = geminiText(json).trim().replace(/```json|```/g, '').trim();
        try {
          const result = JSON.parse(content);
          return res.json({ success: true, data: result, provider: 'gemini' });
        } catch { /* fall through */ }
      } else {
        const errBody = await geminiResp.text();
        console.warn('[healthForecastMulti] Gemini error:', geminiResp.status, errBody);
      }
    } catch (geminiErr) {
      console.warn('[healthForecastMulti] Gemini failed:', geminiErr.message);
    }

    return res.json({ success: true, data: {
      ...FORECAST_FALLBACK,
      reportType: 'Multi-Report Analysis',
      summary: 'AI analysis is currently unavailable. Please try again later.',
    }});
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 10. MEAL RECOMMENDATIONS — Gemini (primary) → OpenAI (fallback)
//     Personalised meal / recipe suggestions based on user's health profile + goals
// ═══════════════════════════════════════════════════════════════════════════════
const mealRecommendations = async (req, res) => {
  try {
    const { remainingCalories, totalCalories, mealType, dietType, healthContext, macroTargets } = req.body || {};

    const userId = req.supabase?.userId;
    let userHealthData = healthContext ?? '';
    if (!userHealthData && userId) {
      try {
        const { buildUserContext } = require('../services/rag.service');
        userHealthData = await buildUserContext(userId);
      } catch { /* ignore */ }
    }

    const mealLabel = mealType ?? 'any meal';
    const calTarget = remainingCalories ?? 500;
    const macroNote = macroTargets
      ? `Macro targets remaining: Protein ${macroTargets.protein ?? '?'}g, Carbs ${macroTargets.carbs ?? '?'}g, Fat ${macroTargets.fat ?? '?'}g.`
      : '';
    const dietNote = dietType && dietType !== 'balanced' ? `Diet type: ${dietType}.` : '';

    const prompt = `You are a certified nutritionist and chef specialising in elderly healthcare nutrition. Suggest 3 personalised, practical meal options for an elderly Indian user.

Meal context:
- Meal type: ${mealLabel}
- Remaining calories for today: ~${calTarget} kcal (daily goal: ${totalCalories ?? 2000} kcal)
${macroNote}
${dietNote}

User health profile:
${userHealthData || 'No specific health data available — suggest generally healthy options.'}

Requirements:
- Each meal must be realistic for an elderly person to prepare or order in India
- Keep ingredients simple, affordable, and widely available
- Respect medical conditions (e.g. diabetic → low glycemic, heart disease → low sodium/fat)
- Respect allergies strictly — never include allergens
- Include regional Indian options where appropriate

Respond with ONLY valid JSON, no markdown:
{
  "recommendations": [
    {
      "name": "Meal name",
      "description": "1 sentence — why this is good for them",
      "mealType": "${mealLabel}",
      "calories": 320,
      "protein": 12,
      "carbs": 48,
      "fat": 8,
      "fiber": 6,
      "healthScore": 9,
      "dietaryTags": ["Diabetic-friendly", "Heart-healthy"],
      "prepTime": "15 min",
      "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}
Provide exactly 3 recommendations. All numeric fields must be real numbers, not placeholders.`;

    // ── Try Gemini ─────────────────────────────────────────────────────────────
    try {
      const geminiResp = await geminiFetch(GEMINI_MODEL_TEXT, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.6 },
      }, 30_000);

      if (geminiResp.ok) {
        const json = await geminiResp.json();
        const content = geminiText(json).trim().replace(/```json|```/g, '').trim();
        try {
          const result = JSON.parse(content);
          if (Array.isArray(result?.recommendations)) {
            return res.json({ success: true, data: result, provider: 'gemini' });
          }
        } catch { /* fall through */ }
      }
    } catch (geminiErr) {
      console.warn('[mealRecs] Gemini failed, falling back to OpenAI:', geminiErr.message);
    }

    // ── Fallback: OpenAI ───────────────────────────────────────────────────────
    try {
      const oaiResp = await openAiFetch('/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.6,
        }),
      });

      if (oaiResp.ok) {
        const oaiJson = await oaiResp.json();
        const content = (oaiJson?.choices?.[0]?.message?.content ?? '').trim().replace(/```json|```/g, '').trim();
        try {
          const result = JSON.parse(content);
          if (Array.isArray(result?.recommendations)) {
            return res.json({ success: true, data: result, provider: 'openai' });
          }
        } catch { /* fall through */ }
      }
    } catch (oaiErr) {
      console.warn('[mealRecs] OpenAI also failed:', oaiErr.message);
    }

    return res.status(502).json({ success: false, message: 'Could not generate meal recommendations. Please try again.' });
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Server error' });
  }
};

module.exports = { chat, clearConversation, transcribe, tts, analyzeReport, analyzeFood, suggestClothing, wellnessSummary, healthForecast, healthForecastMulti, mealRecommendations };
