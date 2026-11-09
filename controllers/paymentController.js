const mongoose = require("mongoose");
const ethers = require("ethers");
const axios = require("axios");
const crypto = require("crypto");
const QRCode = require("qrcode");

require("dotenv").config();

const Order = require("../models/Order");
const Event = require("../models/Event");
const Seat = require("../models/Seat");

const { mintTicket } = require("../blockchain/connectNFT");
const { generateSignature } = require("../utils/payosUtils");
const {
  createMetadata,
  uploadMetadataToPinata,
} = require("../utils/pinataUtils");

const PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";
const RESERVATION_MINUTES = 10;
const POLYGONSCAN_URL = "https://amoy.polygonscan.com/tx/";

// ==================================================
// HELPERS
// ==================================================

function verifySignature(data, receivedSignature) {
  if (
    !data ||
    !receivedSignature ||
    typeof receivedSignature !== "string" ||
    !/^[a-fA-F0-9]{64}$/.test(receivedSignature)
  ) {
    return false;
  }

  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!checksumKey) {
    console.error("Missing PAYOS_CHECKSUM_KEY");
    return false;
  }

  try {
    const computed = generateSignature(data, checksumKey);

    const receivedBuffer = Buffer.from(receivedSignature, "hex");
    const computedBuffer = Buffer.from(computed, "hex");

    if (
      receivedBuffer.length !== computedBuffer.length ||
      computedBuffer.length !== 32
    ) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuffer, computedBuffer);
  } catch (error) {
    console.error("Verify signature error:", error.message);
    return false;
  }
}

function generateOrderCode() {
  const code = Date.now() * 1000 + Math.floor(Math.random() * 1000);

  if (!Number.isSafeInteger(code)) {
    throw new Error("Order code không hợp lệ");
  }

  return String(code);
}

function getFrontendUrl() {
  const url =
    process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL
      : process.env.FRONTEND_URL || "http://localhost:5173";

  if (!url) {
    throw new Error("Chưa cấu hình FRONTEND_URL");
  }

  return url.replace(/\/$/, "");
}

async function releaseOrderSeats(orderId, session = null) {
  const query = Seat.updateMany(
    {
      orderId,
      status: "reserved",
    },
    {
      $set: {
        status: "available",
        orderId: null,
        reservedUntil: null,
      },
    },
  );

  if (session) {
    query.session(session);
  }

  return query;
}

async function markOrderFailedAndReleaseSeats(orderId) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order || order.status !== "pending") {
        return;
      }

      order.status = "failed";
      order.failedAt = new Date();

      await order.save({ session });
      await releaseOrderSeats(order._id, session);
    });
  } finally {
    await session.endSession();
  }
}

// ==================================================
// 1. CREATE PAYMENT
// ==================================================

