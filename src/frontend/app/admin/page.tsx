"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import "../../styles/dashboard.css";
import Revenue12MonthsChart from "@/components/admin/Revenue12MonthsChart";
import WeeklyRevenueChart from "@/components/admin/WeeklyRevenueChart";
import YearlyRevenueChart from "@/components/admin/YearlyRevenueChart";
import axios from "@/utils/axiosConfig";

/** ===== Types ===== */
// Bổ sung tên màu/size để hiển thị đúng ở danh sách sắp hết
type VariantSize = {
  quantity?: number;
  sold?: number;
  isActive?: boolean;
  size?: { name?: string } | string;
};
type Variant = {
  sizes?: VariantSize[];
  isActive?: boolean;
  color?: { name?: string } | string;
};
type Product = { _id: string; name: string; isActive?: boolean; variants?: Variant[] };

type Order = {
  _id: string;
  status?: string;
  createdAt?: string;

  // các field tổng tiền thường gặp (string hoặc number đều chấp nhận)
  total?: number | string;
  totalAmount?: number | string;
  finalAmount?: number | string;
  grandTotal?: number | string;
  amount?: number | string;
  totalPrice?: number | string;
  summaryTotal?: number | string;
  paymentTotal?: number | string;

  // các object lồng có total
  payment?: { total?: number | string } | null;
  pricing?: { total?: number | string } | null;
  invoice?: { total?: number | string } | null;
  summary?: { total?: number | string } | null;

  // cho phép key khác nhưng KHÔNG dùng any
  [key: string]: unknown;
};

// Products API có thể trả về items/data/products
type ProductsApiItems = { items: Product[]; total?: number };
type ProductsApiDataObj = { data: Product[]; total?: number };
type ProductsApiProducts = { products: Product[]; total?: number };
type ProductsApiData = ProductsApiItems | ProductsApiDataObj | ProductsApiProducts;

// Orders API có thể trả mảng trần hoặc đối tượng {data|orders}
type OrdersApiArray = Order[];
type OrdersApiDataObj = { data: Order[]; total?: number };
type OrdersApiOrdersObj = { orders: Order[]; total?: number };
type OrdersApiData = OrdersApiArray | OrdersApiDataObj | OrdersApiOrdersObj;

/** ===== Constants ===== */
const LOW_STOCK_LT = 5;   // < 5 (và > 0) là “sắp hết”
const STOCK_GTE   = 200;  // tổng tồn (đã clamp) >= 200 là “tồn kho”
const PAGE_SIZE   = 500;  // gom đủ mọi trang an toàn

/** ===== Helpers ===== */
const remainingOfSize = (s: VariantSize) =>
  Math.max(Number(s.quantity ?? 0) - Number(s.sold ?? 0), 0);

const totalRemainingOfProduct = (p: Product) =>
  (p.variants ?? []).reduce(
    (sumV, v) => sumV + (v.sizes ?? []).reduce((sumS, s) => sumS + remainingOfSize(s), 0),
    0
  );

// “Sắp hết” = có size nào còn >0 & < 5
const hasLowStock = (p: Product) =>
  (p.variants ?? []).some((v) =>
    (v.sizes ?? []).some((s) => {
      const left = remainingOfSize(s);
      return left > 0 && left < LOW_STOCK_LT;
    })
  );

// ===== Helpers: đọc name an toàn từ unknown =====
function hasName(x: unknown): x is { name?: string } {
  return typeof x === "object" && x !== null && "name" in (x as Record<string, unknown>);
}

// Lấy tên size (có thể là string hoặc object {name})
const sizeName = (s: VariantSize & { size?: unknown }): string => {
  const n = (s as { size?: unknown }).size;
  if (typeof n === "string") return n;
  if (hasName(n) && typeof n.name === "string") return n.name ?? "";
  return "";
};

// Lấy tên màu (có thể là string hoặc object {name})
const colorName = (v: Variant & { color?: unknown }): string => {
  const c = (v as { color?: unknown }).color;
  if (typeof c === "string") return c;
  if (hasName(c) && typeof c.name === "string") return c.name ?? "";
  return "";
};


