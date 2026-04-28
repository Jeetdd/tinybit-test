const mongoose = require('mongoose');

const DailyCheckInSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      unique: true,
      index: true,
    },
    mood: {
      type: String,
      enum: ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'],
    },
    moodScore: {
      type: Number,
      min: 1,
      max: 5,
    },
    sleepQuality: {
      type: String,
      enum: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'],
    },
    sleepHours: {
      type: Number,
      min: 0,
      max: 24,
    },
    energyLevel: {
      type: String,
      enum: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'],
    },
    painLevel: {
      type: Number,
      min: 0,
      max: 10,
    },
    appetite: {
      type: String,
      enum: ['Poor', 'Fair', 'Good', 'Excellent'],
    },
    medicationsTaken: {
      type: Boolean,
      default: false,
    },
    physicalActivity: {
      type: String,
      enum: ['None', 'Light', 'Moderate', 'Vigorous'],
    },
    activityMinutes: {
      type: Number,
      min: 0,
    },
    socialInteraction: {
      type: String,
      enum: ['None', 'Minimal', 'Moderate', 'High'],
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    voiceNoteUrl: {
      type: String,
    },
    voiceNoteDuration: {
      type: Number,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    familyNotified: {
      type: Boolean,
      default: false,
    },
    notifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index for user and date
DailyCheckInSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyCheckIn', DailyCheckInSchema);