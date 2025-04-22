const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Review = require('../models/Review');
const Movie = require('../models/Movie');

// @route   POST /api/reviews
// @desc    Create a review
router.post('/', auth, async (req, res) => {
  try {
    const { movieId, rating, comment } = req.body;

    // Kiểm tra phim tồn tại
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: 'Không tìm thấy phim' });
    }

    // Kiểm tra người dùng đã đánh giá chưa
    const existingReview = await Review.findOne({
      movie: movieId,
      user: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'Bạn đã đánh giá phim này rồi' });
    }

    // Tạo đánh giá mới
    const review = new Review({
      movie: movieId,
      user: req.user._id,
      rating,
      comment
    });

    await review.save();

    // Cập nhật điểm đánh giá trung bình của phim
    const reviews = await Review.find({ movie: movieId });
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    await Movie.findByIdAndUpdate(movieId, {
      rating: averageRating,
      totalReviews: reviews.length
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   GET /api/reviews/movie/:movieId
// @desc    Get reviews for a movie
router.get('/movie/:movieId', async (req, res) => {
  try {
    const reviews = await Review.find({ movie: req.params.movieId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/reviews/:id/like
// @desc    Like a review
router.put('/:id/like', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ msg: 'Review not found' });
    }

    // Check if user has already liked this review
    if (review.likes.includes(req.user.id)) {
      return res.status(400).json({ msg: 'Review already liked' });
    }

    review.likes.push(req.user.id);
    await review.save();

    res.json(review.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/reviews/:id/reply
// @desc    Reply to a review
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const { comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ msg: 'Review not found' });
    }

    const reply = {
      user: req.user.id,
      comment
    };

    review.replies.push(reply);
    await review.save();

    res.json(review.replies);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Cập nhật đánh giá
router.put('/:id', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    // Kiểm tra quyền sửa
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền sửa đánh giá này' });
    }

    review.rating = rating;
    review.comment = comment;
    await review.save();

    // Cập nhật điểm đánh giá trung bình của phim
    const reviews = await Review.find({ movie: review.movie });
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    await Movie.findByIdAndUpdate(review.movie, {
      rating: averageRating,
      totalReviews: reviews.length
    });

    res.json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Xóa đánh giá
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }

    // Kiểm tra quyền xóa
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền xóa đánh giá này' });
    }

    await review.remove();

    // Cập nhật điểm đánh giá trung bình của phim
    const reviews = await Review.find({ movie: review.movie });
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;
    
    await Movie.findByIdAndUpdate(review.movie, {
      rating: averageRating,
      totalReviews: reviews.length
    });

    res.json({ message: 'Xóa đánh giá thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 