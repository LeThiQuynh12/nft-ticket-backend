// controllers/paymentController.js
require('dotenv').config();
const axios = require('axios');
const QRCode = require('qrcode');
const crypto = require('crypto');
const Order = require('../models/Order');
const { generateSignature } = require('../utils/payosUtils');
const Event = require('../models/Event');

const PAYOS_API_URL = 'https://api-merchant.payos.vn/v2/payment-requests';

exports.createPayment = async (req, res) => {
  try {
    const { eventId, tickets, description, buyerName, buyerPhone, buyerEmail } = req.body;

    if (!eventId || !tickets || !tickets.length) {
      return res.status(400).json({ message: 'eventId và tickets bắt buộc' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event không tồn tại' });

    // Tính tổng tiền & chuẩn hóa tickets
    let totalAmount = 0;
    const ticketsDetails = [];
    tickets.forEach(t => {
      const typeObj = event.ticketTypes.find(
        tt => tt.name.toLowerCase() === t.ticketType.toLowerCase()
      );
      if (!typeObj) return;
      const price = typeObj.price;
      totalAmount += price;
      ticketsDetails.push({ ticketType: t.ticketType, price, zone: t.zone, seat: t.seat });
    });

    if (!ticketsDetails.length) {
      return res.status(400).json({ message: 'Không có vé hợp lệ' });
    }

// Sinh orderId tự động
const orderId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

// Tạo orderCode để gửi PayOS
const orderCode = Date.now(); // hoặc Number(Date.now())

    const shortDescription = (description || `Thanh toán ${orderId}`).slice(0, 25);

    // Gửi request đến PayOS
    const dataForSignature = {
      orderCode: Number(Date.now()),
      amount: totalAmount,
      description: shortDescription,
  cancelUrl: process.env.FRONTEND_URL + '/payment-failed',
  returnUrl: process.env.FRONTEND_URL + '/payment-success?orderCode=' + orderCode
    };

    const signature = generateSignature(dataForSignature, process.env.PAYOS_CHECKSUM_KEY);

    const payload = {
      ...dataForSignature,
      buyerName,
      buyerPhone,
      buyerEmail,
      signature
    };

    const headers = {
      'x-client-id': process.env.PAYOS_CLIENT_ID,
      'x-api-key': process.env.PAYOS_API_KEY,
      'Content-Type': 'application/json'
    };

    const response = await axios.post(PAYOS_API_URL, payload, { headers });
    const respData = response.data;

    // Lưu đơn hàng
    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        eventId,
        tickets: ticketsDetails,
        totalAmount,
        customer: { name: buyerName, phone: buyerPhone, email: buyerEmail },
        paymentUrl: respData?.data?.checkoutUrl || respData?.data?.qrCode,
        status: 'pending'
      },
      { upsert: true, new: true }
    );

    // Trả về payUrl và order, bỏ QR base64
    return res.status(201).json({
      success: true,
      payUrl: respData?.data?.checkoutUrl || respData?.data?.qrCode,
      order,
      payosResponse: respData
    });

  } catch (err) {
    console.error('createPayment error:', err.response?.data || err.message || err);
    res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
};


// Webhook endpoint: nhận body { code, desc, success, data, signature }
exports.payosWebhook = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') return res.status(400).send('Invalid body');

    const { data, signature: receivedSignature } = body;
    if (!data) return res.status(400).send('Missing data');

    // compute signature from data
    const computedSignature = generateSignature(data, process.env.PAYOS_CHECKSUM_KEY);

    // debug logs (bỏ hoặc giữ tuỳ bạn)
    console.log('PayOS webhook received. computedSignature=', computedSignature, 'received=', receivedSignature);

    if (computedSignature !== receivedSignature) {
      console.error('❌ Invalid signature');
      // trả 400 để PayOS biết, và dashboard sẽ hiển thị lỗi "Invalid signature"
      return res.status(400).send('Invalid signature');
    }

    // Xử lý dữ liệu thực tế
    // Theo sample data.orderCode, data.status, data.amount
    const orderCode = data.orderCode || data.orderId || data.orderCode;
    const statusFromPayos = (data.status || data.code || '').toString().toUpperCase();

    // Tìm order trong db: Order.orderId == orderCode
    const order = await Order.findOne({ orderId: String(orderCode) });
    if (!order) {
      console.warn('Order not found for orderCode=', orderCode);
      // trả 200 hay 404? mình trả 200 OK để PayOS không retry forever, nhưng log cảnh báo
      return res.status(200).send('Order not found');
    }

    // map trạng thái
    if (statusFromPayos === 'PAID' || statusFromPayos === 'SUCCESS' || statusFromPayos === '00') {
      order.status = 'paid';
    } else if (statusFromPayos === 'CANCELED' || statusFromPayos === 'FAILED') {
      order.status = 'failed';
    } else {
      // giữ nguyên / pending
    }
    await order.save();

    console.log(`✅ Webhook processed for order ${order.orderId}. new status=${order.status}`);
    return res.status(200).send('OK');
  } catch (err) {
    console.error('payosWebhook error:', err);
    return res.status(500).send('ERROR');
  }
};

exports.getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, status: order.status, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};
