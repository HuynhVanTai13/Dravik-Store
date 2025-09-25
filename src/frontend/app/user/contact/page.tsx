'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import '../../../public/css/contact.css';

type State = {
  from_name: string;
  from_email: string;
  phone: string;
  message: string;
  honeypot: string; // chống bot
};

export default function Contact() {
  const [form, setForm] = useState<State>({
    from_name: '',
    from_email: '',
    phone: '',
    message: '',
    honeypot: '',
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (form.honeypot) return; // bot

    if (!form.from_name || !form.from_email || !form.phone || !form.message) {
      setNotice({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin.' });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_name: form.from_name.trim(),
          from_email: form.from_email.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Gửi liên hệ thất bại');

      setNotice({ type: 'success', text: 'Đã gửi liên hệ thành công! Chúng tôi sẽ phản hồi sớm.' });
      setForm({ from_name: '', from_email: '', phone: '', message: '', honeypot: '' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Trang chủ</Link> /{' '}
        <span className="current">
          <Link href="/user/contact" style={{ color: '#2c2929ff' }}>Liên hệ</Link>
        </span>
      </nav>

      <section className="contact-section">
        <div className="contact-info">
          <h2>Liên hệ với chúng tôi</h2>
          <p>
            <i className="fas fa-map-marker-alt" /> Địa chỉ: 158/25 Phạm Văn Chiêu, Phường 8, Gò Vấp, TP Hồ Chí Minh
          </p>
          <p>
            <i className="fas fa-phone" /> Số điện thoại: 1234567890
          </p>
          <p>
            <i className="fas fa-envelope" /> Email: dravikstore@gmail.com
          </p>

          {/* Thông báo */}
          {notice && (
            <div
              style={{
                margin: '10px 0',
                padding: '10px 12px',
                borderRadius: 8,
                background: notice.type === 'success' ? '#ecfdf5' : '#fee2e2',
                color: notice.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${notice.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              }}
            >
              {notice.text}
            </div>
          )}

          {/* Form gửi liên hệ */}
          <form className="contact-form" id="contact-form" autoComplete="off" onSubmit={onSubmit}>
            <input
              type="text"
              name="from_name"
              placeholder="Họ và tên *"
              required
              value={form.from_name}
              onChange={onChange}
            />
            <input
              type="email"
              name="from_email"
              placeholder="Email *"
              required
              value={form.from_email}
              onChange={onChange}
            />
            <input
              type="tel"
              name="phone"
              placeholder="Số điện thoại *"
              required
              value={form.phone}
              onChange={onChange}
            />
            <textarea
              name="message"
              rows={4}
              placeholder="Nhập nội dung *"
              required
              value={form.message}
              onChange={onChange}
            />

            {/* Honeypot (ẩn) để chặn bot */}
            <input
              type="text"
              name="honeypot"
              value={form.honeypot}
              onChange={onChange}
              style={{ display: 'none' }}
              tabIndex={-1}
              aria-hidden="true"
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Đang gửi…' : 'Gửi liên hệ của bạn'}
            </button>
          </form>
        </div>

        {/* Google Map */}
        <div className="contact-map">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.833367511029!2d106.66650567471938!3d10.822159558365538!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317528cc58289b41%3A0x74904f0a529b7e68!2zMTU4LzI1IFBo4bqhbSBWw6JuIENoaeG7gW4sIFBoxrDhu51uZyA4LCBH4bubaSBW4buHcCwgSOG7kyBDaMOtIE1pbmggNzAwMDAwLCBWaeG7h3QgTmFt!5e0!3m2!1svi!2s!4v1717999999999"
            allowFullScreen
            loading="lazy"
            style={{ width: '100%', height: '100%', border: 0, borderRadius: 10 }}
          />
        </div>
      </section>
    </>
  );
}
