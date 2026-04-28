const mongoose = require('mongoose');

const StreakSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['medicine', 'journal', 'checkin', 'mindgames', 'overall'],
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastActiveDate: {
      type: String, // YYYY-MM-DD
    },
    totalDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    history: [{
      date: {
        type: String, // YYYY-MM-DD
      },
      completed: {
        type: Boolean,
      },
      value: {
        type: Number,
      },
    }],
    milestones: [{
      streak: {
        type: Number,
      },
      achievedAt: {
        type: Date,
      },
      reward: {
        type: String,
      },
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index for user and type
StreakSchema.index({ user: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Streak', StreakSchema);