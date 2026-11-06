const mongoose = require("mongoose");

const SeatSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    ticketTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    seatNumber: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["available", "reserved", "sold"],
      default: "available",
      index: true,
    },

    reservedUntil: {
      type: Date,
      default: null,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Một ghế chỉ tồn tại duy nhất trong một khu vực của một loại vé
SeatSchema.index(
  {
    eventId: 1,
    ticketTypeId: 1,
    sectionId: 1,
    seatNumber: 1,
  },
  {
    unique: true,
  }
);

// Tìm ghế theo sự kiện và trạng thái
SeatSchema.index({
  eventId: 1,
  status: 1,
});

module.exports = mongoose.model("Seat", SeatSchema);