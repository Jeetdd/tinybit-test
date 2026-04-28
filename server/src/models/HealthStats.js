const mongoose = require('mongoose');

const HealthStatsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bloodSugar: {
      value: {
        type: Number,
        min: 0,
        max: 600,
      },
      unit: {
        type: String,
        enum: ['mg/dL', 'mmol/L'],
        default: 'mg/dL',
      },
      status: {
        type: String,
        enum: ['Very Low', 'Low', 'Normal', 'High', 'Very High'],
      },
      fasting: {
        type: Boolean,
        default: false,
      },
      recordedAt: {
        type: Date,
        default: Date.now,
      },
    },
    bloodPressure: {
      systolic: {
        type: Number,
        min: 0,
        max: 300,
      },
      diastolic: {
        type: Number,
        min: 0,
        max: 200,
      },
      unit: {
        type: String,
        default: 'mmHg',
      },
      status: {
        type: String,
        enum: ['Low', 'Normal', 'Elevated', 'High Stage 1', 'High Stage 2', 'Crisis'],
      },
      position: {
        type: String,
        enum: ['sitting', 'standing', 'lying'],
        default: 'sitting',
      },
      recordedAt: {
        type: Date,
        default: Date.now,
      },
    },
    heartRate: {
      value: {
        type: Number,
        min: 0,
        max: 300,
      },
      unit: {
        type: String,
        default: 'bpm',
      },
      status: {
        type: String,
        enum: ['Bradycardia', 'Normal', 'Tachycardia'],
      },
      recordedAt: {
        type: Date,
        default: Date.now,
      },
    },
    weight: {
      value: {
        type: Number,
        min: 0,
        max: 500,
      },
      unit: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg',
      },
      recordedAt: {
        type: Date,
        default: Date.now,
      },
    },
    temperature: {
      value: {
        type: Number,
        min: 0,
        max: 50,
      },
      unit: {
        type: String,
        enum: ['C', 'F'],
        default: 'C',
      },
      status: {
        type: String,
        enum: ['Hypothermia', 'Normal', 'Fever', 'High Fever'],
      },
      recordedAt: {
        type: Date,
        default: Date.now,
      },
    },
    oxygenSaturation: {
      value: {
        type: Number,
        min: 0,
        max: 100,
      },
      unit: {
        type: String,
        default: '%',
      },
      status: {
        type: String,
        enum: ['Low', 'Normal', 'High'],
      },
      recordedAt: {
        type: Date,
        default: Date.now,
      },
    },
    sleep: {
      duration: {
        type: Number, // in hours
        min: 0,
        max: 24,
      },
      quality: {
        type: String,
        enum: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'],
      },
      bedTime: {
        type: String, // HH:MM
      },
      wakeTime: {
        type: String, // HH:MM
      },
      recordedAt: {
        type: Date,
        default: Date.now,
      },
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    recordedBy: {
      type: String,
      enum: ['self', 'caregiver', 'device', 'automatic'],
      default: 'self',
    },
    deviceId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for user and date
HealthStatsSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('HealthStats', HealthStatsSchema);