const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Cinema = require('../models/Cinema');
const Movie = require('../models/Movie');
const { auth, adminAuth } = require('../middleware/auth');
const moment = require('moment');
const ExcelJS = require('exceljs');
const Promotion = require('../models/Promotion');

// Middleware kiểm tra quyền admin
router.use(auth);
router.use(adminAuth);

// API Quản lý thông báo
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách thông báo' });
  }
});

router.post('/notifications', async (req, res) => {
  try {
    const { title, content, type, status, scheduledTime } = req.body;
    const notification = new Notification({
      title,
      content,
      type,
      status,
      scheduledTime: status === 'scheduled' ? scheduledTime : null
    });
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tạo thông báo' });
  }
});

router.put('/notifications/:id', async (req, res) => {
  try {
    const { title, content, type, status, scheduledTime } = req.body;
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        type,
        status,
        scheduledTime: status === 'scheduled' ? scheduledTime : null
      },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật thông báo' });
  }
});

router.delete('/notifications/:id', async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa thông báo thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa thông báo' });
  }
});

router.post('/notifications/:id/send', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    // Gửi thông báo qua WebSocket
    req.app.get('io').emit('notification', {
      type: 'notification',
      data: notification
    });

    notification.status = 'sent';
    await notification.save();

    res.json({ message: 'Gửi thông báo thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi gửi thông báo' });
  }
});

// API Báo cáo thống kê
router.get('/reports', async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const start = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');

    let reportData = {};

    // Lấy tổng doanh thu và số vé
    const bookings = await Booking.find({
      createdAt: { $gte: start, $lte: end },
      status: 'confirmed'
    }).populate({
      path: 'showtime',
      populate: {
        path: 'movie cinema',
        select: 'title name'
      }
    });

    reportData.totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
    reportData.totalTickets = bookings.reduce((sum, booking) => sum + booking.seats.length, 0);
    reportData.totalBookings = bookings.length;

    if (type === 'revenue') {
      // Thống kê doanh thu theo ngày
      const revenueByDay = {};
      bookings.forEach(booking => {
        const date = moment(booking.createdAt).format('YYYY-MM-DD');
        revenueByDay[date] = (revenueByDay[date] || 0) + booking.totalPrice;
      });

      reportData.revenueByDay = Object.entries(revenueByDay).map(([date, amount]) => ({
        date,
        amount
      }));
    } else if (type === 'movies') {
      // Thống kê phim bán chạy
      const movieStats = {};
      bookings.forEach(booking => {
        const movieId = booking.showtime.movie._id.toString();
        const movieTitle = booking.showtime.movie.title;
        if (!movieStats[movieId]) {
          movieStats[movieId] = {
            movieId,
            title: movieTitle,
            ticketCount: 0,
            revenue: 0
          };
        }
        movieStats[movieId].ticketCount += booking.seats.length;
        movieStats[movieId].revenue += booking.totalPrice;
      });

      reportData.topMovies = Object.values(movieStats)
        .sort((a, b) => b.ticketCount - a.ticketCount)
        .slice(0, 10);
    } else if (type === 'cinemas') {
      // Thống kê doanh thu theo rạp
      const cinemaStats = {};
      bookings.forEach(booking => {
        const cinemaId = booking.showtime.cinema._id.toString();
        const cinemaName = booking.showtime.cinema.name;
        if (!cinemaStats[cinemaId]) {
          cinemaStats[cinemaId] = {
            cinemaId,
            name: cinemaName,
            ticketCount: 0,
            revenue: 0
          };
        }
        cinemaStats[cinemaId].ticketCount += booking.seats.length;
        cinemaStats[cinemaId].revenue += booking.totalPrice;
      });

      const totalRevenue = Object.values(cinemaStats).reduce((sum, stat) => sum + stat.revenue, 0);
      reportData.revenueByCinema = Object.values(cinemaStats).map(stat => ({
        ...stat,
        percentage: ((stat.revenue / totalRevenue) * 100).toFixed(2)
      }));
    }

    res.json(reportData);
  } catch (error) {
    console.error('Lỗi khi lấy báo cáo:', error);
    res.status(500).json({ message: 'Lỗi khi lấy báo cáo' });
  }
});

