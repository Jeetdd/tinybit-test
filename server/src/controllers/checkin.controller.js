const DailyCheckIn = require('../models/DailyCheckIn');
const { validationResult } = require('express-validator');

// @desc   Get all daily check-ins for user
// @route  GET /api/checkin
// @access Private
const getCheckIns = async (req, res) => {
  try {
    const { startDate, endDate, limit = 30 } = req.query;

    const query = { user: req.user.id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const checkIns = await DailyCheckIn.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: checkIns.length,
      data: checkIns,
    });
  } catch (error) {
    console.error('Get check-ins error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get check-in for specific date
// @route  GET /api/checkin/:date
// @access Private
const getCheckInByDate = async (req, res) => {
  try {
    const { date } = req.params;

    const checkIn = await DailyCheckIn.findOne({
      user: req.user.id,
      date,
    });

    if (!checkIn) {
      return res.status(404).json({ success: false, message: 'Check-in not found for this date' });
    }

    res.json({ success: true, data: checkIn });
  } catch (error) {
    console.error('Get check-in by date error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get check-in statistics
// @route  GET /api/checkin/stats
// @access Private
const getCheckInStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const checkIns = await DailyCheckIn.find({
      user: req.user.id,
      date: { $gte: startDate.toISOString().split('T')[0] },
    });

    const stats = {
      totalCheckIns: checkIns.length,
      completionRate: 0,
      averageMoodScore: 0,
      averageSleepHours: 0,
      averagePainLevel: 0,
      moodDistribution: {
        'Very Sad': 0,
        'Sad': 0,
        'Neutral': 0,
        'Happy': 0,
        'Very Happy': 0,
      },
      sleepQualityDistribution: {
        'Very Poor': 0,
        'Poor': 0,
        'Fair': 0,
        'Good': 0,
        'Excellent': 0,
      },
      medicationAdherence: {
        taken: 0,
        total: checkIns.length,
        percentage: 0,
      },
      activityDistribution: {
        'None': 0,
        'Light': 0,
        'Moderate': 0,
        'Vigorous': 0,
      },
      trend: [],
    };

    if (checkIns.length > 0) {
      stats.completionRate = (checkIns.length / parseInt(days)) * 100;

      checkIns.forEach((checkIn) => {
        if (checkIn.moodScore) {
          stats.averageMoodScore += checkIn.moodScore;
          stats.moodDistribution[checkIn.mood]++;
        }
        if (checkIn.sleepHours) {
          stats.averageSleepHours += checkIn.sleepHours;
        }
        if (checkIn.painLevel !== undefined) {
          stats.averagePainLevel += checkIn.painLevel;
        }
        if (checkIn.sleepQuality) {
          stats.sleepQualityDistribution[checkIn.sleepQuality]++;
        }
        if (checkIn.medicationsTaken) {
          stats.medicationAdherence.taken++;
        }
        if (checkIn.physicalActivity) {
          stats.activityDistribution[checkIn.physicalActivity]++;
        }

        stats.trend.push({
          date: checkIn.date,
          moodScore: checkIn.moodScore,
          sleepHours: checkIn.sleepHours,
          painLevel: checkIn.painLevel,
        });
      });

      stats.averageMoodScore = Math.round(stats.averageMoodScore / checkIns.length);
      stats.averageSleepHours = Math.round((stats.averageSleepHours / checkIns.length) * 10) / 10;
      stats.averagePainLevel = Math.round((stats.averagePainLevel / checkIns.length) * 10) / 10;
      stats.medicationAdherence.percentage = Math.round(
        (stats.medicationAdherence.taken / stats.medicationAdherence.total) * 100
      );

      stats.trend.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get check-in stats error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Create new daily check-in
// @route  POST /api/checkin
// @access Private
const createCheckIn = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if check-in already exists for today
    const existingCheckIn = await DailyCheckIn.findOne({
      user: req.user.id,
      date: today,
    });

    let checkInData;

    if (existingCheckIn) {
      // Update existing check-in
      checkInData = await DailyCheckIn.findByIdAndUpdate(
        existingCheckIn._id,
        {
          ...req.body,
          completedAt: new Date(),
        },
        { new: true, runValidators: true }
      );
    } else {
      // Create new check-in
      checkInData = await DailyCheckIn.create({
        user: req.user.id,
        date: today,
        ...req.body,
        completedAt: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Daily check-in completed successfully',
      data: checkInData,
    });
  } catch (error) {
    console.error('Create check-in error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Update check-in
// @route  PUT /api/checkin/:id
// @access Private
const updateCheckIn = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const checkIn = await DailyCheckIn.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!checkIn) {
      return res.status(404).json({ success: false, message: 'Check-in not found' });
    }

    const updatedCheckIn = await DailyCheckIn.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Check-in updated successfully',
      data: updatedCheckIn,
    });
  } catch (error) {
    console.error('Update check-in error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Delete check-in
// @route  DELETE /api/checkin/:id
// @access Private
const deleteCheckIn = async (req, res) => {
  try {
    const checkIn = await DailyCheckIn.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!checkIn) {
      return res.status(404).json({ success: false, message: 'Check-in not found' });
    }

    await DailyCheckIn.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Check-in deleted successfully',
    });
  } catch (error) {
    console.error('Delete check-in error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getCheckIns,
  getCheckInByDate,
  getCheckInStats,
  createCheckIn,
  updateCheckIn,
  deleteCheckIn,
};