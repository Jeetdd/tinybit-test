const HealthDocument = require('../models/HealthDocument');
const { validationResult } = require('express-validator');

// @desc   Get all health documents for user
// @route  GET /api/health-documents
// @access Private
const getHealthDocuments = async (req, res) => {
  try {
    const { category, startDate, endDate, isFavorite, limit = 50 } = req.query;

    const query = { user: req.user.id, isActive: true };

    if (category) query.category = category;
    if (isFavorite === 'true') query.isFavorite = true;
    if (startDate || endDate) {
      query.documentDate = {};
      if (startDate) query.documentDate.$gte = new Date(startDate);
      if (endDate) query.documentDate.$lte = new Date(endDate);
    }

    const documents = await HealthDocument.find(query)
      .sort({ documentDate: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error('Get health documents error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get single health document
// @route  GET /api/health-documents/:id
// @access Private
const getHealthDocument = async (req, res) => {
  try {
    const document = await HealthDocument.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true,
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.json({ success: true, data: document });
  } catch (error) {
    console.error('Get health document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Create new health document
// @route  POST /api/health-documents
// @access Private
const createHealthDocument = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const {
      title,
      category,
      documentType,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      description,
      doctorName,
      hospitalName,
      documentDate,
      expiryDate,
      tags,
    } = req.body;

    const document = await HealthDocument.create({
      user: req.user.id,
      title,
      category,
      documentType,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      description,
      doctorName,
      hospitalName,
      documentDate,
      expiryDate,
      tags,
    });

    res.status(201).json({
      success: true,
      message: 'Health document uploaded successfully',
      data: document,
    });
  } catch (error) {
    console.error('Create health document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Update health document
// @route  PUT /api/health-documents/:id
// @access Private
const updateHealthDocument = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const document = await HealthDocument.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const updatedDocument = await HealthDocument.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Health document updated successfully',
      data: updatedDocument,
    });
  } catch (error) {
    console.error('Update health document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Delete health document (soft delete)
// @route  DELETE /api/health-documents/:id
// @access Private
const deleteHealthDocument = async (req, res) => {
  try {
    const document = await HealthDocument.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    document.isActive = false;
    await document.save();

    res.json({
      success: true,
      message: 'Health document deleted successfully',
    });
  } catch (error) {
    console.error('Delete health document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Toggle favorite status
// @route  PUT /api/health-documents/:id/favorite
// @access Private
const toggleFavorite = async (req, res) => {
  try {
    const document = await HealthDocument.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    document.isFavorite = !document.isFavorite;
    await document.save();

    res.json({
      success: true,
      message: 'Favorite status updated',
      data: document,
    });
  } catch (error) {
    console.error('Toggle favorite error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Share document with family members
// @route  PUT /api/health-documents/:id/share
// @access Private
const shareDocument = async (req, res) => {
  try {
    const { sharedWith } = req.body;

    const document = await HealthDocument.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    document.isShared = true;
    document.sharedWith = sharedWith;
    await document.save();

    res.json({
      success: true,
      message: 'Document shared successfully',
      data: document,
    });
  } catch (error) {
    console.error('Share document error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get documents by category
// @route  GET /api/health-documents/category/:category
// @access Private
const getDocumentsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    const documents = await HealthDocument.find({
      user: req.user.id,
      category,
      isActive: true,
    })
      .sort({ documentDate: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error('Get documents by category error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getHealthDocuments,
  getHealthDocument,
  createHealthDocument,
  updateHealthDocument,
  deleteHealthDocument,
  toggleFavorite,
  shareDocument,
  getDocumentsByCategory,
};