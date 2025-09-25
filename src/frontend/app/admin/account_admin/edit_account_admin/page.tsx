"use client";
import React from "react";
import "../../../../styles/account.css";
// Nếu dùng ảnh placeholder, bạn nên đặt ở public/assets/images/product-placeholder.png

export default function EditAccountAdminPage() {
  return (
    <main className="main-content">
      <div className="popup">
        <h2>Chỉnh sửa tài khoản</h2>
        <p>Tên đăng nhập</p>
        <input type="text" placeholder="Tên đăng nhập" id="username" />
        <p>Email</p>
        <input type="email" placeholder="Email" id="email" />
        <p>Password</p>
        <input type="password" placeholder="Mật khẩu" id="password" />
        <p> Nhập lại password</p>
        <input type="password" placeholder="Nhập lại mật khẩu" id="password" />
        <div className="btn-group">
          <button className="btnsave">Lưu</button>
          <button className="remove-cancel">Hủy</button>
        </div>
      </div>
    </main>

  );
}
