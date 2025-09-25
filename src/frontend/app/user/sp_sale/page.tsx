"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../../../public/css/product.css";
import "../../../public/css/sale-products.css"; // <— CSS riêng cho trang SALE
import axios from "axios";
import VariantPickerModal from "@/components/ui/VariantPickerModal";

interface VariantSize { size: string; quantity: number; sold: number; isActive: boolean; }
interface Variant { color: { _id: string; name: string }; image: string; isActive: boolean; sizes: VariantSize[]; }
interface Product {
  _id: string;
  name: string;
  price: number;
  discount: number;
  slug: string;
  isActive: boolean;
  variants: Variant[];
  category: { _id: string; name: string };
  brand: { _id: string; name: string };
  createdAt?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SaleProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"buy" | "cart">("buy");
  const [pickerSlug, setPickerSlug] = useState<string>("");
  const [pickerName, setPickerName] = useState<string>("");
  const [pickerImage, setPickerImage] = useState<string>("/images/no-image.png");

  const openPicker = (p: Product, mode: "buy" | "cart", fallbackImg?: string) => {
    setPickerSlug(p.slug);
    setPickerName(p.name);
    setPickerImage(fallbackImg || "/images/no-image.png");
    setPickerMode(mode);
    setPickerOpen(true);
  };

