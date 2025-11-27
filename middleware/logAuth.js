// middleware/logAuth.js
const { sendLog } = require("../splunkLogger");

async function logAuthRequests(req, res, next) {
  res.on("finish", async () => { // chạy sau khi response trả về client
    await sendLog({
      user: req.body.email || "anonymous",
      action: req.path.replace("/", ""), // login, register, verify-otp
      status: res.statusCode < 400 ? "success" : "failure",
      ip: req.ip,
      message: `HTTP ${res.statusCode}`,
      timestamp: new Date().toISOString()
    });
  });
  next();
}

module.exports = logAuthRequests;
