const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  ticketType: String,
  zone: String,
  seat: String,
  price: Number,
  metadataURI: String
});

const NFTSchema = new mongoose.Schema({
  ticketType: String,
  tokenId: String,
  metadataURI: String,
   txLink: String,
});

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  tickets: [TicketSchema],
  nfts: [NFTSchema],
  totalAmount: Number,
  customer: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    phone: String,
    walletAddress: String
  },
  paymentUrl: String,
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
