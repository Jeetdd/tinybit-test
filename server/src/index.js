const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/medicines', require('./routes/medicine.routes'));
app.use('/api/health-stats', require('./routes/health.routes'));
app.use('/api/journal', require('./routes/journal.routes'));
app.use('/api/messages', require('./routes/message.routes'));
app.use('/api/care-events', require('./routes/care_events.routes'));
app.use('/api/health-records', require('./routes/health_records.routes'));
app.use('/api/ai',       require('./routes/ai.routes'));
app.use('/api/guardian',    require('./routes/guardian.routes'));
app.use('/api/health-card', require('./routes/health-card.routes'));
app.use('/admin',           require('./routes/admin.routes'));

// Health check
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
  console.log(`\n🚀 TinyBit Server running on http://0.0.0.0:${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV}`);
});
