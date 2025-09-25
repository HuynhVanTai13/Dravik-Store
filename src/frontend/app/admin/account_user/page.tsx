"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2"; // 👈 import SweetAlert2
import "../../../styles/account.css";

type RawUser = {
  _id: string;
  username?: string;
  email?: string;
  email1?: string;
  phone?: string;
  phone_number?: string;
  createdAt?: string;
  created_at?: string;
  role?: number;
  status?: string;
};

type User = {
  _id: string;
  username: string;
  email: string;
  phone: string;
  createdAt: string;
  role: number;
  status: string;
};

const PAGE_SIZE = 10;

export default function AccountUserPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);

  const normalize = (u: RawUser): User => ({
    _id: u._id,
    username: (u.username ?? "").toString(),
    email: (u.email ?? u.email1 ?? "").toString(),
    phone: (u.phone_number ?? u.phone ?? "").toString(),
    createdAt: (u.createdAt ?? u.created_at ?? "") as string,
    role: typeof u.role === "number" ? u.role : 0,
    status: u.status ?? "active",
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErr("");

      // CHANGED: bỏ kiểm tra/ép đăng nhập + bỏ gửi token
      const res = await fetch("http://localhost:5000/api/users");
      const data = await res.json();

      if (!res.ok) {
        return setErr(data?.message || "Không tải được danh sách người dùng");
      }

      const list: RawUser[] = Array.isArray(data) ? data : data?.users || [];
      setUsers(list.map(normalize));
    } catch {
      setErr("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // CHANGED: gọi thẳng fetchUsers(), không chặn bởi token/iduser
    fetchUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.role === 0 &&
        (u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q))
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  const goto = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  // ✅ Cập nhật trạng thái bằng popup (GIỮ NGUYÊN – vẫn dùng token nếu backend yêu cầu)
  const updateStatus = async (userId: string, newStatus: string) => {
    const confirmResult = await Swal.fire({
      title: "Xác nhận thay đổi",
      text: `Bạn có chắc muốn đổi trạng thái sang "${
        newStatus === "active" ? "Hoạt động" : "Đã khóa"
      }"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Hủy",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(
        `http://localhost:5000/api/users/${userId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId ? { ...u, status: newStatus } : u
          )
        );
        Swal.fire("Thành công", "Cập nhật trạng thái thành công!", "success");
      } else {
        const errData = await res.json();
        Swal.fire(
          "Lỗi",
          "Không thể cập nhật trạng thái: " + (errData.message || ""),
          "error"
        );
      }
    } catch {
      Swal.fire("Lỗi", "Không kết nối được máy chủ!", "error");
    }
  };

  return (
    <main className="main-content">
      <section className="section-card product-list-section">
        <div className="product-list-header">
          <h2>Danh sách người dùng</h2>
          <div
            className="header-actions"
            style={{ gap: 12, display: "flex", alignItems: "center" }}
          >
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Tìm theo tên hoặc email…"
                className="expanded-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: "7px 16px 7px 38px",
                  borderRadius: 6,
                  border: "1px solid #ddd",
                  minWidth: 260,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#888",
                }}
              >
                <i className="fas fa-search" />
              </span>
            </div>
            <div style={{ color: "#666", fontSize: 14 }}>
              Hiển thị: <b>{pageItems.length}</b> / {filtered.length}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 24 }}>Đang tải danh sách người dùng…</div>
        ) : err ? (
          <div style={{ padding: 24, color: "red" }}>{err}</div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên người dùng</th>
                    <th>Email</th>
                    <th>Số điện thoại</th>
                    <th>Ngày tạo</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((u, idx) => (
                    <tr key={u._id}>
                      <td>{startIdx + idx + 1}</td>
                      <td>{u.username || "—"}</td>
                      <td>{u.email || "—"}</td>
                      <td>{u.phone || "—"}</td>
                      <td>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleString("vi-VN")
                          : "—"}
                      </td>
                      <td>
                        <select
                          value={u.status}
                          onChange={(e) =>
                            updateStatus(u._id, e.target.value)
                          }
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            border: "1px solid #ddd",
                            fontWeight: 600,
                            background: "#fff",
                            color:
                              u.status === "active" ? "green" : "red",
                          }}
                        >
                          <option value="active">Hoạt động</option>
                          <option value="blocked">Đã khóa</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center" }}>
                        Không có người dùng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              style={{
                display: "flex",
                gap: 4,
                justifyContent: "center",
                padding: "16px 0",
              }}
            >
              <button
                onClick={() => goto(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
                )
                .map((p, i, arr) => {
                  const prev = arr[i - 1];
                  const needDots = prev && p - prev > 1;
                  return (
                    <React.Fragment key={p}>
                      {needDots && (
                        <span
                          style={{
                            padding: "6px 10px",
                            color: "#666",
                          }}
                        >
                          …
                        </span>
                      )}
                      <button
                        onClick={() => goto(p)}
                        style={{
                          padding: "6px 10px",
                          border: "1px solid #ddd",
                          borderRadius: 6,
                          background: p === currentPage ? "#0d6efd" : "#fff",
                          color: p === currentPage ? "#fff" : "#000",
                          fontWeight: p === currentPage ? 600 : 400,
                          cursor: "pointer",
                        }}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => goto(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: "#fff",
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                ›
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
