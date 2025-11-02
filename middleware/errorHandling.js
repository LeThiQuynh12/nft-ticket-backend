// middleware/errorHandling.js
module.exports = (err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ',
  });
};
