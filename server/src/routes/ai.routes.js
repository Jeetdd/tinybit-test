const express = require('express');
const router = express.Router();

const { requireSupabaseAuth } = require('../middleware/supabaseAuth.middleware');
const {
  chat,
  transcribe,
  tts,
  analyzeReport,
  analyzeFood,
  suggestClothing,
  wellnessSummary,
} = require('../controllers/ai.controller');

// Sathi AI core
router.post('/chat',            requireSupabaseAuth, chat);
router.post('/transcribe',      requireSupabaseAuth, transcribe);
router.post('/tts',             requireSupabaseAuth, tts);

// Health document analysis
router.post('/analyze-report',  requireSupabaseAuth, analyzeReport);

// New AI features
router.post('/analyze-food',    requireSupabaseAuth, analyzeFood);       // Calorie calculator
router.post('/suggest-clothing',requireSupabaseAuth, suggestClothing);   // Weather AI suggestions
router.post('/wellness-summary',requireSupabaseAuth, wellnessSummary);   // Wellness log AI summary

module.exports = router;
