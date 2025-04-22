const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Lấy danh sách phim
router.get('/', async (req, res) => {
    try {
        const movies = await Movie.find()
            .populate('genres', 'name')
            .populate('director', 'name')
            .populate('cast', 'name');
        res.json(movies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Lấy thông tin phim theo ID
router.get('/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id)
            .populate('genres', 'name')
            .populate('director', 'name')
            .populate('cast', 'name');
        if (!movie) {
            return res.status(404).json({ message: 'Không tìm thấy phim' });
        }
        res.json(movie);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Tạo phim mới (Admin)
router.post('/', adminAuth, async (req, res) => {
    const movie = new Movie({
        title: req.body.title,
        description: req.body.description,
        duration: req.body.duration,
        releaseDate: req.body.releaseDate,
        genres: req.body.genres,
        director: req.body.director,
        cast: req.body.cast,
        poster: req.body.poster,
        trailer: req.body.trailer,
        rating: req.body.rating,
        status: req.body.status
    });

    try {
        const newMovie = await movie.save();
        res.status(201).json(newMovie);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Cập nhật phim (Admin)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ message: 'Không tìm thấy phim' });
        }

        Object.assign(movie, req.body);
        const updatedMovie = await movie.save();
        res.json(updatedMovie);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Xóa phim (Admin)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ message: 'Không tìm thấy phim' });
        }

        await movie.remove();
        res.json({ message: 'Đã xóa phim thành công' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Tìm kiếm phim
router.get('/search', async (req, res) => {
    try {
        const { title, genre, director, cast } = req.query;
        const query = {};

        if (title) {
            query.title = { $regex: title, $options: 'i' };
        }
        if (genre) {
            query.genres = genre;
        }
        if (director) {
            query.director = director;
        }
        if (cast) {
            query.cast = cast;
        }

        const movies = await Movie.find(query)
            .populate('genres', 'name')
            .populate('director', 'name')
            .populate('cast', 'name');
        res.json(movies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 