const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Vui lòng nhập email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
  },
  password: {
    type: String,
    required: [true, 'Vui lòng nhập mật khẩu'],
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Vui lòng nhập số điện thoại'],
    match: [/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ']
  },
  address: {
    type: String,
    default: 'Chưa cập nhật'
  },
  role: {
    type: String,
    enum: ['user', 'staff', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password trước khi lưu
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Tạo token
userSchema.methods.generateAuthToken = function() {
  try {
    // Kiểm tra biến môi trường
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET không được cấu hình');
    }
    if (!process.env.JWT_EXPIRE) {
      throw new Error('JWT_EXPIRE không được cấu hình');
    }

    // Log thông tin token
    console.log('Generating token with config:', {
      userId: this._id.toString(),
      role: this.role,
      email: this.email,
      jwtExpire: process.env.JWT_EXPIRE
    });

    // Tạo payload
    const payload = {
      id: this._id,
      role: this.role,
      email: this.email
    };

    // Tạo options
    const options = {
      expiresIn: process.env.JWT_EXPIRE
    };

    // Tạo token
    const token = jwt.sign(payload, process.env.JWT_SECRET, options);
    
    // Verify token để đảm bảo nó hợp lệ
    jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('Token generated and verified successfully');
    return token;
  } catch (error) {
    console.error('Lỗi khi tạo token:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      env: {
        hasSecret: !!process.env.JWT_SECRET,
        hasExpire: !!process.env.JWT_EXPIRE,
        expire: process.env.JWT_EXPIRE
      }
    });
    throw new Error(`Không thể tạo token xác thực: ${error.message}`);
  }
};

// So sánh password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Tạo token reset mật khẩu
userSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 phút
  return resetToken;
};

// Lấy thông tin public
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  return userObject;
};

module.exports = mongoose.model('User', userSchema); 