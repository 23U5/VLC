const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  director: {
    type: String,
    required: true
  },
  cast: {
    type: [String],
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  releaseDate: {
    type: Date,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  ageRating: {
    type: String,
    required: true
  },
  genre: {
    type: [String],
    required: true
  },
  status: {
    type: String,
    enum: ['nowShowing', 'comingSoon', 'ended'],
    default: 'comingSoon'
  },
  poster: {
    type: String,
    required: true
  },
  trailer: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Movie', movieSchema); 