// —— Type guards
const extractProducts = (payload: ProductsApiData): Product[] => {
  if ("items" in payload) return payload.items;
  if ("data" in payload) return payload.data;
  if ("products" in payload) return payload.products;
  return [];
};
const extractProductsTotal = (payload: ProductsApiData): number | undefined =>
  "total" in payload && typeof payload.total === "number" ? payload.total : undefined;

const extractOrders = (payload: OrdersApiData): Order[] => {
  if (Array.isArray(payload)) return payload;
  if ("data" in payload) return payload.data ?? [];
  if ("orders" in payload) return payload.orders ?? [];
  return [];
};

/** ===== Robust fetch helpers (gom đủ mọi trang) ===== */
async function fetchAllProducts(): Promise<{ list: Product[]; total: number }> {
  const firstRes = await axios.get<ProductsApiData>("/api/products", {
    params: { page: 1, limit: PAGE_SIZE, showHidden: "true" },
  });
  let list = extractProducts(firstRes.data);
  const total = extractProductsTotal(firstRes.data) ?? list.length;

  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages > 1) {
    const reqs: Promise<Product[]>[] = [];
    for (let p = 2; p <= pages; p++) {
      reqs.push(
        axios
          .get<ProductsApiData>("/api/products", {
            params: { page: p, limit: PAGE_SIZE, showHidden: "true" },
          })
          .then((r) => extractProducts(r.data))
          .catch(() => [])
      );
    }
    const rest = await Promise.all(reqs);
    for (const chunk of rest) list = list.concat(chunk);
  }
  return { list, total };
}

async function fetchAllOrders(): Promise<Order[]> {
  try {
    const first = await axios.get<OrdersApiData>("/api/orders", {
      params: { page: 1, limit: PAGE_SIZE },
    });
    let list = extractOrders(first.data);
    const total =
      (Array.isArray(first.data)
        ? list.length
        : "total" in first.data
        ? first.data.total ?? list.length
        : list.length) || list.length;
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages > 1) {
      const reqs: Promise<Order[]>[] = [];
      for (let p = 2; p <= pages; p++) {
        reqs.push(
          axios
.get<OrdersApiData>("/api/orders", { params: { page: p, limit: PAGE_SIZE } })
            .then((r) => extractOrders(r.data))
            .catch(() => [])
        );
      }
      const rest = await Promise.all(reqs);
      for (const chunk of rest) list = list.concat(chunk);
    }
    return list;
  } catch {
    try {
      const res = await axios.get<OrdersApiData>("/api/orders");
      return extractOrders(res.data);
    } catch {
      return [];
    }
  }
}

/** ===== Revenue helpers ===== */
// Lấy tổng tiền của 1 đơn (thử nhiều field phổ biến)
function getOrderAmount(o: Order): number {
  const tryKeys = [
    "total", "totalAmount", "finalAmount", "grandTotal", "amount", "totalPrice",
    "summaryTotal", "paymentTotal",
  ];
  for (const k of tryKeys) {
    const v = o?.[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  // Một số API gói trong object con
const nestedCandidates: Array<number | string | undefined> = [
  o.payment?.total,
  o.pricing?.total,
  o.invoice?.total,
  o.summary?.total,
];

for (const val of nestedCandidates) {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string" && val.trim() !== "" && !Number.isNaN(Number(val))) {
    return Number(val);
  }
}

  return 0;
}

// Bắt đầu tuần (Thứ 2, 00:00)
function startOfThisWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0..6 (CN..T7)
  const diff = (dow + 6) % 7; // số ngày lùi về thứ 2
  d.setDate(d.getDate() - diff);
  return d;
}
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfThisMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Định dạng tiền VND rút gọn (Nghìn/Triệu/tỷ)
function formatVNDCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n)); // làm tròn về đơn vị đồng

  const BILLION = 1_000_000_000;
  const MILLION = 1_000_000;
  const THOUSAND = 1_000;

  if (abs >= BILLION) {
    const ty = Math.floor(abs / BILLION);
    const trieu = Math.floor((abs % BILLION) / MILLION);
    const parts = [`${ty.toLocaleString("vi-VN")} tỷ`];
    if (trieu) parts.push(`${trieu.toLocaleString("vi-VN")} Triệu`);
    return `${sign}${parts.join(" ")}`;
  }

  if (abs >= MILLION) {
    const trieu = Math.floor(abs / MILLION);
    const nghin = Math.floor((abs % MILLION) / THOUSAND);
    const parts = [`${trieu.toLocaleString("vi-VN")} Triệu`];
    if (nghin) parts.push(`${nghin.toLocaleString("vi-VN")} Nghìn`);
    return `${sign}${parts.join(" ")}`;
  }

  if (abs >= THOUSAND) {
    const nghin = Math.floor(abs / THOUSAND);
    return `${sign}${nghin.toLocaleString("vi-VN")} Nghìn`;
  }

  return `${sign}${abs.toLocaleString("vi-VN")}`;
}

