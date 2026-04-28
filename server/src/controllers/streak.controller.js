const Streak = require('../models/Streak');
const { validationResult } = require('express-validator');

// @desc   Get all streaks for user
// @route  GET /api/streaks
// @access Private
const getStreaks = async (req, res) => {
  try {
    const streaks = await Streak.find({
      user: req.user.id,
      isActive: true,
    });

    res.json({
      success: true,
      count: streaks.length,
      data: streaks,
    });
  } catch (error) {
    console.error('Get streaks error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get single streak
// @route  GET /api/streaks/:type
// @access Private
const getStreak = async (req, res) => {
  try {
    const { type } = req.params;

    const streak = await Streak.findOne({
      user: req.user.id,
      type,
      isActive: true,
    });

    if (!streak) {
      // Create new streak if it doesn't exist
      const newStreak = await Streak.create({
        user: req.user.id,
        type,
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0,
        history: [],
        milestones: [],
      });

      return res.json({ success: true, data: newStreak });
    }

    res.json({ success: true, data: streak });
  } catch (error) {
    console.error('Get streak error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Update streak (called when user completes activity)
// @route  POST /api/streaks/:type/update
// @access Private
const updateStreak = async (req, res) => {
  try {
    const { type } = req.params;
    const { date, value } = req.body;

    const today = date || new Date().toISOString().split('T')[0];

    let streak = await Streak.findOne({
      user: req.user.id,
      type,
    });

    if (!streak) {
      streak = await Streak.create({
        user: req.user.id,
        type,
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0,
        history: [],
        milestones: [],
      });
    }

    // Check if already completed today
    const existingEntry = streak.history.find((h) => h.date === today);

    if (existingEntry) {
      existingEntry.completed = true;
      existingEntry.value = value || 1;
    } else {
      streak.history.push({
        date: today,
        completed: true,
        value: value || 1,
      });
    }

    // Calculate streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayEntry = streak.history.find((h) => h.date === yesterdayStr);

    if (yesterdayEntry && yesterdayEntry.completed) {
      // Continue streak
      streak.currentStreak++;
    } else if (streak.lastActiveDate !== today) {
      // Reset streak (unless it's today)
      streak.currentStreak = 1;
    }

    // Update longest streak
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;

      // Check for milestones
      const milestones = [7, 14, 30, 60, 90, 180, 365];
      if (milestones.includes(streak.currentStreak)) {
        streak.milestones.push({
          streak: streak.currentStreak,
          achievedAt: new Date(),
          reward: `${streak.currentStreak} day milestone!`,
        });
      }
    }

    streak.lastActiveDate = today;
    streak.totalDays = streak.history.filter((h) => h.completed).length;

    await streak.save();

    res.json({
      success: true,
      message: 'Streak updated successfully',
      data: streak,
    });
  } catch (error) {
    console.error('Update streak error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get streak history
// @route  GET /api/streaks/:type/history
// @access Private
const getStreakHistory = async (req, res) => {
  try {
    const { type } = req.params;
    const { days = 30 } = req.query;

    const streak = await Streak.findOne({
      user: req.user.id,
      type,
    });

    if (!streak) {
      return res.status(404).json({ success: false, message: 'Streak not found' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const history = streak.history.filter(
      (h) => new Date(h.date) >= startDate
    );

    res.json({
      success: true,
      data: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        totalDays: streak.totalDays,
        history,
      },
    });
  } catch (error) {
    console.error('Get streak history error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Reset streak (for testing or manual reset)
// @route  POST /api/streaks/:type/reset
// @access Private
const resetStreak = async (req, res) => {
  try {
    const { type } = req.params;

    const streak = await Streak.findOne({
      user: req.user.id,
      type,
    });

    if (!streak) {
      return res.status(404).json({ success: false, message: 'Streak not found' });
    }

    streak.currentStreak = 0;
    streak.lastActiveDate = null;
    await streak.save();

    res.json({
      success: true,
      message: 'Streak reset successfully',
      data: streak,
    });
  } catch (error) {
    console.error('Reset streak error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get overall streak summary
// @route  GET /api/streaks/summary
// @access Private
const getStreakSummary = async (req, res) => {
  try {
    const streaks = await Streak.find({
      user: req.user.id,
      isActive: true,
    });

    const summary = {
      totalCurrentStreak: 0,
      totalLongestStreak: 0,
      totalCompletedDays: 0,
      byType: {},
      milestones: [],
    };

    streaks.forEach((streak) => {
      summary.totalCurrentStreak += streak.currentStreak;
      summary.totalLongestStreak += streak.longestStreak;
      summary.totalCompletedDays += streak.totalDays;

      summary.byType[streak.type] = {
        current: streak.currentStreak,
        longest: streak.longestStreak,
        total: streak.totalDays,
      };

      streak.milestones.forEach((milestone) => {
        summary.milestones.push({
          type: streak.type,
          ...milestone,
        });
      });
    });

    // Sort milestones by date
    summary.milestones.sort((a, b) => new Date(b.achievedAt) - new Date(a.achievedAt));

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Get streak summary error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getStreaks,
  getStreak,
  updateStreak,
  getStreakHistory,
  resetStreak,
  getStreakSummary,
};