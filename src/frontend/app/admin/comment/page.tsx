"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "@/public/css/admin-comment.css";

type Cmt = {
  _id: string;
  productId: string;
  productName?: string | null;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  images?: string[];
  createdAt?: string;
};

type StarKey = "1" | "2" | "3" | "4" | "5";
type StarNum = 1 | 2 | 3 | 4 | 5;

type ApiResp = {
  items: Cmt[];
  page: number;
  pages: number;
  byStars: Record<StarKey, number>;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const LIMIT = 8;

const fmt = (d?: string) => (d ? new Date(d).toLocaleString("vi-VN") : "");

/** bỏ dấu + thường hóa để tìm không phân biệt chữ hoa/thường & dấu tiếng Việt */
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim();
}

function Stars({ n }: { n: number }) {
  return (
    <span className="cm-stars" aria-label={`${n} sao`}>
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

function usePager(pages: number, page: number) {
  return useMemo(() => {
    const res: (number | string)[] = [];
    if (pages <= 9) {
      for (let i = 1; i <= pages; i++) res.push(i);
      return res;
    }
    const add = (v: number | string) => res[res.length - 1] !== v && res.push(v);
    const near = [page - 1, page, page + 1].filter((x) => x >= 1 && x <= pages);
    add(1);
    add(2);
    if (page > 4) add("…");
    near.forEach(add);
    if (page < pages - 3) add("…");
    add(pages - 1);
    add(pages);
    return Array.from(new Set(res));
  }, [pages, page]);
}

export default function AdminCommentAllPage() {
  const [q, setQ] = useState("");          // tìm theo sp / user
  const [qContent, setQContent] = useState(""); // tìm theo nội dung bình luận
  const [stars, setStars] = useState<number | 0>(0);
  const [sort, setSort] = useState<"recent" | "old" | "top">("recent");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ApiResp>({
    items: [],
    page: 1,
    pages: 1,
    byStars: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  });
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const url = new URL(`${API}/api/comments`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(LIMIT));
      if (q.trim()) url.searchParams.set("q", q.trim());
      if (qContent.trim()) url.searchParams.set("content", qContent.trim()); // server-side (nếu có)
      if (stars) url.searchParams.set("stars", String(stars));
      url.searchParams.set("sort", sort);

      const r = await fetch(url.toString(), { cache: "no-store", credentials: "include" });
      const j = await r.json();
      setData({
        items: Array.isArray(j?.items) ? j.items : [],
        page: Number(j?.page || 1),
        pages: Number(j?.pages || 1),
        byStars: j?.byStars || { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      });
    } catch {
      setData({ items: [], page: 1, pages: 1, byStars: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [q, qContent, stars, sort, page]);

  // ✅ Lọc dự phòng ở client nếu server không hỗ trợ `content`
  const itemsFilteredByContent = useMemo(() => {
    if (!qContent.trim()) return data.items;
    const needle = norm(qContent);
    return data.items.filter((c) => norm(c.content).includes(needle));
  }, [data.items, qContent]);

  const [open, setOpen] = useState<Cmt | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Xóa đánh giá này?")) return;
    try {
      const r = await fetch(`${API}/api/comments/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || "Xóa thất bại");
      }
      const lastOnPage = data.items.length === 1 && page > 1;
      if (lastOnPage) setPage((p) => Math.max(1, p - 1));
      else load();
    } catch (e: any) {
      alert(e?.message || "Không thể xóa.");
    }
  }

  const sttBase = (page - 1) * LIMIT;
  const pagesList = usePager(data.pages || 1, page);

  return (
    <main className="main-content">
      <div className="cm-page">
        <header className="cm-head">
          <h1>Quản trị đánh giá</h1>
          <div className="cm-breadcrumb">
            <Link href="/admin">Trang quản trị</Link> / Tất cả bình luận
          </div>
        </header>

        {/* Controls */}
        <section className="cm-controls">
          <div className="cm-controls-grid">
            <div className="field">
              <label>Tìm theo sản phẩm / người dùng</label>
              <input
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
                placeholder="Ví dụ: Áo sơ mi, Duy Hoang…"
              />
            </div>
            <div className="field">
              <label>Tìm theo nội dung bình luận</label>
              <input
                value={qContent}
                onChange={(e) => { setPage(1); setQContent(e.target.value); }}
                placeholder="Nhập từ khóa trong nội dung…"
              />
            </div>
            <div className="field w-160">
              <label>Lọc sao</label>
              <select
                value={String(stars)}
                onChange={(e) => { setPage(1); setStars(Number(e.target.value)); }}
              >
                <option value="0">Tất cả</option>
                <option value="5">5 sao</option>
                <option value="4">4 sao</option>
                <option value="3">3 sao</option>
                <option value="2">2 sao</option>
                <option value="1">1 sao</option>
              </select>
            </div>
            <div className="field w-200">
              <label>Sắp xếp</label>
              <select
                value={sort}
                onChange={(e) => { setPage(1); setSort(e.target.value as any); }}
              >
                <option value="recent">Mới nhất</option>
                <option value="old">Cũ nhất</option>
                <option value="top">Rating cao → thấp</option>
              </select>
            </div>
          </div>

          {/* Chip thống kê sao */}
          <div className="cm-stats">
            {(["5", "4", "3", "2", "1"] as const).map((k) => {
              const s = Number(k) as StarNum;
              const count = data.byStars[k];
              return (
                <button
                  key={k}
                  className={`chip ${stars === s ? "active" : ""}`}
                  onClick={() => { setPage(1); setStars(stars === s ? 0 : s); }}
                >
                  {s}★ <span className="cnt">{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Table */}
        <section className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>STT</th>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th style={{ width: 92 }}>Ảnh</th>
                <th>Nội dung</th>
                <th style={{ width: 140 }}>Sao</th>
                <th style={{ width: 140 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="no-data">Đang tải…</td></tr>
              ) : itemsFilteredByContent.length === 0 ? (
                <tr><td colSpan={7} className="no-data">Không có dữ liệu</td></tr>
              ) : (
                itemsFilteredByContent.map((c, i) => (
                  <tr key={c._id}>
                    <td className="center">{sttBase + i + 1}</td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">{c.userName}</div>
                        <div className="cell-sub">{fmt(c.createdAt)}</div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">{c.productName || "(Không rõ tên sản phẩm)"}</div>
                      </div>
                    </td>
                    <td className="center">
                      {c.images?.length ? (
                        <img
                          className="thumb"
                          src={c.images[0].startsWith("http") ? c.images[0] : `${API}${c.images[0]}`}
                          alt="thumb"
                        />
                      ) : ("—")}
                    </td>
                    <td className="text">
                      <span className="line-clamp" title={c.content}>
                        {c.content || "(Không có nội dung)"}
                      </span>
                    </td>
                    <td className="center">
                      <Stars n={c.rating} />
                    </td>
                    <td>
                      <div className="actions">
                        <button className="link" onClick={() => setOpen(c)}>Xem</button>
                        <button className="link danger" onClick={() => handleDelete(c._id)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Paging */}
          <div className="cm-paging">
            <button className="cm-btn outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Trước</button>
            <div className="page-list">
              {usePager(data.pages || 1, page).map((p, idx) =>
                typeof p === "number" ? (
                  <button key={idx} className={`page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                ) : (
                  <span key={idx} className="page-ellipsis">{p}</span>
                )
              )}
            </div>
            <button className="cm-btn outline" disabled={page >= (data.pages || 1)} onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))}>Sau →</button>
          </div>
        </section>

        {/* Modal xem nhanh */}
        {open && (
          <div className="cm-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
            <div className="cm-modal">
              <div className="head">
                <div className="title">Chi tiết đánh giá</div>
                <button className="close" onClick={() => setOpen(null)} aria-label="Đóng">✕</button>
              </div>
              <div className="body">
                <div className="kv"><span>Khách hàng</span><b>{open.userName}</b></div>
                <div className="kv"><span>Sản phẩm</span><b>{open.productName || "(Không rõ)"}</b></div>
                <div className="kv"><span>Thời gian</span><b>{fmt(open.createdAt)}</b></div>
                <div className="kv"><span>Đánh giá</span><b><Stars n={open.rating} /></b></div>
                <div className="kv col"><span>Nội dung</span><div className="bubble">{open.content || "(Không có nội dung)"}</div></div>
                {!!open.images?.length && (
                  <div className="kv col">
                    <span>Ảnh</span>
                    <div className="imgs">
                      {open.images!.map((src, idx) => (
                        <img key={idx} src={src.startsWith("http") ? src : `${API}${src}`} alt={`img-${idx}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="foot">
                <button className="cm-btn outline" onClick={() => setOpen(null)}>Đóng</button>
                <button className="cm-btn danger" onClick={() => { handleDelete(open._id); setOpen(null); }}>Xóa đánh giá</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
