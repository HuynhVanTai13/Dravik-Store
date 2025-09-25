"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import "../../../public/css/payment.css";

/* ===== Types ===== */
interface Address {
  _id?: string;
  address: string;
  receiver: string;
  phone: string;
  isDefault: boolean;
}
interface CartItem {
  _id?: string;
  productId: string | { _id: string };
  name: string;
  image: string;
  price: number;
  quantity: number;
  sizeId?: string;
  sizeName?: string;
  colorId?: string;
  colorName?: string;
}
/** Voucher giống logic ở giỏ hàng */
interface Voucher {
  _id?: string;
  code: string;
  description?: string;
  type: "fixed" | "percent";
  discount: number;
  minOrderValue?: number;
  maxDiscount?: number;
  remainingForUser?: number | "Infinity";
  displayRemaining?: string;
  canSelect?: boolean;
  disabledReason?: "minOrder" | null;
  startDate?: string;
  endDate?: string;
  active?: boolean;
}
type PaymentMethod = { _id: string; method_name: string; active?: boolean };

/* ===== Constants & helpers ===== */
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const formatVND = (n: number) => n.toLocaleString("vi-VN") + " đ";
const today = new Date();
const fmtDate = (d?: string) => {
  if (!d) return "";
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
const toastDelay = (cb: () => void, ms = 4000) => setTimeout(cb, ms);

/* ===== Component ===== */
export default function PaymentPage() {
  const router = useRouter();

  /* ===== State: Address / Cart / Voucher ===== */
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [tempVoucherCode, setTempVoucherCode] = useState<string | null>(null);

  /* ===== State: Address modals ===== */
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [tempSelectedIdx, setTempSelectedIdx] = useState<number>(0);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressIdx, setEditingAddressIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Address>({
    receiver: "",
    phone: "",
    address: "",
    isDefault: false,
  });

  // ❗ State lỗi hiển thị chữ đỏ
  const [formErr, setFormErr] = useState<{ receiver?: string; phone?: string; address?: string }>({});

  /* ===== State: Payment from DB ===== */
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  /* ===== Misc ===== */
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [shippingFee, setShippingFee] = useState(0);

  const user_id =
    typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";

  /* ===== Focus refs ===== */
  const voucherTitleRef = useRef<HTMLDivElement>(null);
  const addressSelectTitleRef = useRef<HTMLDivElement>(null);
  const addressEditTitleRef = useRef<HTMLDivElement>(null);

  // refs cho từng input để focus khi lỗi
  const receiverRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  /* ===== Shipping fee theo địa chỉ ===== */
  const normalizeVN = (s: string) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  useEffect(() => {
    if (addresses.length > 0) {
      const raw = addresses[selectedAddressIdx]?.address || "";
      const addr = normalizeVN(raw);
      const inHCM =
        /(tp\.?\s*ho\s*chi\s*minh|tphcm|ho\s*chi\s*minh|hcmc|^hcm\b|\bhcm\b|ho\s*chi\s*minh\s*city)/.test(
          addr
        );
      setShippingFee(inHCM ? 20000 : 35000);
    } else setShippingFee(0);
  }, [selectedAddressIdx, addresses]);

  /* ===== Helper: xác định nguồn thanh toán ===== */
  const getPaymentFrom = () => {
    if (typeof window === "undefined") return "cart";
    const val = (localStorage.getItem("payment_from") || "").toLowerCase();
    return val === "buynow" ? "buyNow" : "cart";
  };

  /* ===== Load vouchers giống GIỎ HÀNG: /api/promotion/for-user ===== */
  async function loadVouchersForUser(subtotalForApi: number) {
    if (!user_id) {
      setVouchers([]);
      return;
    }
    setPromotionsLoading(true);
    try {
      const url = new URL(`${API}/api/promotion/for-user`);
      url.searchParams.set("userId", user_id);
      url.searchParams.set("total", String(subtotalForApi || 0));
      const r = await fetch(url.toString());
      const data = await r.json();
      const items: Voucher[] = Array.isArray(data?.items) ? data.items : [];
      setVouchers(items);

      if (voucher) {
        const found = items.find((v) => v.code === voucher.code);
        if (!found || found.canSelect === false) {
          setVoucher(null);
          try { localStorage.removeItem("payment_voucher"); } catch {}
        } else {
          const merged = { ...found, ...voucher };
          setVoucher(merged);
          try { localStorage.setItem("payment_voucher", JSON.stringify(merged)); } catch {}
        }
      }
    } catch {
      setVouchers([]);
    } finally {
      setPromotionsLoading(false);
    }
  }

  /* ===== Initial load ===== */
  useEffect(() => {
    if (user_id) {
      fetch(`${API}/api/users/${user_id}`)
        .then((res) => res.json())
        .then((data: unknown) => {
          const list = Array.isArray((data as { addresses?: Address[] })?.addresses)
            ? ((data as { addresses?: Address[] }).addresses as Address[])
            : [];
          setAddresses(list);
          const savedIdx = Number(localStorage.getItem("payment_address_index") || NaN);
          let effectiveIdx = list.findIndex((ad: Address) => ad.isDefault);
          if (!Number.isNaN(savedIdx) && savedIdx >= 0 && savedIdx < list.length)
            effectiveIdx = savedIdx;
          setSelectedAddressIdx(effectiveIdx >= 0 ? effectiveIdx : 0);
          setTempSelectedIdx(effectiveIdx >= 0 ? effectiveIdx : 0);
        });
    }

    const parsed = JSON.parse(localStorage.getItem("payment_products") || "[]") as unknown;
    setCartItems(Array.isArray(parsed) ? (parsed as CartItem[]) : []);
    if (!Array.isArray(parsed) || parsed.length === 0) router.push("/user/cart");

    const voucherLS = localStorage.getItem("payment_voucher");
    setVoucher(voucherLS ? (JSON.parse(voucherLS) as Voucher) : null);

    fetch(`${API}/api/payments`)
      .then((r) => r.json())
      .then((data: unknown) => {
        const arr = Array.isArray(data) ? (data as PaymentMethod[]) : [];
        setMethods(arr || []);
        const savedId = localStorage.getItem("payment_method_id");
        if (savedId && arr.some((m) => m._id === savedId)) setPaymentId(savedId);
        else if (arr?.length) setPaymentId(arr[0]._id);
      })
      .catch(() => setMethods([]));
  }, [user_id]);

  // persist selections
  useEffect(() => {
    if (addresses.length)
      localStorage.setItem("payment_address_index", String(selectedAddressIdx));
  }, [selectedAddressIdx, addresses.length]);
  useEffect(() => { if (paymentId) localStorage.setItem("payment_method_id", paymentId); }, [paymentId]);

  /* ===== Money ===== */
  const subtotal = useMemo(
    () => cartItems.reduce((s, it) => s + it.price * it.quantity, 0),
    [cartItems]
  );

  useEffect(() => { if (showVoucherModal) loadVouchersForUser(subtotal); }, [showVoucherModal, subtotal]);

  const isVoucherInDate = (v: Voucher) =>
    (!v.startDate || new Date(v.startDate) <= today) && (!v.endDate || today <= new Date(v.endDate));
  const isVoucherActive = (v: Voucher) => (v.active ?? true) && isVoucherInDate(v);
  const eligibleByTotal = (v: Voucher, st: number) => (v.minOrderValue ?? 0) <= st;

  const discountValue = useMemo(() => {
    if (!voucher) return 0;
    if (voucher.canSelect === false) return 0;
    if (!isVoucherActive(voucher) || !eligibleByTotal(voucher, subtotal)) return 0;

    let d = voucher.type === "fixed"
      ? voucher.discount
      : Math.floor(subtotal * (voucher.discount / 100));

    if (voucher.maxDiscount && voucher.maxDiscount > 0) d = Math.min(d, voucher.maxDiscount);
    return Math.max(0, d);
  }, [voucher, subtotal]);

  const finalTotal = Math.max(0, subtotal - discountValue + shippingFee);

  /* ===== Address actions ===== */
  const [showAddressToast, setShowAddressToast] = useState(false);
  const openSelectModal = () => { setTempSelectedIdx(selectedAddressIdx); setShowSelectModal(true); };
  const applySelectedAddress = () => {
    setSelectedAddressIdx(tempSelectedIdx);
    setShowSelectModal(false);
    setShowAddressToast(true);
    toastDelay(() => setShowAddressToast(false), 2000);
  };
  function openAddressModal(idx: number | null) {
    setShowAddressModal(true);
    setFormErr({});
    if (idx === null) {
      setEditingAddressIdx(null);
      setForm({ receiver: "", phone: "", address: "", isDefault: false });
    } else {
      setEditingAddressIdx(idx);
      setForm(addresses[idx]);
    }
  }
  const toastError = (msg: string) => { setErrorToast(msg); toastDelay(() => setErrorToast(null)); };

  // ✅ Validate bằng JS + hiển thị lỗi đỏ
  const validateAddressForm = (f: Address) => {
    const errs: { receiver?: string; phone?: string; address?: string } = {};
    if (!f.receiver || !f.receiver.trim()) errs.receiver = "Vui lòng nhập tên người nhận.";
    if (!/^0\d{9}$/.test((f.phone || "").trim())) errs.phone = "Số điện thoại phải bắt đầu bằng 0 và đủ 10 số.";
    if (!f.address || !f.address.trim()) errs.address = "Vui lòng nhập địa chỉ nhận hàng.";
    setFormErr(errs);

    // focus vào ô lỗi đầu tiên
    if (errs.receiver) receiverRef.current?.focus();
    else if (errs.phone) phoneRef.current?.focus();
    else if (errs.address) addressRef.current?.focus();

    return Object.keys(errs).length === 0;
  };

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!user_id) return;

    // Chặn submit nếu form lỗi
    if (!validateAddressForm(form)) return;

    try {
      let res: Response;
      if (editingAddressIdx === null) {
        res = await fetch(`${API}/api/users/${user_id}/addresses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch(`${API}/api/users/${user_id}/addresses/${addresses[editingAddressIdx]._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      const data: any = await res.json();
      const ok = data && !!data.success;
      if (ok) {
        const res2 = await fetch(`${API}/api/users/${user_id}`);
        const userData: any = await res2.json();
        const list = Array.isArray(userData?.addresses) ? (userData.addresses as Address[]) : [];
        setAddresses(list);
        const idx = list.findIndex((ad: Address) => ad.isDefault);
        const effectiveIdx = idx >= 0 ? idx : 0;
        setSelectedAddressIdx(effectiveIdx);
        setTempSelectedIdx(effectiveIdx);
        setShowAddressModal(false);
      } else {
        const msg = (data && typeof data.message === "string") ? data.message : "Có lỗi xảy ra!";
        toastError(msg);
      }
    } catch {
      toastError("Có lỗi mạng!");
    }
  }

  /* ===== Xóa item đã đặt khỏi giỏ (chỉ khi checkout từ giỏ) ===== */
  async function removeOrderedFromCart() {
    const from = getPaymentFrom();
    if (from !== "cart") return;

    if (!user_id || !cartItems?.length) return;
    try {
      await fetch(`${API}/api/cart/remove-selected`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          items: cartItems.map((i) => ({
            productId: typeof i.productId === "string" ? i.productId : i.productId?._id,
            sizeId: i.sizeId,
            colorId: i.colorId,
          })),
        }),
      });
    } catch (e) {
      console.error("bulk remove cart failed", e);
    }
  }

  /* ===== API trừ tồn kho ===== */
  type PurchaseItem = { productId: string; colorId?: string; sizeId?: string; quantity: number };
  async function applyPurchaseAPI(items: PurchaseItem[]) {
    const candidates = [
      `${API}/api/products/purchase/apply`,
      `${API}/api/purchase/apply`,
      `${API}/api/products/apply-purchase`,
    ];
    const payload = JSON.stringify({ items });
    let lastErr: unknown = null;

    for (const url of candidates) {
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
        if (r.ok) return r.json().catch(() => ({}));
        if (r.status === 404) continue;
        const d: any = await r.json().catch(() => ({}));
        const msg = d && typeof d.message === "string" ? d.message : `Lỗi ${r.status}`;
        throw new Error(msg);
      } catch (err) { lastErr = err; }
    }
    throw new Error("API trừ tồn kho chưa triển khai (404). Hãy thêm route POST /api/products/purchase/apply.");
  }

  /* ===== Place Order (COD | VNPay) ===== */
  const placeOrder = async () => {
    if (!user_id || !addresses[selectedAddressIdx]) {
      toastError("Vui lòng đăng nhập và chọn địa chỉ nhận hàng!");
      return;
    }
    if (!paymentId) { toastError("Vui lòng chọn phương thức thanh toán!"); return; }

    try {
      setLoading(true);

      const chosen = methods.find((m) => m._id === paymentId);
      const methodName = chosen?.method_name || "";

      // 1) Tạo đơn (pending + unpaid)
      const createRes = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          items: cartItems,
          address: addresses[selectedAddressIdx],
          voucher: discountValue > 0 ? voucher : null,
          shippingFee,
          total: finalTotal,
          note,
          paymentId,
          paymentType: methodName,
        }),
      });
      const createdJson: any = await createRes.json();
      const createdId = createdJson && typeof createdJson._id === "string" ? createdJson._id : undefined;
      if (!createRes.ok || !createdId) {
        const msg = createdJson && typeof createdJson.message === "string" ? createdJson.message : "Không tạo được đơn hàng";
        throw new Error(msg);
      }

      // 2) TRỪ TỒN KHO
      await applyPurchaseAPI(
        cartItems.map((i) => ({
          productId: typeof i.productId === "string" ? i.productId : (i.productId?._id as string),
          sizeId: i.sizeId,
          colorId: i.colorId,
          quantity: i.quantity,
        }))
      );

      // 3) Xoá item đã đặt khỏi giỏ — CHỈ khi đi từ giỏ
      await removeOrderedFromCart();

      // 4) Thanh toán
      const isVnpay = (methodName || "").toLowerCase().includes("vnpay");
      if (!isVnpay) {
        localStorage.removeItem("payment_products");
        localStorage.removeItem("payment_voucher");
        localStorage.removeItem("payment_from");
        router.push(`/user/payment-result?status=success&orderId=${createdId}`);
        return;
      }

      const r = await fetch(`${API}/api/payments/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalTotal, orderId: createdId }),
      });
      const dataJson: any = await r.json();
      const paymentUrl = dataJson && typeof dataJson.paymentUrl === "string" ? dataJson.paymentUrl : "";

      if (paymentUrl) {
        localStorage.removeItem("payment_products");
        localStorage.removeItem("payment_voucher");
        localStorage.removeItem("payment_from");
        window.location.href = paymentUrl;
      } else {
        throw new Error("Không tạo được phiên thanh toán VNPay.");
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Có lỗi khi đặt hàng.";
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ===== Voucher handlers ===== */
  const openVoucherModal = () => {
    setTempVoucherCode(voucher?.code ?? null);
    setShowVoucherModal(true);
  };

  const applyVoucher = async () => {
    if (!tempVoucherCode) return;
    const selected = vouchers.find((v) => v.code === tempVoucherCode) || null;
    if (!selected || selected.canSelect === false) {
      toastError("Mã không đủ điều kiện hoặc đã hết lượt.");
      return;
    }
    try {
      const r = await fetch(`${API}/api/promotion/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: selected.code, userId: user_id, total: subtotal }),
      });
      const data = await r.json();
      if (!r.ok || (data && data.ok !== true)) {
        const msg = (data && typeof data.message === "string") ? data.message : "Không áp dụng được mã này";
        toastError(msg);
        return;
      }
      setVoucher(selected);
      try { localStorage.setItem("payment_voucher", JSON.stringify(selected)); } catch {}
      setShowVoucherModal(false);
    } catch {
      toastError("Không áp dụng được mã này");
    }
  };

  const clearVoucher = () => {
    setVoucher(null);
    localStorage.removeItem("payment_voucher");
  };

  /* ===== Convenience ===== */
  const currentAddress = addresses[selectedAddressIdx];
  const canApplyVoucher = Boolean(tempVoucherCode) && !promotionsLoading;

  /* ===== UI ===== */
  return (
    <div className="payment-container">
      <div className="payment-main">
        {/* LEFT */}
        <div className="payment-col-left">
          {/* Address */}
          <div className="payment-box">
            <div className="payment-title">
              Địa chỉ nhận hàng
              {addresses.length > 0 && (
                <button className="payment-edit-btn" onClick={openSelectModal}>
                  Thay đổi
                </button>
              )}
            </div>

            {addresses.length === 0 ? (
              <div className="empty-inline">
                <span>Bạn chưa có địa chỉ nhận hàng.</span>
                <button className="payment-add-address-btn" onClick={() => openAddressModal(null)}>
                  + Thêm địa chỉ mới
                </button>
              </div>
            ) : (
              <div className="payment-address-item active no-pointer">
                <div className="payment-address-content">
                  <span className="payment-address-receiver">
                    {currentAddress.receiver} - {currentAddress.phone}
                  </span>
                  <span className="payment-address-desc">{currentAddress.address}</span>
                  {currentAddress.isDefault && (
                    <span className="payment-default-label">Mặc định</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Voucher */}
          <div className="payment-box">
            <div className="payment-title">
              Chọn mã giảm giá
              <div className="title-actions">
                {voucher ? (
                  <>
                    <button className="payment-edit-btn" onClick={openVoucherModal}>Thay đổi</button>
                    <button className="payment-cancel-btn" onClick={clearVoucher}>Xóa</button>
                  </>
                ) : (
                  <button className="payment-add-address-btn" onClick={openVoucherModal}>Chọn mã</button>
                )}
              </div>
            </div>

            {voucher ? (
              <div className="voucher-selected">
                <div className="voucher-code">{voucher.code}</div>
                <div className="voucher-texts">
                  <div className="voucher-line">
                    Ưu đãi:{" "}
                    <b>
                      {voucher.type === "fixed" ? `- ${formatVND(voucher.discount)}` : `- ${voucher.discount}%`}
                    </b>
                    {voucher.maxDiscount ? (
                      <span className="muted"> (tối đa {formatVND(voucher.maxDiscount)})</span>
                    ) : (
                      <span className="muted"> {voucher.type === "fixed" ? "(giảm trực tiếp)" : "(giảm theo %)"}</span>
                    )}
                  </div>
                  <div className="voucher-desc">
                    {voucher.minOrderValue ? `Áp dụng cho đơn từ ${formatVND(voucher.minOrderValue)}` : "Không yêu cầu giá trị tối thiểu"}
                    {(voucher.startDate || voucher.endDate) && (
                      <> • Hiệu lực {fmtDate(voucher.startDate)}–{fmtDate(voucher.endDate)}</>
                    )}
                    {!isVoucherActive(voucher) || !eligibleByTotal(voucher, subtotal) ? (
                      <span className="badge-error">Chưa đủ điều kiện hoặc mã hết hiệu lực</span>
                    ) : null}
                  </div>
                  {voucher.description && (
                    <div className="voucher-note"><b>Mô tả:</b> {voucher.description}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="voucher-empty">Chưa chọn mã giảm giá. Bấm <b>Chọn mã</b> để xem ưu đãi khả dụng.</div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="payment-box">
            <div className="payment-title">Phương thức thanh toán</div>
            <div className="paymethod-grid">
              {methods.map((m) => {
                const isActive = paymentId === m._id;
                const lower = (m.method_name || "").toLowerCase();
                const isVnpay = lower.includes("vnpay");
                const isCod = lower.includes("cod") || lower.includes("cash");

                return (
                  <label key={m._id} className={`method-card ${isActive ? "selected" : ""}`}>
                    <input type="radio" checked={isActive} onChange={() => setPaymentId(m._id)} name="paymentTypeCard" />
                    <div className="method-icon" aria-hidden>
                      {isCod ? (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="#1e3879" strokeWidth="1.7"/>
                          <rect x="4.5" y="9" width="6.8" height="3" rx="1" fill="#1e3879"/>
                        </svg>
                      ) : isVnpay ? (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                          <path d="M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="#1e3879" strokeWidth="1.7"/>
                          <rect x="3" y="5" width="18" height="4" fill="#1e3879"/>
                        </svg>
                      ) : (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="9" stroke="#1e3879" strokeWidth="1.7"/>
                          <path d="M7 12h10" stroke="#1e3879" strokeWidth="1.7" />
                        </svg>
                      )}
                    </div>
                    <div className="method-info">
                      <div className="method-name">{m.method_name}</div>
                      <div className="method-desc">
                        {isCod ? "Thanh toán khi nhận hàng, kiểm tra trước khi trả tiền." : isVnpay ? "Quét QR / thẻ nội địa, xử lý nhanh qua VNPAY." : "Phương thức thanh toán khác."}
                      </div>
                    </div>
                    <div className={`method-badge ${isVnpay ? "alt" : ""}`}>{isVnpay ? "Khuyến khích" : "Phổ biến"}</div>
                  </label>
                );
              })}
              {!methods.length && <div className="muted">Chưa có phương thức thanh toán.</div>}
            </div>
            <div className="method-footnote">* Có thể phát sinh phí cổng thanh toán với VNPay (nếu có).</div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="payment-col-right">
          <div className="payment-box">
            <div className="payment-title">Sản phẩm trong đơn</div>

            <div className="payment-cart-list">
              {cartItems.map((item, idx) => (
                <div className="payment-cart-row" key={item._id || idx}>
                  <img
                    className="payment-cart-img"
                    src={item.image?.startsWith("http") ? item.image : `${API}${item.image}`}
                    alt={item.name}
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                      const img = e.currentTarget; img.onerror = null; img.src = "/no-image.png";
                    }}
                  />
                  <div className="payment-cart-info">
                    <div className="payment-cart-name">{item.name}</div>
                    <div className="payment-cart-desc">
                      Số lượng: {item.quantity}
                      {item.colorName && (<><span> | Màu sắc: <b>{item.colorName}</b></span></>)}
                      {item.sizeName && (<><span> | Size: <b>{item.sizeName}</b></span></>)}
                    </div>
                  </div>
                  <div className="payment-cart-price">{formatVND(item.price)}</div>
                </div>
              ))}
            </div>

            <div className="payment-cart-summary">
              <div className="payment-cart-summary-row"><span>Tổng tiền hàng:</span><span>{formatVND(subtotal)}</span></div>
              <div className="payment-cart-summary-row"><span>Phí vận chuyển:</span><span>{formatVND(shippingFee)}</span></div>
              <div className="payment-cart-summary-row"><span>Giảm giá:</span><span>-{formatVND(discountValue)}</span></div>
              {discountValue > 0 && voucher && (
                <div className="payment-saved-note">Bạn đã tiết kiệm <b>{formatVND(discountValue)}</b> từ mã <b>{voucher.code}</b>.</div>
              )}
              <div className="payment-cart-summary-row payment-cart-summary-final"><span>Tổng tiền thanh toán:</span><span>{formatVND(finalTotal)}</span></div>
            </div>

            <div className="payment-note">
              <textarea placeholder="Ghi chú cho đơn hàng (không bắt buộc)" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <div className="payment-cart-btns">
              <button className="payment-pay-btn" disabled={loading} onClick={placeOrder}>
                {loading ? "Đang đặt hàng..." : "ĐẶT HÀNG"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Select Address Modal ===== */}
      {showSelectModal && (
        <div className="payment-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="address-select-title">
          <div className="payment-address-popup address-popup-size">
            <div className="payment-popup-title title-between" id="address-select-title" ref={addressSelectTitleRef} tabIndex={-1}>
              <span>Chọn địa chỉ nhận hàng</span>
              <button className="payment-add-address-btn" onClick={() => { setShowSelectModal(false); openAddressModal(null); }}>
                + Thêm địa chỉ mới
              </button>
            </div>

            <div className="address-select-list">
              {addresses.length === 0 ? (
                <div className="muted">Bạn chưa có địa chỉ. Hãy thêm mới.</div>
              ) : (
                addresses.map((ad, i) => (
                  <div key={i} className={`payment-address-item ${tempSelectedIdx === i ? "active" : ""}`} onClick={() => setTempSelectedIdx(i)}>
                    <label className="payment-radio-label">
                      <input type="radio" checked={tempSelectedIdx === i} onChange={() => setTempSelectedIdx(i)} />
                      <div className="payment-address-content">
                        <span className="payment-address-receiver">{ad.receiver} - {ad.phone}</span>
                        <span className="payment-address-desc">{ad.address}</span>
                        {ad.isDefault && (<span className="payment-default-label">Mặc định</span>)}
                      </div>
                    </label>
                    <button className="payment-edit-btn" onClick={(e) => { e.stopPropagation(); setShowSelectModal(false); openAddressModal(i); }}>
                      Sửa
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="payment-form-actions">
              <button type="button" className="payment-cancel-btn" onClick={() => setShowSelectModal(false)}>Huỷ</button>
              <button type="button" className="payment-save-btn" onClick={applySelectedAddress}>Cập nhật</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Create/Edit Address Modal ===== */}
      {showAddressModal && (
        <div className="payment-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="address-edit-title">
          <form className="payment-address-popup" onSubmit={handleSaveAddress}>
            <div className="payment-popup-title" id="address-edit-title" ref={addressEditTitleRef} tabIndex={-1}>
              {editingAddressIdx === null ? "Thêm địa chỉ mới" : "Cập nhật địa chỉ"}
            </div>

            <label>
              Người nhận
              <input
                ref={receiverRef}
                type="text"
                value={form.receiver}
                onChange={(e) => { setForm({ ...form, receiver: e.target.value }); if (formErr.receiver) setFormErr((p) => ({ ...p, receiver: "" })); }}
                aria-invalid={!!formErr.receiver}
                className={formErr.receiver ? "input-error" : undefined}
                style={formErr.receiver ? { borderColor: "#d64545", background: "#fff7f7" } : undefined}
              />
              {formErr.receiver && <small style={{ color: "#d64545" }}>{formErr.receiver}</small>}
            </label>

            <label>
              Số điện thoại
              <input
                ref={phoneRef}
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  setForm({ ...form, phone: e.target.value });
                  if (formErr.phone) setFormErr((p) => ({ ...p, phone: "" }));
                }}
                aria-invalid={!!formErr.phone}
                className={formErr.phone ? "input-error" : undefined}
                style={formErr.phone ? { borderColor: "#d64545", background: "#fff7f7" } : undefined}
                placeholder="Ví dụ: 0xxxxxxxxx"
              />
              {formErr.phone && <small style={{ color: "#d64545" }}>{formErr.phone}</small>}
            </label>

            <label>
              Địa chỉ
              <div className="address-line">
                <input
                  ref={addressRef}
                  type="text"
                  value={form.address}
                  onChange={(e) => { setForm({ ...form, address: e.target.value }); if (formErr.address) setFormErr((p) => ({ ...p, address: "" })); }}
                  aria-invalid={!!formErr.address}
                  className={formErr.address ? "input-error" : undefined}
                  style={formErr.address ? { borderColor: "#d64545", background: "#fff7f7" } : undefined}
                />
                <button
                  type="button"
                  className="payment-get-location-btn"
                  onClick={() => {
                    if (!navigator.geolocation) return setErrorToast("Trình duyệt không hỗ trợ định vị.");
                    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
                      try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`);
                        const data: any = await res.json();
                        if (data && typeof data.display_name === "string") {
                          setForm((prev) => ({ ...prev, address: data.display_name }));
                          setFormErr((p) => ({ ...p, address: "" }));
                        } else { setErrorToast("Không thể lấy địa chỉ."); }
                      } catch { setErrorToast("Không thể lấy địa chỉ."); }
                    }, () => setErrorToast("Không thể lấy vị trí."));
                  }}
                >
                  Vị trí hiện tại
                </button>
              </div>
              {formErr.address && <small style={{ color: "#d64545" }}>{formErr.address}</small>}
            </label>

            <label className="payment-default-checkbox">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              Đặt làm mặc định
            </label>

            <div className="payment-form-actions">
              <button type="button" className="payment-cancel-btn" onClick={() => setShowAddressModal(false)}>Huỷ</button>
              <button type="submit" className="payment-save-btn">{editingAddressIdx === null ? "Thêm mới" : "Cập nhật"}</button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Voucher Modal ===== */}
      {showVoucherModal && (
        <div className="payment-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="voucher-modal-title">
          <div className="payment-address-popup voucher-popup-size">
            <div className="payment-popup-title" id="voucher-modal-title" ref={voucherTitleRef} tabIndex={-1}>
              Chọn mã giảm giá
            </div>

            <div className="voucher-list">
              {promotionsLoading ? (
                <div className="voucher-loading"><div className="spinner" aria-label="Đang tải mã giảm giá" /> Đang tải mã giảm giá...</div>
              ) : vouchers.length === 0 ? (
                <div className="muted">Không có mã phù hợp</div>
              ) : (
                vouchers.map((v) => {
                  const active = isVoucherActive(v);
                  const eligible = eligibleByTotal(v, subtotal);
                  const canUse = (v.canSelect ?? (active && eligible));
                  const selected = tempVoucherCode === v.code;
                  return (
                    <label key={v._id || v.code} className={`voucher-item ${selected ? "selected" : ""} ${!canUse ? "disabled" : ""}`} title={v.description || ""}>
                      <input type="radio" name="voucher" checked={selected} onChange={() => setTempVoucherCode(v.code)} disabled={!canUse} />
                      <div className="voucher-meta">
                        <div className="voucher-head">
                          <div className="voucher-code">{v.code}</div>
                          <div className="voucher-discount">{v.type === "fixed" ? `- ${formatVND(v.discount)}` : `- ${v.discount}%`}{v.maxDiscount ? ` (tối đa ${formatVND(v.maxDiscount)})` : ""}</div>
                          {v.minOrderValue ? (
                            <span className="badge badge-min">Đơn tối thiểu {formatVND(v.minOrderValue)}</span>
                          ) : (
                            <span className="badge badge-min-ok">Không yêu cầu tối thiểu</span>
                          )}
                          {v.displayRemaining && (
                            <span className="badge badge-remaining">Còn lại: {v.displayRemaining}</span>
                          )}
                          {!active && (<span className="badge badge-expired">Hết hiệu lực</span>)}
                          {active && !eligible && (<span className="badge badge-warn">Chưa đủ điều kiện</span>)}
                        </div>
                        <div className="voucher-foot">
                          {v.startDate || v.endDate ? (
                            <>Hiệu lực {fmtDate(v.startDate)}–{fmtDate(v.endDate)}</>
                          ) : (
                            <>Áp dụng trong thời gian khuyến mãi</>
                          )}
                          {v.description && <> • {v.description}</>}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="payment-form-actions">
              <button type="button" className="payment-cancel-btn" onClick={() => setShowVoucherModal(false)}>Huỷ</button>
              <div className="action-right">
                <button type="button" className="payment-cancel-btn" onClick={() => { setTempVoucherCode(null); setVoucher(null); localStorage.removeItem("payment_voucher"); setShowVoucherModal(false); }}>
                  Bỏ chọn
                </button>
                <button type="button" className="payment-save-btn" onClick={applyVoucher} disabled={!canApplyVoucher}>
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {errorToast && (
        <div className="toast-error" role="alert">
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none" aria-hidden>
            <circle cx="24" cy="24" r="24" fill="#ffdddd" />
            <path d="M24 14v14M24 34h.01" stroke="#b54747" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span>{errorToast}</span>
        </div>
      )}
      {showAddressToast && (<div className="toast-ok" role="status">Đã cập nhật địa chỉ nhận hàng.</div>)}
    </div>
  );
}
