const SOSAlert = require('../models/SOSAlert');
const EmergencyContact = require('../models/EmergencyContact');
const { validationResult } = require('express-validator');

// @desc   Get all SOS alerts for user
// @route  GET /api/sos
// @access Private
const getSOSAlerts = async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;

    const query = { user: req.user.id };

    if (status) query.status = status;

    const alerts = await SOSAlert.find(query)
      .populate('notifiedContacts.contact', 'name phone relationship')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error('Get SOS alerts error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get single SOS alert
// @route  GET /api/sos/:id
// @access Private
const getSOSAlert = async (req, res) => {
  try {
    const alert = await SOSAlert.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate('notifiedContacts.contact', 'name phone relationship');

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Get SOS alert error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Create new SOS alert
// @route  POST /api/sos
// @access Private
const createSOSAlert = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { alertType, location, message, fallDetected, healthData } = req.body;

    // Get user's emergency contacts
    const emergencyContacts = await EmergencyContact.find({
      user: req.user.id,
      isActive: true,
    }).sort({ priority: -1, isPrimary: -1 });

    // Create alert with notified contacts
    const notifiedContacts = emergencyContacts.map((contact) => ({
      contact: contact._id,
      notifiedAt: new Date(),
      status: 'sent',
    }));

    const alert = await SOSAlert.create({
      user: req.user.id,
      alertType,
      location,
      message,
      fallDetected,
      healthData,
      notifiedContacts,
    });

    // TODO: Implement actual notification sending (SMS, email, push)
    // This would integrate with services like Twilio, SendGrid, etc.

    res.status(201).json({
      success: true,
      message: 'SOS alert created and contacts notified',
      data: alert,
    });
  } catch (error) {
    console.error('Create SOS alert error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Update SOS alert status
// @route  PUT /api/sos/:id/status
// @access Private
const updateAlertStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const alert = await SOSAlert.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.status = status;

    if (status === 'resolved') {
      alert.resolvedBy = req.user.id;
      alert.resolvedAt = new Date();
    }

    await alert.save();

    res.json({
      success: true,
      message: 'Alert status updated successfully',
      data: alert,
    });
  } catch (error) {
    console.error('Update alert status error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Add contact response to alert
// @route  PUT /api/sos/:id/response
// @access Private
const addContactResponse = async (req, res) => {
  try {
    const { contactId, response } = req.body;

    const alert = await SOSAlert.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const notifiedContact = alert.notifiedContacts.find(
      (nc) => nc.contact.toString() === contactId
    );

    if (notifiedContact) {
      notifiedContact.response = response;
      notifiedContact.respondedAt = new Date();
      notifiedContact.status = 'read';
    }

    await alert.save();

    res.json({
      success: true,
      message: 'Contact response recorded',
      data: alert,
    });
  } catch (error) {
    console.error('Add contact response error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Call emergency services
// @route  PUT /api/sos/:id/emergency-services
// @access Private
const callEmergencyServices = async (req, res) => {
  try {
    const { serviceType, caseNumber } = req.body;

    const alert = await SOSAlert.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.emergencyServices = {
      called: true,
      calledAt: new Date(),
      serviceType,
      caseNumber,
    };

    await alert.save();

    // TODO: Implement actual emergency service call integration
    // This would integrate with emergency dispatch systems

    res.json({
      success: true,
      message: 'Emergency services called',
      data: alert,
    });
  } catch (error) {
    console.error('Call emergency services error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get active SOS alert
// @route  GET /api/sos/active
// @access Private
const getActiveAlert = async (req, res) => {
  try {
    const alert = await SOSAlert.findOne({
      user: req.user.id,
      status: 'active',
    }).populate('notifiedContacts.contact', 'name phone relationship');

    if (!alert) {
      return res.status(404).json({ success: false, message: 'No active alert found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Get active alert error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get SOS statistics
// @route  GET /api/sos/stats
// @access Private
const getSOSStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const alerts = await SOSAlert.find({
      user: req.user.id,
      createdAt: { $gte: startDate },
    });

    const stats = {
      totalAlerts: alerts.length,
      byType: {
        manual: 0,
        fall_detection: 0,
        inactivity: 0,
        health_threshold: 0,
      },
      byStatus: {
        active: 0,
        acknowledged: 0,
        resolved: 0,
        false_alarm: 0,
      },
      averageResponseTime: 0,
      totalContactsNotified: 0,
      emergencyServicesCalled: 0,
    };

    if (alerts.length > 0) {
      alerts.forEach((alert) => {
        stats.byType[alert.alertType]++;
        stats.byStatus[alert.status]++;
        stats.totalContactsNotified += alert.notifiedContacts.length;

        if (alert.emergencyServices?.called) {
          stats.emergencyServicesCalled++;
        }
      });
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get SOS stats error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getSOSAlerts,
  getSOSAlert,
  createSOSAlert,
  updateAlertStatus,
  addContactResponse,
  callEmergencyServices,
  getActiveAlert,
  getSOSStats,
};