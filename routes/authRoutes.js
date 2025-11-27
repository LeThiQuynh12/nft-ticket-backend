const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  verifyOtp,
} = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimit");
const logAuthRequests = require("../middleware/logAuth");

router.use(logAuthRequests); // log tất cả request auth

router.post("/register", authLimiter, registerUser);
router.post("/verify-otp", verifyOtp); 
router.post("/login", authLimiter, loginUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", logoutUser);

module.exports = router;
