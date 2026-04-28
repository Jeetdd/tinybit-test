const express = require('express');
const router = express.Router();
const HealthStats = require('../models/HealthStats');
const { protect } = require('../middleware/auth.middleware');

// @route   GET /api/health-stats
// @desc    Get latest health stats for user
router.get('/latest',protect, async (req, res) => {
  try {
    const stats = await HealthStats.findOne({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/health-stats
// @desc    Add new health stats
router.post('/',protect, async (req, res) => {
  try {
    const newStats = new HealthStats({
      ...req.body,
      user: req.user.id
    });
    const stats = await newStats.save();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
