const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Lấy danh sách thông báo của người dùng
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, isRead } = req.query;
    const query = { user: req.user._id };

    if (type) {
      query.type = type;
    }
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Đánh dấu thông báo đã đọc
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    notification.isRead = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Đánh dấu tất cả thông báo đã đọc
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'Đã đánh dấu tất cả thông báo đã đọc' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Xóa thông báo
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    await notification.remove();
    res.json({ message: 'Xóa thông báo thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Xóa tất cả thông báo
router.delete('/', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ message: 'Xóa tất cả thông báo thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lấy số lượng thông báo chưa đọc
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 