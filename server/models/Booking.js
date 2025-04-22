const mongoose = require('mongoose');
const Notification = require('./Notification');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  showtime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Showtime',
    required: true
  },
  seats: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat'
  }],
  totalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'momo', 'zalopay'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Middleware trước khi xóa booking
bookingSchema.pre('deleteOne', { document: true }, async function(next) {
  try {
    // Gửi thông báo cho user
    const notification = new Notification({
      user: this.user,
      title: 'Đơn đặt vé đã bị hủy',
      message: `Đơn đặt vé của bạn đã bị hủy. Vui lòng liên hệ hỗ trợ nếu cần thêm thông tin.`,
      type: 'booking_cancelled'
    });
    await notification.save();
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Booking', bookingSchema); 