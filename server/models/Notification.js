const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['booking', 'promotion', 'system', 'review'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  link: {
    type: String,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Tạo index để tối ưu truy vấn
NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

// Cập nhật updatedAt trước khi lưu
NotificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Tự động gửi thông báo đã lên lịch
NotificationSchema.statics.sendScheduledNotifications = async function() {
  const now = new Date();
  const notifications = await this.find({
    status: 'scheduled',
    scheduledTime: { $lte: now }
  });

  for (const notification of notifications) {
    // Gửi thông báo qua WebSocket
    const io = require('../server').io;
    io.emit('notification', {
      type: 'notification',
      data: notification
    });

    notification.status = 'sent';
    await notification.save();
  }
};

module.exports = mongoose.model('Notification', NotificationSchema); 