const createPayment = async (req, res) => {
  let createdOrder = null;

  try {
    // Kiểm tra cấu hình PayOS.
    if (
      !process.env.PAYOS_CLIENT_ID ||
      !process.env.PAYOS_API_KEY ||
      !process.env.PAYOS_CHECKSUM_KEY
    ) {
      return res.status(500).json({
        success: false,
        message: "Chưa cấu hình đầy đủ thông tin PayOS",
      });
    }

    const { eventId, tickets, description, buyerName, buyerPhone, buyerEmail } =
      req.body;

    const user = req.user;

    // Kiểm tra dữ liệu đầu vào.
    if (
      !eventId ||
      !mongoose.isValidObjectId(eventId) ||
      !Array.isArray(tickets) ||
      tickets.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "eventId và danh sách tickets không hợp lệ",
      });
    }

    if (!buyerName?.trim() || !buyerPhone?.trim() || !buyerEmail?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin người mua",
      });
    }

    const seatIds = tickets.map((ticket) => String(ticket.seatId));

    if (
      seatIds.some((id) => !mongoose.isValidObjectId(id)) ||
      new Set(seatIds).size !== seatIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Danh sách ghế không hợp lệ hoặc bị trùng",
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Sự kiện không tồn tại",
      });
    }

    const now = new Date();

    const paymentExpiresAt = new Date(
      now.getTime() + RESERVATION_MINUTES * 60 * 1000,
    );

    const orderCode = generateOrderCode();

    let totalAmount = 0;

    // ----------------------------------------------
    // Tạo đơn hàng và giữ ghế trong transaction.
    // ----------------------------------------------

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Giải phóng các ghế đã hết hạn.
        const expiredOrderIds = await Seat.distinct("orderId", {
          eventId,
          status: "reserved",
          reservedUntil: { $lte: now },
          orderId: { $ne: null },
        }).session(session);

        if (expiredOrderIds.length > 0) {
          await Order.updateMany(
            {
              _id: { $in: expiredOrderIds },
              status: "pending",
            },
            {
              $set: {
                status: "failed",
                failedAt: now,
              },
            },
            { session },
          );

          await Seat.updateMany(
            {
              eventId,
              orderId: { $in: expiredOrderIds },
              status: "reserved",
              reservedUntil: { $lte: now },
            },
            {
              $set: {
                status: "available",
                orderId: null,
                reservedUntil: null,
              },
            },
            { session },
          );
        }

        // Lấy ghế từ database.
        const seatDocuments = await Seat.find({
          _id: { $in: seatIds },
          eventId,
        }).session(session);

        if (seatDocuments.length !== seatIds.length) {
          throw new Error("Một hoặc nhiều ghế không tồn tại");
        }

        const ticketsDetails = [];

        for (const inputTicket of tickets) {
          const seat = seatDocuments.find(
            (item) => String(item._id) === String(inputTicket.seatId),
          );

          if (!seat) {
            throw new Error("Không tìm thấy ghế đã chọn");
          }

          if (seat.status !== "available") {
            throw new Error(`Ghế ${seat.seatNumber} không còn khả dụng`);
          }

          // Kiểm tra loại vé.
          const ticketType = event.ticketTypes.id(String(seat.ticketTypeId));

          if (
            !ticketType ||
            String(ticketType._id) !== String(inputTicket.ticketTypeId)
          ) {
            throw new Error(`Loại vé của ghế ${seat.seatNumber} không hợp lệ`);
          }

          // Kiểm tra khu vực.
          const section = ticketType.sections.id(String(seat.sectionId));

          if (
            !section ||
            String(section._id) !== String(inputTicket.sectionId) ||
            section.isActive === false
          ) {
            throw new Error(
              `Khu vực của ghế ${seat.seatNumber} không khả dụng`,
            );
          }

          // Giá lấy từ database, không lấy từ frontend.
          const price = Number(ticketType.price);

          if (!Number.isSafeInteger(price) || price < 0) {
            throw new Error(`Giá vé ${ticketType.name} không hợp lệ`);
          }

          totalAmount += price;

          ticketsDetails.push({
            ticketTypeId: ticketType._id,
            sectionId: section._id,
            seatId: seat._id,
            ticketType: ticketType.name,
            zone: section.name,
            seat: seat.seatNumber,
            price,
            nftStatus: "pending",
          });
        }

        if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
          throw new Error("Tổng tiền đơn hàng không hợp lệ");
        }

        // Tạo Order.
        const [order] = await Order.create(
          [
            {
              orderId: orderCode,
              eventId,
              tickets: ticketsDetails,
              totalAmount,
              customer: {
                userId: user?._id || null,
                name: buyerName.trim(),
                phone: buyerPhone.trim(),
                email: buyerEmail.trim(),
                walletAddress: user?.walletAddress || null,
              },
              status: "pending",
              paymentExpiresAt,
              nfts: [],
            },
          ],
          { session },
        );

        // Giữ toàn bộ ghế.
        const reservationResult = await Seat.updateMany(
          {
            _id: { $in: seatIds },
            eventId,
            status: "available",
          },
          {
            $set: {
              status: "reserved",
              orderId: order._id,
              reservedUntil: paymentExpiresAt,
            },
          },
          { session },
        );

        if (reservationResult.modifiedCount !== seatIds.length) {
          throw new Error("Không thể giữ toàn bộ ghế. Vui lòng chọn lại.");
        }

        createdOrder = order;
      });
    } finally {
      await session.endSession();
    }

    if (!createdOrder) {
      throw new Error("Không thể tạo đơn hàng");
    }

    // ----------------------------------------------
    // Tạo thanh toán PayOS sau khi giữ ghế thành công.
    // ----------------------------------------------

    const frontendUrl = getFrontendUrl();

    const shortDescription = (description || `Thanh toan ${orderCode}`).slice(
      0,
      25,
    );

    const dataForSignature = {
      orderCode: Number(orderCode),
      amount: totalAmount,
      description: shortDescription,
      cancelUrl: `${frontendUrl}/payment-failed`,
      returnUrl: `${frontendUrl}/payment-success?orderCode=${orderCode}`,
    };

    const signature = generateSignature(
      dataForSignature,
      process.env.PAYOS_CHECKSUM_KEY,
    );

    const payload = {
      ...dataForSignature,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerEmail: buyerEmail.trim(),
      signature,
    };

    const headers = {
      "x-client-id": process.env.PAYOS_CLIENT_ID,
      "x-api-key": process.env.PAYOS_API_KEY,
      "Content-Type": "application/json",
    };

    const response = await axios.post(PAYOS_API_URL, payload, {
      headers,
      timeout: 20000,
    });

    const payData = response.data?.data;

    if (!payData?.checkoutUrl) {
      throw new Error("PayOS không trả về checkoutUrl");
    }

    const paymentUrl = payData.checkoutUrl;
    const qrCode = payData.qrCode || null;

    const updateResult = await Order.updateOne(
      {
        _id: createdOrder._id,
        status: "pending",
      },
      {
        $set: {
          paymentUrl,
          qrCode,
        },
      },
    );

    if (updateResult.matchedCount !== 1) {
      throw new Error("Không thể cập nhật thông tin thanh toán");
    }

    const savedOrder = await Order.findById(createdOrder._id);

    return res.status(201).json({
      success: true,
      message: "Tạo thanh toán thành công",
      payUrl: paymentUrl,
      qrCode,
      orderId: orderCode,
      order: {
        ...savedOrder.toObject(),
        eventName: event.name,
      },
    });
  } catch (err) {
    console.error("createPayment error:", err.response?.data || err.message);

    // Không giải phóng ghế ngay khi PayOS timeout/lỗi mạng.
    // Giao dịch có thể đã được PayOS tạo thành công.
    // Ghế sẽ hết hạn sau RESERVATION_MINUTES và được giải phóng
    // trong lần tạo đơn tiếp theo hoặc bởi tác vụ dọn dẹp riêng.

    return res.status(500).json({
      success: false,
      message: err.message || "Không thể tạo thanh toán",
    });
  }
};

