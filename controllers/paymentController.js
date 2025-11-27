const ethers = require("ethers");
const { contract, mintTicket } = require("../blockchain/connectNFT.js");
require("dotenv").config();
const axios = require("axios");
const Order = require("../models/Order");
const Event = require("../models/Event");
const { generateSignature } = require("../utils/payosUtils");
const QRCode = require("qrcode");
const {
  createMetadata,
  uploadMetadataToPinata,
} = require("../utils/pinataUtils");
const PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";

const createPayment = async (req, res) => {
  try {
    const { eventId, tickets, description, buyerName, buyerPhone, buyerEmail } =
      req.body;
    const user = req.user; // user từ authMiddleware

    if (!eventId || !tickets?.length) {
      return res.status(400).json({ message: "eventId và tickets bắt buộc" });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event không tồn tại" });

    let totalAmount = 0;
    const ticketsDetails = [];
    tickets.forEach((t) => {
      const typeObj = event.ticketTypes.find(
        (tt) => tt.name.toLowerCase() === t.ticketType.toLowerCase()
      );
      if (!typeObj) return;
      const price = typeObj.price;
      totalAmount += price;
      ticketsDetails.push({
        ticketType: t.ticketType,
        price,
        zone: t.zone,
        seat: t.seat,
      });
    });

    if (!ticketsDetails.length) {
      return res.status(400).json({ message: "Không có vé hợp lệ" });
    }

    const orderId = Date.now().toString();
    const orderCode = Number(orderId);
    const shortDescription = (description || `Thanh toán ${orderId}`).slice(
      0,
      25
    );

    const FRONTEND_URL =
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:5173";

    const dataForSignature = {
      orderCode,
      amount: totalAmount,
      description: shortDescription,
      cancelUrl: `${FRONTEND_URL}/payment-failed`,
      returnUrl: `${FRONTEND_URL}/payment-success?orderCode=${orderCode}`,
    };

    const signature = generateSignature(
      dataForSignature,
      process.env.PAYOS_CHECKSUM_KEY
    );
    const payload = {
      ...dataForSignature,
      buyerName,
      buyerPhone,
      buyerEmail,
      signature,
    };
    const headers = {
      "x-client-id": process.env.PAYOS_CLIENT_ID,
      "x-api-key": process.env.PAYOS_API_KEY,
      "Content-Type": "application/json",
    };

    const response = await axios.post(PAYOS_API_URL, payload, { headers });
    const respData = response.data;

    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        eventId,
        tickets: ticketsDetails,
        totalAmount,
        customer: {
          userId: user?._id,
          name: buyerName,
          phone: buyerPhone,
          email: buyerEmail,
          walletAddress: user?.walletAddress || null,
        },
        paymentUrl: respData?.data?.checkoutUrl || respData?.data?.qrCode,
        status: "pending",
        nfts: [],
      },
      { upsert: true, new: true }
    );

    return res
      .status(201)
      .json({ success: true, payUrl: order.paymentUrl, order });
  } catch (err) {
    console.error(
      "createPayment error:",
      err.response?.data || err.message || err
    );
    res
      .status(500)
      .json({ success: false, error: err.response?.data || err.message });
  }
};

// gọi khi khách hàng thanh toán thành công
const payosWebhook = async (req, res) => {
  try {
    const { data, signature: receivedSignature } = req.body;
    if (!data) return res.status(400).send("Missing data");

    // kiểm tra chữ ký webhook
    const computedSignature = generateSignature(
      data,
      process.env.PAYOS_CHECKSUM_KEY
    );
    if (computedSignature !== receivedSignature)
      return res.status(400).send("Invalid signature");

    const orderCode = data.orderCode?.toString();
    const statusFromPayos = (data.status || data.code || "")
      .toString()
      .toUpperCase();

    const order = await Order.findOne({ orderId: orderCode });
    if (!order) return res.status(200).send("Order not found");

    if (["PAID", "SUCCESS", "00"].includes(statusFromPayos)) {
      order.status = "paid";

      // Tạo vé khi thanh toán thành công

      for (let ticket of order.tickets) {
        try {
          // tạo metadata JSON
          const metadata = createMetadata(ticket);
          console.log("Metadata JSON:", metadata);

          const metadataURI = await uploadMetadataToPinata(metadata);
          console.log("Uploaded metadata URI:", metadataURI);

          const recipient =
            order.customer.walletAddress ||
            process.env.CUSTODIAL_WALLET_ADDRESS;

          // mint NFT
          const { tx, tokenId } = await mintTicket(
            recipient,
            ticket.ticketType,
            ticket.zone,
            ticket.seat,
            ethers.parseEther(ticket.price.toString()),
            metadataURI
          );

          const txLink = `https://amoy.polygonscan.com/tx/${tx.hash}`;
          console.log(` Minted NFT tokenId: ${tokenId}, txLink: ${txLink}`);

          // lưu vào order.nfts
          order.nfts.push({
            ticketType: ticket.ticketType,
            tokenId,
            metadataURI,
            txLink,
          });


          nft.qrCode = await QRCode.toDataURL(
            JSON.stringify({
              tokenId,
              orderId: order.orderId,
              eventId: order.eventId,
              seat: ticket.seat,
              ticketType: ticket.ticketType,
            })
          );

          order.nfts.push(nft);
        } catch (err) {
          console.error("Error minting NFT:", err);
        }
      }

      await order.save();
      console.log("Order updated with NFTs:", order.nfts);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("payosWebhook error:", err);
    return res.status(500).send("ERROR");
  }
};

const getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });

    return res.json({ success: true, status: order.status, order });
  } catch (err) {
    console.error("getOrderStatus error:", err);
    res.status(500).json({ success: false });
  }
};

const getMyNFTs = async (req, res) => {
  try {
    const orders = await Order.find({
      "customer.userId": req.user._id,
      status: "paid",
    });

    const nfts = orders.flatMap((o) =>
      o.nfts.map((n) => ({
        ...n,
        orderId: o.orderId,
        eventId: o.eventId,
        txLink: n.txLink, 
        qrCode: n.qrCode || null, 
      }))
    );

    res.json({ success: true, nfts });
  } catch (err) {
    console.error("getMyNFTs error:", err);
    res.status(500).json({ success: false });
  }
};

// Lấy tất cả NFT, chỉ dành cho admin
const getAllNFTs = async (req, res) => {
  try {
    const orders = await Order.find({ status: "paid" });

    const nfts = orders.flatMap((o) =>
      o.nfts.map((n) => ({
        ticketType: n.ticketType,
        tokenId: n.tokenId,
        metadataURI: n.metadataURI,
        txLink: n.txLink || null,
        qrCode: n.qrCode || null, 
        orderId: o.orderId,
        eventId: o.eventId,
        customer: {
          name: o.customer.name,
          email: o.customer.email,
          phone: o.customer.phone,
          walletAddress: o.customer.walletAddress,
        },
      }))
    );

    res.json({ success: true, nfts });
  } catch (err) {
    console.error("getAllNFTs error:", err);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  createPayment,
  payosWebhook,
  getOrderStatus,
  getMyNFTs,
  getAllNFTs,
};
