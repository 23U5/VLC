const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Showtime = require('../models/Showtime');
const Movie = require('../models/Movie');
const Cinema = require('../models/Cinema');
const Room = require('../models/Room');

// Lấy danh sách suất chiếu
router.get('/', async (req, res) => {
  try {
    const { movie, cinema, date } = req.query;
    let query = {};

    if (movie) {
      query.movie = movie;
    }

    if (cinema) {
      query.cinema = cinema;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.startTime = { $gte: startDate, $lte: endDate };
    }

    const showtimes = await Showtime.find(query)
      .populate('movie')
      .populate('cinema')
      .populate('room')
      .sort({ startTime: 1 });
    res.json(showtimes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lấy chi tiết suất chiếu
router.get('/:id', async (req, res) => {
  try {
    const showtime = await Showtime.findById(req.params.id)
      .populate('movie')
      .populate('cinema')
      .populate('room');
    if (!showtime) {
      return res.status(404).json({ message: 'Không tìm thấy suất chiếu' });
    }
    res.json(showtime);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Thêm suất chiếu mới (admin)
router.post('/', [auth, adminAuth], async (req, res) => {
  try {
    const { movie, cinema, room, startTime, endTime, price } = req.body;

    // Kiểm tra phim tồn tại
    const existingMovie = await Movie.findById(movie);
    if (!existingMovie) {
      return res.status(404).json({ message: 'Không tìm thấy phim' });
    }

    // Kiểm tra rạp tồn tại
    const existingCinema = await Cinema.findById(cinema);
    if (!existingCinema) {
      return res.status(404).json({ message: 'Không tìm thấy rạp' });
    }

    // Kiểm tra phòng tồn tại
    const existingRoom = await Room.findById(room);
    if (!existingRoom) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }

    // Kiểm tra phòng có thuộc rạp không
    if (existingRoom.cinema.toString() !== cinema) {
      return res.status(400).json({ message: 'Phòng không thuộc rạp này' });
    }

    // Kiểm tra trùng lịch
    const overlappingShowtime = await Showtime.findOne({
      room,
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });

    if (overlappingShowtime) {
      return res.status(400).json({ message: 'Thời gian chiếu bị trùng' });
    }

    const showtime = new Showtime({
      movie,
      cinema,
      room,
      startTime,
      endTime,
      price
    });

    await showtime.save();
    res.status(201).json(showtime);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cập nhật suất chiếu (admin)
router.put('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { startTime, endTime, price } = req.body;

    const showtime = await Showtime.findById(req.params.id);
    if (!showtime) {
      return res.status(404).json({ message: 'Không tìm thấy suất chiếu' });
    }

    if (startTime && endTime) {
      // Kiểm tra trùng lịch
      const overlappingShowtime = await Showtime.findOne({
        room: showtime.room,
        _id: { $ne: req.params.id },
        $or: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime }
          }
        ]
      });

      if (overlappingShowtime) {
        return res.status(400).json({ message: 'Thời gian chiếu bị trùng' });
      }

      showtime.startTime = startTime;
      showtime.endTime = endTime;
    }

    if (price) {
      showtime.price = price;
    }

    const updatedShowtime = await showtime.save();
    res.json(updatedShowtime);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Xóa suất chiếu (admin)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const showtime = await Showtime.findById(req.params.id);
    if (!showtime) {
      return res.status(404).json({ message: 'Không tìm thấy suất chiếu' });
    }

    await showtime.deleteOne();
    res.json({ message: 'Xóa suất chiếu thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 