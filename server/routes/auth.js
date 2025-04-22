const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');

// Đăng ký
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    
    // Log dữ liệu đầu vào (không log password)
    console.log('Đăng ký user mới:', { username, email, phone });
    
    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Email đã tồn tại:', email);
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    // Tạo user mới
    const user = new User({
      name: username,
      email,
      password,
      phone,
      address: 'Chưa cập nhật'
    });

    // Lưu user
    console.log('Đang lưu user...');
    await user.save();
    console.log('User đã được lưu với ID:', user._id);

    // Tạo token
    console.log('Đang tạo token...');
    const token = user.generateAuthToken();
    console.log('Token đã được tạo');
    
    // Trả về response
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    // Log chi tiết lỗi
    console.error('Lỗi chi tiết khi đăng ký:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Xử lý các loại lỗi cụ thể
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Dữ liệu không hợp lệ',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(500).json({ 
        message: 'Lỗi khi tạo token',
        error: error.message
      });
    }

    // Lỗi mặc định
    res.status(500).json({ 
      message: 'Lỗi server khi đăng ký',
      error: error.message
    });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Log thông tin đăng nhập (không log password)
    console.log('Đang xử lý đăng nhập cho email:', email);

    // Validate email
    if (!email || !password) {
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ email và mật khẩu',
        error: 'MISSING_FIELDS'
      });
    }

    // Tìm user và bao gồm trường password
    const user = await User.findOne({ email }).select('+password');
    
    // Kiểm tra user tồn tại
    if (!user) {
      console.log('Không tìm thấy user với email:', email);
      return res.status(400).json({ 
        message: 'Email hoặc mật khẩu không đúng',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Kiểm tra trạng thái tài khoản
    if (user.status === 'inactive') {
      console.log('Tài khoản không hoạt động:', email);
      return res.status(400).json({ 
        message: 'Tài khoản đã bị vô hiệu hóa',
        error: 'ACCOUNT_INACTIVE'
      });
    }

    // Kiểm tra mật khẩu
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Mật khẩu không đúng cho email:', email);
      return res.status(400).json({ 
        message: 'Email hoặc mật khẩu không đúng',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Tạo token
    console.log('Tạo token cho user:', user._id);
    const token = user.generateAuthToken();

    // Chuẩn bị thông tin user để trả về (loại bỏ các trường nhạy cảm)
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      status: user.status
    };

    // Log thành công
    console.log('Đăng nhập thành công:', userResponse.email);

    // Trả về response
    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: userResponse
    });

  } catch (error) {
    // Log lỗi chi tiết
    console.error('Lỗi đăng nhập:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Trả về lỗi
    res.status(500).json({ 
      message: 'Lỗi server khi đăng nhập',
      error: error.message
    });
  }
});

// Lấy thông tin người dùng hiện tại
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Không tìm thấy token' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    res.json(user);
  } catch (error) {
    console.error('Lỗi khi lấy thông tin người dùng:', error);
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
});

// Quên mật khẩu
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này' });
    }

    // Tạo token reset
    const resetToken = user.getResetPasswordToken();
    await user.save();

    // TODO: Gửi email chứa resetToken
    res.json({ message: 'Email reset mật khẩu đã được gửi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset mật khẩu
router.put('/reset-password/:resetToken', async (req, res) => {
  try {
    const { password } = req.body;
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    // Cập nhật mật khẩu
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 