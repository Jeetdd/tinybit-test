const mongoose = require('mongoose');

const MoodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mood: {
      type: String,
      required: [true, 'Mood is required'],
      enum: ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'],
    },
    moodScore: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    factors: [{
      type: String,
      enum: ['Health', 'Family', 'Sleep', 'Exercise', 'Social', 'Work', 'Weather', 'Other'],
    }],
    activities: [{
      type: String,
    }],
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    time: {
      type: String, // HH:MM
      default: () => new Date().toTimeString().slice(0, 5),
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user and date
MoodSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Mood', MoodSchema);