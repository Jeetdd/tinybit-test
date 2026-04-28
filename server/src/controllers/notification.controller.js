const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

// @desc   Get all notifications for user
// @route  GET /api/notifications
// @access Private
const getNotifications = async (req, res) => {
  try {
    const { type, isRead, limit = 50 } = req.query;

    const query = { user: req.user.id };

    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get unread notifications count
// @route  GET /api/notifications/unread-count
// @access Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Get unread count error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get single notification
// @route  GET /api/notifications/:id
// @access Private
const getNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Get notification error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Create new notification
// @route  POST /api/notifications
// @access Private
const createNotification = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const {
      type,
      title,
      message,
      data,
      priority,
      actionRequired,
      actionType,
      actionUrl,
      expiresAt,
      channels,
    } = req.body;

    const notification = await Notification.create({
      user: req.user.id,
      type,
      title,
      message,
      data,
      priority: priority || 'normal',
      actionRequired: actionRequired || false,
      actionType,
      actionUrl,
      expiresAt,
      channels: channels || { push: true, email: false, sms: false },
    });

    // TODO: Implement actual notification sending
    // This would integrate with push notification services, email, SMS, etc.

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification,
    });
  } catch (error) {
    console.error('Create notification error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Mark notification as read
// @route  PUT /api/notifications/:id/read
// @access Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    console.error('Mark as read error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Mark all notifications as read
// @route  PUT /api/notifications/read-all
// @access Private
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        user: req.user.id,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error('Mark all as read error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Delete notification
// @route  DELETE /api/notifications/:id
// @access Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Delete notification error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Delete all read notifications
// @route  DELETE /api/notifications/clear-read
// @access Private
const clearReadNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user.id,
      isRead: true,
    });

    res.json({
      success: true,
      message: `${result.deletedCount} notifications deleted`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error('Clear read notifications error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get notification statistics
// @route  GET /api/notifications/stats
// @access Private
const getNotificationStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const notifications = await Notification.find({
      user: req.user.id,
      createdAt: { $gte: startDate },
    });

    const stats = {
      total: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      read: notifications.filter((n) => n.isRead).length,
      byType: {},
      byPriority: {
        low: 0,
        normal: 0,
        high: 0,
        urgent: 0,
      },
      actionRequired: notifications.filter((n) => n.actionRequired).length,
    };

    notifications.forEach((notification) => {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      stats.byPriority[notification.priority]++;
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get notification stats error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  getNotification,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  getNotificationStats,
};