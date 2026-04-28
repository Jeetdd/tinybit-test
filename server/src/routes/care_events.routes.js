const express = require('express');
const router = express.Router();
const CareEvent = require('../models/CareEvent');
const { protect } = require('../middleware/auth.middleware');

// @route   GET /api/care-events
// @desc    Get all care events for the logged in user
router.get('/', protect, async (req, res) => {
  try {
    const events = await CareEvent.find({ user: req.user.id }).sort({ timestamp: 1 });
    res.json({ success: true, count: events.length, data: events });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/care-events
// @desc    Create a new care event
router.post('/', protect, async (req, res) => {
  try {
    const newEvent = new CareEvent({
      ...req.body,
      user: req.user.id
    });

    const event = await newEvent.save();
    res.json({ success: true, data: event });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
