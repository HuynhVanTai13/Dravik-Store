"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import "@/styles/admin-order-detail.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ===== Types ===== */
type Address = { receiver?: string; phone?: string; address?: string };
type OrderItem = {
  _id: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  sizeName?: string;
  colorName?: string;
};
type Voucher = {
  code?: string;
  type?: "fixed" | "percent";
  discount?: number;
  maxDiscount?: number;
  percent?: number; percentage?: number; percentOff?: number;
  amount?: number; discountAmount?: number;
};
type Order = {
  _id: string;
  orderCode?: string;
  items: OrderItem[];
  address?: Address;
  shippingFee?: number;
  total?: number;
  voucher?: Voucher | null;
  note?: string;
  paymentType?: string;                 // "COD" / "VNPay"...
  paymentStatus?: "unpaid" | "paid" | "failed";
  createdAt?: string;
  status: "pending" | "confirmed" | "processing" | "shipping" | "completed" | "cancelled";
};

const STATUS_STEPS: Order["status"][] = ["pending", "confirmed", "processing", "shipping", "completed"];
const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã tiếp nhận",
  processing: "Đang xử lý",
  shipping: "Đang vận chuyển",
  completed: "Giao hàng thành công",
  cancelled: "Hủy đơn hàng",
};

const VND = (n: number) =>
  (Number(n) || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const subtotalOf = (items: OrderItem[]) =>
  (items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);

function voucherDiscount(subtotal: number, v?: Voucher | null) {
  if (!v) return 0;
  const pct = Number(v.percent ?? v.percentage ?? v.percentOff ?? (v.type === "percent" ? v.discount : 0)) || 0;
  const amt = Number(v.amount ?? v.discountAmount ?? (v.type === "fixed" ? v.discount : 0)) || 0;
  let d = 0;
  if (pct > 0) d = Math.floor(subtotal * (pct / 100));
  else if (amt > 0) d = amt;
  if (v.maxDiscount && v.maxDiscount > 0) d = Math.min(d, v.maxDiscount);
  return Math.max(0, d);
}

const codeView = (o?: Order) =>
  (o?.orderCode && o.orderCode.trim()) || (o?._id ? `DH${o._id.slice(-6).toUpperCase()}` : "—");

const imgSrc = (raw?: string) => {
  if (!raw) return "/images/placeholder.png";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
};

export default function AdminOrderDetailPage() {
  const params = useParams() as Record<string, string>;
  const orderId = useMemo(() => Object.values(params || {})[0] || "", [params]);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/orders/${orderId}`, { credentials: "include", cache: "no-store" });
        const data = await res.json();
        setOrder(data?.order || data);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  const amounts = useMemo(() => {
    const sub = subtotalOf(order?.items || []);
    const disc = voucherDiscount(sub, order?.voucher || undefined);
    const ship = Number(order?.shippingFee) || 0;
    const total = Number(order?.total ?? Math.max(0, sub - disc + ship));
    return { sub, disc, ship, total };
  }, [order]);

  // VNPay: đã thanh toán ⇒ còn phải thu = 0
  const isVNPay = (order?.paymentType || "").toLowerCase().includes("vnpay");
  const alreadyPaid = isVNPay && order?.paymentStatus === "paid" ? amounts.total : 0;
  const due = Math.max(0, amounts.total - alreadyPaid);

  const nextStatus = useMemo(() => {
    if (!order || order.status === "cancelled") return undefined;
    const i = STATUS_STEPS.indexOf(order.status);
    return i >= 0 ? STATUS_STEPS[i + 1] : undefined;
  }, [order]);

  const goNext = async () => {
    if (!order || !nextStatus) return;
    setUpdating(true);
    try {
      const res = await fetch(`${API}/api/orders/${order._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Không thể cập nhật trạng thái");
      setOrder(data?.order || order);
    } catch (e: any) {
      alert(e?.message || "Lỗi cập nhật trạng thái");
    } finally {
      setUpdating(false);
    }
  };

  const onCopy = async () => {
    if (!order) return;
    await navigator.clipboard.writeText(codeView(order));
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  if (loading) {
    return (
      <main className="main-content">
        <div className="aod-container"><div className="aod-card center">Đang tải đơn hàng…</div></div>
      </main>
    );
  }
  if (!order) {
    return (
      <main className="main-content">
        <div className="aod-container">
          <div className="aod-card center">Không tìm thấy đơn hàng.</div>
          <div className="aod-actions"><Link className="btn outline" href="/admin/order">← Quay lại</Link></div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="print-area">
        {/* Header in print */}
        <div className="print-header">
          <div className="brand">DRAVIK STORE</div>
          <div className="meta">
            <div>Mã đơn: <b>{codeView(order)}</b></div>
            <div>Thời gian: <b>{order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "—"}</b></div>
          </div>
        </div>

        <div className="aod-container">
          {/* Actions (not print) */}
          <div className="aod-actions sticky no-print">
            <Link className="btn outline" href="/admin/order">← Quay lại</Link>

            <div className="code-copy">
              <span className="muted">Mã đơn:</span>
              <b className="code">{codeView(order)}</b>
              <button className="linkish" onClick={onCopy}>{copied ? "Đã sao chép" : "Sao chép"}</button>
            </div>

            <div className="spacer" />

            <button className="btn outline" onClick={() => window.print()}>🧾 In / Xuất hóa đơn</button>
            {nextStatus ? (
              <button className="btn primary" disabled={updating} onClick={goNext}>
                {updating ? "Đang cập nhật…" : `Chuyển sang: ${STATUS_LABEL[nextStatus]}`}
              </button>
            ) : (
              <span className={`badge ${`badge-${order.status}`}`}>{STATUS_LABEL[order.status]}</span>
            )}
          </div>

          {/* Summary */}
          <div className="aod-grid">
            <div className="aod-card col-6">
              <h3>Thông tin người nhận</h3>
              <div className="kv"><span>Người nhận</span><b>{order.address?.receiver || "—"}</b></div>
              <div className="kv"><span>Số điện thoại</span><b>{order.address?.phone || "—"}</b></div>
              <div className="kv print-only"><span>Địa chỉ</span><b>{order.address?.address || "—"}</b></div>
              {order.note && <div className="kv"><span>Ghi chú</span><b>{order.note}</b></div>}
            </div>

            <div className="aod-card col-6">
              <h3>Thông tin đơn hàng</h3>
              <div className="kv"><span>Ngày đặt</span>
                <b>{order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "—"}</b>
              </div>
              {/* ĐÃ BỎ DÒNG “Trạng thái” */}
              <div className="kv"><span>Thanh toán</span><b>{(order.paymentType || "—").toUpperCase()}</b></div>
            </div>
          </div>

          {/* Items */}
          <div className="aod-card">
            <h3>Danh sách sản phẩm</h3>
            <div className="table-wrap">
              <table className="aod-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th colSpan={2}>Sản phẩm</th>
                    <th>Thuộc tính</th>
                    <th className="right">Số lượng</th>
                    <th className="right">Đơn giá</th>
                    <th className="right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((it, i) => {
                    const attrs = [it.colorName ? `Màu: ${it.colorName}` : "", it.sizeName ? `Size: ${it.sizeName}` : ""]
                      .filter(Boolean).join(" • ");
                    return (
                      <tr key={it._id}>
                        <td>{i + 1}</td>
                        <td className="thumb-cell"><img className="thumb" src={imgSrc(it.image)} alt={it.name} /></td>
                        <td className="name">{it.name}</td>
                        <td className="muted">{attrs || "—"}</td>
                        <td className="right">{it.quantity}</td>
                        <td className="right">{VND(it.price)}</td>
                        <td className="right">{VND((it.price || 0) * (it.quantity || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Money */}
          <div className="aod-card">
            <h3>Tổng kết thanh toán</h3>
            <div className="money pretty">
              <div className="row"><span>Tạm tính</span><b>{VND(amounts.sub)}</b></div>
              <div className="row">
                <span>Giảm giá {order.voucher?.code ? <em className="vc">({order.voucher.code})</em> : ""}</span>
                <b className="minus">- {VND(amounts.disc)}</b>
              </div>
              <div className="row"><span>Phí vận chuyển</span><b>{VND(amounts.ship)}</b></div>

              {alreadyPaid > 0 ? (
                <>
                  <div className="row"><span>Đã thanh toán (VNPay)</span><b>{VND(alreadyPaid)}</b></div>
                  <div className="row total"><span>Còn phải thu</span><b>{VND(due)}</b></div>
                </>
              ) : (
                <div className="row total"><span>Tổng phải thu</span><b>{VND(amounts.total)}</b></div>
              )}
            </div>
          </div>

          <div className="aod-actions no-print">
            <Link className="btn outline" href="/admin/order">← Quay lại danh sách</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
