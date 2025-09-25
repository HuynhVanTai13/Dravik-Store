"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../../../public/css/login.css";

export default function ForgotPassword() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOTP] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // B1: Gửi OTP
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/users/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep(2);
      setMsg("✅ Đã gửi mã xác thực OTP về email. Vui lòng kiểm tra hộp thư!");
    } catch (err: any) {
      setMsg("❌ Gửi mã thất bại: " + (err?.message || "Thử lại sau!"));
    } finally {
      setLoading(false);
    }
  };

  // B2: Xác thực OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/users/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep(3);
      setMsg("✅ Xác thực OTP thành công! Nhập mật khẩu mới.");
    } catch (err: any) {
      setMsg("❌ Mã OTP không hợp lệ!");
    } finally {
      setLoading(false);
    }
  };

  // B3: Đặt mật khẩu mới
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg("✅ Đổi mật khẩu thành công! Đang chuyển về trang đăng nhập...");
      setTimeout(() => router.push("/user/login"), 1600);
    } catch (err: any) {
      setMsg("❌ Đổi mật khẩu thất bại: " + (err?.message || "Thử lại sau!"));
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại OTP (tuỳ chọn tại B2)
  const handleResendOTP = async () => {
    if (!email) return;
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/users/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg("✅ Đã gửi lại OTP. Vui lòng kiểm tra email.");
    } catch (err: any) {
      setMsg("❌ Gửi lại OTP thất bại: " + (err?.message || "Thử lại sau!"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Form trái */}
      <div className="form-left">
        <h2>Quên Mật Khẩu</h2>

        <p style={{ textAlign: "center", marginBottom: 20 }}>
          {step === 1 && "Vui lòng nhập email để lấy lại mật khẩu"}
          {step === 2 && "Nhập mã OTP vừa được gửi về email để xác thực"}
          {step === 3 && "Nhập mật khẩu mới cho tài khoản"}
        </p>

        {/* Bước 1: Nhập email */}
        {step === 1 && (
          <form onSubmit={handleSendEmail}>
            <input
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <button type="submit" disabled={loading || !email}>
              {loading ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </form>
        )}

        {/* Bước 2: Nhập OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP}>
            <input
              type="text"
              placeholder="Nhập mã OTP"
              value={otp}
              onChange={(e) =>
                setOTP(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              maxLength={6}
              required
              disabled={loading}
              style={{
                letterSpacing: 4,
                fontWeight: 600,
                textAlign: "center",
              }}
            />
            <button type="submit" disabled={loading || otp.length !== 6}>
              {loading ? "Đang xác thực..." : "Xác thực mã OTP"}
            </button>

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button
                type="button"
                style={{
                  background: "#e2e6ed",
                  color: "#003366",
                  fontWeight: 500,
                }}
                onClick={() => {
                  setStep(1);
                  setOTP("");
                  setMsg("");
                }}
                disabled={loading}
              >
                Nhập lại email
              </button>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                style={{ background: "#f3f4f6", color: "#111827", fontWeight: 500 }}
              >
                Gửi lại OTP
              </button>
            </div>
          </form>
        )}

        {/* Bước 3: Đặt mật khẩu mới */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <input
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
            <button type="submit" disabled={loading || password.length < 6}>
              {loading ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
            </button>
          </form>
        )}

        {msg && (
          <p
            style={{
              color: msg.startsWith("✅") ? "green" : "red",
              textAlign: "center",
              marginTop: 10,
            }}
          >
            {msg}
          </p>
        )}

        <div style={{ textAlign: "center", marginTop: 15 }}>
          <Link href="/user/login" id="registerBtn">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>

      {/* Cột phải giữ nguyên bố cục */}
      <div className="form-right">
        <h2>CHÀO BẠN!</h2>
        <p>Chúng tôi sẽ giúp bạn lấy lại mật khẩu một cách nhanh chóng</p>
        <Link href="/user/register" id="registerBtn">
          <button>Đăng ký tài khoản mới</button>
        </Link>
      </div>
    </div>
  );
}
