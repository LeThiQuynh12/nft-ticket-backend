// backend/middleware/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Tạo thư mục lưu trữ nếu chưa có
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình nơi lưu file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Chỉ cho phép upload hình ảnh
function fileFilter(req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Chỉ cho phép tải lên file ảnh (jpg, png, webp)."));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // giới hạn 5MB
});

module.exports = upload;
