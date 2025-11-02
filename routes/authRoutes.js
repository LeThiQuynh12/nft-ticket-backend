const express = require("express");
const router = express.Router();
const {
  registerUser,
  logoutUser,
  loginUser,
  refreshToken,
} = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimit");

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", logoutUser); 

module.exports = router;
