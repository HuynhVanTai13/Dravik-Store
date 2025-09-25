"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../../../public/css/cart.css";

/* ===== Types ===== */
interface CartItem {
  _id?: string;
  productId: any;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  quantity: number;
  sizeId?: string;
  colorId?: string;
  sizeName?: string;
  colorName?: string;
}
interface CartData { _id: string; user_id: string; items: CartItem[]; }
interface VoucherForUser {
  _id: string; code: string; description?: string;
  type: "fixed" | "percent"; discount: number;
  minOrderValue?: number; maxDiscount?: number;
  remainingForUser: number | "Infinity"; displayRemaining: string;
  canSelect: boolean; disabledReason?: "minOrder" | null;
}

/* ===== Helpers ===== */
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const VND = (n: number) => n.toLocaleString("vi-VN") + " đ";
const LS_CHECKED = "cart_checked_ids";
const itemKey = (i: CartItem) =>
  `${(i.productId?._id || i.productId) ?? ""}|${i.colorId ?? ""}|${i.sizeId ?? ""}`;

/* tồn kho cho biến thể */
type StockMeta = { left: number; active: boolean };

export default function CartPage() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);

  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [checkAll, setCheckAll] = useState(false);

  const [voucherList, setVoucherList] = useState<VoucherForUser[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherForUser | null>(null);
  const [validateMsg, setValidateMsg] = useState<string | null>(null);
  const [showVoucher, setShowVoucher] = useState(false);

  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const [stockMap, setStockMap] = useState<Record<string, StockMeta>>({});

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";

  /* ----- Load cart ----- */
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/api/cart/${userId}`);
        const data = await res.json();
        setCart(data || null);
      } catch { setCart(null); } finally { setLoading(false); }
    })();
  }, [userId]);

  /* ----- Tải meta tồn kho theo từng item ----- */
  useEffect(() => {
    if (!cart?.items?.length) { setStockMap({}); return; }

    const load = async () => {
      const byPid = new Map<string, CartItem[]>();
      for (const it of cart.items) {
        const pid = String(it.productId?._id || it.productId || "");
        if (!byPid.has(pid)) byPid.set(pid, []);
        byPid.get(pid)!.push(it);
      }
      const newMap: Record<string, StockMeta> = {};

      const fetchProduct = async (pid: string) => {
        const urls = [`${API}/api/products/${pid}`, `${API}/api/products/id/${pid}`];
        for (const u of urls) {
          try {
            const r = await fetch(u);
            if (!r.ok) continue;
            const j = await r.json();
            return j?.product || j;
          } catch {}
        }
        return null;
      };

      for (const [pid, items] of byPid.entries()) {
        const product = await fetchProduct(pid);
        for (const it of items) {
          const key = itemKey(it);
          if (!product) { newMap[key] = { left: Number.MAX_SAFE_INTEGER, active: true }; continue; }
          const variant = (product.variants || []).find((v: any) => String(v.color?._id || v.color) === String(it.colorId));
          const sizeRow = variant?.sizes?.find((s: any) => String(s.size?._id || s.size) === String(it.sizeId));
          const qty = Number(sizeRow?.quantity || 0);
          const sold = Number(sizeRow?.sold || 0);
          const left = Math.max(0, qty - sold);
          const isActive = product.isActive !== false && (variant?.isActive !== false) && (sizeRow?.isActive !== false);
          newMap[key] = { left, active: isActive };
        }
      }
      setStockMap(newMap);
    };

    load();
  }, [cart?.items]);

  /* ----- Restore & sync chọn sp ----- */
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(LS_CHECKED) || "[]"); if (Array.isArray(s)) setCheckedItems(s);} catch {} }, []);
  const availableIds = useMemo(() => (cart?.items || [])
    .filter(i => { const m = stockMap[itemKey(i)]; return m ? m.active && m.left > 0 : true; })
    .map(i => i._id!), [cart?.items, stockMap]);

  useEffect(() => { setCheckedItems(prev => prev.filter(id => availableIds.includes(id))); }, [availableIds]);

  useEffect(() => {
    localStorage.setItem(LS_CHECKED, JSON.stringify(checkedItems));
    const chosen = checkedItems.filter(id => availableIds.includes(id)).length;
    setCheckAll(availableIds.length > 0 && chosen === availableIds.length);
  }, [checkedItems, availableIds]);

  /* ----- Tính tiền ----- */
  const selectedItems = useMemo(() => {
    const ids = new Set(availableIds);
    return cart?.items.filter(i => i && ids.has(i._id!) && checkedItems.includes(i._id!)) || [];
  }, [cart, checkedItems, availableIds]);

  const total = useMemo(() => selectedItems.reduce((s, i) => s + i.price * i.quantity, 0), [selectedItems]);

  const discountValue = useMemo(() => {
    if (!selectedVoucher || !selectedVoucher.canSelect) return 0;
    let d = selectedVoucher.type === "fixed" ? selectedVoucher.discount : Math.floor(total * (selectedVoucher.discount / 100));
    if (selectedVoucher.maxDiscount && selectedVoucher.maxDiscount > 0) d = Math.min(d, selectedVoucher.maxDiscount);
    return Math.max(0, d);
  }, [selectedVoucher, total]);

  const totalAfterDiscount = Math.max(0, total - discountValue);

  /* ----- Voucher ----- */
  const loadVouchers = async () => {
    if (!userId) return setVoucherList([]);
    try {
      const url = new URL(`${API}/api/promotion/for-user`);
      url.searchParams.set("userId", userId);
      url.searchParams.set("total", String(total || 0));
      const r = await fetch(url.toString());
      const data = await r.json();
      const items: VoucherForUser[] = Array.isArray(data?.items) ? data.items : [];
      setVoucherList(items);
      if (selectedVoucher && !items.find(v => v.code === selectedVoucher.code)?.canSelect) setSelectedVoucher(null);
    } catch { setVoucherList([]); }
  };
  useEffect(() => { if (showVoucher) loadVouchers(); }, [showVoucher, total]);

  /* ----- Actions ----- */
  const changeQty = async (item: CartItem, delta: number) => {
    if (!cart) return;
    const meta = stockMap[itemKey(item)];
    if (meta && (!meta.active || meta.left <= 0)) return;
    const wanted = Math.max(1, item.quantity + delta);
    const maxLeft = Math.max(1, meta?.left ?? 1);
    const newQty = Math.min(Math.max(1, wanted), maxLeft);
    if (newQty === item.quantity) return;

    try {
      await fetch(`${API}/api/cart/update-qty`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: cart.user_id,
          productId: item.productId._id || item.productId,
          sizeId: item.sizeId,
          colorId: item.colorId,
          quantity: newQty,
        }),
      });
      setCart({
        ...cart,
        items: cart.items.map(i =>
          (i.productId._id || i.productId) === (item.productId._id || item.productId) &&
          i.sizeId === item.sizeId && i.colorId === item.colorId
            ? { ...i, quantity: newQty }
            : i
        ),
      });
    } catch {}
  };

  const handleCheckItem = (id: string) =>
    setCheckedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCheckAll = () => { if (!cart?.items?.length) return; setCheckedItems(checkAll ? [] : availableIds); };

  const askRemoveOne = (id: string) => setRemoveTargetId(id);

  const removeOneConfirmed = async () => {
    if (!cart || !removeTargetId) return;
    const item = cart.items.find(i => i._id === removeTargetId); if (!item) return;
    try {
      await fetch(`${API}/api/cart/remove-item`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: cart.user_id,
          productId: item.productId._id || item.productId,
          sizeId: item.sizeId,
          colorId: item.colorId,
        }),
      });
      setCart({ ...cart, items: cart.items.filter(i => i._id !== removeTargetId) });
      setCheckedItems(prev => prev.filter(id => id !== removeTargetId));
      setToast("Đã xoá sản phẩm."); setTimeout(() => setToast(null), 2000);
    } catch {}
    setRemoveTargetId(null);
  };

  const removeSelected = async () => {
    if (!cart) return;
    const list = cart.items.filter(i => checkedItems.includes(i._id!));
    if (!list.length) return;
    try {
      await Promise.all(list.map(item => fetch(`${API}/api/cart/remove-item`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: cart.user_id,
          productId: item.productId._id || item.productId,
          sizeId: item.sizeId,
          colorId: item.colorId,
        }),
      })));
      setCart({ ...cart, items: cart.items.filter(i => !checkedItems.includes(i._id!)) });
      setCheckedItems([]);
      setToast("Đã xoá các sản phẩm đã chọn."); setTimeout(() => setToast(null), 2000);
    } catch {}
    setConfirmRemoveAll(false);
  };

  /* ----- Voucher apply / checkout ----- */
  const openVoucher = () => { setShowVoucher(true); setValidateMsg(null); };
  const applySelected = async () => {
    if (!selectedVoucher || !selectedVoucher.canSelect) return;
    try {
      const r = await fetch(`${API}/api/promotion/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: selectedVoucher.code, userId, total }),
      });
      const data = await r.json();
      if (!r.ok || data?.ok !== true) { setValidateMsg(data?.message || "Không áp dụng được mã này"); return; }
      setValidateMsg(null);
      setShowVoucher(false);
      setToast(`Đã áp dụng mã ${selectedVoucher.code}`); setTimeout(() => setToast(null), 1500);
    } catch { setValidateMsg("Không áp dụng được mã này"); }
  };

  const goCheckout = () => {
    if (!cart) return;
    const selected = cart.items.filter(i => checkedItems.includes(i._id!));
    if (!selected.length) return;

    localStorage.setItem("payment_products", JSON.stringify(selected));
    localStorage.setItem("payment_total", totalAfterDiscount.toString());
    localStorage.setItem("payment_from", "cart");

    if (selectedVoucher) {
      const p = {
        code: selectedVoucher.code, type: selectedVoucher.type, discount: selectedVoucher.discount,
        maxDiscount: selectedVoucher.maxDiscount ?? 0, minOrderValue: selectedVoucher.minOrderValue ?? 0,
        description: selectedVoucher.description ?? "", startDate: (selectedVoucher as any).startDate ?? null,
        endDate: (selectedVoucher as any).endDate ?? null, active: true,
      };
      localStorage.setItem("payment_voucher", JSON.stringify(p));
    } else localStorage.removeItem("payment_voucher");

    window.location.href = "/user/payment";
  };

  /* ----- UI ----- */
  if (loading) return <div className="cart-main"><div className="grid-12"><div className="col-12">Đang tải giỏ hàng…</div></div></div>;
  if (!userId) return <div className="cart-main"><div className="grid-12"><div className="col-12">Bạn chưa đăng nhập.</div></div></div>;
  if (!cart || cart.items.length === 0)
    return (
      <div className="cart-main">
        <div className="grid-12">
          <div className="col-12 empty-text">Giỏ hàng trống.</div>
          <div className="col-12"><Link href="/" className="btn-primary">Tiếp tục mua sắm</Link></div>
        </div>
      </div>
    );

  return (
    <div className="cart-main">
      <nav className="breadcrumb">
        <Link href="/">Trang chủ</Link> /{' '}
        <span className="current">
          <Link href="/user/cart" style={{ color: '#2c2929ff' }}>Giỏ hàng</Link>
        </span>
      </nav>
      <div className="grid-12">
        

        <div className="col-8 md-col-12"><h1 className="cart-title">Giỏ hàng của bạn</h1></div>
        <div className="col-4 md-col-12 cart-actions-right">
          <button className="cart-remove-all danger" onClick={() => setConfirmRemoveAll(true)} disabled={checkedItems.length === 0}>
            Xoá đã chọn
          </button>
        </div>

        <div className="col-12 cart-selectall">
          <input
            className="cart-checkall"
            type="checkbox"
            checked={checkAll}
            onChange={handleCheckAll}
            disabled={availableIds.length === 0}
            title={availableIds.length === 0 ? "Không có sản phẩm còn hàng để chọn" : ""}
          />
          <span>Chọn tất cả</span>
          <span className="cart-selected-count">{checkedItems.length} / {cart.items.length} sản phẩm</span>
        </div>

        <div className="col-12">
          {cart.items.map((item) => {
            const meta = stockMap[itemKey(item)];
            const isUnavailable = !!meta && (!meta.active || meta.left <= 0);
            const plusDisabled = isUnavailable || (!!meta && item.quantity >= Math.max(1, meta.left));
            const minusDisabled = isUnavailable || item.quantity <= 1;

            return (
              <div className={`cart-row grid-12 ${isUnavailable ? "cart-row-oos" : ""}`} key={item._id}>
                <div className="col-1 col-center">
                  <input
                    type="checkbox"
                    className="cart-checkbox"
                    checked={checkedItems.includes(item._id!)}
                    onChange={() => handleCheckItem(item._id!)}
                    disabled={isUnavailable}
                    title={isUnavailable ? "Sản phẩm đã hết hàng / tạm ẩn" : ""}
                  />
                </div>

                <div className="col-2 col-center">
                  <div className="cart-img-wrap oos-dimmable">
                    {isUnavailable && <span className="cart-oos-badge">Hết hàng</span>}
                    <img
                      className="cart-img"
                      src={ item.image?.startsWith("http") ? item.image : `${API}${item.image}` }
                      alt={item.name}
                      onError={(e: any) => { e.target.onerror = null; e.target.src = "/no-image.png"; }}
                    />
                  </div>
                </div>

                <div className="col-5 cart-info oos-dimmable">
                  <div className="cart-product-name">{item.name}</div>
                  <div className="cart-variant">
                    {item.colorName && <span>Màu: {item.colorName}</span>}
                    {item.sizeName  && <span> • Size: {item.sizeName}</span>}
                    {meta && meta.left > 0 && <span className="cart-max-note"> • Tối đa: {meta.left}</span>}
                  </div>
                </div>

                <div className="col-2 cart-price-block oos-dimmable">
                  {item.oldPrice && <div className="cart-old-price">{VND(item.oldPrice)}</div>}
                  <div className="cart-price">{VND(item.price)}</div>
                </div>

                <div className="col-1 cart-qty-block oos-dimmable">
                  <div className="qty-control" aria-disabled={isUnavailable}>
                    <button onClick={() => changeQty(item, -1)} className="qty-btn" type="button" aria-label="Giảm" disabled={minusDisabled}>−</button>
                    <input value={item.quantity} readOnly className="qty-input" disabled={isUnavailable} />
                    <button onClick={() => changeQty(item, 1)} className="qty-btn" type="button" aria-label="Tăng" disabled={plusDisabled}>+</button>
                  </div>
                </div>

                {/* Nút xoá: LUÔN rõ, không bị mờ kể cả khi hết hàng */}
                <div className="col-1 col-end">
                  <button className="cart-delete-btn" onClick={() => askRemoveOne(item._id!)}>Xoá</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======= Thanh sticky bám đáy ======= */}
      <div className="cart-sticky-bar" role="region" aria-label="Thanh toán nhanh">
        <div className="cart-sticky-left">
          Đã chọn <b>{checkedItems.length}</b> / {availableIds.length} sản phẩm
        </div>

        <div className="cart-sticky-right">
          <button className="cart-sticky-voucher" onClick={openVoucher}>
            {selectedVoucher ? selectedVoucher.code : "Chọn mã"}
          </button>

        <div className="cart-sticky-total">
            <b>Tổng:</b>&nbsp;{VND(totalAfterDiscount)}
            {discountValue > 0 && <small>&nbsp;(-{VND(discountValue)})</small>}
          </div>

          <button
            className="cart-sticky-checkout"
            onClick={goCheckout}
            disabled={checkedItems.length === 0}
          >
            Thanh toán ({checkedItems.length || 0})
          </button>
        </div>
      </div>

      {/* ===== POPUP VOUCHER ===== */}
      {showVoucher && (
        <div className="voucher-popup-overlay" onClick={() => setShowVoucher(false)}>
          <div className="voucher-popup" onClick={(e) => e.stopPropagation()}>
            <div className="voucher-popup-header">
              <span>MÃ GIẢM GIÁ</span>
              <button onClick={() => setShowVoucher(false)} aria-label="Đóng">×</button>
            </div>

            <div className="voucher-popup-list">
              {voucherList.length === 0 && <div className="px-4 py-8 text-center text-gray-500">Không có mã phù hợp</div>}
              {voucherList.map((vc) => {
                const disabled = !vc.canSelect;
                const selected = selectedVoucher?.code === vc.code;
                return (
                  <label key={vc._id} className={`voucher-popup-item ${selected ? "selected" : ""} ${disabled ? "unavailable" : ""}`} title={vc.description || ""}>
                    <input type="radio" name="voucher" disabled={disabled} checked={selected} onChange={() => !disabled && setSelectedVoucher(vc)} />
                    <div>
                      <div className="voucher-popup-code">
                        {vc.code} <span className="ml-2 text-xs text-gray-600">Còn lại: {vc.displayRemaining}</span>
                      </div>
                      {vc.description && <div className="voucher-popup-desc">{vc.description}</div>}
                      {vc.minOrderValue ? <div className="voucher-popup-condition">Áp dụng đơn tối thiểu {VND(vc.minOrderValue)}</div> : <div className="voucher-popup-condition">Không yêu cầu đơn tối thiểu</div>}
                      {vc.type === "percent"
                        ? <div className="voucher-popup-condition">Giảm {vc.discount}%{vc.maxDiscount ? ` (tối đa ${VND(vc.maxDiscount)})` : ""}</div>
                        : <div className="voucher-popup-condition">Giảm {VND(vc.discount)}</div>}
                    </div>
                  </label>
                );
              })}
            </div>

            {validateMsg && <div className="px-4 py-2 text-red-600 text-sm">{validateMsg}</div>}

            <div className="voucher-popup-actions">
              <button className="voucher-popup-apply" onClick={applySelected} disabled={!selectedVoucher || !selectedVoucher.canSelect}>
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm xoá 1 / xoá đã chọn */}
      {confirmRemoveAll && (
        <div className="popup-overlay"><div className="popup-box">
          <h3>Bạn muốn xoá {checkedItems.length} sản phẩm đã chọn?</h3>
          <div className="popup-actions">
            <button className="popup-cancel" onClick={() => setConfirmRemoveAll(false)}>Huỷ</button>
            <button className="popup-delete" onClick={removeSelected}>Xoá</button>
          </div>
        </div></div>
      )}
      {removeTargetId && (
        <div className="popup-overlay"><div className="popup-box">
          <h3>Bạn có muốn xoá sản phẩm này?</h3>
          <div className="popup-actions">
            <button className="popup-cancel" onClick={() => setRemoveTargetId(null)}>Huỷ</button>
            <button className="popup-delete" onClick={removeOneConfirmed}>Xoá</button>
          </div>
        </div></div>
      )}

      {toast && <div className="cart-toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}
