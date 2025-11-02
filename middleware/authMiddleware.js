const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Xác thực JWT
exports.protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Không có token, truy cập bị từ chối" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token không hợp lệ hoặc hết hạn" });
  }
};

// Chỉ cho phép admin
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Chỉ admin mới có quyền truy cập" });
  next();
};
