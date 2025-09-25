"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "../../public/css/productComments.css";

type Props = { productId: string; userId?: string };

type CommentItem = {
  _id: string;
  userId: string;
  userName?: string;
  rating: number;
  content: string;
  images?: string[];
  createdAt: string;
};

type CommentResponse = {
  items: CommentItem[];
  page: number;
  pages: number;
  byStars: Record<number, number>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const client = axios.create({ baseURL: API_BASE });
const PAGE_SIZE = 5;

/* Lấy tên hiển thị từ localStorage (nhiều fallback) */
function getDisplayName() {
  if (typeof window === "undefined") return "";
  try {
    const u =
      JSON.parse(localStorage.getItem("userInfo") || "null") ||
      JSON.parse(localStorage.getItem("user") || "null") ||
      {};
    const n =
      u.username || u.userName || u.fullname || u.fullName || u.name || "";
    if (n) return String(n);
    const email = u.email || "";
    if (email && typeof email === "string") return email.split("@")[0];
  } catch {}
  return "";
}

/* Tạo hiệu ứng pháo sao (ngẫu nhiên vị trí bay) */
type StarFx = { id: number; x: number; y: number; delay: number; scale: number; rotate: number };
function makeStars(count = 14): StarFx[] {
  const arr: StarFx[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 120; // bán kính bay
    arr.push({
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * -1, // bay lên trên là số âm
      delay: Math.random() * 200,
      scale: 0.8 + Math.random() * 0.6,
      rotate: Math.random() * 360,
    });
  }
  return arr;
}

export default function ProductComments({ productId, userId }: Props) {
  const [data, setData] = useState<CommentResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // filters
  const [page, setPage] = useState(1);
  const [stars, setStars] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [sort, setSort] = useState<"recent" | "old" | "top">("recent");

  // form
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // popup cảm ơn + hiệu ứng sao
  const [thanksOpen, setThanksOpen] = useState(false);
  const [starsFx, setStarsFx] = useState<StarFx[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userName = useMemo(() => getDisplayName(), []);

  const totals = useMemo(() => {
    const by = data?.byStars || {};
    const total =
      (by[1] || 0) + (by[2] || 0) + (by[3] || 0) + (by[4] || 0) + (by[5] || 0);
    const avg =
      total === 0
        ? 0
        : (1 * (by[1] || 0) +
            2 * (by[2] || 0) +
            3 * (by[3] || 0) +
            4 * (by[4] || 0) +
            5 * (by[5] || 0)) / total;
    return { total, avg: Number(avg.toFixed(1)) };
  }, [data]);

  const loadComments = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await client.get(`/api/comments/product/${productId}`, {
        params: { page, limit: PAGE_SIZE, stars, sort },
      });
      const next: CommentResponse = res.data;
      setData((prev) => {
        if (!prev || page === 1) return next;
        return { ...next, items: [...(prev.items || []), ...(next.items || [])] };
      });
    } catch (e: any) {
      console.error(e);
      alert(
        "Không tải được bình luận!\n" +
          (e?.response?.data?.message || e?.message || "")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
    setPage(1);
  }, [productId, stars, sort]);

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, productId, stars, sort]);

  const remaining = useMemo(() => {
    if (!data) return 0;
    const totalForFilter =
      stars === 0
        ? (data.byStars[1] || 0) +
          (data.byStars[2] || 0) +
          (data.byStars[3] || 0) +
          (data.byStars[4] || 0) +
          (data.byStars[5] || 0)
        : data.byStars[stars] || 0;
    const shown = data.items.length;
    return Math.max(0, totalForFilter - shown);
  }, [data, stars]);

  const onLoadMore = () => {
    if (loading || remaining <= 0) return;
    setPage((p) => p + 1);
  };

  /* ===== Gửi bình luận: thêm userName + optimistic update ===== */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      alert("Bạn cần đăng nhập để bình luận!");
      return;
    }
    if (!content.trim()) {
      alert("Vui lòng nhập nội dung bình luận.");
      return;
    }
    const displayName = userName || "Người dùng";

    try {
      const fd = new FormData();
      fd.append("productId", productId);
      fd.append("userId", userId);
      fd.append("userName", displayName); // backend yêu cầu
      fd.append("rating", String(rating));
      fd.append("content", content.trim());
      files.forEach((f) => fd.append("images", f));

      const res = await client.post("/api/comments", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 1) Optimistic: chèn ngay bình luận vào danh sách + cập nhật byStars
      const serverComment: CommentItem | undefined = res?.data?.comment;
      const optimistic: CommentItem = serverComment || {
        _id: "temp-" + Date.now(),
        userId,
        userName: displayName,
        rating,
        content: content.trim(),
        images: files.map((f) => URL.createObjectURL(f)),
        createdAt: new Date().toISOString(),
      };

      setData((prev) => {
        const by = { ...(prev?.byStars || {}) };
        by[rating] = (by[rating] || 0) + 1;
        return {
          items: [optimistic, ...(prev?.items || [])],
          page: 1,
          pages: prev?.pages || 1,
          byStars: by,
        };
      });

      // 2) Reset form
      setContent("");
      setFiles([]);
      fileInputRef.current && (fileInputRef.current.value = "");
      setStars(0);
      setSort("recent");
      setPage(1); // sẽ load lại từ server để đồng bộ

      // 3) Popup cảm ơn 2s + hiệu ứng sao 3s
      setThanksOpen(true);
      toastTimer.current && clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setThanksOpen(false), 2000);

      setStarsFx(makeStars());
      fxTimer.current && clearTimeout(fxTimer.current);
      fxTimer.current = setTimeout(() => setStarsFx([]), 3000);

      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e: any) {
      alert(e?.response?.data?.message || "Không gửi được bình luận.");
    }
  };

  useEffect(() => {
    return () => {
      toastTimer.current && clearTimeout(toastTimer.current);
      fxTimer.current && clearTimeout(fxTimer.current);
    };
  }, []);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arr = Array.from(e.target.files || []);
    setFiles(arr.slice(0, 4));
  };

  return (
    <section className="pc-wrap">
      <div className="pc-grid">
        {/* Cột trái: tổng quan + bộ lọc sao */}
        <aside className="pc-col-left">
          <div className="pc-panel">
            <div className="pc-score-wrap">
              <div className="pc-avg-score">{totals.avg}</div>
              <div className="pc-star-row" aria-label={`${totals.avg} sao trung bình`}>
                {renderStars(Math.round(totals.avg))}
              </div>
              <div className="pc-total-text">{totals.total} đánh giá</div>
            </div>

            <div className="pc-stats-wrap" style={{ marginTop: 12 }}>
              {[5, 4, 3, 2, 1].map((s) => {
                const count = data?.byStars?.[s] || 0;
                const pct = totals.total ? Math.round((count / totals.total) * 100) : 0;
                return (
                  <button
                    key={s}
                    className={`pc-stat-row ${stars === s ? "pc-stat-row-active" : ""}`}
                    onClick={() => {
                      setStars(stars === (s as 1 | 2 | 3 | 4 | 5) ? 0 : (s as 1 | 2 | 3 | 4 | 5));
                      setPage(1);
                    }}
                    type="button"
                  >
                    <span className="pc-stat-label">{s} sao</span>
                    <div className="pc-stat-bar">
                      <div className="pc-stat-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="pc-stat-num">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Cột giữa: danh sách & nút xem thêm */}
        <main className="pc-col-center">
          <div className="pc-toolbar pc-toolbar-center">
            <div className="pc-sort-box">
              <label>Sắp xếp</label>
              <select
                className="pc-select"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as "recent" | "old" | "top");
                  setPage(1);
                }}
              >
                <option value="recent">Mới nhất</option>
                <option value="old">Cũ nhất</option>
                <option value="top">Điểm cao</option>
              </select>
            </div>
          </div>

          <div className="pc-chips pc-chips-center" style={{ marginBottom: 8 }}>
            <Chip active={stars === 0} onClick={() => { setStars(0); setPage(1); }}>
              Tất cả ({totals.total})
            </Chip>
            {[5, 4, 3, 2, 1].map((s) => (
              <Chip
                key={s}
                active={stars === s}
                onClick={() => { setStars(s as 1 | 2 | 3 | 4 | 5); setPage(1); }}
              >
                {s} sao ({data?.byStars?.[s] || 0})
              </Chip>
            ))}
          </div>

          {loading && <div className="pc-muted">Đang tải đánh giá…</div>}
          {!loading && (data?.items?.length ?? 0) === 0 && (
            <div className="pc-muted">Chưa có bình luận nào.</div>
          )}

          <div className="pc-list-wrap">
            {data?.items?.map((c) => (
              <article key={c._id} className="pc-card">
                <div className="pc-card-comment">
                  <div className="pc-card-title">{c.userName || "Người dùng"}</div>
                  <div className="pc-card-meta">
                    {new Date(c.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>

                <div className="pc-card-rating" aria-label={`${c.rating} sao`}>
                  {renderStars(c.rating)}
                </div>

                <p className="pc-card-content">{c.content}</p>

                {!!(c.images && c.images.length) && (
                  <div className="pc-images-row">
                    {c.images.map((img, i) => (
                      <img
                        key={i}
                        src={
                          img.startsWith("http")
                            ? img
                            : `${API_BASE}${img.startsWith("/") ? "" : "/"}${img}`
                        }
                        alt={`review-${i}`}
                        className="pc-image"
                      />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>

          {data && remaining > 0 && (
            <div className="pc-loadmore" style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
              <button
                className="pc-btn-ghost"
                onClick={onLoadMore}
                disabled={loading}
                title={`Tải thêm ${Math.min(PAGE_SIZE, remaining)} bình luận (còn ${remaining})`}
                type="button"
              >
                Xem thêm ({remaining} đánh giá)
              </button>
            </div>
          )}
        </main>

        {/* Cột phải: form */}
        <aside className="pc-col-right" ref={formRef}>
          <div className="pc-sticky">
            <div className="pc-form-wrap">
              <h3 className="pc-form-title">Viết đánh giá của bạn</h3>

              {!userId ? (
                <div className="pc-notice">Bạn cần đăng nhập để đánh giá.</div>
              ) : (
                <form onSubmit={onSubmit} className="pc-form">
                  <div className="pc-form-group">
                    <label>Chấm sao</label>
                    <div className="pc-stars-control">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`pc-star-btn ${rating >= s ? "pc-star-active" : ""}`}
                          aria-label={`${s} sao`}
                          onClick={() => setRating(s as 1 | 2 | 3 | 4 | 5)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pc-form-group">
                    <label>Nội dung</label>
                    <textarea
                      className="pc-textarea"
                      rows={5}
                      placeholder={
                        userName ? "Chia sẻ cảm nhận của bạn…" : "Bạn cần đăng nhập để bình luận"
                      }
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                    />
                  </div>

                  <div className="pc-form-group">
                    <label>Ảnh đính kèm (tối đa 4)</label>
                    <input
                      ref={fileInputRef}
                      className="pc-file-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onPickFiles}
                    />
                    {!!files.length && (
                      <div className="pc-previews">
                        {files.map((f, i) => (
                          <img
                            key={i}
                            src={URL.createObjectURL(f)}
                            alt={`preview-${i}`}
                            className="pc-preview-img"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pc-submit-area">
                    <button type="submit" className="pc-btn-primary">
                      Gửi bình luận
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ✅ Popup cảm ơn 2s */}
      {thanksOpen && (
        <div className="pc-toast" role="status" aria-live="polite">
          <div className="pc-toast-card">
            <div className="pc-toast-icon">💙</div>
            <div className="pc-toast-text">Cảm ơn quý khách đã đánh giá sản phẩm!</div>
          </div>
        </div>
      )}

      {/* ✅ Pháo sao 3s */}
      {starsFx.length > 0 && (
        <div className="pc-starsfx" aria-hidden>
          {starsFx.map((s) => (
            <span
              key={s.id}
              className="s"
              style={
                {
                  "--tx": `${s.x}px`,
                  "--ty": `${s.y}px`,
                  "--d": `${s.delay}ms`,
                  "--sc": s.scale,
                  "--rot": `${s.rotate}deg`,
                } as React.CSSProperties
              }
            >
              ★
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/* Helpers */
function renderStars(n: number) {
  const full = Math.max(0, Math.min(5, n));
  return (
    <>
      {"★".repeat(full)}
      <span className="pc-star-muted">{"★".repeat(5 - full)}</span>
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`pc-chip ${active ? "pc-chip-active" : ""}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
