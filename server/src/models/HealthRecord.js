const mongoose = require('mongoose');

const HealthRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true },
  date: { type: String, required: true },
  timestamp: { type: Number, required: true },
  size: { type: String, default: '0.5 MB' },
  type: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Reports', 'Prescriptions', 'X-Rays', 'Blood Tests'],
    required: true
  },
  icon: { type: String },
  iconBg: { type: String },
  color: { type: String },
  uri: { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('HealthRecord', HealthRecordSchema);
