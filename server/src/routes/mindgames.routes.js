const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getMindGames,
  getMindGameStats,
  getLeaderboard,
  createMindGame,
  getMindGame,
  deleteMindGame,
} = require('../controllers/mindgames.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all mind games
router.get('/', protect, getMindGames);

// Get mind game statistics
router.get('/stats', protect, getMindGameStats);

// Get leaderboard
router.get('/leaderboard', protect, getLeaderboard);

// Create new mind game result
router.post(
  '/',
  protect,
  [
    body('gameType').notEmpty().withMessage('Game type is required'),
    body('gameName').notEmpty().withMessage('Game name is required'),
    body('score').isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
    body('maxScore').isInt({ min: 1 }).withMessage('Max score must be a positive integer'),
    body('timeTaken').isInt({ min: 0 }).withMessage('Time taken must be a non-negative integer'),
  ],
  createMindGame
);

// Get single mind game result
router.get('/:id', protect, getMindGame);

// Delete mind game result
router.delete('/:id', protect, deleteMindGame);

module.exports = router;