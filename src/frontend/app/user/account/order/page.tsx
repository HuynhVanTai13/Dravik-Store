'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import '@/public/css/orders.css';

/* ================= Types ================= */
type OrderItem = {
  productId?: string | { _id: string };
  name: string;
  image: string;
  price: number;
  quantity: number;
  sizeId?: string;
  colorId?: string;
  sizeName?: string;
  colorName?: string;
};
type Order = {
  _id: string;
  orderCode?: string;
  createdAt: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipping'
    | 'completed'
    | 'cancelled'
    | 'success'
    | string;
  items: OrderItem[];
  total?: number;
  shippingFee?: number;
  discount?: number;
};

type SizeRef = string | { _id?: string; name?: string };
type VariantSize = { size: SizeRef; quantity?: number; sold?: number; isActive?: boolean };
type Variant = { color?: string | { _id?: string; name?: string }; isActive?: boolean; sizes?: VariantSize[] };
type Product = { _id: string; isActive?: boolean; variants?: Variant[] };

/* ================= Helpers ================= */
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã tiếp nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  completed: 'Thành công',
  cancelled: 'Đã huỷ',
  success: 'Thành công',
};
const STATUS_CLASS: Record<string, string> = {
  pending: 'pending',
  confirmed: 'confirmed',
  processing: 'processing',
  shipping: 'shipping',
  completed: 'completed',
  cancelled: 'cancelled',
  success: 'completed',
};
const normalizeStatus = (s: string) => {
  const key = (s || '').toLowerCase().trim();
  if (['success'].includes(key)) return 'completed';
  return STATUS_LABEL[key] ? key : 'pending';
};
const statusClass = (s: string) => `status-pill ${STATUS_CLASS[normalizeStatus(s)]}`;
const formatVND = (n: number) => (n || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const calcTotal = (o: Order) => {
  const sub = (o.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  const fee = Number(o.shippingFee) || 0;
  const dc = Number(o.discount) || 0;
  return sub + fee - dc;
};

const idOf = (x: any) =>
  x && typeof x === 'object' && x._id ? String(x._id) : typeof x === 'string' ? x : undefined;
const nameOfSize = (x?: SizeRef) => (x && typeof x === 'object' && x.name ? String(x.name) : undefined);
const leftQty = (s?: VariantSize) => Math.max(0, Number(s?.quantity || 0) - Number(s?.sold || 0));

function matchVariantAndSize(product: Product | undefined, item: OrderItem) {
  if (!product) return { variant: undefined as Variant | undefined, size: undefined as VariantSize | undefined };
  const variants = product.variants || [];
  if (!variants.length) return { variant: undefined, size: undefined };

  const wantedColorId = item.colorId ? String(item.colorId) : undefined;
  let variant: Variant | undefined = wantedColorId
    ? variants.find((v) => idOf(v.color) === wantedColorId)
    : undefined;

  if (!variant && item.colorName) {
    const cname = item.colorName.toLowerCase().trim();
    variant = variants.find((v) => {
      const n = typeof v.color === 'object' && v.color?.name ? String(v.color.name) : undefined;
      return n && n.toLowerCase().trim() === cname;
    });
  }

  let size: VariantSize | undefined;
  if (item.sizeId || item.sizeName) {
    const wantedSizeId = item.sizeId ? String(item.sizeId) : undefined;
    const wantedSizeName = item.sizeName ? item.sizeName.toLowerCase().trim() : undefined;
    const pool = variant ? (variant.sizes || []) : variants.flatMap((v) => v.sizes || []);
    size = pool.find((sz) =>
      wantedSizeId
        ? idOf(sz.size) === wantedSizeId
        : wantedSizeName
        ? nameOfSize(sz.size)?.toLowerCase().trim() === wantedSizeName
        : false
    );
  }
  return { variant, size };
}
const isOrderItemAvailable = (item: OrderItem, product?: Product) => {
  if (!product) return false;
  const prodActive = product.isActive !== false;
  const variants = product.variants || [];
  if (!variants.length) return prodActive;

  const { variant, size } = matchVariantAndSize(product, item);
  if (item.sizeId || item.sizeName) {
    const sActive = size?.isActive !== false;
    return !!(prodActive && sActive && leftQty(size) > 0);
  }
  const pool = variant ? (variant.sizes || []) : variants.flatMap((v) => v.sizes || []);
  return !!(prodActive && pool.some((s) => s?.isActive !== false && leftQty(s) > 0));
};

/* ================= Page ================= */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState<string>('change_mind');
  const [reasonText, setReasonText] = useState<string>('');
  const [cancelSuccessOpen, setCancelSuccessOpen] = useState(false);

  const [stockLoading, setStockLoading] = useState(false);
  const [allInStockByOrder, setAllInStockByOrder] = useState<Record<string, boolean>>({});

  // ====== Load-more state
  const PAGE_SIZE = 5;
  const [showLimit, setShowLimit] = useState<number>(PAGE_SIZE);

  const getUserId = () => {
    try {
      const direct = localStorage.getItem('userId') || localStorage.getItem('userid');
      if (direct) return direct;
      const s = localStorage.getItem('userInfo') || localStorage.getItem('user');
      if (!s) return null;
      const obj = JSON.parse(s);
      return obj?._id || null;
    } catch {
      return null;
    }
  };

  const uniqueProductIdsFromOrders = (list: Order[]) => {
    const set = new Set<string>();
    list.forEach((o) =>
      (o.items || []).forEach((it) => {
        const pid = typeof it.productId === 'string' ? it.productId : it.productId?._id;
        if (pid) set.add(String(pid));
      })
    );
    return Array.from(set);
  };

  const fetchProductsMap = async (ids: string[]) => {
    const map = new Map<string, Product>();
    await Promise.all(
      ids.map(async (id) => {
        try {
          const r = await fetch(`${API}/api/products/${id}`, { credentials: 'include' });
          if (r.ok) {
            const j = await r.json();
            const prod: Product = j?.product || j;
            if (prod && prod._id) map.set(String(prod._id), prod);
          }
        } catch {}
      })
    );
    return map;
  };

  const computeAllInStockMap = async (list: Order[]) => {
    setStockLoading(true);
    try {
      const ids = uniqueProductIdsFromOrders(list);
      const prodMap = await fetchProductsMap(ids);
      const result: Record<string, boolean> = {};
      list.forEach((o) => {
        const anyOk = (o.items || []).some((it) => {
          const pid = typeof it.productId === 'string' ? it.productId : it.productId?._id;
          const prod = pid ? prodMap.get(String(pid)) : undefined;
          return isOrderItemAvailable(it, prod);
        });
        result[o._id] = anyOk;
      });
      setAllInStockByOrder(result);
    } finally {
      setStockLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const uid = getUserId();
      if (!uid) {
        setOrders([]);
        setAllInStockByOrder({});
        return;
      }
      const r = await fetch(`${API}/api/orders/user/${uid}`, { credentials: 'include' });
      let list: Order[] = [];
      if (r.ok) {
        const j = await r.json();
        list = (Array.isArray(j?.orders) ? j.orders : Array.isArray(j) ? j : []) as Order[];
      }
      setOrders(list);
      await computeAllInStockMap(list);
    } catch {
      setOrders([]);
      setAllInStockByOrder({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (/(^user(Id)?$|^user(info)?$|^userid$|token|accessToken)/i.test(e.key)) {
        fetchOrders();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lọc theo trạng thái
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return (orders || []).filter((o) => normalizeStatus(o.status) === normalizeStatus(statusFilter));
  }, [orders, statusFilter]);

  // Reset showLimit khi đổi lọc hoặc khi danh sách thay đổi
  useEffect(() => {
    setShowLimit(PAGE_SIZE);
  }, [statusFilter, orders]);

  const visible = filtered.slice(0, showLimit);
  const remaining = Math.max(0, filtered.length - visible.length); // ✅ dòng lỗi đã được sửa

  const openCancelPopup = (id: string) => {
    setCancelingId(id);
    setReasonCode('change_mind');
    setReasonText('');
    setCancelOpen(true);
  };
  const confirmCancel = async () => {
    if (!cancelingId) return;
    try {
      const res = await fetch(`${API}/api/orders/${cancelingId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reasonCode, reasonText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Huỷ đơn thất bại');
      setOrders((prev) => (prev || []).map((o) => (o._id === cancelingId ? { ...o, status: 'cancelled' } : o)));
      setCancelOpen(false);
      setCancelSuccessOpen(true);
    } catch (e) {
      alert((e as Error).message || 'Huỷ đơn thất bại!');
    }
  };

  // ====== Re-order (giữ nguyên)
  const onReorder = async (orderId: string, currentStatus: string) => {
    const st = normalizeStatus(currentStatus);
    if (st !== 'completed') return;
    if (allInStockByOrder[orderId] === false) {
      alert('Tất cả sản phẩm trong đơn đã hết hàng hoặc không còn biến thể phù hợp để mua lại.');
      return;
    }
    try {
      let items: OrderItem[] | null = null;
      try {
        const r = await fetch(`${API}/api/orders/${orderId}/reorder`, { method: 'POST', credentials: 'include' });
        if (r.ok) {
          const j = await r.json();
          if (Array.isArray(j?.items)) items = j.items as OrderItem[];
        }
      } catch {}
      if (!items) {
        const r2 = await fetch(`${API}/api/orders/${orderId}`, { credentials: 'include' });
        const j2 = await r2.json();
        if (!r2.ok || !j2?._id) throw new Error('Không lấy được thông tin đơn hàng.');
        items = Array.isArray(j2.items) ? (j2.items as OrderItem[]) : [];
      }
      if (!items.length) {
        alert('Đơn hàng không có sản phẩm để mua lại.');
        return;
      }
      const productCache = new Map<string, Product>();
      const getProduct = async (pid: string) => {
        if (productCache.has(pid)) return productCache.get(pid)!;
        const r = await fetch(`${API}/api/products/${pid}`, { credentials: 'include' });
        const j = await r.json();
        const prod: Product = j?.product || j;
        if (prod && prod._id) productCache.set(String(prod._id), prod);
        return prod;
      };
      const availList = await Promise.all(
        items.map(async (it) => {
          const pid = typeof it.productId === 'string' ? it.productId : it.productId?._id;
          if (!pid) return 0;
          const prod = await getProduct(String(pid));
          if (!prod || prod.isActive === false) return 0;
          const { variant, size } = matchVariantAndSize(prod, it);
          if (it.sizeId || it.sizeName) return Math.max(0, leftQty(size));
          const pool = variant ? (variant.sizes || []) : (prod.variants || []).flatMap((v) => v.sizes || []);
          const sum = pool.reduce((acc, s) => (s?.isActive === false ? acc : acc + leftQty(s)), 0);
          return Math.max(0, sum || Number.POSITIVE_INFINITY);
        })
      );
      const mapped = items
        .map((it, idx) => {
          const bought = Number(it.quantity) || 1;
          const available = Number.isFinite(availList[idx]) ? (availList[idx] as number) : bought;
          const finalQty = Math.max(0, Math.min(bought, available));
          return {
            productId: typeof it.productId === 'string' ? it.productId : it.productId?._id,
            name: it.name,
            image: it.image,
            price: Number(it.price) || 0,
            quantity: finalQty,
            sizeId: it.sizeId || undefined,
            sizeName: it.sizeName || undefined,
            colorId: it.colorId || undefined,
            colorName: it.colorName || undefined,
          };
        })
        .filter((x) => x.quantity > 0);
      if (!mapped.length) {
        alert('Tất cả sản phẩm trong đơn đã hết hàng hoặc không còn tồn kho phù hợp.');
        return;
      }
      localStorage.setItem('payment_products', JSON.stringify(mapped));
      localStorage.removeItem('payment_voucher');
      window.location.href = '/user/payment';
    } catch {
      alert('Mua lại thất bại!');
    }
  };

  const uid = getUserId();

  /* ================= Render ================= */
  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Trang chủ</Link> /{' '}
        <span className="current">
          <Link href="/user/order" style={{ color: '#2c2929ff' }}>Đơn hàng</Link>
        </span>
      </nav>

      <div className="account-container container-12">
        {/* Sidebar */}
        <aside className="account-sidebar">
          <h3>Trang tài khoản</h3>
          <p>Xin chào, <span className="hl">{uid ? 'bạn' : 'Khách'}</span></p>
          <ul>
            <li><Link href="/user/account">Thông tin tài khoản</Link></li>
            <li><Link href="/user/account/order" className="active">Đơn hàng của bạn</Link></li>
            <li><Link href="/user/account/changepassword">Đổi mật khẩu</Link></li>
            <li><Link href="/user/account/address">Địa chỉ</Link></li>
          </ul>
        </aside>

        {/* Orders */}
        <section className="orders-cards">
          <div className="orders-top">
            <h2>Đơn hàng của bạn</h2>
            <div className="order-filter">
              <label>Lọc trạng thái:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">Tất cả</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã tiếp nhận</option>
                <option value="processing">Đang xử lý</option>
                <option value="shipping">Đang giao</option>
                <option value="completed">Thành công</option>
                <option value="cancelled">Đã huỷ</option>
              </select>
            </div>
          </div>

          {!uid ? (
            <div className="empty">
              <p className="muted">Bạn cần đăng nhập để xem đơn hàng.</p>
              <Link href="/user/login" className="btn">Đăng nhập</Link>
            </div>
          ) : loading ? (
            <div className="empty"><p className="muted">Đang tải đơn hàng…</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <img src="/images/empty-order.svg" alt="empty" />
              <p className="muted">Chưa có đơn hàng nào.</p>
              <Link href="/user" className="btn">Tiếp tục mua sắm</Link>
            </div>
          ) : (
            <>
              {visible.map((o) => {
                const total = typeof o.total === 'number' ? o.total : calcTotal(o);
                const st = normalizeStatus(o.status);
                const allOk = allInStockByOrder[o._id];

                return (
                  <article className="order-card" key={o._id}>
                    <div className="order-header">
                      <div className="head-left">
                        <div className="row">
                          <span className="label">Mã đơn:</span>
                          <Link href={`/user/account/order/${o._id}`} className="code">
                            #{o.orderCode || o._id}
                          </Link>
                        </div>
                        <div className="row">
                          <span className="label">Ngày đặt:</span>
                          <span>{new Date(o.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="row">
                          <span className="label">Trạng thái:</span>
                          <span className={statusClass(o.status)}>
                            {STATUS_LABEL[normalizeStatus(o.status)] || 'Chờ xác nhận'}
                          </span>
                        </div>
                      </div>

                      <div className="head-right detail-float">
                        <Link className="btn tiny outline" href={`/user/account/order/${o._id}`}>
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>

                    <div className="product-list">
                      {(o.items || []).map((it, idx) => (
                        <div className="product-item" key={idx}>
                          <img
                            src={
                              it.image?.startsWith('http')
                                ? it.image
                                : `http://localhost:5000${it.image?.startsWith('/') ? '' : '/'}${it.image || ''}`
                            }
                            alt={it.name}
                            className="thumb"
                            onError={(e) => ((e.target as HTMLImageElement).src = '/images/placeholder.png')}
                          />
                          <div className="meta">
                            <div className="name" title={it.name}>{it.name}</div>
                            <div className="attrs">
                              {it.colorName && <span>Màu: {it.colorName}</span>}
                              {it.sizeName && <span>Size: {it.sizeName}</span>}
                              <span>SL: {it.quantity}</span>
                            </div>
                          </div>
                          <div className="price">{formatVND((it.price || 0) * (it.quantity || 0))}</div>
                        </div>
                      ))}
                    </div>

                    <div className="order-footer">
                      <div className="total">
                        <span className="label">Tổng:</span>
                        <strong>{formatVND(total)}</strong>
                      </div>
                      <div className="actions">
                        <button
                          className="btn tiny danger"
                          onClick={() => openCancelPopup(o._id)}
                          disabled={st !== 'pending'}
                          title={st === 'pending' ? 'Huỷ đơn hàng này' : 'Chỉ huỷ được đơn Chờ xác nhận'}
                        >
                          Huỷ đơn hàng
                        </button>

                        {st === 'completed' && (
                          allOk === false ? (
                            <button className="btn tiny outline" disabled title="Tất cả sản phẩm trong đơn đã hết hàng">
                              Hết hàng
                            </button>
                          ) : (
                            <button
                              className="btn tiny outline"
                              onClick={() => onReorder(o._id, o.status)}
                              disabled={stockLoading}
                              title={stockLoading ? 'Đang kiểm tra tồn kho...' : 'Thêm sản phẩm của đơn này sang trang thanh toán'}
                            >
                              Mua lại
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* ====== Nút Xem thêm (mỗi lần +5) ====== */}
              {remaining > 0 && (
                <div className="orders-loadmore">
                  <button
                    className="btn outline"
                    onClick={() => setShowLimit((n) => n + PAGE_SIZE)}
                    title={`Hiển thị thêm 5 đơn (còn ${remaining} đơn)`}
                  >
                    Xem thêm ({remaining} đơn)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Popup huỷ */}
      {cancelOpen && (
        <div className="odr-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
          <div className="odr-popup">
            <div className="odr-title" id="cancel-title">Bạn chắc chắn muốn huỷ đơn hàng này?</div>

            <div className="odr-subtitle">Vui lòng chọn lý do huỷ:</div>
            <div className="odr-reasons">
              {['change_mind','wrong_item','add_more','slow_shipping','better_price','other'].map((code) => (
                <label key={code} className="odr-reason">
                  <input
                    type="radio"
                    name="cancelReason"
                    checked={reasonCode === code}
                    onChange={() => setReasonCode(code)}
                  />
                  <span>
                    {code === 'change_mind' ? 'Đổi ý, không muốn mua nữa'
                      : code === 'wrong_item' ? 'Đặt nhầm sản phẩm / sai biến thể'
                      : code === 'add_more' ? 'Muốn thêm/đổi sản phẩm trong đơn'
                      : code === 'slow_shipping' ? 'Thời gian giao hàng lâu'
                      : code === 'better_price' ? 'Tìm được giá tốt hơn ở nơi khác'
                      : 'Lý do khác'}
                  </span>
                </label>
              ))}
            </div>

            <label className="odr-input">
              <div className="odr-subtitle">Nhập thêm lý do (không bắt buộc):</div>
              <textarea
                placeholder="Ví dụ: muốn đổi màu/size, đặt nhầm địa chỉ, v.v."
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
              />
            </label>

            <div className="odr-actions">
              <button className="btn odr-cancel" onClick={() => setCancelOpen(false)}>Quay lại</button>
              <button className="btn odr-danger" onClick={confirmCancel}>Xác nhận huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup: Huỷ thành công */}
      {cancelSuccessOpen && (
        <div className="odr-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-ok-title">
          <div className="odr-popup small">
            <div className="odr-title" id="cancel-ok-title">Bạn đã huỷ đơn hàng thành công</div>
            <div className="odr-actions center">
              <button className="btn" onClick={() => setCancelSuccessOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
