import React, { useRef } from "react";
interface AccountPopupProps {
  open: boolean;
  onClose: () => void;
}
export default function AccountPopup({ open, onClose }: AccountPopupProps) {
  const avatarRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <div id="popupOverlay" className="popup-overlay" style={{ display: "flex" }}>
      <div className="popup-content">
        <button className="btn-close" id="btnClosePopup" onClick={onClose}>
          &times;
        </button>
        <form action="" id="form-account">
          <h3>Chỉnh sửa tài khoản</h3>
          <div className="form-group">
            <label>Avatar:</label>
            <img src="https://i.pravatar.cc/100" id="previewAvatar" className="avatar-preview" alt="User Avatar" style={{ display: "block", marginBottom: 8 }}/>
            <input type="file" id="inputAvatar" accept="image/*" ref={avatarRef} />
          </div>
          <div className="form-group">
            <label>Họ tên:</label>
            <input type="text" id="inputName" defaultValue="John Doe" />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input type="email" id="inputEmail" defaultValue="john@example.com" />
          </div>
          <div className="form-group">
            <label>SĐT:</label>
            <input type="tel" id="inputPhone" defaultValue="0123456789" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-save" id="btnSave">
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