// ==================================================
// 2. PROCESS NFT MINTING
// ==================================================

async function processPendingMints(orderId) {
  const order = await Order.findById(orderId);

  if (!order || order.status !== "paid") {
    return;
  }

  const event = await Event.findById(order.eventId);

  if (!event) {
    throw new Error("Không tìm thấy sự kiện để mint NFT");
  }

  for (const originalTicket of order.tickets) {
    const ticketId = originalTicket._id;

    // Chỉ claim vé chưa từng gửi giao dịch lên blockchain.
    // Vé minting không được tự động claim lại.
    const claimResult = await Order.updateOne(
      {
        _id: order._id,
        status: "paid",
        tickets: {
          $elemMatch: {
            _id: ticketId,
            nftStatus: { $in: ["pending", "failed"] },
            txHash: null,
            tokenId: null,
          },
        },
      },
      {
        $set: {
          "tickets.$.nftStatus": "minting",
          "tickets.$.mintError": null,
        },
      },
    );

    if (claimResult.modifiedCount !== 1) {
      continue;
    }

    let txHash = null;

    try {
      const latestOrder = await Order.findById(order._id);
      const ticket = latestOrder?.tickets.id(ticketId);

      if (!ticket) {
        throw new Error("Không tìm thấy thông tin vé");
      }

      const recipient =
        latestOrder.customer.walletAddress ||
        process.env.CUSTODIAL_WALLET_ADDRESS;

      if (!recipient || !ethers.isAddress(recipient)) {
        throw new Error("Địa chỉ ví nhận NFT không hợp lệ");
      }

      // Tạo metadata.
      const metadata = createMetadata({
        ...ticket.toObject(),
        eventName: event.name,
      });

      const metadataURI = await uploadMetadataToPinata(metadata);

      if (!metadataURI) {
        throw new Error("Upload metadata lên Pinata thất bại");
      }

      // Kiểm tra giá vé.
      if (!Number.isSafeInteger(ticket.price) || ticket.price < 0) {
        throw new Error("Giá vé không hợp lệ để mint NFT");
      }

      const contractPrice = BigInt(ticket.price);

      // mintTicket phải trả về { tx, tokenId }.
      const mintResult = await mintTicket(
        recipient,
        event.name,
        ticket.zone,
        ticket.seat,
        contractPrice,
        metadataURI,
      );

      const tx = mintResult?.tx;
      const tokenId = mintResult?.tokenId;

      if (!tx) {
        throw new Error("Hàm mintTicket không trả về transaction");
      }

      txHash = tx.hash || tx.transactionHash || null;

      if (!txHash) {
        throw new Error("Không lấy được transaction hash");
      }

      // Lưu transaction hash ngay sau khi nhận kết quả mint.
      // Nếu các bước sau lỗi, vé vẫn ở trạng thái minting
      // và không được tự động mint lại.
      const txSaveResult = await Order.updateOne(
        {
          _id: latestOrder._id,
          "tickets._id": ticketId,
        },
        {
          $set: {
            "tickets.$.txHash": txHash,
            "tickets.$.metadataURI": metadataURI,
            "tickets.$.mintError": null,
          },
        },
      );

      if (txSaveResult.matchedCount !== 1) {
        throw new Error("Không thể lưu transaction hash");
      }

      if (tokenId === undefined || tokenId === null) {
        throw new Error("Không lấy được tokenId từ giao dịch mint");
      }

      const txLink = `${POLYGONSCAN_URL}${txHash}`;

      // Tạo QR Code riêng cho vé.
      const qrCode = await QRCode.toDataURL(
        JSON.stringify({
          tokenId: String(tokenId),
          orderId: latestOrder.orderId,
          eventId: String(latestOrder.eventId),
          ticketId: String(ticketId),
          seat: ticket.seat,
          zone: ticket.zone,
          ticketType: ticket.ticketType,
        }),
      );

      const mintedAt = new Date();

      // Lưu bản ghi NFT trước.
      // Điều kiện này giúp webhook retry không push trùng ticketId.
      await Order.updateOne(
        {
          _id: latestOrder._id,
          "nfts.ticketId": { $ne: ticketId },
        },
        {
          $push: {
            nfts: {
              ticketId,
              seatId: ticket.seatId,
              ticketType: ticket.ticketType,
              zone: ticket.zone,
              seat: ticket.seat,
              tokenId: String(tokenId),
              metadataURI,
              txLink,
              txHash,
              qrCode,
              mintedAt,
            },
          },
        },
      );

      // Cập nhật ticket sau khi NFT đã được lưu.
const ticketUpdateResult = await Order.updateOne(
  {
    _id: latestOrder._id,
    tickets: {
      $elemMatch: {
        _id: ticketId,
      },
    },
  },
  {
    $set: {
      "tickets.$.nftStatus": "minted",
      "tickets.$.tokenId": String(tokenId),
      "tickets.$.metadataURI": metadataURI,
      "tickets.$.txLink": txLink,
      "tickets.$.txHash": txHash,
      "tickets.$.qrCode": qrCode,
      "tickets.$.mintedAt": mintedAt,
      "tickets.$.mintError": null,
    },
  },
);

console.log("Ticket update result:", ticketUpdateResult);

if (ticketUpdateResult.matchedCount !== 1 ||
    ticketUpdateResult.modifiedCount !== 1) {
  throw new Error("Không thể cập nhật trạng thái NFT trong vé");
}
      if (ticketUpdateResult.matchedCount !== 1) {
        throw new Error("Không thể cập nhật trạng thái NFT trong vé");
      }

      console.log(`Minted NFT ${tokenId}: ${txLink}`);
    } catch (err) {
      console.error(`Mint NFT error for ticket ${ticketId}:`, err.message);

      if (txHash) {
        // Đã có transaction hash: không chuyển về failed
        // để tránh webhook retry mint NFT lần thứ hai.
        await Order.updateOne(
          {
            _id: order._id,
            "tickets._id": ticketId,
          },
          {
            $set: {
              "tickets.$.nftStatus": "minting",
              "tickets.$.txHash": txHash,
              "tickets.$.mintError": err.message,
            },
          },
        );
      } else {
        // Chưa nhận được transaction hash.
        // Có thể retry sau khi xác minh chắc chắn chưa broadcast.
        await Order.updateOne(
          {
            _id: order._id,
            "tickets._id": ticketId,
            "tickets.txHash": null,
          },
          {
            $set: {
              "tickets.$.nftStatus": "failed",
              "tickets.$.mintError": err.message,
            },
          },
        );
      }
    }
  }
}

