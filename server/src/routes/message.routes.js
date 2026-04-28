const express = require('express');
const router = express.Router();
const FamilyMessage = require('../models/FamilyMessage');
const { protect } = require('../middleware/auth.middleware');

// @route   GET /api/messages/latest
// @desc    Get latest messages for the user
router.get('/latest', protect, async (req, res) => {
  try {
    const messages = await FamilyMessage.find({ receiver: req.user.id })
      .populate('sender', 'fullName')
      .sort({ createdAt: -1 })
      .limit(5);
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/messages
// @desc    Send a message
router.post('/', protect, async (req, res) => {
  try {
    const newMessage = new FamilyMessage({
      ...req.body,
      sender: req.user.id
    });
    const message = await newMessage.save();
    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
