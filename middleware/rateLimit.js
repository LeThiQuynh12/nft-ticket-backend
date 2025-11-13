const rateLimit = require("express-rate-limit");

let globalLimiter, authLimiter;

// Nếu đang dev hoặc bật DISABLE_RATE_LIMIT thì bỏ qua rate limit
if (process.env.NODE_ENV === "development" || process.env.DISABLE_RATE_LIMIT === "true") {
  console.log("Rate limit disabled (dev mode)");
  globalLimiter = (req, res, next) => next();
  authLimiter = (req, res, next) => next();
} else {
globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // tăng từ 100 lên 500 request/15 phút
  standardHeaders: true,
  legacyHeaders: false,
});


  // stricter cho auth
  authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many attempts from this IP, please try again later.",
  });
}

module.exports = { globalLimiter, authLimiter };