// ==================================================
// 3. PAYOS WEBHOOK
// ==================================================

const payosWebhook = async (req, res) => {
  try {
    const { data, signature } = req.body;

    if (!data || !signature) {
      return res.status(400).send("Missing data or signature");
    }

    if (!verifySignature(data, signature)) {
      return res.status(400).send("Invalid signature");
    }

    const orderCode = data.orderCode?.toString();

    if (!orderCode) {
      return res.status(400).send("Missing orderCode");
    }

    const order = await Order.findOne({
      orderId: orderCode,
    });

    if (!order) {
      return res.status(200).send("Order not found");
    }

    // PayOS webhook thông thường có success ở cấp root.
    // data.status được dùng bổ sung nếu provider trả trạng thái PAID.
    const statusFromPayos = String(data.status || "").toUpperCase();

    const isPaid = req.body.success === true || statusFromPayos === "PAID";

    if (!isPaid) {
      // Không tự đánh dấu failed chỉ dựa vào data.code.
      // Webhook không phải lúc nào cũng là thông báo thanh toán thất bại.
      return res.status(200).send("OK");
    }

    // Kiểm tra số tiền trước mọi thao tác xác nhận thanh toán.
    if (
      !Number.isFinite(Number(data.amount)) ||
      Number(data.amount) !== Number(order.totalAmount)
    ) {
      await Order.updateOne(
        {
          _id: order._id,
          status: { $ne: "paid" },
        },
        {
          $set: {
            status: "review",
          },
        },
      );

      return res.status(200).send("Amount mismatch");
    }

    // Đơn hàng đã thất bại hoặc cần kiểm tra:
    // không tự động lấy lại ghế đã được giải phóng.
    if (["failed", "review"].includes(order.status)) {
      await Order.updateOne(
        {
          _id: order._id,
          status: { $in: ["failed", "review"] },
        },
        {
          $set: {
            status: "review",
          },
        },
      );

      return res.status(200).send("Payment requires manual review");
    }

    // ----------------------------------------------
    // Xác nhận thanh toán và chuyển ghế sang sold.
    // ----------------------------------------------

    if (order.status === "pending") {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const currentOrder = await Order.findById(order._id).session(session);

          if (!currentOrder || currentOrder.status !== "pending") {
            return;
          }

          const ticketSeatIds = currentOrder.tickets.map(
            (ticket) => ticket.seatId,
          );

          const now = new Date();

          // Kiểm tra tất cả ghế vẫn thuộc đơn hàng.
          const validSeats = await Seat.find({
            _id: { $in: ticketSeatIds },
            orderId: currentOrder._id,
            status: "reserved",
            reservedUntil: { $gt: now },
          }).session(session);

          if (validSeats.length !== ticketSeatIds.length) {
            await releaseOrderSeats(currentOrder._id, session);

            currentOrder.status = "review";
            await currentOrder.save({ session });

            return;
          }

          // Chuyển toàn bộ ghế sang sold.
          const soldResult = await Seat.updateMany(
            {
              _id: { $in: ticketSeatIds },
              orderId: currentOrder._id,
              status: "reserved",
              reservedUntil: { $gt: now },
            },
            {
              $set: {
                status: "sold",
                reservedUntil: null,
              },
            },
            { session },
          );

          if (soldResult.modifiedCount !== ticketSeatIds.length) {
            // Không để lại ghế bị bán dở dang.
            await Seat.updateMany(
              {
                _id: { $in: ticketSeatIds },
                orderId: currentOrder._id,
                status: "sold",
              },
              {
                $set: {
                  status: "reserved",
                },
              },
              { session },
            );

            await releaseOrderSeats(currentOrder._id, session);

            currentOrder.status = "review";
            await currentOrder.save({ session });

            return;
          }

          currentOrder.status = "paid";
          currentOrder.paidAt = now;

          await currentOrder.save({ session });
        });
      } finally {
        await session.endSession();
      }
    }

    // Lấy lại trạng thái mới nhất.
    const latestOrder = await Order.findById(order._id);

    if (latestOrder?.status === "paid") {
      await processPendingMints(latestOrder._id);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("payosWebhook error:", err.response?.data || err.message);

    // Trả 500 để PayOS có thể gửi lại webhook.
    return res.status(500).send("ERROR");
  }
};

