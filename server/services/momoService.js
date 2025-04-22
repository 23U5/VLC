const crypto = require('crypto');

const MOMO_CONFIG = {
  partnerCode: 'MOMO',
  accessKey: 'YOUR_ACCESS_KEY',
  secretKey: 'YOUR_SECRET_KEY',
  endpoint: 'https://test-payment.momo.vn/v2/gateway/api/create'
};

const createPaymentRequest = async (orderInfo, amount, orderId) => {
  const requestId = orderId;
  const orderGroupId = '';
  const autoCapture = true;
  const lang = 'vi';
  const extraData = '';

  const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${process.env.MOMO_IPN_URL}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${process.env.MOMO_REDIRECT_URL}&requestId=${requestId}&requestType=captureWallet`;

  const signature = crypto
    .createHmac('sha256', MOMO_CONFIG.secretKey)
    .update(rawSignature)
    .digest('hex');

  const requestBody = {
    partnerCode: MOMO_CONFIG.partnerCode,
    partnerName: 'VLC Cinema',
    storeId: 'VLC Cinema',
    requestId: requestId,
    amount: amount,
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: process.env.MOMO_REDIRECT_URL,
    ipnUrl: process.env.MOMO_IPN_URL,
    lang: lang,
    extraData: extraData,
    requestType: 'captureWallet',
    signature: signature
  };

  try {
    const response = await fetch(MOMO_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Momo payment error:', error);
    throw error;
  }
};

const verifyPayment = (signature, data) => {
  const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${data.amount}&extraData=${data.extraData}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&orderType=${data.orderType}&partnerCode=${data.partnerCode}&payType=${data.payType}&requestId=${data.requestId}&responseTime=${data.responseTime}&resultCode=${data.resultCode}&transId=${data.transId}`;

  const expectedSignature = crypto
    .createHmac('sha256', MOMO_CONFIG.secretKey)
    .update(rawSignature)
    .digest('hex');

  return signature === expectedSignature;
};

module.exports = {
  createPaymentRequest,
  verifyPayment
}; 