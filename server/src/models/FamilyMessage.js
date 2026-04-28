const mongoose = require('mongoose');

const FamilyMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['voice', 'text', 'photo', 'video', 'document', 'location'],
    },
    content: {
      type: String,
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    mediaUrl: {
      type: String,
    },
    mediaThumbnail: {
      type: String,
    },
    duration: {
      type: Number, // for voice/video messages in seconds
    },
    fileSize: {
      type: Number, // in bytes
    },
    fileName: {
      type: String,
    },
    mimeType: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
      address: {
        type: String,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reaction: {
        type: String,
        enum: ['love', 'like', 'care', 'haha', 'wow', 'sad', 'angry'],
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMessage',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for sender and receiver
FamilyMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
FamilyMessageSchema.index({ receiver: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('FamilyMessage', FamilyMessageSchema);