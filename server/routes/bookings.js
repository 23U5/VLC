const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const Seat = require('../models/Seat');

// @route   GET /api/bookings
// @desc    Lấy tất cả booking của user hiện tại
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate({
        path: 'showtime',
        populate: {
          path: 'movie cinema room',
          select: 'title name roomNumber'
        }
      })
      .populate('seats')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/bookings/:id
// @desc    Lấy chi tiết một booking
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'showtime',
        populate: {
          path: 'movie cinema room',
          select: 'title name roomNumber'
        }
      })
      .populate('seats');

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    // Kiểm tra quyền truy cập
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/bookings
// @desc    Tạo booking mới
router.post('/', auth, async (req, res) => {
  try {
    const { showtimeId, seatIds, totalPrice } = req.body;

    // Kiểm tra showtime tồn tại
    const showtime = await Showtime.findById(showtimeId);
    if (!showtime) {
      return res.status(404).json({ message: 'Không tìm thấy suất chiếu' });
    }

    // Kiểm tra ghế đã được đặt chưa
    const existingBookings = await Booking.find({
      showtime: showtimeId,
      seats: { $in: seatIds }
    });

    if (existingBookings.length > 0) {
      return res.status(400).json({ message: 'Một số ghế đã được đặt' });
    }

    // Tạo booking mới
    const booking = new Booking({
      user: req.user._id,
      showtime: showtimeId,
      seats: seatIds,
      totalPrice,
      status: 'pending'
    });

    // Cập nhật trạng thái ghế
    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { $set: { isBooked: true } }
    );

    const newBooking = await booking.save();

    // Populate dữ liệu trước khi trả về
    const populatedBooking = await Booking.findById(newBooking._id)
      .populate({
        path: 'showtime',
        populate: {
          path: 'movie cinema room',
          select: 'title name roomNumber'
        }
      })
      .populate('seats');

    // Gửi thông báo realtime qua socket.io
    const io = req.app.get('io');
    io.emit('newBooking', {
      message: 'Có đơn đặt vé mới',
      booking: populatedBooking
    });

    res.status(201).json(populatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   PUT /api/bookings/:id
// @desc    Cập nhật trạng thái booking
router.put('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    // Chỉ admin mới có quyền cập nhật trạng thái
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền thực hiện' });
    }

    booking.status = status;
    const updatedBooking = await booking.save();

    // Populate dữ liệu trước khi trả về
    const populatedBooking = await Booking.findById(updatedBooking._id)
      .populate({
        path: 'showtime',
        populate: {
          path: 'movie cinema room',
          select: 'title name roomNumber'
        }
      })
      .populate('seats');

    // Gửi thông báo realtime qua socket.io
    const io = req.app.get('io');
    io.emit('bookingUpdated', {
      message: 'Trạng thái đơn đặt vé đã được cập nhật',
      booking: populatedBooking
    });

    res.json(populatedBooking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   DELETE /api/bookings/:id
// @desc    Hủy booking
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy booking' });
    }

    // Kiểm tra quyền - chỉ user tạo booking hoặc admin mới có quyền hủy
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền thực hiện' });
    }

    // Cập nhật trạng thái ghế về available
    await Seat.updateMany(
      { _id: { $in: booking.seats } },
      { $set: { isBooked: false } }
    );

    await booking.deleteOne();

    // Gửi thông báo realtime qua socket.io
    const io = req.app.get('io');
    io.emit('bookingCancelled', {
      message: 'Đơn đặt vé đã bị hủy',
      bookingId: req.params.id
    });

    res.json({ message: 'Đã hủy đơn đặt vé thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 