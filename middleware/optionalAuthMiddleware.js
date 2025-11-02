// middleware/optionalAuthMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // nếu bạn có model User
const { JWT_SECRET } = process.env;

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // bạn có thể lấy user từ DB nếu cần quyền chi tiết
    // const user = await User.findById(decoded.id).select('-password');
    // req.user = user;
    req.user = { id: decoded.id, role: decoded.role }; // nếu token chứa role
    return next();
  } catch (err) {
    // token invalid -> ignore and continue as anonymous
    return next();
  }
};
