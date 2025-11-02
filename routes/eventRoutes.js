const express = require("express");
const router = express.Router();
const evt = require("../controllers/eventController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const optionalAuth = require('../middleware/optionalAuthMiddleware');

// 🧩 Lấy danh sách sự kiện (public)
router.get("/", optionalAuth, evt.getEvents);

// 🧩 Lấy chi tiết sự kiện (public hoặc private tuỳ quyền)
router.get("/:id", evt.getEventById);

// 🧩 Tạo sự kiện mới (Admin)
router.post(
  "/",
  protect,
  adminOnly,
  upload.fields([
    { name: "coverImage", maxCount: 1 }, // Ảnh bìa
    { name: "gallery", maxCount: 10 },   // Bộ sưu tập ảnh
    { name: "seatMap", maxCount: 1 },    // Sơ đồ ghế
    { name: "organizerLogo", maxCount: 1 },
  ]),
  evt.createEvent
);

// 🧩 Cập nhật sự kiện (Admin)
router.put(
  "/:id",
  protect,
  adminOnly,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "seatMap", maxCount: 1 },
    { name: "organizerLogo", maxCount: 1 },
  ]),
  evt.updateEvent
);

// 🧩 Xóa sự kiện (Admin)
router.delete("/:id", protect, adminOnly, evt.deleteEvent);

module.exports = router;
