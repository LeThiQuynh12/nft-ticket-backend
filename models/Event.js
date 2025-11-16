const mongoose = require("mongoose");

const TicketTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  totalQuantity: { type: Number, default: 0 },
  minPerOrder: { type: Number, default: 1 },
  maxPerOrder: { type: Number, default: 10 },
});

const LocationSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  province: { type: String, trim: true },
  district: { type: String, trim: true },
  ward: { type: String, trim: true },
  addressDetail: { type: String, trim: true },
}, { _id: false });

const EventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  mode: { type: String, enum: ["offline", "online"], default: "offline" },
  location: LocationSchema,
  organizer: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  startAt: { type: Date },
  endAt: { type: Date },
  coverImage: { type: String },
  gallery: [String],
  seatMapUrl: { type: String },
  organizerLogo: { type: String },
  ticketTypes: [TicketTypeSchema],
  privacy: { type: String, enum: ["public", "private"], default: "public" },
  confirmationMessage: { type: String, maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

module.exports = mongoose.model("Event", EventSchema);
