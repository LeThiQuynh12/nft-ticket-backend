const { sendLog } = require("../splunkLogger");

async function logPaymentRequests(req, res, next) {
  res.on("finish", async () => {
    const actionMap = {
      "POST /api/payments/create": "create_payment",
      "POST /api/payments/webhook": "payos_webhook",
      "GET /api/payments/status/:orderId": "get_order_status",
      "GET /api/payments/my-nfts": "get_my_nfts",
      "GET /api/payments/all-nfts": "get_all_nfts",
    };

    // Xác định route + action
    let routePath = req.baseUrl + req.route?.path;
    let action = actionMap[routePath] || req.method + " " + req.originalUrl;

    await sendLog({
      user: req.user?.email || "anonymous",
      action: action,
      status: res.statusCode < 400 ? "success" : "failure",
      ip: req.ip,
      message: `HTTP ${res.statusCode}`,
      timestamp: new Date().toISOString(),
    });
  });

  next();
}

module.exports = logPaymentRequests;
