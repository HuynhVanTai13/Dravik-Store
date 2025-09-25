// src/backend/controllers/contact.controller.js
import ContactMessage from '../models/ContactMessage.js';
import nodemailer from 'nodemailer';

export const createContact = async (req, res) => {
  const { from_name, from_email, phone, message } = req.body || {};

  if (!from_name || !from_email || !phone || !message) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
  }

  try {
    const doc = await ContactMessage.create({
      from_name,
      from_email,
      phone,
      message,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const {
      SMTP_HOST, SMTP_PORT, SMTP_SECURE,
      SMTP_USER, SMTP_PASS, SMTP_FROM,
      CONTACT_RECEIVER
    } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn('⚠️ Chưa cấu hình SMTP đầy đủ.');
      return res.status(201).json({
        message: 'Đã lưu liên hệ. (Chưa cấu hình SMTP nên chưa gửi email)',
        id: doc._id,
      });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: String(SMTP_SECURE).toLowerCase() === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      logger: true,           // <-- bật log
    });

    // kiểm tra kết nối SMTP
    try {
      await transporter.verify();
      console.log('✅ SMTP verify OK');
    } catch (e) {
      console.error('❌ SMTP verify FAILED:', e?.message || e);
      return res.status(500).json({ message: 'SMTP_VERIFY_FAILED', error: e?.message || String(e) });
    }

    const to = CONTACT_RECEIVER || 'dravikstore@gmail.com';
    const subject = `Liên hệ mới: ${from_name} (${phone})`;

    try {
      await transporter.sendMail({
        from: SMTP_FROM || `"Contact Form" <${SMTP_USER}>`,
        to,
        subject,
        replyTo: `${from_name} <${from_email}>`,
        text:
`Tên: ${from_name}
Email: ${from_email}
SĐT: ${phone}

Nội dung:
${message}
`,
        html:
`<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">
  <p><b>Tên:</b> ${from_name}</p>
  <p><b>Email:</b> ${from_email}</p>
  <p><b>SĐT:</b> ${phone}</p>
  <p><b>Nội dung:</b><br/>${message.replace(/\n/g, '<br/>')}</p>
  <hr/>
  <p style="color:#666">ID: ${doc._id} • IP: ${doc.ip || ''}</p>
</div>`
      });
      console.log('📧 Đã gửi email tới:', to);
    } catch (e) {
      console.error('❌ SENDMAIL FAILED:', e?.message || e);
      return res.status(500).json({ message: 'MAIL_SEND_FAILED', error: e?.message || String(e) });
    }

    return res.status(201).json({ message: 'Đã gửi liên hệ & email thành công', id: doc._id });
  } catch (err) {
    console.error('createContact error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
};
