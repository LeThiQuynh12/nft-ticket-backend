const mongoose = require("mongoose");

// 🎟️ Schema vé
const TicketTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  totalQuantity: { type: Number, default: 0 },
  minPerOrder: { type: Number, default: 1 },
  maxPerOrder: { type: Number, default: 10 },
});

// 💳 Schema thanh toán
const PaymentSchema = new mongoose.Schema({
  accountName: { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  bankName: { type: String, trim: true },
  branch: { type: String, trim: true },
  invoice: {
    businessType: { type: String, enum: ["Cá nhân", "Công ty"] },
    fullName: { type: String, trim: true },
    address: { type: String, trim: true },
    taxCode: { type: String, trim: true },
  },
});

const EventSchema = new mongoose.Schema({
  // 🔹 Thông tin cơ bản
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  mode: { type: String, enum: ["offline", "online"], default: "offline" },

  // 📍 Địa điểm
  location: {
    name: String,
    province: String,
    district: String,
    ward: String,
    addressDetail: String,
  },

  organizer: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  startAt: { type: Date },
  endAt: { type: Date },

  // 🖼️ Hình ảnh
  coverImage: { type: String },
  gallery: [String],
  seatMapUrl: { type: String },

  // 🎫 Loại vé
  ticketTypes: [TicketTypeSchema],

  // 🔐 Quyền riêng tư
  privacy: { type: String, enum: ["public", "private"], default: "public" },

  // 💬 Tin nhắn xác nhận
  confirmationMessage: { type: String, maxlength: 500 },

  // 💳 Thanh toán
  paymentInfo: PaymentSchema,

  // 🧍‍♂️ Người tạo
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

module.exports = mongoose.model("Event", EventSchema);
