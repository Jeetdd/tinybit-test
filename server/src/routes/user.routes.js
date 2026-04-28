const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const User = require('../models/User');

// @desc   Get user profile
// @route  GET /api/users/profile
// @access Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc   Update user profile
// @route  PUT /api/users/profile
// @access Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone, dateOfBirth, profileImage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, phone, dateOfBirth, profileImage },
      { new: true, runValidators: true }
    );
    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