  const [userId, setUserId] = useState<string>("");
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [busyFav, setBusyFav] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("userInfo");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?._id) setUserId(u._id);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/favourites/${userId}`, { credentials: "include" });
        const arr = await res.json();
        const ids = new Set<string>((Array.isArray(arr) ? arr : []).map((p: any) => p?._id).filter(Boolean));
        setFavSet(ids);
      } catch { setFavSet(new Set()); }
    })();
  }, [userId]);

  const toggleFavourite = async (p: Product) => {
    if (!userId) {
      alert("Bạn cần đăng nhập để dùng Yêu thích!");
      window.location.href = "/user/login";
      return;
    }
    const pid = p._id;
    const mark = (on: boolean) => {
      const s = new Set(busyFav);
      on ? s.add(pid) : s.delete(pid);
      setBusyFav(s);
    };
    try {
      mark(true);
      if (!favSet.has(pid)) {
        const r = await fetch(`${API}/api/favourites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ users_id: userId, products_id: pid }),
        });
        if (r.ok) {
          const s = new Set(favSet); s.add(pid); setFavSet(s);
          window.dispatchEvent(new Event("favourite:updated"));
          localStorage.setItem("favourite_updated", String(Date.now()));
          try { new BroadcastChannel("favourites").postMessage("updated"); } catch {}
        }
      } else {
        const r = await fetch(`${API}/api/favourites/${userId}/${pid}`, { method: "DELETE", credentials: "include" });
        if (r.ok) {
          const s = new Set(favSet); s.delete(pid); setFavSet(s);
          window.dispatchEvent(new Event("favourite:updated"));
          localStorage.setItem("favourite_updated", String(Date.now()));
          try { new BroadcastChannel("favourites").postMessage("updated"); } catch {}
        }
      }
    } finally { mark(false); }
  };

  useEffect(() => { fetchProducts(); }, []);
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/api/products`, {
        params: { page: 1, limit: 1000, search: "", status: "active", sort: "discount" },
      });
      const list = res.data.items || res.data.products || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch { setProducts([]); }
  };

  const getTotalAvailable = (p: Product) =>
    (p.variants || []).reduce((sum, v) => {
      if (!v.isActive) return sum;
      const left = (v.sizes || []).reduce((s, sz) => s + (sz.isActive ? Math.max(0, (sz.quantity || 0) - (sz.sold || 0)) : 0), 0);
      return sum + left;
    }, 0);

  const displayedAll = useMemo(() => {
    const arr = [...products].filter(p => p.isActive && (p.discount || 0) > 0)
      .sort((a, b) => (b.discount || 0) - (a.discount || 0));
    return arr;
  }, [products]);

  const pageSizeCalc = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(displayedAll.length / pageSizeCalc));
  const items = useMemo(() => displayedAll.slice((page - 1) * pageSizeCalc, page * pageSizeCalc), [displayedAll, page]);

  return (
    <main className="main-content products-page sale-products">
      <div className="container">
        <nav className="breadcrumb">
          <Link href="/">Trang chủ</Link> / <span className="current">Sản phẩm giảm giá</span>
        </nav>

        <section className="product-content">
          <h2 className="product-title">
            <span className="title-logo-sale" aria-hidden="true">SALE</span>
            SẢN PHẨM GIẢM GIÁ
          </h2>

          {items.length === 0 ? (
            <div className="text-center text-gray-500 text-lg py-12">Không có sản phẩm nào.</div>
          ) : (
            <>
              <div className="row-3">
                {items.map((p) => {
                  const activeVariants = p.variants?.filter(v => v.isActive && v.sizes?.some(s => s.isActive)) || [];
                  const imageUrl = activeVariants[0]?.image ? `${API}${activeVariants[0].image}` : "/images/no-image.png";
                  const discountPrice = (p.price || 0) - (p.discount || 0);
                  const isFav = favSet.has(p._id);
                  const isBusy = busyFav.has(p._id);
                  const outOfStock = getTotalAvailable(p) <= 0;
                  const detailHref = `/user/products/${p.slug}`;
                  const totalSold = (p.variants || []).reduce((sum, v) => sum + (v.isActive ? (v.sizes || []).reduce((s, sz) => s + (sz.isActive ? (sz.sold || 0) : 0), 0) : 0), 0);
                  const percent = p.price > 0 ? Math.round((p.discount / p.price) * 100) : 0;

                  return (
                    <div key={p._id} className="col-5-sp">
                      <div className="img-sp" style={{ position: "relative" }}>
                        {/* Badge SALE riêng trang này */}
                        <span className="badge-sale" aria-label="Đang giảm giá">
                          {percent > 0 ? `-${percent}%` : "SALE"}
                        </span>

                        <Link href={detailHref} className="block" style={{ width: "100%", height: "100%" }} aria-label={p.name}>
                          <img src={imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        </Link>
                        {outOfStock && (
                          <span className="flag-out">Hết hàng</span>
                        )}
                      </div>

                      <div className="trang-sp">
                        <div className="text-sp">
                          <div className="left-sp">
                            <p className="name-sp">{p.name}</p>
                            <p className="price-line">
                              {(discountPrice).toLocaleString()}₫{" "}
                              <del>{p.price.toLocaleString()}₫</del>
                            </p>
                            <p className="sold-line">
                              Đã bán: <span>{totalSold.toLocaleString()}</span>
                            </p>

                            {outOfStock ? (
                              <a href={detailHref} onClick={(e) => e.preventDefault()} className="btn-disabled" title="Hết hàng" aria-disabled="true">
                                Hết hàng
                              </a>
                            ) : (
                              <Link href={detailHref} onClick={(e) => { e.preventDefault(); openPicker(p, "buy", imageUrl); }} title="Mua ngay">
                                Mua ngay
                              </Link>
                            )}
                          </div>

                          <div className="right-sp">
                            <button className="heart-btn" aria-pressed={isFav} aria-label={isFav ? "Hủy yêu thích" : "Yêu thích"} title={isFav ? "Hủy yêu thích" : "Yêu thích"} onClick={() => toggleFavourite(p)} disabled={isBusy}>
                              <i className="fa-solid fa-heart" />
                            </button>
                            <button title={outOfStock ? "Hết hàng" : "Thêm vào giỏ"} onClick={() => !outOfStock && openPicker(p, "cart", imageUrl)} disabled={outOfStock} className={outOfStock ? "btn-cart disabled" : "btn-cart"}>
                              <i className="fa-solid fa-cart-plus"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="paging">
                  <button onClick={() => page > 1 && setPage(page - 1)} disabled={page === 1} className="pg-btn prev">
                    <i className="fa-solid fa-angle-left"></i>
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const n = i + 1;
                    if (n === 1 || n === totalPages || (n >= page - 1 && n <= page + 1)) {
                      return (
                        <button key={n} onClick={() => setPage(n)} className={`pg-btn ${page === n ? "active" : ""}`}>{n}</button>
                      );
                    } else if ((n === page - 2 && page > 3) || (n === page + 2 && page < totalPages - 2)) {
                      return <span key={`dots-${n}`} className="pg-dots">…</span>;
                    } else return null;
                  })}
                  <button onClick={() => page < totalPages && setPage(page + 1)} disabled={page === totalPages} className="pg-btn next">
                    <i className="fa-solid fa-angle-right"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <VariantPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          productSlug={pickerSlug}
          productNameFallback={pickerName}
          productImageFallback={pickerImage}
          mode={pickerMode}
        />
      </div>
    </main>
  );
}
