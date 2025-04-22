const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  row: {
    type: Number,
    required: true
  },
  column: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['standard', 'vip'],
    default: 'standard'
  },
  price: {
    type: Number,
    required: true
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Tạo index cho việc tìm kiếm ghế theo phòng
seatSchema.index({ room: 1, row: 1, column: 1 }, { unique: true });

module.exports = mongoose.model('Seat', seatSchema); 