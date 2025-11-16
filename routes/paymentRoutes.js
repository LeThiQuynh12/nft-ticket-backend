const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { getAllNFTs } = require("../controllers/paymentController");

const { adminOnly } = require("../middleware/authMiddleware");
router.post('/create', protect, paymentController.createPayment);
router.post('/webhook', paymentController.payosWebhook);
router.get('/status/:orderId', protect, paymentController.getOrderStatus);
router.get('/my-nfts', protect, paymentController.getMyNFTs);

router.get("/all-nfts", protect, adminOnly, getAllNFTs);
module.exports = router;
