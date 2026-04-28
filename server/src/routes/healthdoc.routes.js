const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getHealthDocuments,
  getHealthDocument,
  createHealthDocument,
  updateHealthDocument,
  deleteHealthDocument,
  toggleFavorite,
  shareDocument,
  getDocumentsByCategory,
} = require('../controllers/healthdoc.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all health documents
router.get('/', protect, getHealthDocuments);

// Get documents by category
router.get('/category/:category', protect, getDocumentsByCategory);

// Get single health document
router.get('/:id', protect, getHealthDocument);

// Create new health document
router.post(
  '/',
  protect,
  [
    body('title').notEmpty().withMessage('Document title is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('documentType').notEmpty().withMessage('Document type is required'),
    body('fileUrl').notEmpty().withMessage('File URL is required'),
    body('fileName').notEmpty().withMessage('File name is required'),
    body('fileSize').isInt({ min: 0 }).withMessage('File size must be a non-negative integer'),
    body('mimeType').notEmpty().withMessage('MIME type is required'),
  ],
  createHealthDocument
);

// Update health document
router.put(
  '/:id',
  protect,
  [
    body('title').optional().notEmpty().withMessage('Document title cannot be empty'),
    body('category').optional().notEmpty().withMessage('Category cannot be empty'),
  ],
  updateHealthDocument
);

// Toggle favorite status
router.put('/:id/favorite', protect, toggleFavorite);

// Share document
router.put('/:id/share', protect, shareDocument);

// Delete health document
router.delete('/:id', protect, deleteHealthDocument);

module.exports = router;