// ==================================================
// 4. GET ORDER STATUS
// ==================================================


const getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId })
      .populate("eventId", "name");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    const isAdmin = req.user?.role === "admin";

    const isOwner =
      !!req.user?._id &&
      !!order.customer?.userId &&
      String(order.customer.userId) === String(req.user._id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem đơn hàng này",
      });
    }

    const orderData = order.toObject();

    // Bổ sung dữ liệu vé gốc cho từng NFT
    orderData.nfts = (orderData.nfts || []).map((nft) => {
      const tickets = orderData.tickets || [];

      // Ưu tiên ghép bằng ticketId
      let ticket = tickets.find(
        (item) =>
          nft.ticketId &&
          String(item._id) === String(nft.ticketId)
      );

      // Nếu không tìm thấy thì ghép bằng seatId
      if (!ticket && nft.seatId) {
        ticket = tickets.find(
          (item) =>
            item.seatId &&
            String(item.seatId) === String(nft.seatId)
        );
      }

      // Nếu đơn hàng chỉ có một vé thì có thể ghép an toàn
      if (!ticket && tickets.length === 1) {
        ticket = tickets[0];
      }

      return {
        ...nft,

        ticketId: nft.ticketId || ticket?._id || null,
        seatId: nft.seatId || ticket?.seatId || null,

        ticketType: nft.ticketType || ticket?.ticketType || "",
        zone: nft.zone || ticket?.zone || "",
        seat: nft.seat || ticket?.seat || "",

        qrCode: nft.qrCode || ticket?.qrCode || null,
        txHash: nft.txHash || ticket?.txHash || null,
        txLink: nft.txLink || ticket?.txLink || null,
      };
    });

    return res.json({
      success: true,
      status: order.status,
      order: orderData,
    });
  } catch (err) {
    console.error("getOrderStatus error:", err);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy trạng thái đơn hàng",
    });
  }
};

