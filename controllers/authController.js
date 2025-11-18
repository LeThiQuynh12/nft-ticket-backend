// controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/tokenUtils");
const verifyCaptcha = require("../utils/verifyCaptcha");
const sendEmail = require("../utils/sendEmail");
const generateOTP = require("../utils/generateOTP");

exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password, captchaToken } = req.body;

    // Check captcha
    const isCaptchaValid = await verifyCaptcha(captchaToken);
    if (!isCaptchaValid)
      return res.status(400).json({ message: "Xác minh Captcha thất bại" });

    // Check user
    let user = await User.findOne({ email });

    const otp = generateOTP();
    const otpExpires = Date.now() + 5 * 60 * 1000; // 5 phút

    if (!user) {
      // User mới chưa đăng ký
      user = await User.create({
        name,
        email,
        password,
        otp,
        otpExpires,
        isVerified: false,
        role: "user",
      });
    } else {
      // User tồn tại nhưng chưa xác thực OTP → cập nhật lại OTP
      user.name = name;
      user.password = password;
      user.otp = otp;
      user.otpExpires = otpExpires;
      user.isVerified = false;
      await user.save();
    }

    // Gửi email OTP
    await sendEmail(
      email,
      "Mã OTP xác thực tài khoản tài khoản NFT Ticket của bạn",
      `
      <h2>Mã OTP để xác thực tài khoản của bạn:</h2>
      <p style="font-size:22px; font-weight:bold">${otp}</p>
      <p>Mã này chỉ có hiệu lực trong 5 phút. Vui lòng điền vào giao diện</p>
      `
    );

    res.json({ message: "OTP đã được gửi qua email", email });
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    if (user.otp !== otp)
      return res.status(400).json({ message: "OTP không đúng" });

    if (user.otpExpires < Date.now())
      return res.status(400).json({ message: "OTP đã hết hạn" });

    // Xác thực thành công
    user.otp = null;
    user.otpExpires = null;
    user.isVerified = true; //Quan trọng
    await user.save();

    res.json({ message: "Xác thực OTP thành công! Bạn có thể đăng nhập." });
  } catch (err) {
    next(err);
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const { email, password, captchaToken } = req.body;

    // Captcha
    const isCaptchaValid = await verifyCaptcha(captchaToken);
    if (!isCaptchaValid)
      return res.status(400).json({ message: "Xác minh Captcha thất bại" });

    // Kiểm tra user
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Không tồn tại user" });

    // Không cho login nếu chưa xác thực OTP
    // Bỏ OTP cho admin
    if (user.role !== "admin" && !user.isVerified) {
      return res.status(403).json({
        message: "Tài khoản chưa được xác thực OTP. Vui lòng đăng ký lại.",
      });
    }

    // Kiểm tra password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Sai mật khẩu" });

    // Tạo token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      message: "Đăng nhập thành công",
      user: { id: user._id, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ message: "Thiếu refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken)
      return res.status(403).json({ message: "Refresh token không hợp lệ" });

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    res.status(403).json({ message: "Refresh token không hợp lệ" });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(400).json({ message: "Thiếu refresh token" });

    const user = await User.findOne({ refreshToken });

    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.json({ message: "Đăng xuất thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi đăng xuất" });
  }
};
