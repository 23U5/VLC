const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Cinema = require('../models/Cinema');
const Showtime = require('../models/Showtime');

// Tìm kiếm phim
router.get('/movies', async (req, res) => {
  try {
    const { keyword, genre, status } = req.query;
    let query = {};

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (genre) {
      query.genre = genre;
    }

    if (status) {
      query.status = status;
    }

    const movies = await Movie.find(query);
    res.json(movies);
  } catch (error) {
    console.error('Lỗi khi tìm kiếm phim:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Tìm kiếm suất chiếu
router.get('/showtimes', async (req, res) => {
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
      .populate('room');
    res.json(showtimes);
  } catch (error) {
    console.error('Lỗi khi tìm kiếm suất chiếu:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Tìm kiếm rạp
router.get('/cinemas', async (req, res) => {
  try {
    const { keyword, city } = req.query;
    let query = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { address: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (city) {
      query.city = city;
    }

    const cinemas = await Cinema.find(query).populate('rooms');
    res.json(cinemas);
  } catch (error) {
    console.error('Lỗi khi tìm kiếm rạp:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router; 