const User = require("../models/User");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -refreshToken");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "Thiếu role" });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    res.json({ message: "Cập nhật quyền thành công", user });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.lockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    user.lockUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await user.save();

    res.json({ message: "Đã khoá tài khoản" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.unlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    user.lockUntil = null;
    user.failedLoginAttempts = 0;
    await user.save();

    res.json({ message: "Đã mở khoá tài khoản" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Xóa user thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};
