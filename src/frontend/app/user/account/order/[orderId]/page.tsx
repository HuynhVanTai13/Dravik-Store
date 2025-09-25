"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import "@/public/css/order-detail.css";

/* ===== Types ===== */
type OrderItem = {
  _id: string;
  productId?: string | { _id: string; slug?: string };
  name: string;
  slug?: string;
  image?: string;
  price: number;
  quantity: number;
  sizeName?: string;
  colorName?: string;
  product?: { slug?: string };
};
type Address = { _id?: string; receiver?: string; phone?: string; address?: string; isDefault?: boolean };
type Voucher = {
  code?: string;
  type?: "fixed" | "percent";
  discount?: number;
  maxDiscount?: number;
  percent?: number; percentage?: number; percentOff?: number;
  amount?: number; discountAmount?: number;
};
type OrderData = {
  _id: string;
  orderCode?: string;
  status?: string;
  createdAt?: string;
  items: OrderItem[];
  address?: Address;
  paymentType?: string;
  paymentStatus?: "paid" | "unpaid" | "failed";
  shippingFee?: number;
  total?: number;
  voucher?: Voucher | null;
  note?: string;
};

/* ===== Utils ===== */
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const VND = (n: number) => (Number(n) || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
const imgSrc = (raw?: string) => (!raw ? "/images/placeholder.png" : /^https?:\/\//i.test(raw) ? raw : `${API}${raw.startsWith("/") ? "" : "/"}${raw}`);
const codeView = (o: OrderData) => (o.orderCode && o.orderCode.trim()) || `DH${(o._id || "").slice(-6).toUpperCase()}`;
const LABELS: Record<string, string> = { pending: "Chờ xác nhận", confirmed: "Đã tiếp nhận", processing: "Đang xử lý", shipping: "Đang giao", completed: "Thành công", success: "Thành công", cancelled: "Đã huỷ", canceled: "Đã huỷ" };
const normalize = (s?: string) => {
  const k = (s || "").toLowerCase().trim();
  if (k === "success") return "completed";
  if (k === "canceled") return "cancelled";
  return LABELS[k] ? k : "pending";
};
const STEPS = [
  { key: "pending", label: "Chờ xác nhận" },
  { key: "confirmed", label: "Đã tiếp nhận" },
  { key: "processing", label: "Đang xử lý" },
  { key: "shipping", label: "Đang giao" },
  { key: "completed", label: "Thành công" },
];
const stepIndex = (status?: string) => {
  const k = normalize(status);
  const i = STEPS.findIndex((s) => s.key === k);
  return i >= 0 ? i : -1;
};
const calcSubtotal = (items: OrderItem[]) => (items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
const calcVoucherDiscount = (subtotal: number, v?: Voucher | null) => {
  if (!v) return 0;
  const pct = Number(v.percent ?? v.percentage ?? v.percentOff ?? (v.type === "percent" ? v.discount : 0)) || 0;
  const amt = Number(v.amount ?? v.discountAmount ?? (v.type === "fixed" ? v.discount : 0)) || 0;
  let discount = 0;
  if (pct > 0) discount = Math.floor(subtotal * (pct / 100));
  else if (amt > 0) discount = amt;
  if (v.maxDiscount && v.maxDiscount > 0) discount = Math.min(discount, v.maxDiscount);
  return Math.max(0, discount);
};
const toSlug = (str: string) =>
  (str || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const productLink = (it: OrderItem) => {
  const pid = typeof it.productId === "string" ? it.productId : it.productId?._id;
  const slug = it.slug || it.product?.slug || (typeof it.productId === "object" ? it.productId?.slug : undefined) || (it.name ? toSlug(it.name) : undefined);
  return slug ? `/user/products/${slug}` : `/user/products/${pid || ""}`;
};
function getLocalUser() {
  if (typeof window === "undefined") return { id: "", name: "" };
  try {
    const a = JSON.parse(localStorage.getItem("userInfo") || "null");
    const b = JSON.parse(localStorage.getItem("user") || "null");
    const u = a || b || {};
    return { id: u?._id || u?.id || "", name: u?.username || u?.name || "Người dùng" };
  } catch {
    return { id: "", name: "" };
  }
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>() || { orderId: "" };
  const router = useRouter();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  // đánh giá
  const [openForm, setOpenForm] = useState<Record<string, boolean>>({});
  const [rating, setRating] = useState<Record<string, number>>({});
  const [comment, setComment] = useState<Record<string, string>>({});
  const [images, setImages] = useState<Record<string, File[]>>({});
  const [posting, setPosting] = useState<Record<string, boolean>>({});
  const [me, setMe] = useState<{ id: string; name: string }>({ id: "", name: "" });

  // địa chỉ
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showSelectAddr, setShowSelectAddr] = useState(false);
  const [pickIdx, setPickIdx] = useState<number>(-1);

  const [showAddrModal, setShowAddrModal] = useState(false);
  const [addrForm, setAddrForm] = useState<{ receiver: string; phone: string; address: string }>({ receiver: "", phone: "", address: "" });
  const [savingAddr, setSavingAddr] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => { setMe(getLocalUser()); }, []);

  async function reloadOrder(oid: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/orders/${oid}`, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      setOrder(data?.order || data);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (orderId) reloadOrder(orderId); }, [orderId]);

  // sổ địa chỉ user
  useEffect(() => {
    if (!me.id) return;
    (async () => {
      try {
        const r = await fetch(`${API}/api/users/${me.id}`, { credentials: "include" });
        const d: any = await r.json();
        setAddresses(Array.isArray(d?.addresses) ? (d.addresses as Address[]) : []);
      } catch { setAddresses([]); }
    })();
  }, [me.id]);

  // gửi đánh giá
  async function handleSend(it: OrderItem) {
    const rid = it._id;
    if (!me.id) return alert("Vui lòng đăng nhập để gửi đánh giá.");
    if (!rating[rid]) return alert("Bạn chưa chọn số sao.");
    const text = (comment[rid] || "").trim();

    const pid = typeof it.productId === "string" ? it.productId : it.productId?._id;
    if (!pid) return alert("Thiếu productId của sản phẩm.");

    try {
      setPosting((p) => ({ ...p, [rid]: true }));
      const form = new FormData();
      form.append("productId", String(pid));
      form.append("userId", me.id);
      form.append("userName", me.name || "Người dùng");
      form.append("rating", String(rating[rid]));
      form.append("content", text);
      (images[rid] || []).slice(0, 4).forEach((f) => form.append("images", f));

      const res = await fetch(`${API}/api/comments`, { method: "POST", body: form, credentials: "include" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.message || `Gửi đánh giá thất bại (${res.status})`);
      }
      setOpenForm((p) => ({ ...p, [rid]: false }));
      setRating((p) => ({ ...p, [rid]: 0 }));
      setComment((p) => ({ ...p, [rid]: "" }));
      setImages((p) => ({ ...p, [rid]: [] }));
      router.push(productLink(it));
    } catch (e: any) {
      alert(e?.message || "Không gửi được đánh giá.");
    } finally {
      setPosting((p) => ({ ...p, [rid]: false }));
    }
  }

  /* ===== Cập nhật địa chỉ vào đơn ===== */
  async function updateOrderAddress(addr: { receiver: string; phone: string; address: string }) {
    if (!order) return;
    const r = await fetch(`${API}/api/orders/${order._id}/address`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ address: addr }),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e?.message || "Không cập nhật được địa chỉ đơn hàng.");
    }
    await reloadOrder(order._id);
  }

  function openSelectAddress() {
    if (!order) return;
    const idx = Math.max(0, addresses.findIndex((a) => a.isDefault));
    setPickIdx(addresses.length ? (idx >= 0 ? idx : 0) : -1);
    setShowSelectAddr(true);
  }

  async function applyPickedAddress() {
    if (pickIdx < 0 || !addresses[pickIdx]) { setShowSelectAddr(false); openEditAddress(); return; }
    const ad = addresses[pickIdx];
    try {
      await updateOrderAddress({
        receiver: (ad.receiver || "").trim(),
        phone: (ad.phone || "").trim(),
        address: (ad.address || "").trim(),
      });
      setShowSelectAddr(false);
    } catch (e: any) {
      alert(e?.message || "Không cập nhật được địa chỉ.");
    }
  }

  function openEditAddress() {
    if (!order) return;
    setAddrForm({
      receiver: order.address?.receiver || "",
      phone: order.address?.phone || "",
      address: order.address?.address || "",
    });
    setShowAddrModal(true);
  }

  // validate + lưu địa chỉ bằng JS
  async function saveAddressOnOrder(e: React.FormEvent) {
    e.preventDefault();
    const f = {
      receiver: (addrForm.receiver || "").trim(),
      phone: (addrForm.phone || "").trim(),
      address: (addrForm.address || "").trim(),
    };
    if (!f.receiver) return alert("Vui lòng nhập người nhận.");
    if (!/^0\d{9}$/.test(f.phone)) return alert("Số điện thoại phải bắt đầu bằng 0 và đủ 10 số.");
    if (!f.address) return alert("Vui lòng nhập địa chỉ.");

    try {
      setSavingAddr(true);
      await updateOrderAddress(f);
      setShowAddrModal(false);
    } catch (err: any) {
      alert(err?.message || "Có lỗi khi cập nhật địa chỉ.");
    } finally {
      setSavingAddr(false);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { setShowSelectAddr(false); setShowAddrModal(false);} };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function handleLocate() {
    if (!("geolocation" in navigator)) return alert("Trình duyệt không hỗ trợ định vị.");
    setLocating(true);
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(async ({ coords }) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`);
            const data: any = await res.json();
            if (data && typeof data.display_name === "string") {
              setAddrForm((prev) => ({ ...prev, address: data.display_name }));
              resolve();
            } else reject(new Error("Không thể lấy địa chỉ."));
          } catch { reject(new Error("Không thể lấy địa chỉ.")); }
        }, () => reject(new Error("Không thể lấy vị trí.")));
      });
    } catch (e: any) {
      alert(e?.message || "Không thể lấy vị trí hiện tại.");
    } finally {
      setLocating(false);
    }
  }

  /* ===== RENDER ===== */
  if (loading) return (
    <div className="odr"><div className="odr-container"><div className="odr-card center">Đang tải chi tiết đơn hàng…</div></div></div>
  );
  if (!order) return (
    <div className="odr"><div className="odr-container"><div className="odr-card">
      Không tìm thấy đơn hàng.
      <div className="odr-actions" style={{marginTop:12}}>
        <Link href="/user/account/order" className="btn outline">← Về danh sách đơn hàng</Link>
      </div>
    </div></div></div>
  );

  const k = normalize(order.status);
  const idx = stepIndex(order.status);
  const cancelled = k === "cancelled";
  const canEditAddress = k === "pending";
  const canRate = k === "completed";

  const subtotal = calcSubtotal(order.items || []);
  const discount = calcVoucherDiscount(subtotal, order.voucher || undefined);
  const shipping  = Number(order.shippingFee) || 0;
  const computedTotal = Math.max(0, subtotal - discount + shipping);
  const finalTotal    = Number(order.total ?? computedTotal);

  const isVNPay = (order.paymentType || "").toLowerCase().includes("vnpay");
  const isPaid  = order.paymentStatus === "paid";
  const treatedAsPaid = isVNPay && isPaid;
  const paid = treatedAsPaid ? finalTotal : 0;
  const due  = Math.max(0, finalTotal - paid);

  return (
    <div className="odr">
      <div className="odr-container">
        {/* Header của TRANG chi tiết đơn */}
        <div className="odr-header">
          <div className="odr-breadcrumb">
            <Link href="/user">Trang chủ</Link> <span>/</span>
            <Link href="/user/account/order">Đơn hàng</Link> <span>/</span> Chi tiết
          </div>
          <div className="odr-headrow">
            <div className="left">
              <div className="row">Mã đơn: <span className="pill">#{codeView(order)}</span></div>
              <div className="row">Ngày đặt: <b>{order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "—"}</b></div>
            </div>
            <div className="right"><span className={`status tag-${k}`}>{LABELS[k] || "Chờ xác nhận"}</span></div>
          </div>
        </div>

        {/* Timeline */}
        {cancelled ? (
          <div className="odr-cancelled"><div className="icon">✖</div><div className="text">Đơn hàng đã huỷ</div></div>
        ) : (
          <div className="timeline">
            {STEPS.map((s, i) => {
              const done = i < idx, current = i === idx;
              return (
                <div key={s.key} className={`t-step ${done ? "done" : current ? "current" : "todo"}`}>
                  <div className="dot" /><div className="label">{s.label}</div>{i < STEPS.length - 1 && <div className="line" />}
                </div>
              );
            })}
          </div>
        )}

        {/* 12 columns */}
        <div className="grid12">
          <div className="odr-card col-6">
            <h3>Thông tin nhận hàng</h3>
            <div className="kv"><span>Người nhận</span><b>{order.address?.receiver || "—"}</b></div>
            <div className="kv"><span>Số điện thoại</span><b>{order.address?.phone || "—"}</b></div>
            <div className="kv"><span>Địa chỉ</span><b>{order.address?.address || "—"}</b></div>
            {order.note && <div className="kv"><span>Ghi chú</span><b>{order.note}</b></div>}

            {canEditAddress && (
              <div className="odr-actions-inline" style={{ marginTop: 12 }}>
                <button className="btn tiny outline" onClick={openSelectAddress}>Thay đổi</button>
              </div>
            )}
          </div>

          <div className="odr-card col-6">
            <h3>Thanh toán</h3>
            <div className="kv right"><span>Hình thức</span><b>{(order.paymentType || "—").toUpperCase()}</b></div>
            <div className="money">
              <div className="row"><span>Tạm tính</span><span>{VND(subtotal)}</span></div>
              <div className="row"><span>Giảm giá {order.voucher?.code ? `(${order.voucher.code})` : ""}</span><span className="minus">- {VND(discount)}</span></div>
              <div className="row"><span>Phí vận chuyển</span><span>{VND(shipping)}</span></div>
              {treatedAsPaid ? (
                <>
                  <div className="row"><span>Đã thanh toán (VNPay)</span><span>{VND(paid)}</span></div>
                  <div className="row total"><span>Còn phải thu</span><span>{VND(due)}</span></div>
                </>
              ) : (
                <div className="row total"><span>Tổng thanh toán</span><span>{VND(finalTotal)}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* Items + rating */}
        <div className="odr-card">
          <h3>Sản phẩm trong đơn</h3>
          <div className="items">
            {(order.items || []).map((it) => {
              const open = !!openForm[it._id] && canRate;
              const imgs = images[it._id] || [];
              return (
                <article className="item" key={it._id}>
                  <img className="thumb" src={imgSrc(it.image)} alt={it.name} />
                  <div className="meta">
                    <div className="name">{it.name}</div>
                    <div className="sub">
                      {it.colorName && <span>Màu: {it.colorName}</span>}
                      {it.sizeName && <span>• Size: {it.sizeName}</span>}
                      <span>• SL: {it.quantity}</span>
                    </div>
                  </div>
                  <div className="price">{VND((it.price || 0) * (it.quantity || 0))}</div>

                  <div className="act">
                    <Link className="btn outline tiny" href={productLink(it)}>Xem sản phẩm</Link>
                    {canRate && <button className="btn tiny" onClick={() => setOpenForm(p => ({...p, [it._id]: !p[it._id]}))}>Đánh giá sản phẩm</button>}
                  </div>

                  {open && (
                    <div className="rate-box">
                      <div className="rate-row">
                        <span className="lbl">Đánh giá</span>
                        <div className="stars" onMouseLeave={() => setRating(p => ({ ...p, [it._id]: p[it._id] || 0 }))}>
                          {[1,2,3,4,5].map(s=>(
                            <button key={s} type="button" className={`star ${(rating[it._id]||0) >= s ? "filled":""}`} onClick={()=>setRating(p=>({...p,[it._id]:s}))} aria-label={`${s} sao`}>★</button>
                          ))}
                        </div>
                      </div>
                      <label className="rate-row col">
                        <span className="lbl">Nội dung</span>
                        <textarea value={comment[it._id] || ""} onChange={(e)=>setComment(p=>({...p,[it._id]:e.target.value}))} placeholder="Chia sẻ trải nghiệm của bạn…" />
                      </label>
                      <div className="rate-row col">
                        <span className="lbl">Hình ảnh (tối đa 4)</span>
                        <input type="file" accept="image/*" multiple onChange={(e)=>{ const f = Array.from(e.target.files||[]).slice(0,4) as File[]; setImages(p=>({...p,[it._id]:f})); }} />
                        {!!imgs.length && <div className="previews">{imgs.map((f,i)=>(<img key={i} src={URL.createObjectURL(f)} onLoad={(e)=>URL.revokeObjectURL((e.target as HTMLImageElement).src)} alt={`preview-${i}`} />))}</div>}
                      </div>
                      <div className="rate-actions">
                        <button className="btn outline tiny" onClick={()=>setOpenForm(p=>({...p,[it._id]:false}))} disabled={posting[it._id]}>Hủy</button>
                        <button className="btn tiny" onClick={()=>handleSend(it)} disabled={posting[it._id]}>{posting[it._id] ? "Đang gửi…" : "Gửi đánh giá"}</button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        <div className="odr-actions">
          <Link className="btn outline" href="/user/account/order">← Về danh sách đơn hàng</Link>
        </div>
      </div>

      {/* ===== Modal CHỌN địa chỉ ===== */}
      {showSelectAddr && (
        <div className="odr-overlay" role="dialog" aria-modal="true" onClick={(e)=>{ if(e.target===e.currentTarget) setShowSelectAddr(false); }}>
          <div className="odr-modal">
            <div className="odr-modal-head">
              <div className="odr-modal-title">Chọn địa chỉ nhận hàng</div>
              <button type="button" className="odr-modal-close" onClick={()=>setShowSelectAddr(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="odr-modal-body">
              <div className="kv current-address" style={{marginBottom:12}}>
                <span>Địa chỉ hiện tại</span>
                <b>{order.address?.receiver || "—"} - {order.address?.phone || "—"} | {order.address?.address || "—"}</b>
              </div>

              {addresses.length === 0 ? (
                <div className="kv">Bạn chưa có địa chỉ. Hãy <b>tự nhập</b> ở bên dưới.</div>
              ) : (
                <div className="addr-list">
                  {addresses.map((ad, i) => (
                    <label key={ad._id || i} className={`addr-item ${pickIdx === i ? "active" : ""}`}>
                      <input className="addr-radio" type="radio" checked={pickIdx === i} onChange={()=>setPickIdx(i)} />
                      <div className="addr-meta">
                        <div className="addr-top">{ad.receiver} - {ad.phone}</div>
                        <div className="addr-desc">{ad.address}</div>
                        {ad.isDefault && <span className="badge">Mặc định</span>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="odr-modal-actions">
              <button type="button" className="btn outline" onClick={()=>setShowSelectAddr(false)}>Huỷ</button>
              <div style={{ display:"flex", gap:8 }}>
                <button type="button" className="btn outline" onClick={()=>{ setShowSelectAddr(false); openEditAddress(); }}>Tự nhập địa chỉ</button>
                <button type="button" className="btn" onClick={applyPickedAddress}>Cập nhật vào đơn</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal TỰ NHẬP địa chỉ ===== */}
      {showAddrModal && (
        <div className="odr-overlay" role="dialog" aria-modal="true" onClick={(e)=>{ if(e.target===e.currentTarget) setShowAddrModal(false); }}>
          <form className="odr-modal" onSubmit={saveAddressOnOrder}>
            <div className="odr-modal-head">
              <div className="odr-modal-title">Cập nhật địa chỉ đơn hàng</div>
              <button type="button" className="odr-modal-close" onClick={()=>setShowAddrModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="odr-modal-body">
              <label className="odr-field">
                <span>Người nhận</span>
                <input type="text" value={addrForm.receiver} onChange={(e)=>setAddrForm({...addrForm, receiver: e.target.value})}/>
              </label>

              <label className="odr-field">
                <span>Số điện thoại</span>
                <input type="tel" inputMode="numeric" value={addrForm.phone} onChange={(e)=>setAddrForm({...addrForm, phone: e.target.value})}/>
              </label>

              <label className="odr-field">
                <span>Địa chỉ</span>
                <div className="odr-address-line">
                  <input type="text" value={addrForm.address} onChange={(e)=>setAddrForm({...addrForm, address: e.target.value})}/>
                  <button type="button" className="btn tiny outline" onClick={handleLocate} disabled={locating}>
                    {locating && <span className="spinner" style={{marginRight:6}}/>}
                    Vị trí hiện tại
                  </button>
                </div>
              </label>
            </div>

            <div className="odr-modal-actions">
              <button type="button" className="btn outline" onClick={()=>setShowAddrModal(false)}>Huỷ</button>
              <button type="submit" className="btn" disabled={savingAddr}>{savingAddr ? "Đang lưu…" : "Cập nhật"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