router.get('/reports/export', async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const start = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo');

    const bookings = await Booking.find({
      createdAt: { $gte: start, $lte: end },
      status: 'confirmed'
    }).populate({
      path: 'showtime',
      populate: {
        path: 'movie cinema',
        select: 'title name'
      }
    });

    // Thêm header
    worksheet.addRow(['Báo cáo thống kê']);
    worksheet.addRow(['Từ ngày', start.format('DD/MM/YYYY')]);
    worksheet.addRow(['Đến ngày', end.format('DD/MM/YYYY')]);
    worksheet.addRow([]);

    if (type === 'revenue') {
      worksheet.addRow(['Ngày', 'Doanh thu']);
      const revenueByDay = {};
      bookings.forEach(booking => {
        const date = moment(booking.createdAt).format('DD/MM/YYYY');
        revenueByDay[date] = (revenueByDay[date] || 0) + booking.totalPrice;
      });

      Object.entries(revenueByDay).forEach(([date, amount]) => {
        worksheet.addRow([date, amount]);
      });
    } else if (type === 'movies') {
      worksheet.addRow(['Phim', 'Số vé', 'Doanh thu']);
      const movieStats = {};
      bookings.forEach(booking => {
        const movieTitle = booking.showtime.movie.title;
        if (!movieStats[movieTitle]) {
          movieStats[movieTitle] = {
            ticketCount: 0,
            revenue: 0
          };
        }
        movieStats[movieTitle].ticketCount += booking.seats.length;
        movieStats[movieTitle].revenue += booking.totalPrice;
      });

      Object.entries(movieStats).forEach(([title, stats]) => {
        worksheet.addRow([title, stats.ticketCount, stats.revenue]);
      });
    } else if (type === 'cinemas') {
      worksheet.addRow(['Rạp', 'Số vé', 'Doanh thu', 'Tỷ lệ']);
      const cinemaStats = {};
      bookings.forEach(booking => {
        const cinemaName = booking.showtime.cinema.name;
        if (!cinemaStats[cinemaName]) {
          cinemaStats[cinemaName] = {
            ticketCount: 0,
            revenue: 0
          };
        }
        cinemaStats[cinemaName].ticketCount += booking.seats.length;
        cinemaStats[cinemaName].revenue += booking.totalPrice;
      });

      const totalRevenue = Object.values(cinemaStats).reduce((sum, stat) => sum + stat.revenue, 0);
      Object.entries(cinemaStats).forEach(([name, stats]) => {
        const percentage = ((stats.revenue / totalRevenue) * 100).toFixed(2);
        worksheet.addRow([name, stats.ticketCount, stats.revenue, `${percentage}%`]);
      });
    }

    // Thiết lập header response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=report-${moment().format('YYYY-MM-DD')}.xlsx`
    );

    // Gửi file Excel
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Lỗi khi xuất báo cáo:', error);
    res.status(500).json({ message: 'Lỗi khi xuất báo cáo' });
  }
});

// API Quản lý người dùng
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách người dùng' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { username, email, role, status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, role, status },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật người dùng' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa người dùng' });
  }
});

// API Quản lý đặt vé
router.get('/bookings', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: moment(startDate).startOf('day'),
        $lte: moment(endDate).endOf('day')
      };
    }

    const bookings = await Booking.find(query)
      .populate('user', 'username email')
      .populate('movie', 'title')
      .populate('cinema', 'name')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đặt vé' });
  }
});

router.put('/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'username email');
    
    if (status === 'confirmed') {
      // Gửi thông báo xác nhận cho người dùng
      req.app.get('io').emit('notification', {
        type: 'booking_confirmed',
        data: booking
      });
    }
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái đặt vé' });
  }
});

// API Quản lý khuyến mãi
router.get('/promotions', async (req, res) => {
  try {
    const promotions = await Promotion.find().sort({ createdAt: -1 });
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách khuyến mãi' });
  }
});

router.post('/promotions', async (req, res) => {
  try {
    const { code, name, type, value, description, startDate, endDate, isActive } = req.body;
    const promotion = new Promotion({
      code,
      name,
      type,
      value,
      description,
      startDate,
      endDate,
      isActive
    });
    await promotion.save();
    res.status(201).json(promotion);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Mã khuyến mãi đã tồn tại' });
    } else {
      res.status(500).json({ message: 'Lỗi khi tạo khuyến mãi' });
    }
  }
});

