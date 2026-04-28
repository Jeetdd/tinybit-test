const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getMoods,
  getMoodByDate,
  getMoodStats,
  createMood,
  updateMood,
  deleteMood,
} = require('../controllers/mood.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all moods
router.get('/', protect, getMoods);

// Get mood statistics
router.get('/stats', protect, getMoodStats);

// Get mood for specific date
router.get('/:date', protect, getMoodByDate);

// Create new mood entry
router.post(
  '/',
  protect,
  [
    body('mood').notEmpty().withMessage('Mood is required'),
    body('moodScore')
      .isInt({ min: 1, max: 5 })
      .withMessage('Mood score must be between 1 and 5'),
  ],
  createMood
);

// Update mood entry
router.put(
  '/:id',
  protect,
  [
    body('mood').optional().notEmpty().withMessage('Mood cannot be empty'),
    body('moodScore')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Mood score must be between 1 and 5'),
  ],
  updateMood
);

// Delete mood entry
router.delete('/:id', protect, deleteMood);

module.exports = router;