// models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: false },
  tickets: [
    {
      ticketType: String,
      price: Number,
      zone: String,
      seat: String
    }
  ],
  totalAmount: { type: Number, required: true },
  customer: {
    name: String,
    phone: String,
    email: String
  },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentUrl: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
