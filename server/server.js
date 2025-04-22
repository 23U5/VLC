const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Load biến môi trường từ file .env
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Lỗi khi đọc file .env:', result.error);
  process.exit(1);
}

// Kiểm tra các biến môi trường bắt buộc
const requiredEnvVars = ['JWT_SECRET', 'JWT_EXPIRE', 'MONGODB_URI'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Thiếu các biến môi trường:', missingVars.join(', '));
  console.error('Các biến môi trường hiện tại:', process.env);
  process.exit(1);
}

// Log cấu hình môi trường
console.log('Cấu hình môi trường:', {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  mongoUri: process.env.MONGODB_URI,
  jwtExpire: process.env.JWT_EXPIRE,
  clientUrl: process.env.CLIENT_URL
});

const Notification = require('./models/Notification');

const app = express();
const server = http.createServer(app);

// Tăng giới hạn số lượng listener
require('events').EventEmitter.defaultMaxListeners = 20;

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Lưu io instance để sử dụng trong các route
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection with retry mechanism
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Kiểm tra và tạo các collection nếu chưa tồn tại
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const requiredCollections = [
      'users', 'movies', 'cinemas', 'rooms', 
      'showtimes', 'tickets', 'promotions', 'notifications'
    ];
    
    for (const collection of requiredCollections) {
      if (!collectionNames.includes(collection)) {
        console.log(`Tạo collection: ${collection}`);
        await mongoose.connection.db.createCollection(collection);
      }
    }
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// Initial connection
connectDB();

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  connectDB();
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const movieRoutes = require('./routes/movies');
const cinemaRoutes = require('./routes/cinemas');
const roomRoutes = require('./routes/rooms');
const showtimeRoutes = require('./routes/showtimes');
const ticketRoutes = require('./routes/tickets');
const promotionRoutes = require('./routes/promotions');
const searchRoutes = require('./routes/search');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');
const bookingRoutes = require('./routes/bookings');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/cinemas', cinemaRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Kiểm tra và gửi thông báo đã lên lịch mỗi phút
setInterval(async () => {
  try {
    await Notification.sendScheduledNotifications();
  } catch (error) {
    console.error('Lỗi khi gửi thông báo đã lên lịch:', error);
  }
}, 60000);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Đã xảy ra lỗi server!' });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = () => {
  server.listen(PORT, () => {
    console.log(`Server đang chạy trên port ${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} đang được sử dụng. Thử port khác...`);
      setTimeout(() => {
        server.close();
        server.listen(PORT + 1);
      }, 1000);
    } else {
      console.error('Lỗi server:', err);
    }
  });
};

startServer(); 