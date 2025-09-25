"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation"; // ✅ THÊM
import "@/styles/order.css";

/** ====== API ROOT ====== */
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/** ====== Kiểu dữ liệu ====== */
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
type Order = {
  _id: string;
  orderCode?: string;
  user_id?: string;
  items: OrderItem[];
  address?: Address;
  shippingFee?: number;
  total?: number;
  voucher?: any;
  note?: string;
  paymentType?: string;
  paymentStatus?: "unpaid" | "paid" | "failed";
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipping"
    | "completed"
    | "cancelled";
  createdAt?: string;
};

const STATUS_STEPS: Array<Order["status"]> = [
  "pending",
  "confirmed",
  "processing",
  "shipping",
  "completed",
];

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã tiếp nhận",
  processing: "Đang xử lý",
  shipping: "Đang vận chuyển",
  completed: "Giao hàng thành công",
  cancelled: "Hủy đơn hàng",
};

const BADGE_CLASS: Record<Order["status"], string> = {
  pending: "badge badge-pending",
  confirmed: "badge badge-confirmed",
  processing: "badge badge-processing",
  shipping: "badge badge-shipping",
  completed: "badge badge-completed",
  cancelled: "badge badge-cancelled",
};

const nextOf = (s: Order["status"]) => {
  const i = STATUS_STEPS.indexOf(s);
  if (i < 0) return undefined;
  return STATUS_STEPS[i + 1];
};

/** ====== Helpers ====== */
const codeView = (o: Order) =>
  (o.orderCode && o.orderCode.trim()) ||
  `DH${(o._id || "").slice(-6).toUpperCase()}`;

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("vi-VN") : "—";

// ✅ THÊM: helpers cho filter theo ngày hôm nay & đọc query truthy
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const isTruthyParam = (v: string | null) => {
  if (!v) return false;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "yes";
};

export default function OrderAdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | Order["status"]>("");

  // ✅ THÊM: đọc query để auto lọc theo link từ Dashboard
  const searchParams = useSearchParams();
  const router = useRouter();

  /** ====== Load data ====== */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/orders`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ Đồng bộ filterStatus từ URL (status=pending, confirmed,...)
  useEffect(() => {
    const s = (searchParams.get("status") || "").toLowerCase();
    const allowed: Order["status"][] = [
      "pending",
      "confirmed",
      "processing",
      "shipping",
      "completed",
      "cancelled",
    ];
    if (allowed.includes(s as Order["status"])) {
      setFilterStatus(s as Order["status"]);
    } else {
      setFilterStatus("");
    }
    // optional: reset search khi đổi link
    // setSearch("");
  }, [searchParams]);

  /** ====== Filter/Search ====== */
  const list = useMemo(() => {
    let data = [...orders];

    // 1) Filter theo trạng thái (nếu có)
    if (filterStatus) data = data.filter((o) => o.status === filterStatus);

    // 2) Filter theo query date=today & excludecancelled=1 (từ Dashboard)
    const dateParam = (searchParams.get("date") || "").toLowerCase();
    const excludeCancelled = isTruthyParam(searchParams.get("excludecancelled"));

    if (dateParam === "today") {
      const start = startOfToday();
      const end = new Date(start);
      end.setDate(start.getDate() + 1);

      data = data.filter((o) => {
        if (!o.createdAt) return false;
        const d = new Date(o.createdAt);
        if (excludeCancelled && (o.status || "").toLowerCase() === "cancelled") {
          return false;
        }
        return d >= start && d < end;
      });
    }

    // 3) Search đơn giản theo mã/điện thoại/tên
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(
        (o) =>
          codeView(o).toLowerCase().includes(q) ||
          (o.address?.phone || "").toLowerCase().includes(q) ||
          (o.address?.receiver || "").toLowerCase().includes(q)
      );
    }

    return data;
  }, [orders, filterStatus, search, searchParams]);

  /** ====== Update status (forward only) ====== */
  const updateStatus = async (id: string, next: Order["status"]) => {
    try {
      const res = await fetch(`${API}/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Update failed");

      setOrders((prev) =>
        prev.map((o) => (o._id === id ? (data.order || o) : o))
      );
    } catch (e: any) {
      alert(e?.message || "Không thể cập nhật trạng thái");
    }
  };

  return (
    <main className="main-content">
      <section className="section-card product-list-section">
        <div className="product-list-header">
          <h2>Danh sách đơn hàng</h2>
          <div className="header-actions">
            <div className="search-box-admin">
              <input
                placeholder="Nhập mã đơn / tên / SĐT cần tìm…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                aria-label="Tìm kiếm"
                onClick={() => {
                  // đồng bộ query 'q' lên URL cho đẹp (không bắt buộc)
                  const params = new URLSearchParams(
                    Array.from(searchParams.entries())
                  );
                  if (search.trim()) params.set("q", search.trim());
                  else params.delete("q");
                  router.replace(`/admin/order?${params.toString()}`);
                }}
              >
                <i className="fas fa-search" />
              </button>
            </div>

            <select
              className="status-filter"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as any);
                // đồng bộ lên URL để share link
                const params = new URLSearchParams(
                  Array.from(searchParams.entries())
                );
                const val = e.target.value;
                if (val) params.set("status", val);
                else params.delete("status");
                router.replace(`/admin/order?${params.toString()}`);
              }}
              title="Lọc trạng thái"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">{STATUS_LABEL.pending}</option>
              <option value="confirmed">{STATUS_LABEL.confirmed}</option>
              <option value="processing">{STATUS_LABEL.processing}</option>
              <option value="shipping">{STATUS_LABEL.shipping}</option>
              <option value="completed">{STATUS_LABEL.completed}</option>
              <option value="cancelled">{STATUS_LABEL.cancelled}</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="product-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã đơn hàng</th>
                <th>Tên khách hàng</th>
                <th>Số điện thoại</th>
                <th>Ngày mua</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    Đang tải…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    Không có đơn nào
                  </td>
                </tr>
              ) : (
                list.map((o, idx) => {
                  const current = o.status;
                  const next = nextOf(current);
                  const isLocked = current === "cancelled";
                  const canChange = !!next && !isLocked;

                  return (
                    <tr key={o._id}>
                      <td>{idx + 1}</td>
                      <td>{codeView(o)}</td>
                      <td>{o.address?.receiver || "—"}</td>
                      <td>{o.address?.phone || "—"}</td>
                      <td>{fmtDate(o.createdAt)}</td>
                      <td>
                        {canChange ? (
                          <select
                            className={`status-select ${current}`}
                            value={current}
                            onChange={(e) =>
                              updateStatus(o._id, e.target.value as Order["status"])
                            }
                          >
                            <option value={current} disabled>
                              {STATUS_LABEL[current]}
                            </option>
                            <option value={next!}>{STATUS_LABEL[next!]}</option>
                          </select>
                        ) : (
                          <span className={BADGE_CLASS[current]}>
                            {STATUS_LABEL[current]}
                          </span>
                        )}
                      </td>
                      <td className="actions">
                        <Link href={`/admin/order/${o._id}`}>Xem chi tiết</Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
