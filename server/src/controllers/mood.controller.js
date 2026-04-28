const Mood = require('../models/Mood');
const { validationResult } = require('express-validator');

// @desc   Get all moods for user
// @route  GET /api/mood
// @access Private
const getMoods = async (req, res) => {
  try {
    const { startDate, endDate, limit = 30 } = req.query;

    const query = { user: req.user.id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const moods = await Mood.find(query)
      .sort({ date: -1, time: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: moods.length,
      data: moods,
    });
  } catch (error) {
    console.error('Get moods error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get mood for specific date
// @route  GET /api/mood/:date
// @access Private
const getMoodByDate = async (req, res) => {
  try {
    const { date } = req.params;

    const mood = await Mood.findOne({
      user: req.user.id,
      date,
    });

    if (!mood) {
      return res.status(404).json({ success: false, message: 'Mood not found for this date' });
    }

    res.json({ success: true, data: mood });
  } catch (error) {
    console.error('Get mood by date error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get mood statistics
// @route  GET /api/mood/stats
// @access Private
const getMoodStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const moods = await Mood.find({
      user: req.user.id,
      date: { $gte: startDate.toISOString().split('T')[0] },
    });

    const stats = {
      total: moods.length,
      averageScore: 0,
      moodDistribution: {
        'Very Sad': 0,
        'Sad': 0,
        'Neutral': 0,
        'Happy': 0,
        'Very Happy': 0,
      },
      trend: [],
    };

    if (moods.length > 0) {
      stats.averageScore = moods.reduce((sum, m) => sum + m.moodScore, 0) / moods.length;

      moods.forEach((mood) => {
        stats.moodDistribution[mood.mood]++;
        stats.trend.push({
          date: mood.date,
          score: mood.moodScore,
          mood: mood.mood,
        });
      });

      stats.trend.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get mood stats error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Create new mood entry
// @route  POST /api/mood
// @access Private
const createMood = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { mood, moodScore, factors, activities, notes, location } = req.body;

    const today = new Date().toISOString().split('T')[0];

    // Check if mood already exists for today
    const existingMood = await Mood.findOne({
      user: req.user.id,
      date: today,
    });

    let moodData;

    if (existingMood) {
      // Update existing mood
      moodData = await Mood.findByIdAndUpdate(
        existingMood._id,
        {
          mood,
          moodScore,
          factors,
          activities,
          notes,
          location,
        },
        { new: true, runValidators: true }
      );
    } else {
      // Create new mood
      moodData = await Mood.create({
        user: req.user.id,
        mood,
        moodScore,
        factors,
        activities,
        notes,
        location,
        date: today,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Mood recorded successfully',
      data: moodData,
    });
  } catch (error) {
    console.error('Create mood error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Update mood entry
// @route  PUT /api/mood/:id
// @access Private
const updateMood = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const mood = await Mood.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!mood) {
      return res.status(404).json({ success: false, message: 'Mood not found' });
    }

    const updatedMood = await Mood.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Mood updated successfully',
      data: updatedMood,
    });
  } catch (error) {
    console.error('Update mood error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Delete mood entry
// @route  DELETE /api/mood/:id
// @access Private
const deleteMood = async (req, res) => {
  try {
    const mood = await Mood.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!mood) {
      return res.status(404).json({ success: false, message: 'Mood not found' });
    }

    await Mood.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Mood deleted successfully',
    });
  } catch (error) {
    console.error('Delete mood error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getMoods,
  getMoodByDate,
  getMoodStats,
  createMood,
  updateMood,
  deleteMood,
};