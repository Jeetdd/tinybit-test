const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'medicine_reminder',
        'checkin_reminder',
        'sos_alert',
        'family_message',
        'health_alert',
        'streak_achievement',
        'system',
      ],
    },
    title: {
      type: String,
      required: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    actionRequired: {
      type: Boolean,
      default: false,
    },
    actionType: {
      type: String,
    },
    actionUrl: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending',
    },
    channels: {
      push: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      sms: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for user and read status
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', NotificationSchema);