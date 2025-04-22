const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const Movie = require('../models/Movie');
const Cinema = require('../models/Cinema');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Room = require('../models/Room');

// Middleware kiểm tra quyền admin cho tất cả các route
router.use(auth);
router.use(adminAuth);

// @route   GET /api/stats/revenue
// @desc    Get revenue statistics (admin only)
router.get('/revenue', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const matchStage = {
      $match: {
        paymentStatus: 'completed',
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    };

    const groupStage = {
      $group: {
        _id: {
          $dateToString: {
            format: groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m',
            date: '$createdAt'
          }
        },
        totalRevenue: { $sum: '$totalPrice' },
        totalBookings: { $sum: 1 }
      }
    };

    const sortStage = {
      $sort: { _id: 1 }
    };

    const revenueStats = await Booking.aggregate([
      matchStage,
      groupStage,
      sortStage
    ]);

    res.json(revenueStats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/stats/movies
// @desc    Get movie statistics (admin only)
router.get('/movies', async (req, res) => {
  try {
    const movieStats = await Movie.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'showtime.movie',
          as: 'bookings'
        }
      },
      {
        $project: {
          title: 1,
          totalBookings: { $size: '$bookings' },
          totalRevenue: {
            $sum: '$bookings.totalPrice'
          },
          rating: 1
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    res.json(movieStats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/stats/cinemas
// @desc    Get cinema statistics (admin only)
router.get('/cinemas', async (req, res) => {
  try {
    const cinemaStats = await Cinema.aggregate([
      {
        $lookup: {
          from: 'rooms',
          localField: '_id',
          foreignField: 'cinema',
          as: 'rooms'
        }
      },
      {
        $lookup: {
          from: 'showtimes',
          localField: 'rooms._id',
          foreignField: 'room',
          as: 'showtimes'
        }
      },
      {
        $lookup: {
          from: 'bookings',
          localField: 'showtimes._id',
          foreignField: 'showtime',
          as: 'bookings'
        }
      },
      {
        $project: {
          name: 1,
          totalRooms: { $size: '$rooms' },
          totalShowtimes: { $size: '$showtimes' },
          totalBookings: { $size: '$bookings' },
          totalRevenue: {
            $sum: '$bookings.totalPrice'
          }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    res.json(cinemaStats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/stats/users
// @desc    Get user statistics (admin only)
router.get('/users', async (req, res) => {
  try {
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(userStats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/stats/overview
// @desc    Get overview statistics (admin only)
router.get('/overview', async (req, res) => {
  try {
    const [
      totalMovies,
      totalCinemas,
      totalRooms,
      totalUsers,
      totalShowtimes,
      totalTickets
    ] = await Promise.all([
      Movie.countDocuments(),
      Cinema.countDocuments(),
      Room.countDocuments(),
      User.countDocuments(),
      Showtime.countDocuments(),
      Ticket.countDocuments()
    ]);

    res.json({
      totalMovies,
      totalCinemas,
      totalRooms,
      totalUsers,
      totalShowtimes,
      totalTickets
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 