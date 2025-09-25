import express from 'express';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import User from '../models/User.js'; // Đảm bảo đúng path đến model User của bạn!

const router = express.Router();
let otpStore = {}; // { email: { otp, expired } }

// Gửi OTP
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@'))
    return res.status(400).json({ message: 'Email không hợp lệ!' });

  // Tạo OTP 6 số
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { otp, expired: Date.now() + 5 * 60 * 1000 };

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "dravikstore@gmail.com",        // Gmail của bạn
      pass: "bkbsslhkflsfnyec",             // App password 16 ký tự liền, không dấu cách
    },
  });

  const mailOptions = {
    from: '"Dravik Store" <dravikstore@gmail.com>',
    to: email,
    subject: 'Mã xác thực OTP Dravik Store',
    text: `Mã OTP của bạn là: ${otp}\nCó hiệu lực trong 5 phút.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "Đã gửi mã OTP thành công!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gửi OTP thất bại, thử lại!" });
  }
});

// Xác thực OTP
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const saved = otpStore[email];
  if (!saved) return res.status(400).json({ message: "Chưa gửi OTP tới email này!" });
  if (saved.otp !== otp) return res.status(400).json({ message: "Mã OTP không đúng!" });
  if (Date.now() > saved.expired) return res.status(400).json({ message: "Mã OTP đã hết hạn!" });

  delete otpStore[email];
  res.json({ message: "Xác thực OTP thành công!" });
});

// Đổi mật khẩu mới
router.post('/reset-password', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Thiếu thông tin!' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user!' });
    user.password = await bcrypt.hash(password, 10); // Hash mật khẩu
    await user.save();
    res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Đổi mật khẩu thất bại!" });
  }
});

export default router;
