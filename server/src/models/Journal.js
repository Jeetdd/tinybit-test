const mongoose = require('mongoose');

const JournalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      required: [true, 'Prompt is required'],
      maxlength: [500, 'Prompt cannot exceed 500 characters'],
    },
    content: {
      type: String,
      maxlength: [10000, 'Content cannot exceed 10000 characters'],
    },
    audioUrl: {
      type: String,
    },
    audioDuration: {
      type: Number, // in seconds
    },
    transcription: {
      type: String,
    },
    images: [{
      url: String,
      caption: String,
    }],
    tags: [{
      type: String,
      trim: true,
    }],
    mood: {
      type: String,
      enum: ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'],
    },
    sentiment: {
      type: String,
      enum: ['Positive', 'Neutral', 'Negative'],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    sharedWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reaction: {
        type: String,
        enum: ['love', 'like', 'care', 'haha', 'wow', 'sad'],
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      content: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for user and date
JournalSchema.index({ user: 1, date: -1 });
JournalSchema.index({ user: 1, isFavorite: 1 });

module.exports = mongoose.model('Journal', JournalSchema);