/** ===== Component ===== */
export default function AdminDashboard() {
  const [counts, setCounts] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    inStockProducts: 0, // >= 200
    pendingOrders: 0,
    todayOrders: 0,     // today & not cancelled
  });

  // NEW: state doanh thu
  const [revenue, setRevenue] = useState({
    allTime: 0,
    thisMonth: 0,
    thisWeek: 0,
    today: 0,
  });

  // NEW: danh sách sắp hết & tồn kho (động)
  const [lowStockList, setLowStockList] = useState<
    { id: string; name: string; total: number; combos: string[] }[]
  >([]);
  const [stockOverList, setStockOverList] = useState<
    { id: string; name: string; total: number }[]
  >([]);

  useEffect(() => {
    (async () => {
      try {
        // === PRODUCTS (gom đủ) ===
        const { list: products, total } = await fetchAllProducts();

        const totalProducts = total ?? products.length;
        const lowStockProducts = products.filter(hasLowStock).length;
        const inStockProducts = products.filter(
          (p) => totalRemainingOfProduct(p) >= STOCK_GTE
        ).length;

        // Chuẩn bị list chi tiết cho 2 khối
        const lowList: { id: string; name: string; total: number; combos: string[] }[] = [];
        const stockList: { id: string; name: string; total: number }[] = [];

        for (const p of products) {
          const totalRemain = totalRemainingOfProduct(p);

          // tồn kho >= ngưỡng
          if (totalRemain >= STOCK_GTE) {
            stockList.push({ id: p._id, name: p.name, total: totalRemain });
          }

          // gom các combo < 5 (và > 0) trong cùng 1 sản phẩm
          const combos: string[] = [];
          for (const v of p.variants ?? []) {
            for (const s of v.sizes ?? []) {
              const left = remainingOfSize(s);
              if (left > 0 && left < LOW_STOCK_LT) {
                const cn = colorName(v);
                const sn = sizeName(s);
                const label = (cn ? `${cn} ` : "") + (sn ? `${sn} ` : "") + `(${left})`;
                combos.push(label.trim());
              }
            }
          }
          if (combos.length > 0) {
            lowList.push({ id: p._id, name: p.name, total: totalRemain, combos });
          }
        }

        // sắp xếp nhẹ cho dễ nhìn
        lowList.sort((a, b) => a.total - b.total);   // ít -> nhiều
        stockList.sort((a, b) => b.total - a.total); // nhiều -> ít

        setLowStockList(lowList);
        setStockOverList(stockList);

        // === ORDERS (gom đủ) ===
        const orders = await fetchAllOrders();

        const pendingOrders = orders.filter(
          (o) => (o.status ?? "").toLowerCase() === "pending"
        ).length;

        // KHỐI DOANH THU — chỉ lấy đơn "completed"
        const completed = orders.filter(
          (o) => (o.status ?? "").toLowerCase() === "completed"
        );

        const startToday = startOfToday();
        const startWeek  = startOfThisWeek();
const startMonth = startOfThisMonth();
        const endNow     = new Date();

        let allTime = 0, thisMonth = 0, thisWeek = 0, today = 0;
        for (const o of completed) {
          const amt = getOrderAmount(o);
          allTime += amt;

          const created = o.createdAt ? new Date(o.createdAt) : null;
          if (!created) continue;

          if (created >= startMonth && created <= endNow) thisMonth += amt;
          if (created >= startWeek  && created <= endNow) thisWeek  += amt;
          if (created >= startToday && created <= endNow) today     += amt;
        }

        // Đơn tạo TRONG NGÀY (local) — tính TẤT CẢ trạng thái
const start = startToday;
const end   = new Date(start);
end.setDate(start.getDate() + 1);
const todayOrders = orders.filter((o) => {
  if (!o.createdAt) return false;
  const d = new Date(o.createdAt);
  return d >= start && d < end;
}).length;


        setCounts({
          totalProducts,
          lowStockProducts,
          inStockProducts,
          pendingOrders,
          todayOrders,
        });

        setRevenue({ allTime, thisMonth, thisWeek, today });
      } catch (err) {
        console.error("[Dashboard] load counts/revenue error:", err);
        setCounts({
          totalProducts: 0,
          lowStockProducts: 0,
          inStockProducts: 0,
          pendingOrders: 0,
          todayOrders: 0,
        });
        setRevenue({ allTime: 0, thisMonth: 0, thisWeek: 0, today: 0 });
        setLowStockList([]);
        setStockOverList([]);
      }
    })();
  }, []);

  // Links (để Products page auto bật filter đúng)
  const LINKS = {
    products: "/admin/products",
    lowStock: "/admin/products?lowStock=1",
    stockOver200: "/admin/products?stock=gte200",
    pendingOrders: "/admin/order?status=pending",
    todayOrders: "/admin/order?date=today",
  };
  const cardLinkStyle = { textDecoration: "none", color: "inherit" } as const;

  return (
    <main className="main-content" id="mainContent">
      {/* ===== Hoạt động cửa hàng ===== */}
      <section className="section-card store-activity">
        <h2 className="font-semibold" >Hoạt động cửa hàng</h2>
        <div className="activity-cards">
          <Link href={LINKS.products} style={cardLinkStyle}>
            <div className="activity-card" role="link">
              <div className="icon-wrapper primary-bg">
                <i className="fas fa-box-open" />
              </div>
              <div className="info">
                <span className="count">{counts.totalProducts}</span>
                <span className="label">Sản phẩm</span>
              </div>
            </div>
          </Link>

          <Link href={LINKS.lowStock} style={cardLinkStyle}>
            <div className="activity-card" role="link">
<div className="icon-wrapper warning-bg">
                <i className="fas fa-exclamation-triangle" />
              </div>
              <div className="info">
                <span className="count">{counts.lowStockProducts}</span>
                <span className="label">Sắp hết hàng</span>
              </div>
            </div>
          </Link>

          <Link href={LINKS.stockOver200} style={cardLinkStyle}>
            <div className="activity-card" role="link">
              <div className="icon-wrapper success-bg">
                <i className="fas fa-warehouse" />
              </div>
              <div className="info">
                <span className="count">{counts.inStockProducts}</span>
                <span className="label">Tồn kho</span>
              </div>
            </div>
          </Link>

          <Link href={LINKS.pendingOrders} style={cardLinkStyle}>
            <div className="activity-card" role="link">
              <div className="icon-wrapper info-bg">
                <i className="fas fa-clock" />
              </div>
              <div className="info">
                <span className="count">{counts.pendingOrders}</span>
                <span className="label">Chờ xác nhận</span>
              </div>
            </div>
          </Link>

          <Link href={LINKS.todayOrders} style={cardLinkStyle}>
            <div className="activity-card" role="link">
              <div className="icon-wrapper danger-bg">
                <i className="fas fa-handshake" />
              </div>
              <div className="info">
                <span className="count">{counts.todayOrders}</span>
                <span className="label">Tổng đơn hàng</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ===== Doanh thu (động & rút gọn) ===== */}
      <section className="section-card revenue-summary">
        <h2 className="font-semibold" >Doanh thu</h2>
        <div className="revenue-cards">
          <div className="revenue-card primary-border">
            <div className="icon-wrapper primary-text">
              <i className="fas fa-money-bill-wave" />
            </div>
            <div className="info">
              <span className="amount" style={{ whiteSpace: "nowrap" }}>
                {formatVNDCompact(revenue.allTime)}
              </span>
              <span className="label">Tổng doanh thu</span>
            </div>
          </div>
          <div className="revenue-card success-border">
            <div className="icon-wrapper success-text">
              <i className="fas fa-calendar-check" />
            </div>
            <div className="info">
              <span className="amount" style={{ whiteSpace: "nowrap" }}>
                {formatVNDCompact(revenue.thisMonth)}
              </span>
              <span className="label">Doanh thu tháng này</span>
            </div>
          </div>
