const multer = require("multer");

const storage = multer.memoryStorage(); // lưu vào RAM để upload thẳng Cloudinary
module.exports = multer({ storage });
