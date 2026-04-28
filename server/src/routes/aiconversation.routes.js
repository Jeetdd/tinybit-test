const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getConversations,
  getConversation,
  createConversation,
  addMessage,
  updateConversation,
  endConversation,
  deleteConversation,
  getConversationStats,
} = require('../controllers/aiconversation.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all AI conversations
router.get('/', protect, getConversations);

// Get conversation statistics
router.get('/stats', protect, getConversationStats);

// Create new conversation
router.post(
  '/',
  protect,
  [
    body('session').optional().notEmpty().withMessage('Session cannot be empty'),
  ],
  createConversation
);

// Get single conversation
router.get('/:id', protect, getConversation);

// Add message to conversation
router.post(
  '/:id/messages',
  protect,
  [
    body('role')
      .isIn(['user', 'assistant', 'system'])
      .withMessage('Role must be user, assistant, or system'),
    body('content').notEmpty().withMessage('Content is required'),
  ],
  addMessage
);

// Update conversation
router.put('/:id', protect, updateConversation);

// End conversation
router.put('/:id/end', protect, endConversation);

// Delete conversation
router.delete('/:id', protect, deleteConversation);

module.exports = router;