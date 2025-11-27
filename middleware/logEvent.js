// middleware/logEvent.js
const { sendLog } = require("../splunkLogger");

async function logEventRequests(req, res, next) {
  res.on("finish", async () => { // chạy sau khi response trả về client
    // Chỉ log các route quan trọng
    const actionMap = {
      "GET /api/events": "get_events",
      "GET /api/events/:id": "get_event_by_id",
      "POST /api/events": "create_event",
      "PUT /api/events/:id": "update_event",
      "DELETE /api/events/:id": "delete_event",
    };

    // Tìm action
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

module.exports = logEventRequests;
