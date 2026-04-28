const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getEmergencyContacts,
  getEmergencyContact,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  setPrimaryContact,
} = require('../controllers/emergency.controller');
const { protect } = require('../middleware/auth.middleware');

// Get all emergency contacts
router.get('/', protect, getEmergencyContacts);

// Get single emergency contact
router.get('/:id', protect, getEmergencyContact);

// Create new emergency contact
router.post(
  '/',
  protect,
  [
    body('name').notEmpty().withMessage('Contact name is required'),
    body('relationship').notEmpty().withMessage('Relationship is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
  ],
  createEmergencyContact
);

// Update emergency contact
router.put(
  '/:id',
  protect,
  [
    body('name').optional().notEmpty().withMessage('Contact name cannot be empty'),
    body('relationship').optional().notEmpty().withMessage('Relationship cannot be empty'),
    body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
  ],
  updateEmergencyContact
);

// Set primary contact
router.put('/:id/primary', protect, setPrimaryContact);

// Delete emergency contact
router.delete('/:id', protect, deleteEmergencyContact);

module.exports = router;