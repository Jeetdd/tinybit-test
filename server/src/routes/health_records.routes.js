const express = require('express');
const router = express.Router();
const HealthRecord = require('../models/HealthRecord');
const { protect } = require('../middleware/auth.middleware');

// @route   GET /api/health-records
// @desc    Get all health records for the logged in user
router.get('/', protect, async (req, res) => {
  try {
    const records = await HealthRecord.find({ user: req.user.id }).sort({ timestamp: -1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/health-records
// @desc    Create a new health record
router.post('/', protect, async (req, res) => {
  try {
    const newRecord = new HealthRecord({
      ...req.body,
      user: req.user.id
    });

    const record = await newRecord.save();
    res.json({ success: true, data: record });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
