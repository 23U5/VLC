const mongoose = require('mongoose');
const moment = require('moment');

const promotionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'gift'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'Ngày kết thúc phải sau ngày bắt đầu'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'scheduled'],
    default: 'scheduled'
  },
  usageLimit: {
    type: Number,
    min: 0
  },
  usageCount: {
    type: Number,
    default: 0
  },
  minPurchaseAmount: {
    type: Number,
    min: 0
  },
  maxDiscountAmount: {
    type: Number,
    min: 0
  },
  applicableMovies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie'
  }],
  applicableCinemas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cinema'
  }]
}, {
  timestamps: true
});

// Tự động cập nhật trạng thái dựa trên ngày
promotionSchema.statics.updatePromotionStatuses = async function() {
  const now = moment();
  
  // Cập nhật các khuyến mãi đã hết hạn
  await this.updateMany(
    {
      status: { $ne: 'inactive' },
      endDate: { $lt: now.toDate() }
    },
    {
      $set: { status: 'inactive' }
    }
  );

  // Cập nhật các khuyến mãi đang hoạt động
  await this.updateMany(
    {
      status: { $ne: 'active' },
      startDate: { $lte: now.toDate() },
      endDate: { $gt: now.toDate() }
    },
    {
      $set: { status: 'active' }
    }
  );
};

// Kiểm tra khuyến mãi có thể áp dụng cho đơn hàng
promotionSchema.methods.isApplicable = function(booking) {
  const now = moment();
  
  // Kiểm tra thời gian
  if (now < moment(this.startDate) || now > moment(this.endDate)) {
    return false;
  }

  // Kiểm tra trạng thái
  if (this.status !== 'active') {
    return false;
  }

  // Kiểm tra giới hạn sử dụng
  if (this.usageLimit && this.usageCount >= this.usageLimit) {
    return false;
  }

  // Kiểm tra giá trị đơn hàng tối thiểu
  if (this.minPurchaseAmount && booking.totalPrice < this.minPurchaseAmount) {
    return false;
  }

  // Kiểm tra rạp áp dụng
  if (this.applicableCinemas && this.applicableCinemas.length > 0) {
    if (!this.applicableCinemas.includes(booking.showtime.cinema)) {
      return false;
    }
  }

  // Kiểm tra phim áp dụng
  if (this.applicableMovies && this.applicableMovies.length > 0) {
    if (!this.applicableMovies.includes(booking.showtime.movie)) {
      return false;
    }
  }

  return true;
};

// Tính giá trị giảm giá
promotionSchema.methods.calculateDiscount = function(amount) {
  let discount = 0;

  if (this.type === 'percentage') {
    discount = (amount * this.value) / 100;
    if (this.maxDiscountAmount) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  } else if (this.type === 'fixed') {
    discount = this.value;
  }

  return Math.min(discount, amount);
};

module.exports = mongoose.model('Promotion', promotionSchema); 