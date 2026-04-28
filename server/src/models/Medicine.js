const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    genericName: {
      type: String,
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      trim: true,
    },
    dosageUnit: {
      type: String,
      enum: ['mg', 'ml', 'tablet', 'capsule', 'drop', 'patch', 'injection', 'other'],
      default: 'tablet',
    },
    frequency: {
      type: String,
      required: true,
      enum: ['once', 'twice', 'thrice', 'four_times', 'as_needed', 'weekly', 'monthly'],
    },
    schedule: [{
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      },
      times: [{
        type: String, // HH:MM format
      }],
    }],
    instructions: {
      type: String,
      maxlength: [500, 'Instructions cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },
    category: {
      type: String,
      enum: ['prescription', 'otc', 'supplement', 'vitamin', 'other'],
      default: 'prescription',
    },
    prescribedBy: {
      type: String,
      trim: true,
    },
    startDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    endDate: {
      type: String, // YYYY-MM-DD
    },
    isRecurring: {
      type: Boolean,
      default: true,
    },
    refillReminder: {
      enabled: {
        type: Boolean,
        default: true,
      },
      threshold: {
        type: Number,
        default: 7, // days
      },
      lastNotified: {
        type: Date,
      },
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    logs: [{
      date: {
        type: String, // YYYY-MM-DD
        required: true,
      },
      time: {
        type: String, // HH:MM
        required: true,
      },
      status: {
        type: String,
        enum: ['taken', 'skipped', 'pending', 'missed'],
        default: 'pending',
      },
      takenAt: {
        type: Date,
      },
      notes: {
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

// Index for user and active status
MedicineSchema.index({ user: 1, isActive: 1, priority: 1 });
MedicineSchema.index({ user: 1, 'logs.date': 1 });

module.exports = mongoose.model('Medicine', MedicineSchema);