const mongoose = require('mongoose');

const CareEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: { type: Number, required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  timestamp: { type: Number, required: true },
  title: { type: String, required: true },
  sub: { type: String },
  time: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Doctor', 'Family', 'Medicine', 'Wellness'],
    default: 'Doctor'
  },
  color: { type: String },
  emoji: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('CareEvent', CareEventSchema);
