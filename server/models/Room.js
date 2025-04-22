const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  cinema: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cinema',
    required: true
  },
  type: {
    type: String,
    enum: ['2D', '3D', 'IMAX', '4DX'],
    default: '2D'
  },
  capacity: {
    type: Number,
    required: true
  },
  rows: {
    type: Number,
    required: true
  },
  columns: {
    type: Number,
    required: true
  },
  facilities: [{
    type: String,
    enum: ['air_conditioner', 'sound_system', 'projector', '3d_glasses']
  }],
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Tạo index cho việc tìm kiếm phòng theo rạp
roomSchema.index({ cinema: 1, name: 1 }, { unique: true });

// Middleware trước khi xóa phòng
roomSchema.pre('deleteOne', { document: true }, async function(next) {
  try {
    // Xóa tất cả các suất chiếu trong phòng này
    await mongoose.model('Showtime').deleteMany({ room: this._id });
    // Xóa tất cả các ghế trong phòng này
    await mongoose.model('Seat').deleteMany({ room: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Room', roomSchema); 