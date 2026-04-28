const mongoose = require('mongoose');

const SOSAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    alertType: {
      type: String,
      required: true,
      enum: ['manual', 'fall_detection', 'inactivity', 'health_threshold'],
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved', 'false_alarm'],
      default: 'active',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      address: {
        type: String,
      },
    },
    message: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    fallDetected: {
      detected: {
        type: Boolean,
        default: false,
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
      },
      impactForce: {
        type: Number,
      },
    },
    healthData: {
      heartRate: Number,
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
      },
      bloodSugar: Number,
    },
    notifiedContacts: [{
      contact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmergencyContact',
      },
      notifiedAt: {
        type: Date,
      },
      status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'failed'],
      },
      response: {
        type: String,
      },
      respondedAt: {
        type: Date,
      },
    }],
    emergencyServices: {
      called: {
        type: Boolean,
        default: false,
      },
      calledAt: {
        type: Date,
      },
      serviceType: {
        type: String,
        enum: ['ambulance', 'police', 'fire', 'other'],
      },
      caseNumber: {
        type: String,
      },
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    resolutionNotes: {
      type: String,
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

// Index for user and status
SOSAlertSchema.index({ user: 1, status: 1, createdAt: -1 });
SOSAlertSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SOSAlert', SOSAlertSchema);