// ==================================================
// 5. GET MY NFTS
// ==================================================


const getMyNFTs = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập",
      });
    }

    const orders = await Order.find({
      "customer.userId": req.user._id,
      status: "paid",
    })
      .populate("eventId", "name")
      .sort({ createdAt: -1 });

    const nfts = orders.flatMap((order) =>
      (order.nfts || []).map((nft) => {
        const nftData = nft.toObject();
        const tickets = order.tickets || [];

        // 1. Ưu tiên ghép bằng ticketId
        let ticket = tickets.find(
          (item) =>
            nftData.ticketId &&
            String(item._id) === String(nftData.ticketId)
        );

        // 2. Nếu không có ticketId, ghép bằng seatId
        if (!ticket && nftData.seatId) {
          ticket = tickets.find(
            (item) =>
              String(item.seatId) === String(nftData.seatId)
          );
        }

        // 3. Nếu đơn chỉ có đúng một vé thì có thể ghép an toàn
        if (!ticket && tickets.length === 1) {
          ticket = tickets[0];
        }

        return {
          ...nftData,

          ticketId: nftData.ticketId || ticket?._id || null,
          seatId: nftData.seatId || ticket?.seatId || null,

          zone: nftData.zone || ticket?.zone || "",
          seat: nftData.seat || ticket?.seat || "",

          ticketType:
            nftData.ticketType || ticket?.ticketType || "",

          qrCode: nftData.qrCode || ticket?.qrCode || null,
          txHash: nftData.txHash || ticket?.txHash || null,

          orderId: order.orderId,
          eventId: order.eventId?._id || null,
          eventName: order.eventId?.name || "Chưa xác định",
        };
      })
    );

    return res.json({
      success: true,
      total: nfts.length,
      nfts,
    });
  } catch (err) {
    console.error("getMyNFTs error:", err);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách NFT",
    });
  }
};


// ==================================================
// 6. GET ALL NFTS - ADMIN
// ==================================================

const getAllNFTs = async (req, res) => {
  try {
    const orders = await Order.find({
      status: "paid",
    })
      .populate("eventId", "name")
      .sort({ createdAt: -1 });

    const nfts = orders.flatMap((order) =>
      order.nfts.map((nft) => ({
        ...nft.toObject(),
        orderId: order.orderId,
        eventId: order.eventId?._id || order.eventId,
        eventName: order.eventId?.name || null,
        customer: {
          name: order.customer?.name || "",
          email: order.customer?.email || "",
          phone: order.customer?.phone || "",
          walletAddress: order.customer?.walletAddress || null,
        },
      })),
    );

    return res.json({
      success: true,
      total: nfts.length,
      nfts,
    });
  } catch (err) {
    console.error("getAllNFTs error:", err);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách NFT",
    });
  }
};

// ==================================================
// EXPORT
// ==================================================

module.exports = {
  createPayment,
  payosWebhook,
  getOrderStatus,
  getMyNFTs,
  getAllNFTs,
};
