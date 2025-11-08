// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/create', paymentController.createPayment);
router.post('/webhook', paymentController.payosWebhook);
router.get('/status/:orderId', paymentController.getOrderStatus);

module.exports = router;
