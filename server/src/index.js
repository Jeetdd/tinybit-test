const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// ── Startup env check ──────────────────────────────────────────────────────────
const REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  console.error('   Add them in Railway → your service → Variables.');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

// Routes (all Supabase-backed)
app.use('/api/ai',          require('./routes/ai.routes'));
app.use('/api/guardian',    require('./routes/guardian.routes'));
app.use('/api/health-card', require('./routes/health-card.routes'));
app.use('/admin',           require('./routes/admin.routes'));

// Health check — must respond before any DB call
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TinyBit API is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 TinyBit Server running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`✅ Database: Supabase`);
});
