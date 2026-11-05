const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const logPaymentRequests = require('../middleware/logPayment');

router.use(logPaymentRequests);

router.post('/create', protect, paymentController.createPayment);
router.post('/webhook', paymentController.payosWebhook);
router.get('/status/:orderId', protect, paymentController.getOrderStatus);
router.get('/my-nfts', protect, paymentController.getMyNFTs);

router.get("/all-nfts", protect, adminOnly, paymentController.getAllNFTs);

module.exports = router;
