const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Ticket = require('../models/Ticket');
const Showtime = require('../models/Showtime');
const Booking = require('../models/Booking');

// Lấy danh sách vé
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = { user: req.user._id };

    if (status) {
      query.status = status;
    }

    const tickets = await Ticket.find(query)
      .populate({
        path: 'showtime',
        populate: {
          path: 'movie cinema room',
          select: 'title name roomNumber'
        }
      })
      .populate('booking')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lấy chi tiết vé
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate({
        path: 'showtime',
        populate: {
          path: 'movie cinema room',
          select: 'title name roomNumber'
        }
      })
      .populate('booking');

    if (!ticket) {
      return res.status(404).json({ message: 'Không tìm thấy vé' });
    }

    // Kiểm tra quyền truy cập
    if (ticket.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Tạo vé mới
router.post('/', auth, async (req, res) => {
  try {
    const { showtimeId, seatNumber, price } = req.body;

    // Kiểm tra suất chiếu tồn tại
    const showtime = await Showtime.findById(showtimeId);
    if (!showtime) {
      return res.status(404).json({ message: 'Không tìm thấy suất chiếu' });
    }

    // Kiểm tra ghế đã được đặt chưa
    const existingTicket = await Ticket.findOne({
      showtime: showtimeId,
      seatNumber,
      status: { $in: ['active', 'pending'] }
    });

    if (existingTicket) {
      return res.status(400).json({ message: 'Ghế này đã được đặt' });
    }

    const ticket = new Ticket({
      user: req.user._id,
      showtime: showtimeId,
      seatNumber,
      price,
      status: 'pending'
    });

    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cập nhật trạng thái vé
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Không tìm thấy vé' });
    }

    // Kiểm tra quyền - chỉ admin mới có quyền cập nhật trạng thái
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền thực hiện' });
    }

    ticket.status = status;
    const updatedTicket = await ticket.save();

    // Nếu vé bị hủy, cập nhật trạng thái booking
    if (status === 'cancelled' && ticket.booking) {
      const booking = await Booking.findById(ticket.booking);
      if (booking) {
        booking.status = 'cancelled';
        await booking.save();
      }
    }

    res.json(updatedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Hủy vé
router.delete('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Không tìm thấy vé' });
    }

    // Kiểm tra quyền - chỉ user sở hữu vé hoặc admin mới có quyền hủy
    if (ticket.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền thực hiện' });
    }

    // Chỉ cho phép hủy vé ở trạng thái pending
    if (ticket.status !== 'pending') {
      return res.status(400).json({ message: 'Không thể hủy vé ở trạng thái này' });
    }

    await ticket.deleteOne();
    res.json({ message: 'Hủy vé thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 