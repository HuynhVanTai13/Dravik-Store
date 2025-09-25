'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/public/css/order-success.css';

/* ========= Types ========= */
type OrderItem = {
  image?: string;
  name: string;
  price: number;
  quantity: number;
  colorName?: string;
  sizeName?: string;
};
type Address = { receiver?: string; phone?: string; address?: string };
type Voucher = {
  code: string;
  type: 'fixed' | 'percent';
  discount: number;
  maxDiscount?: number;
};
type Order = {
  _id: string;
  orderCode?: string;
  createdAt?: string;
  status?: string;
  paymentType?: string;                         // "VNPay" | "COD" | ...
  paymentStatus?: 'paid' | 'unpaid' | 'failed'; // có thể đã có trong DB
  address?: Address;
  items: OrderItem[];
  voucher?: Voucher | null;
  shippingFee?: number;
  total?: number;
  note?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const VND = (n: number = 0) => (n || 0).toLocaleString('vi-VN') + ' đ';

function resolveImageSrc(raw?: string): string {
  const placeholder = '/no-image.png';
  if (!raw || typeof raw !== 'string') return placeholder;
  const url = raw.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (/^\/?uploads\//i.test(url)) return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
  if (/^\/?products\//i.test(url)) return `${API_BASE}/uploads/${url.replace(/^\//, '')}`;
  if (/\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(url)) return `${API_BASE}/uploads/products/${url}`;
  return placeholder;
}

const STATUS_STEPS = [
  { key: 'pending',    label: 'Chờ xác nhận' },
  { key: 'confirm',    label: 'Đã tiếp nhận' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'shipping',   label: 'Đang giao' },
  { key: 'success',    label: 'Thành công' },
  { key: 'cancel',     label: 'Đã huỷ' },
];

export default function PaymentResultPage() {
  const router = useRouter();
  const search = useSearchParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = search.get('orderId') || '';
  const statusParam = (search.get('status') || 'success').toLowerCase(); // success | fail | cancel ...

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data) setOrder(data?.order || data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [orderId]);

  const subtotal = useMemo(
    () => (order?.items || []).reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0),
    [order]
  );

  const discountValue = useMemo(() => {
    if (!order?.voucher) return 0;
    const v = order.voucher;
    let d = v.type === 'fixed' ? (v.discount || 0) : Math.floor(subtotal * ((v.discount || 0) / 100));
    if (v.maxDiscount && v.maxDiscount > 0) d = Math.min(d, v.maxDiscount);
    return Math.max(0, d);
  }, [order, subtotal]);

  const shippingFee = order?.shippingFee || 0;
  const finalTotal = Math.max(0, subtotal - discountValue + shippingFee);

  const currentStepIndex = useMemo(() => {
    const k = (order?.status || 'pending').toLowerCase();
    const idx = STATUS_STEPS.findIndex(s => s.key === k);
    return idx >= 0 ? idx : 0;
  }, [order]);

  const title =
    statusParam === 'success' ? 'Đặt hàng thành công'
    : statusParam === 'cancel' ? 'Đơn hàng đã bị huỷ'
    : 'Thanh toán thất bại';

  // === Redeem voucher 1 lần sau khi success ===
  useEffect(() => {
    const code = order?.voucher?.code;
    if (statusParam !== 'success' || !orderId || !code) return;

    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
    if (!userId) return;

    const redeemKey = `redeemed_${orderId}_${code}`;
    if (typeof window !== 'undefined' && localStorage.getItem(redeemKey)) return;

    const endpoints = [
      `${API_BASE}/api/promotion/redeem`,
      `${API_BASE}/api/promotions/redeem`,
      `${API_BASE}/api/vouchers/redeem`,
    ];

    (async () => {
      for (const url of endpoints) {
        try {
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, userId }),
          });
          if (r.ok) {
            localStorage.setItem(redeemKey, '1');
            break;
          }
        } catch {}
      }
    })();
  }, [statusParam, orderId, order?.voucher?.code]);

  // === Hiển thị "Đã thanh toán (VNPay)" & "Còn phải thu" ===
  const isVNPay = (order?.paymentType || '').toLowerCase().includes('vnpay');
  // coi success là đã trả nếu quay về từ VNPay (phòng trường hợp DB chưa set kịp)
  const treatedAsPaid = isVNPay && (order?.paymentStatus === 'paid' || statusParam === 'success');
  const paid = treatedAsPaid ? finalTotal : 0;
  const due = Math.max(0, finalTotal - paid);

  if (loading) {
    return (
      <section className="success-wrap">
        <div className="success-card" style={{ padding: 24, textAlign: 'center' }}>
          Đang tải đơn hàng...
        </div>
      </section>
    );
  }

  return (
    <section className="success-wrap">
      <div className="success-card">
        {/* Header */}
        <div className={`success-hero ${statusParam === 'success' ? 'is-success' : 'is-fail'}`}>
          <div className="icon">
            {statusParam === 'success' ? (
              <svg viewBox="0 0 24 24" width="56" height="56" aria-hidden>
                <path fill="currentColor" d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="56" height="56" aria-hidden>
                <path fill="currentColor" d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm1 15h-2v-2h2zm0-4h-2V7h2z" />
              </svg>
            )}
          </div>
          <h1>{title}</h1>

          {order?.orderCode && (
            <div className="order-code">
              Mã đơn hàng:&nbsp;<strong>{order.orderCode}</strong>
              <button className="copy-btn" onClick={() => navigator.clipboard.writeText(order.orderCode!)} title="Sao chép mã đơn">
                Sao chép
              </button>
            </div>
          )}

          <p className="sub">
            {order?.createdAt
              ? `Thời gian: ${new Date(order.createdAt).toLocaleString('vi-VN')}`
              : 'Cảm ơn bạn đã mua sắm!'}
          </p>
        </div>

        {/* Timeline */}
        <div className="status-timeline">
          {STATUS_STEPS.map((s, idx) => {
            const done = idx <= currentStepIndex;
            return (
              <div className={`step ${done ? 'done' : ''}`} key={s.key}>
                <div className="dot" />
                <span>{s.label}</span>
                {idx < STATUS_STEPS.length - 1 && <div className="line" />}
              </div>
            );
          })}
        </div>

        <div className="grid-2">
          {/* Tóm tắt đơn */}
          <div className="card">
            <h3>Tóm tắt đơn hàng</h3>
            <div className="items">
              {(order?.items || []).map((it, i) => (
                <div className="item" key={i}>
                  <img src={resolveImageSrc(it.image)} alt={it.name} />
                  <div className="info">
                    <div className="name">{it.name}</div>
                    <div className="meta">
                      {it.colorName && <span>Màu: {it.colorName}</span>}
                      {it.sizeName && <span> • Size: {it.sizeName}</span>}
                      <span> • SL: {it.quantity}</span>
                    </div>
                  </div>
                  <div className="price">{VND(it.price * it.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="money">
              <div className="row"><span>Tạm tính</span><span>{VND(subtotal)}</span></div>
              <div className="row"><span>Giảm giá {order?.voucher ? `(${order.voucher.code})` : ''}</span><span className="minus">- {VND(discountValue)}</span></div>
              <div className="row"><span>Phí vận chuyển</span><span>{VND(shippingFee)}</span></div>

              {treatedAsPaid ? (
                <>
                  <div className="row"><span>Đã thanh toán (VNPay)</span><span>{VND(paid)}</span></div>
                  <div className="row total"><span>Còn phải thu</span><span>{VND(due)}</span></div>
                </>
              ) : (
                <div className="row total"><span>Tổng tiền thanh toán</span><span>{VND(finalTotal)}</span></div>
              )}
            </div>
          </div>

          {/* Giao hàng & thanh toán */}
          <div className="card">
            <h3>Thông tin giao hàng</h3>
            <div className="address">
              <div className="line"><strong>{order?.address?.receiver || '-'}</strong> • {order?.address?.phone || '-'}</div>
              <div className="line">{order?.address?.address || '-'}</div>
              {order?.note && <div className="note">Ghi chú: {order.note}</div>}
            </div>

            <div className="split">
              <div><h4>Hình thức thanh toán</h4><p className="tag">{order?.paymentType || '—'}</p></div>
              <div><h4>Trạng thái</h4><p className={`tag ${statusParam === 'success' ? 'ok' : 'warn'}`}>{(order?.status && order.status !== 'pending') ? order.status : 'Chờ xác nhận'}</p></div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="cta">
          <button className="btn ghost" onClick={() => router.push('/user')}>Tiếp tục mua sắm</button>
          <button className="btn" onClick={() => router.push(`/user/account/order/${order?._id || orderId}`)}>
            Xem đơn hàng
          </button>
          <a className="btn outline" href="mailto:support@example.com">Liên hệ hỗ trợ</a>
        </div>
      </div>
    </section>
  );
}
