import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js"; // Đúng với tên file và model bạn!

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ message: "Thiếu thông tin!" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Không tìm thấy user!" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Mật khẩu cũ không đúng!" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server!" });
  }
});

export default router;
