'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@/public/css/register.css';

const RegisterPage = () => {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Nhập liệu: trim email theo thời gian thực cho dễ nhìn
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email') {
      setForm((prev) => ({ ...prev, email: value.trim() }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Validate mật khẩu
  const getPasswordError = (password: string) => {
    if (password.length < 7) return '❌ Mật khẩu phải có ít nhất 7 ký tự. (VD: Abc@123)';
    if (!/[A-Z]/.test(password)) return '❌ Mật khẩu phải có ít nhất 1 ký tự viết hoa (A-Z). Ví dụ: Abc@123';
    if (!/[0-9]/.test(password)) return '❌ Mật khẩu phải có ít nhất 1 số (0-9). Ví dụ: Abc@123';
    if (!/[^A-Za-z0-9]/.test(password)) return '❌ Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*). Ví dụ: Abc@123';
    return '';
  };

  // SĐT VN 10 số, bắt đầu bằng 0
  const isValidPhone = (phone: string) => /^0\d{9}$/.test(phone);

  // Chỉ chấp nhận Gmail (không phân biệt hoa thường)
  const isValidGmail = (email: string) => /^[\w.+\-]+@gmail\.com$/i.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const password = form.password;

    if (password !== form.confirmPassword) {
      setError('❌ Mật khẩu không khớp');
      return;
    }
    if (!isValidGmail(email)) {
      setError('❌ Email phải là địa chỉ @gmail.com hợp lệ. VD: ten123@gmail.com');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('❌ Số điện thoại phải bắt đầu bằng 0 và đủ 10 số. VD: 0987654321');
      return;
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: fullName,     // BE nhận username
          email,                  // đã toLowerCase
          password,
          phone_number: phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(`❌ ${data.message || 'Đăng ký thất bại'}`);
        setLoading(false);
        return;
      }

      setSuccess('✅ Đăng ký thành công! Chuyển sang trang đăng nhập...');
      setLoading(false);
      setTimeout(() => router.push('/user/login'), 1200);
    } catch {
      setLoading(false);
      setError('❌ Lỗi kết nối đến máy chủ');
    }
  };

  return (
    <section className="auth-container">
      <div className="form-left">
        <h2>ĐĂNG KÝ TÀI KHOẢN</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="fullName"
            placeholder="Họ và tên (có thể chứa số)"
            required
            value={form.fullName}
            onChange={handleChange}
          />
          <input
            type="email"
            name="email"
            placeholder="Email (chỉ Gmail)"
            required
            value={form.email}
            onChange={handleChange}
          />
          <input
            type="tel"
            name="phone"
            placeholder="Số điện thoại"
            required
            value={form.phone}
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            required
            value={form.password}
            onChange={handleChange}
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu"
            required
            value={form.confirmPassword}
            onChange={handleChange}
          />

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký'}
          </button>
        </form>
      </div>

      <div className="form-right">
        <h2>CHÀO MỪNG TRỞ LẠI!</h2>
        <p>Đăng nhập để sử dụng tất cả các tính năng của trang web</p>
        <Link href="/user/login">
          <button>Đăng Nhập</button>
        </Link>
      </div>
    </section>
  );
};

export default RegisterPage;
