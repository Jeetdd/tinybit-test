const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getCheckIns,
  getCheckInByDate,
  getCheckInStats,
  createCheckIn,
  updateCheckIn,
  deleteCheckIn,
} = require('../controllers/checkin.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all daily check-ins
router.get('/', protect, getCheckIns);

// Get check-in statistics
router.get('/stats', protect, getCheckInStats);

// Get check-in for specific date
router.get('/:date', protect, getCheckInByDate);

// Create new daily check-in
router.post(
  '/',
  protect,
  [
    body('moodScore')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Mood score must be between 1 and 5'),
    body('sleepHours')
      .optional()
      .isFloat({ min: 0, max: 24 })
      .withMessage('Sleep hours must be between 0 and 24'),
    body('painLevel')
      .optional()
      .isInt({ min: 0, max: 10 })
      .withMessage('Pain level must be between 0 and 10'),
    body('activityMinutes')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Activity minutes must be a non-negative integer'),
  ],
  createCheckIn
);

// Update check-in
router.put(
  '/:id',
  protect,
  [
    body('moodScore')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Mood score must be between 1 and 5'),
    body('sleepHours')
      .optional()
      .isFloat({ min: 0, max: 24 })
      .withMessage('Sleep hours must be between 0 and 24'),
  ],
  updateCheckIn
);

// Delete check-in
router.delete('/:id', protect, deleteCheckIn);

module.exports = router;