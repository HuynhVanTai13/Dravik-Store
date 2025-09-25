"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/public/css/orders.css";
import "@/public/css/account.css";

const LOGIN_PATH = "login";

type MiniUser = {
  fullName?: string; username?: string; name?: string;
  email?: string; phone?: string;
};

export default function AccountMiniPage() {
  const router = useRouter();
  const [u, setU] = useState<MiniUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const a = localStorage.getItem("userInfo");
      const b = localStorage.getItem("user");
      const raw = a || b;
      if (raw) {
        setU(JSON.parse(raw));
        setIsLoggedIn(true);
      } else {
        setU({});
        setIsLoggedIn(
          Boolean(localStorage.getItem("token") || localStorage.getItem("accessToken"))
        );
      }
    } catch {
      setU({});
      setIsLoggedIn(false);
    }
  }, []);

  const name  = u?.fullName || u?.username || u?.name || "—";
  const email = u?.email || "—";
  const phone = u?.phone || "—";

  /** Xóa key theo danh sách & pattern (localStorage + sessionStorage) */
  const wipeStorages = () => {
    const removeByPatterns = (store: Storage) => {
      const patterns: RegExp[] = [
        /^user(Id)?$/i, /^user_id$/i, /^userid$/i,               // ✅ userId các kiểu
        /^user(info)?$/i, /^user$/,                               // userInfo, user
        /token/i, /^accessToken$/i, /^refreshToken$/i, /^jwt$/i,  // token
        /^payment_/i, /^redeemed_/i, /^cart/i,                    // payment_*, redeemed_*, cart*
      ];
      const keys = Object.keys(store);
      for (const k of keys) {
        if (patterns.some((re) => re.test(k))) {
          try { store.removeItem(k); } catch {}
        }
      }
    };
    try { removeByPatterns(localStorage); } catch {}
    try { removeByPatterns(sessionStorage); } catch {}

    // Xóa một số key chắc chắn có
    const hardKeys = [
      "userId","userid","user_id","user","userInfo",
      "token","accessToken","refreshToken",
      "payment_method_id","payment_total"
    ];
    for (const k of hardKeys) {
      try { localStorage.removeItem(k); } catch {}
      try { sessionStorage.removeItem(k); } catch {}
    }

    // Xóa vài cookie phổ biến
    const cookieNames = ["token","accessToken","refreshToken","jwt","session"];
    cookieNames.forEach((c) => {
      try {
        document.cookie = `${c}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      } catch {}
    });
  };

  // NEW: phát tín hiệu để các component (cart badge, wishlist…) cập nhật ngay
  const notifyClientStatesAfterLogout = () => {
    try {
      // Đặt rỗng rõ ràng cho những key thường dùng
      localStorage.setItem("cart", JSON.stringify([]));
      localStorage.setItem("cart_count", "0");
      localStorage.setItem("favourite", JSON.stringify([]));
      localStorage.setItem("favourite_updated", String(Date.now())); // thấy key này trong ảnh devtools

      // Phát custom events — nếu header/badge có nghe sẽ cập nhật ngay lập tức
      window.dispatchEvent(new CustomEvent("auth:logout"));
      window.dispatchEvent(new CustomEvent("cart:changed", { detail: { count: 0 } }));
      window.dispatchEvent(new CustomEvent("favourite:changed", { detail: { count: 0 } }));
    } catch {}
  };

  const handleLogout = () => {
    wipeStorages();
    notifyClientStatesAfterLogout(); // NEW

    setU({});
    setIsLoggedIn(false);
    router.push("/user");
    router.refresh(); // NEW: ép App Router re-render lại để đồng bộ UI
  };

  const handleLogin = () => router.push(LOGIN_PATH);

  const btnBase: React.CSSProperties = {
    padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd8f1",
    background: "#fff", color: "#102a43", fontWeight: 700, cursor: "pointer",
  };
  const btnLogin: React.CSSProperties = {
    ...btnBase, background: "#163d77", color: "#fff", borderColor: "#163d77",
  };
  const btnLogout: React.CSSProperties = {
    ...btnBase, background: "#fff7f7", color: "#b42318", borderColor: "#f1b4b4",
  };

  return (
    <>
      <div className="breadcrumb-wrapper">
        <nav className="breadcrumb">
        <Link href="/">Trang chủ</Link> /{' '}
        <span className="current">
          <Link href="/user/account" style={{ color: '#2c2929ff' }}>Tài khoản</Link>
        </span>
      </nav>
      </div>

      <div className="account-container container-12 accm-page">
        <aside className="account-sidebar">
          <h3>Trang tài khoản</h3>
          <p>Xin chào, <span className="hl">{name}</span></p>
          <ul>
            <li><Link className="active" href="/user/account">Thông tin tài khoản</Link></li>
            <li><Link href="/user/account/order">Đơn hàng của bạn</Link></li>
            <li><Link href="/user/account/address">Địa chỉ</Link></li>
            <li><Link href="/user/account/changepassword">Đổi mật khẩu</Link></li>
          </ul>

          <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
            {isLoggedIn ? (
              <button type="button" onClick={handleLogout} style={btnLogout}>
                Đăng xuất
              </button>
            ) : (
              <button type="button" onClick={handleLogin} style={btnLogin}>
                Đăng nhập
              </button>
            )}
          </div>
        </aside>

        <section className="accm-card">
          <h2 className="accm-title">Thông tin tài khoản</h2>
          <div className="accm-kv"><span>Họ tên</span><b>{name}</b></div>
          <div className="accm-kv"><span>Email</span><b>{email}</b></div>
          <div className="accm-kv"><span>SĐT</span><b>{phone}</b></div>
        </section>
      </div>
    </>
  );
}
