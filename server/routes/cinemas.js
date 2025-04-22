const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Cinema = require('../models/Cinema');
const Room = require('../models/Room');

// @route   GET /api/cinemas
// @desc    Get all cinemas
router.get('/', async (req, res) => {
  try {
    const cinemas = await Cinema.find().populate('rooms');
    res.json(cinemas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/cinemas/:id
// @desc    Get cinema by ID
router.get('/:id', async (req, res) => {
  try {
    const cinema = await Cinema.findById(req.params.id).populate('rooms');
    if (!cinema) {
      return res.status(404).json({ message: 'Không tìm thấy rạp' });
    }
    res.json(cinema);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/cinemas
// @desc    Create a cinema (admin only)
router.post('/', [auth, adminAuth], async (req, res) => {
  try {
    const { name, address, city, phone, email, description } = req.body;

    const cinema = new Cinema({
      name,
      address,
      city,
      phone,
      email,
      description
    });

    await cinema.save();
    res.status(201).json(cinema);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   PUT /api/cinemas/:id
// @desc    Update a cinema (admin only)
router.put('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { name, address, city, phone, email, description } = req.body;

    const cinema = await Cinema.findById(req.params.id);
    if (!cinema) {
      return res.status(404).json({ message: 'Không tìm thấy rạp' });
    }

    cinema.name = name || cinema.name;
    cinema.address = address || cinema.address;
    cinema.city = city || cinema.city;
    cinema.phone = phone || cinema.phone;
    cinema.email = email || cinema.email;
    cinema.description = description || cinema.description;

    const updatedCinema = await cinema.save();
    res.json(updatedCinema);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   DELETE /api/cinemas/:id
// @desc    Delete a cinema (admin only)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const cinema = await Cinema.findById(req.params.id);
    if (!cinema) {
      return res.status(404).json({ message: 'Không tìm thấy rạp' });
    }

    // Delete all rooms in this cinema
    await Room.deleteMany({ cinema: req.params.id });
    await cinema.deleteOne();

    res.json({ message: 'Đã xóa rạp thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 