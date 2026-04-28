const mongoose = require('mongoose');

const MindGameSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gameType: {
      type: String,
      required: [true, 'Game type is required'],
      enum: ['NumberMemory', 'WordMatch', 'ColorRecall', 'StoryQuiz', 'PatternRecognition', 'MathPuzzle'],
    },
    gameName: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    maxScore: {
      type: Number,
      required: true,
      min: 1,
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    timeTaken: {
      type: Number, // in seconds
      required: true,
    },
    questions: [{
      question: String,
      userAnswer: mongoose.Schema.Types.Mixed,
      correctAnswer: mongoose.Schema.Types.Mixed,
      isCorrect: Boolean,
      timeSpent: Number,
    }],
    completedAt: {
      type: Date,
      default: Date.now,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate percentage before saving
MindGameSchema.pre('save', function (next) {
  if (this.score && this.maxScore) {
    this.percentage = Math.round((this.score / this.maxScore) * 100);
  }
  next();
});

// Index for user and date
MindGameSchema.index({ user: 1, date: -1, gameType: 1 });

module.exports = mongoose.model('MindGame', MindGameSchema);