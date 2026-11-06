const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  ticketTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  seatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seat",
    required: true,
  },

  ticketType: {
    type: String,
    required: true,
  },

  zone: {
    type: String,
    required: true,
  },

  seat: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },

  // Metadata NFT trên Pinata
  metadataURI: {
    type: String,
    default: null,
  },

  // Trạng thái mint riêng của từng vé
  nftStatus: {
    type: String,
    enum: ["pending", "minting", "minted", "failed"],
    default: "pending",
  },

  // ID NFT trên blockchain
  tokenId: {
    type: String,
    default: null,
  },

  // Link giao dịch trên PolygonScan
  txLink: {
    type: String,
    default: null,
  },

  // Hash giao dịch blockchain
  txHash: {
    type: String,
    default: null,
  },

  // QR Code riêng của vé NFT
  qrCode: {
    type: String,
    default: null,
  },

  // Thông tin lỗi khi mint NFT
  mintError: {
    type: String,
    default: null,
  },

  mintedAt: {
    type: Date,
    default: null,
  },
});

// ==================================================
//  THÔNG TIN NFT ĐÃ MINT THÀNH CÔNG
// ==================================================

const NFTSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  seatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seat",
    required: true,
  },

  ticketType: {
    type: String,
    default: null,
  },

  zone: {
    type: String,
    default: null,
  },

  seat: {
    type: String,
    default: null,
  },

  // Token ID trên blockchain
  tokenId: {
    type: String,
    required: true,
  },

  // Metadata URI trên Pinata
  metadataURI: {
    type: String,
    required: true,
  },

  // Link giao dịch
  txLink: {
    type: String,
    default: null,
  },

  // Hash giao dịch blockchain
  txHash: {
    type: String,
    default: null,
  },

  // QR Code vé NFT
  qrCode: {
    type: String,
    default: null,
  },

  mintedAt: {
    type: Date,
    default: Date.now,
  },
});

// ==================================================
// ĐƠN HÀNG
// ==================================================

const OrderSchema = new mongoose.Schema(
  {
    // Mã đơn hàng PayOS
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Sự kiện
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    // Danh sách vé trong đơn
    tickets: {
      type: [TicketSchema],
      default: [],
    },

    // Danh sách NFT đã mint thành công
    nfts: {
      type: [NFTSchema],
      default: [],
    },

    // Tổng tiền thanh toán (VND)
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Thông tin người mua
    customer: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      name: {
        type: String,
        default: "",
      },

      email: {
        type: String,
        default: "",
      },

      phone: {
        type: String,
        default: "",
      },

      walletAddress: {
        type: String,
        default: null,
      },
    },

    // ==================================================
    // THÔNG TIN THANH TOÁN PAYOS
    // ==================================================

    // Đường dẫn trang thanh toán PayOS
    paymentUrl: {
      type: String,
      default: null,
    },

    // Chuỗi dữ liệu QR thanh toán PayOS
    // Khác với QR Code của từng vé NFT
    qrCode: {
      type: String,
      default: null,
    },

    // Trạng thái thanh toán
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "review"],
      default: "pending",
      index: true,
    },

    // Thời hạn giữ ghế và thanh toán
    paymentExpiresAt: {
      type: Date,
      default: null,
    },

    // Thời điểm thanh toán thành công
    paidAt: {
      type: Date,
      default: null,
    },

    // Thời điểm thanh toán thất bại hoặc hết hạn
    failedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// ==================================================
// INDEX PHỤC VỤ TRUY VẤN
// ==================================================

// Tìm đơn hàng theo ghế
OrderSchema.index({
  "tickets.seatId": 1,
});

// Tìm đơn hàng cần kiểm tra hết hạn
OrderSchema.index({
  status: 1,
  paymentExpiresAt: 1,
});

// Tìm đơn hàng theo người dùng và trạng thái
OrderSchema.index({
  "customer.userId": 1,
  status: 1,
});

// Tìm NFT theo Token ID
OrderSchema.index({
  "nfts.tokenId": 1,
});

module.exports = mongoose.model("Order", OrderSchema);
