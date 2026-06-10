const { supabaseClient } = require('../config/supabase');

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchProfile(userId) {
  const { data } = await supabaseClient
    .from('profiles')
    .select('full_name, first_name, age, gender, medical_conditions, other_condition, allergies, doctor_name, doctor_contact, medications')
    .eq('id', userId)
    .single();
  return data;
}

async function fetchActiveMedicines(userId) {
  const { data } = await supabaseClient
    .from('medicines')
    .select('name, dosage, dosage_unit, schedule_time, frequency, category, priority, notes, prescribed_by')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(30);
  return data || [];
}

async function fetchRecentHealthStats(userId) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseClient
    .from('health_stats')
    .select(
      'blood_sugar,blood_sugar_unit,blood_sugar_status,blood_sugar_fasting,' +
      'blood_pressure_sys,blood_pressure_dia,blood_pressure_status,' +
      'heart_rate,heart_rate_status,' +
      'sleep_duration,sleep_quality,' +
      'oxygen_saturation,oxygen_saturation_status,' +
      'weight,weight_unit,' +
      'temperature,temperature_unit,temperature_status,' +
      'recorded_at,notes'
    )
    .eq('user_id', userId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: false })
    .limit(14);
  return data || [];
}

async function fetchRecentJournal(userId) {
  const { data } = await supabaseClient
    .from('journal')
    .select('type, content, prompt, created_at')
    .eq('user_id', userId)
    .eq('type', 'Written')
    .order('created_at', { ascending: false })
    .limit(8);
  return data || [];
}

async function fetchRecentMoods(userId) {
  const { data } = await supabaseClient
    .from('moods')
    .select('mood, mood_score, factors, activities, notes, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7);
  return data || [];
}

// ── Conversation memory ───────────────────────────────────────────────────────

async function loadConversationHistory(userId, limit = 20) {
  const { data, error } = await supabaseClient
    .from('ai_conversations')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[RAG] loadConversationHistory error:', error.message);
    return [];
  }
  return (data || []).reverse();
}

async function saveConversationTurns(userId, userContent, assistantContent) {
  const now = new Date().toISOString();
  const rows = [
    { user_id: userId, role: 'user',      content: userContent,      created_at: now },
    { user_id: userId, role: 'assistant', content: assistantContent, created_at: new Date(Date.now() + 1).toISOString() },
  ];
  const { error } = await supabaseClient.from('ai_conversations').insert(rows);
  if (error) console.warn('[RAG] saveConversationTurns error:', error.message);
}

