const express = require('express');
const path = require('path');
const router = express.Router();

const {
  checkSession,
  login, logout,
  getStats, getAnalytics,
  getUsers, banUser, deleteUser,
  getConnections, deleteConnection,
  getMedicines,
  getCheckIns,
  getMoods,
  getAIConversations,
  getCareEvents,
  getMindGames,
  broadcast,
} = require('../controllers/admin.controller');

const PANEL_DIR = path.join(__dirname, '../../public/admin');

// Serve static assets from the React build (JS, CSS, images, etc.)
router.use(express.static(PANEL_DIR));

// Session auth middleware — applied to all /api/* routes except /api/login
const sessionAuth = (req, res, next) => {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!checkSession(auth.slice(7))) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
  return next();
};

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post('/api/login',  login);
router.post('/api/logout', sessionAuth, logout);

// ── Stats & analytics ─────────────────────────────────────────────────────────
router.get('/api/stats',     sessionAuth, getStats);
router.get('/api/analytics', sessionAuth, getAnalytics);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/api/users',             sessionAuth, getUsers);
router.patch('/api/users/:id/ban',   sessionAuth, banUser);
router.delete('/api/users/:id',      sessionAuth, deleteUser);

// ── Connections ───────────────────────────────────────────────────────────────
router.get('/api/connections',           sessionAuth, getConnections);
router.delete('/api/connections/:id',    sessionAuth, deleteConnection);

// ── App data ──────────────────────────────────────────────────────────────────
router.get('/api/medicines',        sessionAuth, getMedicines);
router.get('/api/check-ins',        sessionAuth, getCheckIns);
router.get('/api/moods',            sessionAuth, getMoods);
router.get('/api/ai-conversations', sessionAuth, getAIConversations);
router.get('/api/care-events',      sessionAuth, getCareEvents);
router.get('/api/mind-games',       sessionAuth, getMindGames);

// ── Broadcast ─────────────────────────────────────────────────────────────────
router.post('/api/broadcast', sessionAuth, broadcast);

// ── SPA catch-all — must be last ──────────────────────────────────────────────
// Any non-API GET request (e.g. /admin/users/elders) serves the React app shell
router.get('*', (req, res) => {
  res.sendFile(path.join(PANEL_DIR, 'index.html'));
});

module.exports = router;
