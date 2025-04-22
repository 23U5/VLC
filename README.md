# VLC Cinema - Website Đặt Vé Xem Phim

Website đặt vé xem phim VLC Cinema được xây dựng bằng MERN stack (MongoDB, Express, React, Node.js).

## Cài đặt

1. Cài đặt MongoDB
2. Clone repository
3. Cài đặt dependencies:
   ```bash
   npm install
   cd client
   npm install
   ```
4. Tạo file .env trong thư mục gốc với nội dung:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/vlc-cinema
   JWT_SECRET=your-secret-key
   CLIENT_URL=http://localhost:3000
   ADMIN_URL=http://localhost:3001
   NODE_ENV=development
   ```

## Chạy dự án

1. Chạy server:
   ```bash
   npm run server
   ```

2. Chạy client:
   ```bash
   npm run client
   ```

3. Hoặc chạy cả server và client cùng lúc:
   ```bash
   npm run dev
   ```

## Cấu trúc dự án

- `client/`: React frontend
- `server/`: Node.js backend
  - `models/`: MongoDB models
  - `routes/`: API routes
  - `middleware/`: Middleware functions
  - `controllers/`: Route controllers

## Tính năng

- Đăng ký/Đăng nhập người dùng
- Xem danh sách phim
- Đặt vé và chọn ghế
- Thanh toán online
- Quản lý phim (admin)
- Thống kê doanh thu (admin) 