const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Promotion = require('../models/Promotion');

// Middleware kiểm tra quyền admin
router.use(auth);
router.use(adminAuth);

// @route   GET /api/promotions
// @desc    Lấy danh sách khuyến mãi
router.get('/', async (req, res) => {
  try {
    const promotions = await Promotion.find();
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/promotions/:id
// @desc    Lấy chi tiết khuyến mãi
router.get('/:id', async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    }
    res.json(promotion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/promotions
// @desc    Tạo khuyến mãi mới
router.post('/', async (req, res) => {
  try {
    const { code, name, type, value, description, startDate, endDate, status } = req.body;
    
    // Kiểm tra mã khuyến mãi đã tồn tại chưa
    const existingPromotion = await Promotion.findOne({ code });
    if (existingPromotion) {
      return res.status(400).json({ message: 'Mã khuyến mãi đã tồn tại' });
    }

    const promotion = new Promotion({
      code,
      name,
      type,
      value,
      description,
      startDate,
      endDate,
      status
    });

    const newPromotion = await promotion.save();
    res.status(201).json(newPromotion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   PUT /api/promotions/:id
// @desc    Cập nhật khuyến mãi
router.put('/:id', async (req, res) => {
  try {
    const { code, name, type, value, description, startDate, endDate, status } = req.body;
    
    // Kiểm tra mã khuyến mãi đã tồn tại chưa (trừ khuyến mãi hiện tại)
    const existingPromotion = await Promotion.findOne({
      code,
      _id: { $ne: req.params.id }
    });
    if (existingPromotion) {
      return res.status(400).json({ message: 'Mã khuyến mãi đã tồn tại' });
    }

    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      {
        code,
        name,
        type,
        value,
        description,
        startDate,
        endDate,
        status
      },
      { new: true }
    );

    if (!promotion) {
      return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    }

    res.json(promotion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   DELETE /api/promotions/:id
// @desc    Xóa khuyến mãi
router.delete('/:id', async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    }
    res.json({ message: 'Đã xóa khuyến mãi thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/promotions/stats
// @desc    Lấy thống kê khuyến mãi
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      total: await Promotion.countDocuments(),
      active: await Promotion.countDocuments({ status: 'active' }),
      upcoming: await Promotion.countDocuments({ status: 'upcoming' }),
      expired: await Promotion.countDocuments({ status: 'expired' })
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 