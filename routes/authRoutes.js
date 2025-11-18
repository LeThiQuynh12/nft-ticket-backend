// routes/authRoutes.js
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

router.post("/register", authLimiter, registerUser);
router.post("/verify-otp", verifyOtp); 
router.post("/login", authLimiter, loginUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", logoutUser);

module.exports = router;
