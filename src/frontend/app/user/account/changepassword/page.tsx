"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/public/css/orders.css";         // sidebar/layout giống trang Orders
import "@/public/css/changepassword.css"; // CSS mới (cp-*)

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Changepassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState<any>(null);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const userInfo = localStorage.getItem("userInfo") || localStorage.getItem("user");
      if (userInfo) setUser(JSON.parse(userInfo));
    } catch {
      setUser(null);
    }
  }, []);

  const email = user?.email || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!email || !oldPassword || !newPassword || !confirmPassword) {
      setMsg({ type: "error", text: "Thiếu thông tin bắt buộc." });
      return;
    }
    if (newPassword.length < 8) {
      setMsg({ type: "error", text: "Mật khẩu mới phải có ít nhất 8 ký tự." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: "error", text: "Mật khẩu mới và xác nhận không khớp." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, oldPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Đổi mật khẩu thất bại.");

      setMsg({ type: "success", text: "Đổi mật khẩu thành công! Đang chuyển về đăng nhập…" });
      setTimeout(() => router.push("/user/login"), 1600);
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Đổi mật khẩu thất bại." });
    } finally {
      setLoading(false);
    }
  }

  const isLoggedIn = !!user;

  return (
    <>
      {/* breadcrumb */}
      <nav className="breadcrumb">
        <Link href="/">Trang chủ</Link> /{' '}
        <span className="current">
          <Link href="/user/changepassword" style={{ color: '#2c2929ff' }}>Thay đổi mật khẩu</Link>
        </span>
      </nav>

      <main className="account-container container-12 cp-page">
        {/* Sidebar trái – giữ như trang Orders */}
        <aside className="account-sidebar">
          <h3>Trang tài khoản</h3>
          <p>
            Xin chào,{" "}
            <span className="hl">{user?.username || user?.fullName || user?.name || "Khách"}</span>
          </p>
          <ul>
            <li><Link href="/user/account">Thông tin tài khoản</Link></li>
            <li><Link href="/user/account/order">Đơn hàng của bạn</Link></li>
            <li><Link className="active" href="/user/account/changepassword">Đổi mật khẩu</Link></li>
            <li><Link href="/user/account/address">Địa chỉ</Link></li>
          </ul>
        </aside>

        {/* Nội dung phải */}
        <section className="cp-card">
          <div className="cp-head">
            <h2>Đổi mật khẩu</h2>
            <p className="cp-sub">Để bảo mật, hãy đặt mật khẩu tối thiểu 8 ký tự.</p>
          </div>

          {!isLoggedIn ? (
            <div className="cp-alert cp-alert--note">
              Bạn cần <Link href="/user/login" className="cp-link">đăng nhập</Link> để đổi mật khẩu.
            </div>
          ) : (
            <form className="cp-form" onSubmit={handleSubmit} noValidate>
              <div className="cp-field">
                <label>Email</label>
                <input className="cp-input" type="email" value={email} readOnly />
              </div>

              <div className="cp-field">
                <label>Mật khẩu cũ <span className="req">*</span></label>
                <div className="cp-input-wrap">
                  <input
                    className="cp-input"
                    type={showOld ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" className="cp-eye" onClick={() => setShowOld(v => !v)} aria-label="Hiện/ẩn mật khẩu cũ">
                    {showOld ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="cp-field">
                <label>Mật khẩu mới <span className="req">*</span></label>
                <div className="cp-input-wrap">
                  <input
                    className="cp-input"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="cp-eye" onClick={() => setShowNew(v => !v)} aria-label="Hiện/ẩn mật khẩu mới">
                    {showNew ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="cp-field">
                <label>Xác nhận mật khẩu <span className="req">*</span></label>
                <div className="cp-input-wrap">
                  <input
                    className="cp-input"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="cp-eye" onClick={() => setShowConfirm(v => !v)} aria-label="Hiện/ẩn xác nhận mật khẩu">
                    {showConfirm ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {msg && (
                <div className={`cp-alert ${msg.type === "success" ? "cp-alert--success" : "cp-alert--error"}`} aria-live="polite">
                  {msg.text}
                </div>
              )}

              <div className="cp-actions">
                <button type="submit" className="cp-btn cp-btn--primary" disabled={loading}>
                  {loading ? "Đang xử lý…" : "Đổi mật khẩu"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
