// routes/eventRoutes.js
const express = require("express");
const router = express.Router();
const evt = require("../controllers/eventController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const optionalAuth = require("../middleware/optionalAuthMiddleware");
const blockHtml = require("../middleware/blockAndRenderHtmlErrorPage");

router.get("/", optionalAuth, evt.getEvents);
router.get("/:id", evt.getEventById);

router.post(
  "/",
  protect,
  adminOnly,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
    { name: "seatMap", maxCount: 1 },
    { name: "organizerLogo", maxCount: 1 },
  ]),
  blockHtml,      // ← CHUYỂN SAU multer.fields()
  evt.createEvent
);

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
  blockHtml,      // ← CHUYỂN SAU multer.fields()
  evt.updateEvent
);

router.delete("/:id", protect, adminOnly, evt.deleteEvent);

module.exports = router;
