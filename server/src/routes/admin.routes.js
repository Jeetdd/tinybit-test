const express = require('express');
const router = express.Router();
const {
  serveDashboard,
  getStats,
  getUsers,
  getConnections,
  banUser,
  deleteConnection,
} = require('../controllers/admin.controller');

// Simple API-key auth for all /admin/api/* endpoints
const adminAuth = (req, res, next) => {
  // Dashboard HTML — use HTTP Basic Auth
  if (req.path === '/') return next();

  const key = req.headers['x-admin-key'] ?? req.query.key;
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
};

// Basic Auth for the dashboard page
const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="TinyBit Admin"');
    return res.status(401).send('Authentication required');
  }
  const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString().split(':');
  if (
    user !== (process.env.ADMIN_USERNAME ?? 'admin') ||
    pass !== (process.env.ADMIN_PASSWORD ?? 'tinybit2025')
  ) {
    res.set('WWW-Authenticate', 'Basic realm="TinyBit Admin"');
    return res.status(401).send('Invalid credentials');
  }
  return next();
};

router.get('/',                   basicAuth, serveDashboard);
router.get('/api/stats',          adminAuth, getStats);
router.get('/api/users',          adminAuth, getUsers);
router.get('/api/connections',    adminAuth, getConnections);
router.patch('/api/users/:id/ban',    adminAuth, banUser);
router.delete('/api/connections/:id', adminAuth, deleteConnection);

module.exports = router;
