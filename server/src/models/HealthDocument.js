const mongoose = require('mongoose');

const HealthDocumentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Report', 'Prescription', 'XRay', 'BloodTest', 'MRI', 'CTScan', 'Ultrasound', 'Insurance', 'Other'],
    },
    documentType: {
      type: String,
      required: true,
      enum: ['image', 'pdf', 'document'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // in bytes
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    doctorName: {
      type: String,
      trim: true,
    },
    hospitalName: {
      type: String,
      trim: true,
    },
    documentDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    aiExtractedData: {
      type: mongoose.Schema.Types.Mixed,
    },
    aiSummary: {
      type: String,
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

// Index for user and category
HealthDocumentSchema.index({ user: 1, category: 1, isActive: 1 });
HealthDocumentSchema.index({ user: 1, documentDate: -1 });

module.exports = mongoose.model('HealthDocument', HealthDocumentSchema);