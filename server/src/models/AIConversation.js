const mongoose = require('mongoose');

const AIConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    session: {
      type: String,
      required: true,
      index: true,
    },
    messages: [{
      role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      audioUrl: {
        type: String,
      },
      audioDuration: {
        type: Number,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      tokens: {
        type: Number,
      },
    }],
    context: {
      type: mongoose.Schema.Types.Mixed,
    },
    mood: {
      type: String,
      enum: ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'],
    },
    sentiment: {
      type: String,
      enum: ['Positive', 'Neutral', 'Negative'],
    },
    topics: [{
      type: String,
    }],
    totalTokens: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number, // in seconds
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
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

// Index for user and session
AIConversationSchema.index({ user: 1, session: 1 });
AIConversationSchema.index({ user: 1, startedAt: -1 });

module.exports = mongoose.model('AIConversation', AIConversationSchema);