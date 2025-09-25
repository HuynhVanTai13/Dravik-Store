"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useVariantModal } from "@/components/providers/VariantModalProvider";
import "@/public/css/favourite.css";

type Variant = { image?: string };
type Product = {
  _id: string;
  name: string;
  price: number;
  discount: number;
  slug: string;
  mainImage?: string;
  variants?: Variant[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const toAbsImg = (raw?: string) => {
  const img = raw || "";
  if (!img) return "/images/no-image.png";
  if (/^https?:\/\//i.test(img)) return img;
  const cleaned = img.replace(/^public[\\/]/, "");
  return `${API_BASE}${cleaned.startsWith("/") ? "" : "/"}${cleaned}`;
};

export default function FavouritePage() {
  const { openBuyNow, openAddToCart } = useVariantModal();

  const [userId, setUserId] = useState<string>("");
  const [items, setItems] = useState<Product[]>([]);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  // --- Pagination ---
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const buildPages = (cur: number, total: number): (number | "dots")[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 3) return [1, 2, 3, 4, 5, "dots", total];
    if (cur >= total - 2) return [1, "dots", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "dots", cur - 1, cur, cur + 1, "dots", total];
  };

  // lấy userId
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("userInfo");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?._id) setUserId(u._id);
      }
    } catch {}
  }, []);

  // load danh sách yêu thích
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/favourites/${userId}`, { credentials: "include" });
        const data = await r.json();
        setItems(Array.isArray(data) ? data : []);
        setPage(1); // reset về trang 1 khi user đổi / reload
      } catch {
        setItems([]);
      }
    })();
  }, [userId]);

  const markBusy = (id: string, on: boolean) =>
    setBusy((prev) => {
      const s = new Set(prev);
      on ? s.add(id) : s.delete(id);
      return s;
    });

  // xoá khỏi yêu thích (hàm khác tên)
  const removeFav = async (productId: string) => {
    if (!userId) return;
    try {
      markBusy(productId, true);
      const r = await fetch(`${API_BASE}/api/favourites/${userId}/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.ok) setItems((prev) => prev.filter((p) => p._id !== productId));
    } finally {
      markBusy(productId, false);
    }
  };

  // Mua ngay (hàm khác tên)
  const buyNowFav = (p: Product) =>
    openBuyNow({
      productSlug: p.slug,
      productNameFallback: p.name,
      productImageFallback: toAbsImg(p.mainImage || p.variants?.[0]?.image),
    });

  // Thêm giỏ (hàm khác tên)
  const addToCartFav = (p: Product) =>
    openAddToCart({
      productSlug: p.slug,
      productNameFallback: p.name,
      productImageFallback: toAbsImg(p.mainImage || p.variants?.[0]?.image),
    });

  return (
    <main className="fav-main">
      <nav className="breadcrumb">
        <Link href="/">Trang chủ</Link> /{' '}
        <span className="current">
          <Link href="/user/favourite" style={{ color: '#2c2929ff' }}>Sản phẩm yêu thích</Link>
        </span>
      </nav>
      <h2 className="fav-title">SẢN PHẨM YÊU THÍCH</h2>

      {items.length === 0 ? (
        <div className="fav-empty">Bạn chưa có sản phẩm yêu thích.</div>
      ) : (
        <>
          {/* Dàn 1 hàng 5 ô */}
          <div className="row-3 fav-grid-5">
            {pageItems.map((p) => {
              const img = toAbsImg(p.mainImage || p.variants?.[0]?.image);
              const hasDiscount = (p.discount || 0) > 0;
              const current = Math.max(0, (p.price || 0) - (p.discount || 0));
              return (
                <div className="col-5-sp" key={p._id}>
                  <div className="img-sp">
                    <Link href={`/user/products/${p.slug}`} aria-label={p.name}>
                      <img src={img} alt={p.name} />
                    </Link>
                  </div>

                  <div className="text-sp">
                    <div className="left-sp">
                      <p className="name-sp">
                        <Link href={`/user/products/${p.slug}`} className="text-inherit">
                          {p.name}
                        </Link>
                      </p>

                      <p className="price-row">
                        <span className="gia-moi">
                          {(hasDiscount ? current : p.price).toLocaleString()}₫
                        </span>
                        {hasDiscount && (
                          <del className="gia-cu">{p.price.toLocaleString()}₫</del>
                        )}
                      </p>

                      <button className="buy-btn" onClick={() => buyNowFav(p)}>
                        Mua ngay
                      </button>
                    </div>

                    <div className="right-sp">
                      <button
                        className="heart-btn"
                        aria-pressed="true"
                        title="Hủy yêu thích"
                        disabled={busy.has(p._id)}
                        onClick={() => removeFav(p._id)}
                      >
                        <i className="fa-solid fa-heart" />
                      </button>

                      <button className="cart-btn" title="Thêm vào giỏ" onClick={() => addToCartFav(p)}>
                        <i className="fa-solid fa-cart-plus" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Phân trang */}
          <div className="fav-paging" aria-label="Phân trang">
            <button
              className="pg-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Trang trước"
            >
              ‹
            </button>

            {buildPages(page, totalPages).map((v, idx) =>
              v === "dots" ? (
                <span className="pg-dots" key={`d-${idx}`}>…</span>
              ) : (
                <button
                  key={v}
                  className={`pg-page ${v === page ? "active" : ""}`}
                  onClick={() => setPage(v)}
                  aria-current={v === page ? "page" : undefined}
                >
                  {v}
                </button>
              )
            )}

            <button
              className="pg-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Trang sau"
            >
              ›
            </button>
          </div>
        </>
      )}
    </main>
  );
}
