const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

// ── Health check first — no deps, responds instantly ─────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TinyBit API is running' });
});

// ── Start listening immediately so healthcheck can always get a response ──────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 TinyBit Server running on port ${PORT}`);
  console.log(`✅ Node: ${process.version}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV ?? 'development'}`);

  // Warn about missing optional vars (don't crash — let routes handle it)
  if (!process.env.SUPABASE_URL)            console.warn('⚠️  SUPABASE_URL not set');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set');
  if (!process.env.OPENAI_API_KEY)          console.warn('⚠️  OPENAI_API_KEY not set');
  if (!process.env.GEMINI_API_KEY)          console.warn('⚠️  GEMINI_API_KEY not set');
});

// ── Routes — loaded after server is already listening ────────────────────────
try {
  app.use('/api/ai',          require('./routes/ai.routes'));
  app.use('/api/guardian',    require('./routes/guardian.routes'));
  app.use('/api/health-card', require('./routes/health-card.routes'));
  app.use('/admin',           require('./routes/admin.routes'));
  console.log('✅ All routes loaded');
} catch (err) {
  console.error('❌ Route load error:', err.message);
  console.error(err.stack);
  // Server stays alive — healthcheck passes, but feature routes fail
}

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});
