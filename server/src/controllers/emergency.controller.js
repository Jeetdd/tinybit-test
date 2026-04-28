const EmergencyContact = require('../models/EmergencyContact');
const { validationResult } = require('express-validator');

// @desc   Get all emergency contacts for user
// @route  GET /api/emergency
// @access Private
const getEmergencyContacts = async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({
      user: req.user.id,
      isActive: true,
    }).sort({ priority: -1, isPrimary: -1, name: 1 });

    res.json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (error) {
    console.error('Get emergency contacts error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get single emergency contact
// @route  GET /api/emergency/:id
// @access Private
const getEmergencyContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true,
    });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true, data: contact });
  } catch (error) {
    console.error('Get emergency contact error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Create new emergency contact
// @route  POST /api/emergency
// @access Private
const createEmergencyContact = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, relationship, phone, email, isPrimary, priority, address, notes } = req.body;

    // Check if user already has a primary contact
    if (isPrimary) {
      await EmergencyContact.updateMany(
        { user: req.user.id, isPrimary: true },
        { isPrimary: false }
      );
    }

    const contact = await EmergencyContact.create({
      user: req.user.id,
      name,
      relationship,
      phone,
      email,
      isPrimary: isPrimary || false,
      priority: priority || 1,
      address,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Emergency contact created successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Create emergency contact error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Update emergency contact
// @route  PUT /api/emergency/:id
// @access Private
const updateEmergencyContact = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    let contact = await EmergencyContact.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    const { name, relationship, phone, email, isPrimary, priority, address, notes } = req.body;

    // Handle primary contact change
    if (isPrimary && !contact.isPrimary) {
      await EmergencyContact.updateMany(
        { user: req.user.id, isPrimary: true },
        { isPrimary: false }
      );
    }

    contact = await EmergencyContact.findByIdAndUpdate(
      req.params.id,
      {
        name,
        relationship,
        phone,
        email,
        isPrimary,
        priority,
        address,
        notes,
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Emergency contact updated successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Update emergency contact error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Delete emergency contact (soft delete)
// @route  DELETE /api/emergency/:id
// @access Private
const deleteEmergencyContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    contact.isActive = false;
    await contact.save();

    res.json({
      success: true,
      message: 'Emergency contact deleted successfully',
    });
  } catch (error) {
    console.error('Delete emergency contact error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Set primary emergency contact
// @route  PUT /api/emergency/:id/primary
// @access Private
const setPrimaryContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    // Remove primary from all other contacts
    await EmergencyContact.updateMany(
      { user: req.user.id, isPrimary: true },
      { isPrimary: false }
    );

    // Set this contact as primary
    contact.isPrimary = true;
    await contact.save();

    res.json({
      success: true,
      message: 'Primary contact set successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Set primary contact error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getEmergencyContacts,
  getEmergencyContact,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  setPrimaryContact,
};