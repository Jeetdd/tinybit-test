const MindGame = require('../models/MindGame');
const { validationResult } = require('express-validator');

// @desc   Get all mind games for user
// @route  GET /api/mindgames
// @access Private
const getMindGames = async (req, res) => {
  try {
    const { gameType, startDate, endDate, limit = 50 } = req.query;

    const query = { user: req.user.id };

    if (gameType) query.gameType = gameType;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const games = await MindGame.find(query)
      .sort({ completedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: games.length,
      data: games,
    });
  } catch (error) {
    console.error('Get mind games error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get mind game statistics
// @route  GET /api/mindgames/stats
// @access Private
const getMindGameStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const games = await MindGame.find({
      user: req.user.id,
      date: { $gte: startDate.toISOString().split('T')[0] },
    });

    const stats = {
      totalGames: games.length,
      averageScore: 0,
      averagePercentage: 0,
      averageTime: 0,
      byGameType: {},
      byDifficulty: {
        Easy: { count: 0, avgScore: 0 },
        Medium: { count: 0, avgScore: 0 },
        Hard: { count: 0, avgScore: 0 },
      },
      recentTrend: [],
      bestScores: {},
    };

    if (games.length > 0) {
      stats.averageScore = games.reduce((sum, g) => sum + g.score, 0) / games.length;
      stats.averagePercentage = games.reduce((sum, g) => sum + g.percentage, 0) / games.length;
      stats.averageTime = games.reduce((sum, g) => sum + g.timeTaken, 0) / games.length;

      // Group by game type
      games.forEach((game) => {
        if (!stats.byGameType[game.gameType]) {
          stats.byGameType[game.gameType] = {
            count: 0,
            avgScore: 0,
            avgPercentage: 0,
            bestScore: 0,
          };
        }
        stats.byGameType[game.gameType].count++;
        stats.byGameType[game.gameType].avgScore += game.score;
        stats.byGameType[game.gameType].avgPercentage += game.percentage;
        if (game.score > stats.byGameType[game.gameType].bestScore) {
          stats.byGameType[game.gameType].bestScore = game.score;
        }

        // Group by difficulty
        stats.byDifficulty[game.difficulty].count++;
        stats.byDifficulty[game.difficulty].avgScore += game.score;

        // Track best scores
        if (!stats.bestScores[game.gameType] || game.score > stats.bestScores[game.gameType]) {
          stats.bestScores[game.gameType] = game.score;
        }
      });

      // Calculate averages
      Object.keys(stats.byGameType).forEach((type) => {
        const typeStats = stats.byGameType[type];
        typeStats.avgScore = Math.round(typeStats.avgScore / typeStats.count);
        typeStats.avgPercentage = Math.round(typeStats.avgPercentage / typeStats.count);
      });

      Object.keys(stats.byDifficulty).forEach((diff) => {
        const diffStats = stats.byDifficulty[diff];
        if (diffStats.count > 0) {
          diffStats.avgScore = Math.round(diffStats.avgScore / diffStats.count);
        }
      });

      // Recent trend (last 7 days)
      const recentGames = games.slice(0, 7);
      stats.recentTrend = recentGames.map((g) => ({
        date: g.date,
        gameType: g.gameType,
        score: g.score,
        percentage: g.percentage,
      }));
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get mind game stats error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get leaderboard
// @route  GET /api/mindgames/leaderboard
// @access Private
const getLeaderboard = async (req, res) => {
  try {
    const { gameType, limit = 10 } = req.query;

    const query = {};
    if (gameType) query.gameType = gameType;

    const leaderboard = await MindGame.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$user',
          totalScore: { $sum: '$score' },
          gamesPlayed: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          profileImage: '$user.profileImage',
          totalScore: 1,
          gamesPlayed: 1,
          averagePercentage: { $round: ['$averagePercentage', 2] },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Create new mind game result
// @route  POST /api/mindgames
// @access Private
const createMindGame = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { gameType, gameName, difficulty, score, maxScore, timeTaken, questions } = req.body;

    const today = new Date().toISOString().split('T')[0];

    const game = await MindGame.create({
      user: req.user.id,
      gameType,
      gameName,
      difficulty,
      score,
      maxScore,
      timeTaken,
      questions,
      date: today,
    });

    res.status(201).json({
      success: true,
      message: 'Game result saved successfully',
      data: game,
    });
  } catch (error) {
    console.error('Create mind game error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get single mind game result
// @route  GET /api/mindgames/:id
// @access Private
const getMindGame = async (req, res) => {
  try {
    const game = await MindGame.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    res.json({ success: true, data: game });
  } catch (error) {
    console.error('Get mind game error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Delete mind game result
// @route  DELETE /api/mindgames/:id
// @access Private
const deleteMindGame = async (req, res) => {
  try {
    const game = await MindGame.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    await MindGame.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Game result deleted successfully',
    });
  } catch (error) {
    console.error('Delete mind game error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getMindGames,
  getMindGameStats,
  getLeaderboard,
  createMindGame,
  getMindGame,
  deleteMindGame,
};