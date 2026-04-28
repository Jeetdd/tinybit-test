const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getStreaks,
  getStreak,
  updateStreak,
  getStreakHistory,
  resetStreak,
  getStreakSummary,
} = require('../controllers/streak.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all streaks
router.get('/', protect, getStreaks);

// Get streak summary
router.get('/summary', protect, getStreakSummary);

// Get single streak
router.get('/:type', protect, getStreak);

// Update streak
router.post(
  '/:type/update',
  protect,
  [
    body('date').optional().isDate().withMessage('Invalid date format'),
    body('value').optional().isInt({ min: 0 }).withMessage('Value must be a non-negative integer'),
  ],
  updateStreak
);

// Get streak history
router.get('/:type/history', protect, getStreakHistory);

// Reset streak
router.post('/:type/reset', protect, resetStreak);

module.exports = router;