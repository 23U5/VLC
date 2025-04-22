const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Movie = require('../models/Movie');
const multer = require('multer');
const path = require('path');

// Cấu hình multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Lấy danh sách phim
router.get('/', async (req, res) => {
  try {
    const { status, genre, search } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }
    if (genre) {
      query.genre = genre;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const movies = await Movie.find(query).sort({ releaseDate: -1 });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lấy thông tin phim theo ID
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Không tìm thấy phim' });
    }
    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Thêm phim mới (chỉ admin)
router.post('/', [auth, adminAuth], upload.fields([
  { name: 'poster', maxCount: 1 },
  { name: 'trailer', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      title,
      description,
      director,
      language,
      ageRating,
      status,
      genre,
      cast,
      releaseDate,
      duration,
      youtubeUrl
    } = req.body;

    // Xử lý file
    const poster = req.files.poster ? req.files.poster[0].filename : null;
    const trailer = req.files.trailer ? req.files.trailer[0].filename : null;

    const movie = new Movie({
      title,
      description,
      director,
      language,
      ageRating,
      status,
      genre: genre.split(','),
      cast: cast.split(','),
      releaseDate,
      duration,
      poster,
      trailer: youtubeUrl || trailer // Sử dụng link YouTube nếu có
    });

    const newMovie = await movie.save();
    res.status(201).json(newMovie);
  } catch (error) {
    console.error('Lỗi khi tạo phim:', error);
    res.status(400).json({ message: error.message });
  }
});

// Cập nhật thông tin phim (chỉ admin)
router.put('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Không tìm thấy phim' });
    }

    const updates = [
      'title', 'description', 'genre', 'duration', 'releaseDate', 'endDate',
      'rating', 'director', 'cast', 'language', 'subtitle', 'poster',
      'trailer', 'status', 'isFeatured'
    ];

    updates.forEach(update => {
      if (req.body[update] !== undefined) {
        movie[update] = req.body[update];
      }
    });

    const updatedMovie = await movie.save();
    res.json(updatedMovie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Xóa phim (chỉ admin)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Không tìm thấy phim' });
    }

    await movie.deleteOne();
    res.json({ message: 'Đã xóa phim thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lấy danh sách phim nổi bật
router.get('/featured', async (req, res) => {
  try {
    const movies = await Movie.find({ 
      isFeatured: true,
      status: 'showing',
      releaseDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    })
    .sort({ releaseDate: -1 })
    .limit(6);
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 