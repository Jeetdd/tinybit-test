const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const { protect } = require('../middleware/auth.middleware');

// @route   GET /api/medicines
// @desc    Get all medicines for the logged in user
router.get('/', protect, async (req, res) => {
  try {
    const medicines = await Medicine.find({ user: req.user.id }).sort({ time: 1 });
    res.json({ success: true, count: medicines.length, data: medicines });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/medicines
// @desc    Create a new medicine
router.post('/', protect, async (req, res) => {
  try {
    const newMedicine = new Medicine({
      ...req.body,
      user: req.user.id
    });

    const medicine = await newMedicine.save();
    res.json({ success: true, data: medicine });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/medicines/:id/log
// @desc    Log a medicine as taken/skipped for today
router.put('/:id/log', protect, async (req, res) => {
  try {
    const { status, date } = req.body; // date format: YYYY-MM-DD
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) return res.status(404).json({ msg: 'Medicine not found' });
    if (medicine.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    // Check if log for this date exists
    const logIndex = medicine.logs.findIndex(log => log.date === date);

    if (logIndex > -1) {
      medicine.logs[logIndex].status = status;
      medicine.logs[logIndex].takenAt = status === 'taken' ? new Date() : undefined;
    } else {
      medicine.logs.push({
        date,
        status,
        takenAt: status === 'taken' ? new Date() : undefined
      });
    }

    await medicine.save();
    res.json({ success: true, data: medicine });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
