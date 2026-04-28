const express = require('express');
const router = express.Router();

const { requireSupabaseAuth } = require('../middleware/supabaseAuth.middleware');
const { chat, transcribe, tts } = require('../controllers/ai.controller');

router.post('/chat', requireSupabaseAuth, chat);
router.post('/transcribe', requireSupabaseAuth, transcribe);
router.post('/tts', requireSupabaseAuth, tts);

module.exports = router;

