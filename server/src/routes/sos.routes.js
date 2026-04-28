const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getSOSAlerts,
  getSOSAlert,
  createSOSAlert,
  updateAlertStatus,
  addContactResponse,
  callEmergencyServices,
  getActiveAlert,
  getSOSStats,
} = require('../controllers/sos.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all SOS alerts
router.get('/', protect, getSOSAlerts);

// Get SOS statistics
router.get('/stats', protect, getSOSStats);

// Get active SOS alert
router.get('/active', protect, getActiveAlert);

// Create new SOS alert
router.post(
  '/',
  protect,
  [
    body('alertType')
      .isIn(['manual', 'fall_detection', 'inactivity', 'health_threshold'])
      .withMessage('Invalid alert type'),
    body('location').notEmpty().withMessage('Location is required'),
  ],
  createSOSAlert
);

// Get single SOS alert
router.get('/:id', protect, getSOSAlert);

// Update alert status
router.put(
  '/:id/status',
  protect,
  [
    body('status')
      .isIn(['active', 'acknowledged', 'resolved', 'false_alarm'])
      .withMessage('Invalid status'),
  ],
  updateAlertStatus
);

// Add contact response
router.put(
  '/:id/response',
  protect,
  [
    body('contactId').notEmpty().withMessage('Contact ID is required'),
    body('response').notEmpty().withMessage('Response is required'),
  ],
  addContactResponse
);

// Call emergency services
router.put(
  '/:id/emergency-services',
  protect,
  [
    body('serviceType')
      .isIn(['ambulance', 'police', 'fire', 'other'])
      .withMessage('Invalid service type'),
  ],
  callEmergencyServices
);

module.exports = router;