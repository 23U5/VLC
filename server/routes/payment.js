const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createPaymentRequest, verifyPayment } = require('../services/momoService');
const Booking = require('../models/Booking');

// @route   POST /api/payment/momo/create
// @desc    Create Momo payment
router.post('/momo/create', auth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId).populate('showtime');

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    const orderInfo = `VLC Cinema - Booking ${bookingId}`;
    const result = await createPaymentRequest(
      orderInfo,
      booking.totalPrice,
      bookingId
    );

    if (result.resultCode === 0) {
      booking.momoTransactionId = result.transId;
      await booking.save();
      res.json({ payUrl: result.payUrl });
    } else {
      res.status(400).json({ msg: 'Payment creation failed' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/payment/momo/ipn
// @desc    Momo IPN callback
router.post('/momo/ipn', async (req, res) => {
  try {
    const { signature, ...data } = req.body;
    const isValid = verifyPayment(signature, data);

    if (!isValid) {
      return res.status(400).json({ msg: 'Invalid signature' });
    }

    const booking = await Booking.findById(data.orderId);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    if (data.resultCode === 0) {
      booking.paymentStatus = 'completed';
      booking.status = 'confirmed';
      await booking.save();
    } else {
      booking.paymentStatus = 'failed';
      await booking.save();
    }

    res.json({ msg: 'IPN processed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 