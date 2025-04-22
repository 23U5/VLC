const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Room = require('../models/Room');
const Cinema = require('../models/Cinema');

// Lấy danh sách phòng
router.get('/', async (req, res) => {
  try {
    const { cinema } = req.query;
    let query = {};

    if (cinema) {
      query.cinema = cinema;
    }

    const rooms = await Room.find(query).populate('cinema');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lấy chi tiết phòng
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('cinema');
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Thêm phòng mới (admin)
router.post('/', [auth, adminAuth], async (req, res) => {
  try {
    const { name, cinema, capacity, type, status } = req.body;

    // Kiểm tra rạp tồn tại
    const existingCinema = await Cinema.findById(cinema);
    if (!existingCinema) {
      return res.status(404).json({ message: 'Không tìm thấy rạp' });
    }

    const room = new Room({
      name,
      cinema,
      capacity,
      type,
      status
    });

    const newRoom = await room.save();

    // Thêm phòng vào danh sách phòng của rạp
    existingCinema.rooms.push(newRoom._id);
    await existingCinema.save();

    res.status(201).json(newRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cập nhật phòng (admin)
router.put('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { name, capacity, type, status } = req.body;

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }

    room.name = name || room.name;
    room.capacity = capacity || room.capacity;
    room.type = type || room.type;
    room.status = status || room.status;

    const updatedRoom = await room.save();
    res.json(updatedRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Xóa phòng (admin)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }

    // Xóa phòng khỏi danh sách phòng của rạp
    const cinema = await Cinema.findById(room.cinema);
    if (cinema) {
      cinema.rooms = cinema.rooms.filter(r => r.toString() !== req.params.id);
      await cinema.save();
    }

    await room.deleteOne();
    res.json({ message: 'Xóa phòng thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 