router.put('/promotions/:id', async (req, res) => {
  try {
    const { code, name, type, value, description, startDate, endDate, isActive } = req.body;
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      {
        code,
        name,
        type,
        value,
        description,
        startDate,
        endDate,
        isActive
      },
      { new: true }
    );
    res.json(promotion);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Mã khuyến mãi đã tồn tại' });
    } else {
      res.status(500).json({ message: 'Lỗi khi cập nhật khuyến mãi' });
    }
  }
});

router.delete('/promotions/:id', async (req, res) => {
  try {
    await Promotion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa khuyến mãi thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa khuyến mãi' });
  }
});

// Tự động cập nhật trạng thái khuyến mãi mỗi phút
setInterval(async () => {
  try {
    await Promotion.updatePromotionStatuses();
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái khuyến mãi:', error);
  }
}, 60000);

// API Tìm kiếm và lọc khuyến mãi
router.get('/promotions/search', async (req, res) => {
  try {
    const { code, name, type, status, startDate, endDate } = req.query;
    const query = {};

    if (code) {
      query.code = { $regex: code, $options: 'i' };
    }
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    if (type) {
      query.type = type;
    }
    if (status) {
      query.status = status;
    }
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }

    const promotions = await Promotion.find(query).sort({ createdAt: -1 });
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tìm kiếm khuyến mãi' });
  }
});

// API Xuất báo cáo khuyến mãi
router.get('/promotions/export', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }

    const promotions = await Promotion.find(query).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo khuyến mãi');

    worksheet.columns = [
      { header: 'Mã khuyến mãi', key: 'code', width: 15 },
      { header: 'Tên khuyến mãi', key: 'name', width: 30 },
      { header: 'Loại', key: 'type', width: 15 },
      { header: 'Giá trị', key: 'value', width: 15 },
      { header: 'Ngày bắt đầu', key: 'startDate', width: 20 },
      { header: 'Ngày kết thúc', key: 'endDate', width: 20 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Số lần sử dụng', key: 'usageCount', width: 15 }
    ];

    promotions.forEach(promotion => {
      worksheet.addRow({
        code: promotion.code,
        name: promotion.name,
        type: promotion.type === 'discount' ? 'Giảm giá' : 'Quà tặng',
        value: promotion.type === 'discount' ? `${promotion.value}%` : promotion.value,
        startDate: moment(promotion.startDate).format('DD/MM/YYYY'),
        endDate: moment(promotion.endDate).format('DD/MM/YYYY'),
        status: promotion.status === 'active' ? 'Đang hoạt động' : 
                promotion.status === 'inactive' ? 'Đã kết thúc' : 'Sắp diễn ra',
        usageCount: promotion.usageCount || 0
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=promotions_report_${moment().format('YYYYMMDD')}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xuất báo cáo khuyến mãi' });
  }
});

// API Gửi thông báo khuyến mãi
router.post('/promotions/:id/notify', async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    }

    // Tạo thông báo mới
    const notification = new Notification({
      title: `Khuyến mãi mới: ${promotion.name}`,
      content: `Mã khuyến mãi: ${promotion.code}\nGiá trị: ${promotion.type === 'discount' ? `${promotion.value}%` : promotion.value}\nThời gian: ${moment(promotion.startDate).format('DD/MM/YYYY')} - ${moment(promotion.endDate).format('DD/MM/YYYY')}`,
      type: 'promotion',
      status: 'sent'
    });
    await notification.save();

    // Gửi thông báo qua WebSocket
    req.app.get('io').emit('notification', {
      type: 'promotion',
      data: promotion
    });

    res.json({ message: 'Gửi thông báo khuyến mãi thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi gửi thông báo khuyến mãi' });
  }
});

// API Thống kê khuyến mãi
router.get('/promotions/stats', async (req, res) => {
  try {
    const stats = await Promotion.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: await Promotion.countDocuments(),
      active: stats.find(s => s._id === 'active')?.count || 0,
      inactive: stats.find(s => s._id === 'inactive')?.count || 0,
      scheduled: stats.find(s => s._id === 'scheduled')?.count || 0
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy thống kê khuyến mãi' });
  }
});

module.exports = router; 