async function clearConversationHistory(userId) {
  const { error } = await supabaseClient
    .from('ai_conversations')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

// ── Context formatter ─────────────────────────────────────────────────────────

function formatHealthContext(profile, medicines, healthStats, journals, moods) {
  const sections = [];

  // Profile
  if (profile) {
    const name = profile.full_name || profile.first_name || 'User';
    const parts = [`Name: ${name}`];
    if (profile.age) parts.push(`Age: ${profile.age}`);
    if (profile.gender) parts.push(`Gender: ${profile.gender}`);

    const conditions = (profile.medical_conditions || []).filter(Boolean);
    if (profile.other_condition?.trim()) conditions.push(profile.other_condition.trim());
    if (conditions.length) parts.push(`Medical Conditions: ${conditions.join(', ')}`);

    const allergies = (profile.allergies || []).filter(Boolean);
    if (allergies.length) parts.push(`Allergies: ${allergies.join(', ')}`);

    if (profile.doctor_name?.trim()) {
      const doc = [`Doctor: ${profile.doctor_name.trim()}`];
      if (profile.doctor_contact?.trim()) doc.push(profile.doctor_contact.trim());
      parts.push(doc.join(' — '));
    }

    sections.push(`PATIENT PROFILE:\n${parts.join(' | ')}`);
  }

  // Medicines
  if (medicines.length > 0) {
    const medLines = medicines.map(m => {
      const dosage = [m.dosage, m.dosage_unit].filter(Boolean).join(' ');
      const detail = [m.schedule_time, m.frequency].filter(Boolean).join(', ');
      const extra = [m.prescribed_by ? `Dr. ${m.prescribed_by}` : null, m.notes].filter(Boolean).join(' — ');
      return `• ${m.name}${dosage ? ' ' + dosage : ''}${detail ? ' (' + detail + ')' : ''}${extra ? ' [' + extra + ']' : ''}`;
    });
    sections.push(`CURRENT MEDICINES (${medicines.length}):\n${medLines.join('\n')}`);
  } else {
    sections.push('CURRENT MEDICINES:\nNo active medicines recorded.');
  }

  // Health stats
  if (healthStats.length > 0) {
    const statLines = healthStats.map(s => {
      const d = new Date(s.recorded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const items = [];
      if (s.blood_sugar != null)
        items.push(`Sugar: ${s.blood_sugar}${s.blood_sugar_unit || 'mg/dL'}${s.blood_sugar_fasting ? ' (fasting)' : ''}${s.blood_sugar_status ? ' [' + s.blood_sugar_status + ']' : ''}`);
      if (s.blood_pressure_sys != null && s.blood_pressure_dia != null)
        items.push(`BP: ${s.blood_pressure_sys}/${s.blood_pressure_dia} mmHg${s.blood_pressure_status ? ' [' + s.blood_pressure_status + ']' : ''}`);
      if (s.heart_rate != null)
        items.push(`HR: ${s.heart_rate} bpm${s.heart_rate_status ? ' [' + s.heart_rate_status + ']' : ''}`);
      if (s.sleep_duration != null)
        items.push(`Sleep: ${s.sleep_duration}h${s.sleep_quality ? ' [' + s.sleep_quality + ']' : ''}`);
      if (s.oxygen_saturation != null)
        items.push(`SpO2: ${s.oxygen_saturation}%${s.oxygen_saturation_status ? ' [' + s.oxygen_saturation_status + ']' : ''}`);
      if (s.weight != null)
        items.push(`Weight: ${s.weight} ${s.weight_unit || 'kg'}`);
      if (s.temperature != null)
        items.push(`Temp: ${s.temperature}°${s.temperature_unit || 'C'}${s.temperature_status ? ' [' + s.temperature_status + ']' : ''}`);
      if (s.notes?.trim())
        items.push(`Note: ${s.notes.trim()}`);
      return items.length ? `[${d}] ${items.join(', ')}` : null;
    }).filter(Boolean);
    if (statLines.length)
      sections.push(`HEALTH LOGS (last 7 days):\n${statLines.join('\n')}`);
  }

  // Journal
  if (journals.length > 0) {
    const jLines = journals.map(j => {
      const d = new Date(j.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const text = j.content.length > 250 ? j.content.slice(0, 250) + '…' : j.content;
      return `[${d}]${j.prompt ? ' Prompt: "' + j.prompt + '" →' : ''} ${text}`;
    });
    sections.push(`MEMORY JOURNAL (recent entries):\n${jLines.join('\n')}`);
  }

  // Moods
  if (moods.length > 0) {
    const mLines = moods.map(m => {
      const d = new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const extras = [];
      if ((m.factors || []).length) extras.push('Factors: ' + m.factors.join(', '));
      if ((m.activities || []).length) extras.push('Activities: ' + m.activities.join(', '));
      if (m.notes?.trim()) extras.push('Note: ' + m.notes.trim());
      return `[${d}] ${m.mood} (score ${m.mood_score}/5)${extras.length ? ' — ' + extras.join('; ') : ''}`;
    });
    sections.push(`MOOD HISTORY (last 7 days):\n${mLines.join('\n')}`);
  }

  return sections.join('\n\n');
}

// ── Public API ────────────────────────────────────────────────────────────────

async function buildUserContext(userId) {
  try {
    const [profile, medicines, healthStats, journals, moods] = await Promise.allSettled([
      fetchProfile(userId),
      fetchActiveMedicines(userId),
      fetchRecentHealthStats(userId),
      fetchRecentJournal(userId),
      fetchRecentMoods(userId),
    ]);

    return formatHealthContext(
      profile.status  === 'fulfilled' ? profile.value   : null,
      medicines.status === 'fulfilled' ? medicines.value : [],
      healthStats.status === 'fulfilled' ? healthStats.value : [],
      journals.status === 'fulfilled' ? journals.value : [],
      moods.status === 'fulfilled' ? moods.value : [],
    );
  } catch (err) {
    console.warn('[RAG] buildUserContext error:', err.message);
    return '';
  }
}

module.exports = { buildUserContext, loadConversationHistory, saveConversationTurns, clearConversationHistory };
