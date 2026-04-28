const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    fullName: {
      type: String,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^\+?[\d\s-]{10,}$/.test(v);
        },
        message: 'Please provide a valid phone number',
      },
    },
    countryCode: {
      type: String,
      default: '+1',
    },
    dateOfBirth: {
      type: String, // YYYY-MM-DD
    },
    age: {
      type: Number,
      min: 0,
      max: 150,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    role: {
      type: String,
      enum: ['elder', 'guardian', 'caregiver', 'admin'],
      default: 'elder',
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    profileImage: {
      type: String,
      default: null,
    },
    coverImage: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
    familyCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    familyMembers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    settings: {
      notifications: {
        push: {
          type: Boolean,
          default: true,
        },
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
      },
      privacy: {
        shareLocation: {
          type: Boolean,
          default: true,
        },
        shareHealthData: {
          type: Boolean,
          default: true,
        },
      },
      language: {
        type: String,
        default: 'en',
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto',
      },
    },
    lastLogin: {
      type: Date,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    deviceInfo: [{
      deviceId: String,
      platform: String,
      osVersion: String,
      appVersion: String,
      lastUsed: Date,
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ familyCode: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Generate full name before saving
userSchema.pre('save', function (next) {
  this.fullName = `${this.firstName} ${this.lastName}`;
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Calculate age from date of birth
userSchema.pre('save', function (next) {
  if (this.dateOfBirth) {
    const dob = new Date(this.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    this.age = age;
  }
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate family code
userSchema.methods.generateFamilyCode = function () {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = mongoose.model('User', userSchema);