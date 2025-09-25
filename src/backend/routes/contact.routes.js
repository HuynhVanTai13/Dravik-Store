// routes/contact.routes.js
import { Router } from 'express';
import { createContact } from '../controllers/contact.controller.js';
import nodemailer from 'nodemailer';

const router = Router();

router.post('/', createContact);

// Debug: test gửi email đơn giản
router.get('/debug-test', async (req, res) => {
  try {
    const {
      SMTP_HOST, SMTP_PORT, SMTP_SECURE,
      SMTP_USER, SMTP_PASS, SMTP_FROM, CONTACT_RECEIVER
    } = process.env;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: String(SMTP_SECURE).toLowerCase() === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      logger: true,
    });

    await transporter.verify();

    await transporter.sendMail({
      from: SMTP_FROM || `"Contact Form" <${SMTP_USER}>`,
      to: CONTACT_RECEIVER || 'dravikstore@gmail.com',
      subject: 'Test mail từ API',
      text: 'Nếu bạn thấy email này, SMTP đã OK.',
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('debug-test error:', e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;
