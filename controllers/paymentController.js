require('dotenv').config();
const axios = require('axios');
const Order = require('../models/Order');
const Event = require('../models/Event');
const { generateSignature } = require('../utils/payosUtils');

const PAYOS_API_URL = 'https://api-merchant.payos.vn/v2/payment-requests';

/**
 * 🧾 Tạo yêu cầu thanh toán PayOS
 */
exports.createPayment = async (req, res) => {
  try {
    const { eventId, tickets, description, buyerName, buyerPhone, buyerEmail } = req.body;

    if (!eventId || !tickets || !tickets.length) {
      return res.status(400).json({ message: 'eventId và tickets bắt buộc' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event không tồn tại' });

    // 🧮 Tính tổng tiền & chuẩn hóa vé
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

    // 🔢 Sinh orderId & orderCode trùng nhau (dễ đối chiếu)
    const orderId = Date.now().toString();
    const orderCode = Number(orderId);
    const shortDescription = (description || `Thanh toán ${orderId}`).slice(0, 25);

    // 🧾 Chuẩn bị dữ liệu gửi PayOS
    const dataForSignature = {
      orderCode,
      amount: totalAmount,
      description: shortDescription,
      cancelUrl: `${process.env.FRONTEND_URL}/payment-failed`,
      returnUrl: `${process.env.FRONTEND_URL}/payment-success?orderCode=${orderCode}`
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

    // 🚀 Gửi request đến PayOS
    const response = await axios.post(PAYOS_API_URL, payload, { headers });
    const respData = response.data;

    // 💾 Lưu đơn hàng vào DB
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

    return res.status(201).json({
      success: true,
      payUrl: respData?.data?.checkoutUrl || respData?.data?.qrCode,
      order,
      payosResponse: respData
    });
  } catch (err) {
    console.error('❌ createPayment error:', err.response?.data || err.message || err);
    res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
};

/**
 * 🔔 Webhook PayOS (gọi khi giao dịch hoàn tất)
 */
exports.payosWebhook = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') return res.status(400).send('Invalid body');

    const { data, signature: receivedSignature } = body;
    if (!data) return res.status(400).send('Missing data');

    const computedSignature = generateSignature(data, process.env.PAYOS_CHECKSUM_KEY);
    console.log('📩 PayOS webhook:', { computedSignature, receivedSignature, data });

    if (computedSignature !== receivedSignature) {
      console.error('❌ Invalid signature');
      return res.status(400).send('Invalid signature');
    }

    const orderCode = data.orderCode?.toString();
    const statusFromPayos = (data.status || data.code || '').toString().toUpperCase();

    const order = await Order.findOne({ orderId: orderCode });
    if (!order) {
      console.warn('⚠️ Order not found for orderCode=', orderCode);
      return res.status(200).send('Order not found');
    }

    // 🟢 Nếu thanh toán thành công
    if (['PAID', 'SUCCESS', '00'].includes(statusFromPayos)) {
      order.status = 'paid';
      await order.save();
      console.log(`✅ Đơn hàng ${order.orderId} đã thanh toán thành công`);
    }

    console.log(`✅ Webhook processed for ${order.orderId} → ${order.status}`);
    return res.status(200).send('OK');
  } catch (err) {
    console.error('payosWebhook error:', err);
    return res.status(500).send('ERROR');
  }
};

/**
 * 🔍 Lấy trạng thái đơn hàng
 */
exports.getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    if (!order)
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    return res.json({ success: true, status: order.status, order });
  } catch (err) {
    console.error('getOrderStatus error:', err);
    res.status(500).json({ success: false });
  }
};
