const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware xác thực
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Không có token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Lỗi xác thực:', err);
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

// Middleware kiểm tra quyền admin
const adminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    next();
  } catch (err) {
    console.error('Lỗi kiểm tra quyền admin:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Middleware kiểm tra quyền staff
const staffAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    next();
  } catch (err) {
    console.error('Lỗi kiểm tra quyền staff:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { auth, adminAuth, staffAuth }; 