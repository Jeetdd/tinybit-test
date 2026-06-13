const express = require('express');
const router = express.Router();

const { requireSupabaseAuth } = require('../middleware/supabaseAuth.middleware');
const {
  chat,
  clearConversation,
  transcribe,
  tts,
  analyzeReport,
  analyzeFood,
  suggestClothing,
  wellnessSummary,
  healthForecast,
  healthForecastMulti,
  mealRecommendations,
} = require('../controllers/ai.controller');

// Sathi AI core — chat & conversation use req.supabase.userId for memory persistence
router.post('/chat',            requireSupabaseAuth, chat);
router.delete('/conversation',  requireSupabaseAuth, clearConversation);
router.post('/transcribe',      transcribe);          // no user data — just Whisper transcription
router.post('/tts',             tts);                 // no user data — just speech synthesis

// Health document analysis — pure vision/analysis, no user data read/written
router.post('/analyze-report',        analyzeReport);
router.post('/analyze-food',          analyzeFood);
router.post('/suggest-clothing',      suggestClothing);
router.post('/wellness-summary',      wellnessSummary);
router.post('/health-forecast',       healthForecast);
router.post('/health-forecast-multi', healthForecastMulti);

// Meal recommendations — userId used optionally for health context (graceful without)
router.post('/meal-recommendations',  mealRecommendations);

module.exports = router;
