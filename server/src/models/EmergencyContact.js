const mongoose = require('mongoose');

const EmergencyContactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      enum: ['Spouse', 'Child', 'Parent', 'Sibling', 'Friend', 'Caregiver', 'Doctor', 'Other'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: function (v) {
          return /^\+?[\d\s-]{10,}$/.test(v);
        },
        message: 'Please provide a valid phone number',
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    lastContacted: {
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

// Index for faster queries
EmergencyContactSchema.index({ user: 1, isActive: 1, priority: 1 });

// Ensure only one primary contact per user
EmergencyContactSchema.pre('save', async function (next) {
  if (this.isPrimary) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isPrimary: false }
    );
  }
  next();
});

module.exports = mongoose.model('EmergencyContact', EmergencyContactSchema);