<div className="revenue-card info-border">
            <div className="icon-wrapper info-text">
              <i className="fas fa-calendar-week" />
            </div>
            <div className="info">
              <span className="amount" style={{ whiteSpace: "nowrap" }}>
                {formatVNDCompact(revenue.thisWeek)}
              </span>
              <span className="label">Doanh thu tuần này</span>
            </div>
          </div>
          <div className="revenue-card danger-border">
            <div className="icon-wrapper danger-text">
              <i className="fas fa-calendar-day" />
            </div>
            <div className="info">
              <span className="amount" style={{ whiteSpace: "nowrap" }}>
                {formatVNDCompact(revenue.today)}
              </span>
              <span className="label">Doanh thu hôm nay</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card chart-section-full">
        <div className="chart-header">
          <h2 className="font-semibold">Thống kê doanh thu 12 tháng</h2>
          <div className="chart-controls">
            <select id="yearSelect">
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
            </select>
          </div>
        </div>
        <Revenue12MonthsChart />
      </section>

      {/* ===== Hai danh sách sản phẩm động ===== */}
      <section className="section-row product-status-row">
        {/* Sản phẩm sắp hết hàng */}
        <div className="section-card product-list-card">
          <h2 className="font-semibold">Sản phẩm sắp hết hàng</h2>
          <ul className="product-list">
  {lowStockList.map((item) => (
    <li key={item.id} className="flex justify-between gap-3">
      {/* Bên trái: Tên (hàng 1) + combos (hàng 2) */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" title={item.name}>
          {item.name}
        </div>
        <div
          className="text-sm text-gray-500 truncate"
          title={item.combos.join(", ")}
        >
          {item.combos.join(", ")}
        </div>
      </div>

      {/* Bên phải: badge số SP còn lại */}
      <span className="stock-badge danger whitespace-nowrap">
        Còn {item.total} SP
      </span>
    </li>
  ))}
  {lowStockList.length === 0 && (
    <li>
      <span>Không có sản phẩm sắp hết hàng</span>
    </li>
  )}
</ul>

        </div>

        {/* Sản phẩm tồn kho */}
        <div className="section-card product-list-card">
          <h2 className="font-semibold">Sản phẩm tồn kho</h2>
          <ul className="product-list">
            {stockOverList.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span
                  title={item.name}
style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {item.name}
                </span>
                <span className="stock-badge success">Còn {item.total} SP</span>
              </li>
            ))}
            {stockOverList.length === 0 && (
              <li>
                <span>Không có sản phẩm tồn kho</span>
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="section-row chart-section-row">
        <div className="section-card chart-card">
          <h2 className="font-semibold">Doanh thu theo tuần</h2>
          <div className="chart-container small-chart">
            <WeeklyRevenueChart />
          </div>
        </div>
        <div className="section-card chart-card">
          <h2 className="font-semibold">Doanh thu theo năm</h2>
          <div className="chart-container small-chart">
            <YearlyRevenueChart />
          </div>
        </div>
      </section>
    </main>
  );
}
