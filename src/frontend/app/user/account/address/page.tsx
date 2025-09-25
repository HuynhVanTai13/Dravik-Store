"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import "@/public/css/orders.css";     // sidebar & layout sẵn có
import "@/public/css/address.css";    // giao diện tối giản, Inter, size nhỏ

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

type Address = {
  _id?: string;
  address: string;
  receiver: string;
  phone: string;
  isDefault: boolean;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AddressPage() {
  const [me, setMe] = useState<any>(null);
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState<Address>({ address: "", receiver: "", phone: "", isDefault: false });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const a = localStorage.getItem("userInfo") || localStorage.getItem("user");
      if (a) setMe(JSON.parse(a));
    } catch {}
  }, []);

  const userId = useMemo(() => me?._id || me?.id || null, [me]);

  async function fetchAddresses() {
    if (!userId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/users/${userId}/addresses`, { credentials: "include" });
      const j = await r.json();
      setList(Array.isArray(j) ? j : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (userId) fetchAddresses(); }, [userId]);

  function openModal(row?: Address) {
    setEditing(row ?? null);
    setForm(row ? { ...row } : { address: "", receiver: "", phone: "", isDefault: false });
    setOpen(true);
  }
  function closeModal() {
    setOpen(false);
    setEditing(null);
    setForm({ address: "", receiver: "", phone: "", isDefault: false });
  }
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return alert("Bạn cần đăng nhập!");
    if (!form.address.trim() || !form.receiver.trim() || !form.phone.trim()) {
      alert("Vui lòng nhập đủ thông tin!");
      return;
    }
    setSaving(true);
    try {
      const isUpdate = !!editing?._id;
      const url = isUpdate
        ? `${API}/api/users/${userId}/addresses/${editing!._id}`
        : `${API}/api/users/${userId}/addresses`;
      const method = isUpdate ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiver: form.receiver,
          phone: form.phone,
          address: form.address,
          isDefault: !!form.isDefault,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || "Lưu địa chỉ thất bại");

      await fetchAddresses();
      closeModal();
    } catch (e: any) {
      alert(e?.message || "Không thể lưu địa chỉ.");
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(addr: Address) {
    if (!userId || !addr?._id) return;
    try {
      const r = await fetch(`${API}/api/users/${userId}/addresses/${addr._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiver: addr.receiver,
          phone: addr.phone,
          address: addr.address,
          isDefault: true,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || "Không đặt được mặc định");
      await fetchAddresses();
    } catch (e: any) {
      alert(e?.message || "Không đặt được mặc định.");
    }
  }

  async function handleDelete(id?: string) {
    if (!userId || !id) return;
    if (!confirm("Bạn có chắc muốn xoá địa chỉ này?")) return;
    try {
      const r = await fetch(`${API}/api/users/${userId}/addresses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || "Xoá thất bại (kiểm tra router backend).");
      }
      await fetchAddresses();
    } catch (e: any) {
      alert(e?.message || "Không thể xoá địa chỉ.");
    }
  }

  async function handleLocate() {
    if (!("geolocation" in navigator)) { alert("Trình duyệt không hỗ trợ định vị."); return; }
    setLocating(true);
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(async ({ coords }) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=jsonv2&addressdetails=1&accept-language=vi`
            );
            const data: any = await res.json();
            const display = data?.display_name;
            setForm((p) => ({ ...p, address: display || `${coords.latitude}, ${coords.longitude}` }));
            resolve();
          } catch { reject(new Error("Không thể lấy địa chỉ.")); }
        }, () => reject(new Error("Không thể lấy vị trí.")), { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
      });
    } catch (e: any) {
      alert(e?.message || "Không thể lấy vị trí hiện tại.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className={`address-page ${inter.className}`}>
      {/* breadcrumb */}
      <nav className="breadcrumb">
        <Link href="/">Trang chủ</Link> /{' '}
        <span className="current">
          <Link href="/user/address" style={{ color: '#2c2929ff' }}>Địa chỉ</Link>
        </span>
      </nav>

      <div className="account-container container-12">
        {/* Sidebar trái (giống orders) */}
        <aside className="account-sidebar">
          <h3>Trang tài khoản</h3>
          <p>Xin chào, <span className="hl">{me?.username || "bạn"}</span></p>
          <ul>
            <li><Link href="/user/account">Thông tin tài khoản</Link></li>
            <li><Link href="/user/account/order">Đơn hàng của bạn</Link></li>
            <li><Link className="active" href="/user/account/address">Địa chỉ</Link></li>
            <li><Link href="/user/account/changepassword">Đổi mật khẩu</Link></li>
          </ul>
        </aside>

        {/* Nội dung phải */}
        <section className="address-cards">
          <div className="addr-top">
            <h2>Địa chỉ của bạn</h2>
            <button className="btn btn-sm btn--outline" onClick={() => openModal()}>+ Thêm địa chỉ</button>
          </div>

          {loading ? (
            <div className="addr-empty"><p className="muted">Đang tải danh sách địa chỉ…</p></div>
          ) : (list || []).length === 0 ? (
            <div className="addr-empty">
              <img src="/images/empty-address.svg" alt="empty" />
              <p className="muted">Chưa có địa chỉ nào.</p>
              <button className="btn btn-sm btn--primary" onClick={() => openModal()}>Thêm địa chỉ đầu tiên</button>
            </div>
          ) : (
            <div className="addr-table-wrap">
              <table className="addr-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Địa chỉ</th>
                    <th>Người nhận</th>
                    <th>Điện thoại</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a, i) => (
                    <tr key={a._id || i}>
                      <td>{i + 1}</td>
                      <td className="addr-text">{a.address}</td>
                      <td>{a.receiver}</td>
                      <td>{a.phone}</td>
                      <td>
                        {a.isDefault ? (
                          <span className="pill-default">Đang sử dụng</span>
                        ) : (
                          <button className="btn btn-sm btn--outline" onClick={() => setDefault(a)}>Chọn mặc định</button>
                        )}
                      </td>
                      <td className="addr-actions">
                        <button className="btn btn-sm btn--outline" onClick={() => openModal(a)}>Sửa</button>
                        <button className="btn btn-sm btn--danger" onClick={() => handleDelete(a._id)}>Xoá</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal thêm/sửa */}
      {open && (
        <div className="addr-overlay" role="dialog" aria-modal="true" onClick={(e)=>{ if (e.target === e.currentTarget) closeModal(); }}>
          <form className="addr-modal" onSubmit={handleSave}>
            <div className="addr-head">
              <div className="addr-title">{editing ? "Sửa địa chỉ" : "Thêm địa chỉ"}</div>
              <button type="button" className="addr-close" aria-label="Đóng" onClick={closeModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="addr-body">
              <label className="addr-field">
                <span>Địa chỉ</span>
                <div className="addr-row">
                  <input name="address" value={form.address} onChange={onChange} required />
                  <button type="button" className="btn btn-sm btn--outline" onClick={handleLocate} disabled={locating}>
                    {locating ? "Đang lấy vị trí…" : "Vị trí hiện tại"}
                  </button>
                </div>
              </label>

              <label className="addr-field">
                <span>Người nhận</span>
                <input name="receiver" value={form.receiver} onChange={onChange} required />
              </label>

              <label className="addr-field">
                <span>Điện thoại</span>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  required
                  inputMode="numeric"
                  pattern="^(03|05|07|08|09)\\d{8}$"
                  title="SĐT 10 số, bắt đầu 03/05/07/08/09"
                />
              </label>

              <label className="addr-field check">
                <input type="checkbox" name="isDefault" checked={!!form.isDefault} onChange={onChange} />
                Đặt làm địa chỉ mặc định
              </label>
            </div>

            <div className="addr-foot">
              <button type="button" className="btn btn-sm btn--outline" onClick={closeModal}>Huỷ</button>
              <button type="submit" className="btn btn-sm btn--primary" disabled={saving}>
                {saving ? "Đang lưu…" : (editing ? "Cập nhật" : "Thêm mới")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
