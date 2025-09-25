'use client';
import '@/public/css/login.css';
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

declare global {
  interface Window {
    google?: any;
  }
}

export default function UserLoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // GOOGLE
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // FACEBOOK
  const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  useEffect(() => {
    // ========== 1) HANDLE FACEBOOK REDIRECT ==========
    // Nếu URL có #access_token=... sau khi người dùng đồng ý -> tự đăng nhập
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = params.get("access_token");
      // dọn URL cho sạch
      window.history.replaceState({}, document.title, window.location.pathname);
      if (accessToken) {
        void loginWithFacebookAccessToken(accessToken);
      }
    }

    // ========== 2) LOAD GOOGLE GIS ==========
    const gid = "google-client-script";
    const onGLoad = () => initGoogle();
    if (!document.getElementById(gid)) {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true; s.defer = true; s.id = gid; s.onload = onGLoad;
      document.body.appendChild(s);
    } else onGLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- GOOGLE ----------------
  const initGoogle = () => {
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!CLIENT_ID) {
      console.error("❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing");
      setError("Thiếu GOOGLE CLIENT ID ở frontend (.env.local).");
      return;
    }
    if (!window.google || !googleBtnRef.current) return;

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleGoogleCredential,
      ux_mode: "popup",
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "filled",
      size: "large",
      shape: "pill",
      text: "signin_with",
      logo_alignment: "left",
      width: 260
    });
  };

  const handleGoogleCredential = async (response: any) => {
    try {
      setError("");
      const res = await fetch("http://localhost:5000/api/users/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data.message && String(data.message)) || "Google đăng nhập thất bại. Kiểm tra Authorized JavaScript origins phải có http://localhost:3000.");
        return;
      }
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("userInfo", JSON.stringify(data.user));
      window.location.href = "/user";
    } catch {
      setError("Không thể kết nối server cho Google đăng nhập");
    }
  };
  // -------------- /GOOGLE ----------------

  // -------------- FACEBOOK (REDIRECT FLOW) --------------
  const buildFacebookOAuthUrl = () => {
    if (!FB_APP_ID) {
      setError("Thiếu FACEBOOK APP ID (.env.local)");
      return "";
    }
    // Redirect URI PHẢI khớp trong Facebook → Facebook Login → Settings → Valid OAuth Redirect URIs
    const redirectUri = `${window.location.origin}/user/login`;
    const url =
      `https://www.facebook.com/v19.0/dialog/oauth` +
      `?client_id=${encodeURIComponent(FB_APP_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=public_profile,email` +
      `&display=popup`;
    return url;
  };

  // Gọi backend với accessToken đã có
  const loginWithFacebookAccessToken = async (accessToken: string) => {
    try {
      const res = await fetch("http://localhost:5000/api/users/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Facebook đăng nhập thất bại"); return; }
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("userInfo", JSON.stringify(data.user));
      window.location.href = "/user";
    } catch {
      setError("Không thể kết nối server cho Facebook đăng nhập");
    }
  };

  // Handler SYNC cho nút Facebook (tránh lỗi "asyncfunction, not function")
  const onFacebookClick = () => {
    const oauthUrl = buildFacebookOAuthUrl();
    if (oauthUrl) window.location.href = oauthUrl; // dùng redirect, KHÔNG gọi FB.login
  };
  // -------------- /FACEBOOK --------------

  // -------------- LOCAL LOGIN --------------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/users/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Đăng nhập thất bại"); setLoading(false); return; }
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("userInfo", JSON.stringify(data.user));
      window.location.href = "/user";
    } catch { setError("Lỗi kết nối đến máy chủ"); setLoading(false); }
  };
  // -------------- /LOCAL LOGIN --------------

  return (
    <section className="auth-container" id="auth-box">
      <div className="form-right" id="register-side">
        <h2>CHƯA CÓ TÀI KHOẢN?</h2>
        <p>Đăng ký tài khoản để sử dụng tất cả các tính năng của trang web</p>
        <Link href="/user/register" id="registerBtn"><button>Đăng Ký</button></Link>
      </div>

      <div className="form-left" id="login-form">
        <h2>ĐĂNG NHẬP</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            required
            onChange={handleChange}
            autoComplete="username"
          />
          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={form.password}
            required
            onChange={handleChange}
            autoComplete="current-password" 
          />
          {error && <p className="error-message">{error}</p>}
          <div className="forgot-password">
            <Link href="/user/forgot_password" id="registerBtn">Quên mật khẩu</Link>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
          </button>
        </form>

        <div className="social-login" style={{ display: "flex", gap: "10px", marginTop: "15px",justifyContent:"center" }}>
          

          {/* Google */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "260px", height: "40px", borderRadius: "50px",
              overflow: "hidden", background: "#fff", border: "1px solid #ddd",
            }}
          >
            <div ref={googleBtnRef} />
          </div>
        </div>
      </div>
    </section>
  );
}
