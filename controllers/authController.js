const User = require("../models/User");
const jwt = require("jsonwebtoken");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/tokenUtils");
const verifyCaptcha = require("../utils/verifyCaptcha");
const sendEmail = require("../utils/sendEmail"); 

exports.registerUser = async (req, res, next) => {
  try {
    console.log("Goi dang ky")
    const { name, email, password, adminKey, captchaToken } = req.body;
   
    const isCaptchaValid = await verifyCaptcha(captchaToken, req.ip);
    if (!isCaptchaValid)
      return res.status(400).json({ message: "Xác minh Captcha thất bại" });
  
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email đã tồn tại" });

    let role = "user";
    if (adminKey && adminKey === process.env.ADMIN_SECRET_KEY) {
      role = "admin";
    }

    const user = await User.create({ name, email, password, role });

    const subject = "🎉 Chào mừng bạn đến với LuxGo!";
    const html = `
      <h1>Xin chào ${name}</h1>
      <p>Bạn đã đăng ký thành công tài khoản LuxGo với email <b>${email}</b>.</p>
      <p>Chúc bạn có trải nghiệm tuyệt vời!</p>
    `;
    await sendEmail(email, subject, html);

    res.status(201).json({
      message: "Đăng ký thành công, email xác nhận đã được gửi",
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};


exports.loginUser = async (req, res, next) => {
  try {
    const { email, password, captchaToken } = req.body;

    const isCaptchaValid = await verifyCaptcha(captchaToken);
    if (!isCaptchaValid)
      return res.status(400).json({ message: "Xác minh Captcha thất bại" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Người dùng không tồn tại" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Sai mật khẩu!" });

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
    res
      .status(403)
      .json({ message: "Refresh token không hợp lệ hoặc hết hạn" });
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
