const express = require('express');
const router = express.Router();
const Journal = require('../models/Journal');
const { protect } = require('../middleware/auth.middleware');

// @route   GET /api/journal/latest-prompt
// @desc    Get the latest daily prompt for user
router.get('/latest-prompt', protect, async (req, res) => {
  try {
    const prompts = [
      "What was the most memorable journey of your life?",
      "Who was your best friend in childhood?",
      "What is your favorite family recipe and its story?",
      "Describe a place that makes you feel peaceful.",
      "What is the most valuable lesson you've learned?"
    ];
    // For now, randomly pick a prompt or use day of week
    const day = new Date().getDay();
    res.json({ success: true, data: { prompt: prompts[day % prompts.length] } });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/journal
// @desc    Save a journal entry
router.post('/', protect, async (req, res) => {
  try {
    const newEntry = new Journal({
      ...req.body,
      user: req.user.id,
      date: new Date().toISOString().split('T')[0]
    });
    const entry = await newEntry.save();
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
