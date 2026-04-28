const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getNotifications,
  getUnreadCount,
  getNotification,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  getNotificationStats,
} = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all notifications
router.get('/', protect, getNotifications);

// Get unread count
router.get('/unread-count', protect, getUnreadCount);

// Get notification statistics
router.get('/stats', protect, getNotificationStats);

// Create new notification
router.post(
  '/',
  protect,
  [
    body('type').notEmpty().withMessage('Notification type is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
  ],
  createNotification
);

// Mark all as read
router.put('/read-all', protect, markAllAsRead);

// Clear read notifications
router.delete('/clear-read', protect, clearReadNotifications);

// Get single notification
router.get('/:id', protect, getNotification);

// Mark as read
router.put('/:id/read', protect, markAsRead);

// Delete notification
router.delete('/:id', protect, deleteNotification);

module.exports = router;