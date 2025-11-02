const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getAllUsers,
  updateUserRole,
  lockUser,
  unlockUser,
  deleteUser,
} = require("../controllers/userController");

// ✅ Chỉ admin truy cập
router.get("/", protect, adminOnly, getAllUsers);
router.put("/:id/role", protect, adminOnly, updateUserRole);
router.put("/:id/lock", protect, adminOnly, lockUser);
router.put("/:id/unlock", protect, adminOnly, unlockUser);
router.delete("/:id", protect, adminOnly, deleteUser);

module.exports = router;
