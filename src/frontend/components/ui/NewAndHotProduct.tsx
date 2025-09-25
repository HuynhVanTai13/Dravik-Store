'use client';

import { useEffect, useState, useRef } from 'react';
import axios from '@/utils/axiosConfig';
import Link from 'next/link';
import { useVariantModal } from '@/components/providers/VariantModalProvider';
import '@/public/css/home.css';
import '@/public/css/new-hot-mobile-fix.css';

interface Product {
  _id: string;
  name: string;
  price: number;
  discount: number;
  slug: string;
  createdAt?: string;
  variants: { image: string; sizes: { sold: number }[] }[];
  totalSold?: number;
}

const ITEM_WIDTH = 245;
const CARD_IMAGE_HEIGHT = 220;
const GAP = 16;
const VIEWPORT_WIDTH = ITEM_WIDTH * 5 + GAP * 4;
const NAVY = '#001F5D';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const toAbsImg = (img?: string) =>
  !img ? '/images/no-image.png' : /^https?:\/\//.test(img) ? img : `${API_BASE}${img}`;

export default function NewAndHotProduct() {
  const { openBuyNow, openAddToCart } = useVariantModal();

  const [activeTab, setActiveTab] = useState<'new' | 'hot'>('new');
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [hotProducts, setHotProducts] = useState<Product[]>([]);

  // ====== Yêu thích ======
  const [userId, setUserId] = useState<string>('');
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [busyFav, setBusyFav] = useState<Set<string>>(new Set());

  // 2 ref tách biệt cho 2 tab
  const scrollNewRef = useRef<HTMLDivElement>(null);
  const scrollHotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNewProducts();
    fetchHotProducts();
  }, []);

  // lấy userId
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('userInfo');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?._id) setUserId(u._id);
      }
    } catch {}
  }, []);

  // lấy danh sách yêu thích
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/favourites/${userId}`, { credentials: 'include' });
        const arr = await res.json();
        const ids = new Set<string>((Array.isArray(arr) ? arr : []).map((p: any) => p?._id).filter(Boolean));
        setFavSet(ids);
      } catch {
        setFavSet(new Set());
      }
    })();
  }, [userId]);

  const markBusy = (pid: string, on: boolean) => {
    setBusyFav(prev => {
      const s = new Set(prev);
      on ? s.add(pid) : s.delete(pid);
      return s;
    });
  };

  const toggleFavourite = async (p: Product) => {
    if (!userId) {
      alert('Bạn cần đăng nhập để dùng Yêu thích!');
      return;
    }
    const pid = p._id;
    try {
      markBusy(pid, true);
      if (!favSet.has(pid)) {
        const r = await fetch(`${API_BASE}/api/favourites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ users_id: userId, products_id: pid }),
        });
        if (r.ok) setFavSet(prev => new Set(prev).add(pid));
      } else {
        const r = await fetch(`${API_BASE}/api/favourites/${userId}/${pid}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (r.ok) {
          setFavSet(prev => {
            const s = new Set(prev);
            s.delete(pid);
            return s;
          });
        }
      }
    } finally {
      markBusy(pid, false);
    }
  };

  const withTotalSold = (arr: Product[]) =>
    arr.map(p => ({
      ...p,
      totalSold:
        p.variants?.reduce(
          (sum, v) => sum + (v.sizes?.reduce((s, sz) => s + (sz?.sold || 0), 0) || 0),
          0
        ) || 0,
    }));

  const fetchNewProducts = async () => {
    try {
      const res = await axios.get('/api/products', { params: { sort: 'new', limit: 15, status: 'active' } });
      let items: Product[] = withTotalSold(res.data.items || res.data.products || []);
      items = items.sort(
        (a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0)
      );
      setNewProducts(items.slice(0, 15));
    } catch (err) {
      console.error('Load sản phẩm mới lỗi:', err);
    }
  };

  const fetchHotProducts = async () => {
    try {
      const res = await axios.get('/api/products', { params: { sort: 'sold', limit: 15, status: 'active' } });
      let items: Product[] = withTotalSold(res.data.items || res.data.products || []);
      items = items.sort((a, b) => (b.totalSold || 0) - (a.totalSold || 0));
      setHotProducts(items.slice(0, 15));
    } catch (err) {
      console.error('Load sản phẩm bán chạy lỗi:', err);
    }
  };

  const handleScroll = (direction: 'next' | 'prev') => {
    const ref = activeTab === 'new' ? scrollNewRef : scrollHotRef;
    if (!ref.current) return;
    const container = ref.current;
    const scrollAmount = direction === 'next' ? ITEM_WIDTH + GAP : -(ITEM_WIDTH + GAP);
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const renderProductItem = (product: Product) => {
    const currentPrice = Math.max(0, (product.price || 0) - (product.discount || 0));
    const hasDiscount = (product.discount || 0) > 0;
    const detailHref = `/user/products/${product.slug}`;
    const imageUrl = toAbsImg(product.variants?.[0]?.image);

    const isFav = favSet.has(product._id);
    const isBusy = busyFav.has(product._id);

    return (
      <div
        className="col-5-sp relative"
        key={product._id}
        style={{ width: ITEM_WIDTH, flexShrink: 0, scrollSnapAlign: 'start' }}
      >
        {/* 🔥 Badge HOT – chỉ tab bán chạy hiển thị */}
        {activeTab === 'hot' && (
          <div className="hot-badge">
            <i className="fa-solid fa-fire" />
            HOT
          </div>
        )}

        <div className="img-sp" style={{ height: CARD_IMAGE_HEIGHT }}>
          <Link href={detailHref} aria-label={product.name} className="block w-full h-full">
            <img src={imageUrl} alt={product.name} className="w-full h-full" style={{ objectFit: 'cover' }} />
          </Link>
        </div>

        <div className="text-sp">
          <div className="left-sp">
            <p className="name-sp">
              <Link href={detailHref} className="hover:underline text-inherit">
                {product.name}
              </Link>
            </p>

            <p style={{ color: '#cd1919', fontSize: 16, fontWeight: 550, marginBottom: 4 }}>
              <Link href={detailHref} className="text-inherit no-underline">
                {hasDiscount ? (
                  <>
                    {currentPrice.toLocaleString()}₫{' '}
                    <del style={{ color: '#979797', fontSize: 14 }}>{product.price.toLocaleString()}₫</del>
                  </>
                ) : (
                  <>{product.price.toLocaleString()}₫</>
                )}
              </Link>
            </p>

            <p style={{ fontSize: 14, color: 'black' }}>
              <Link href={detailHref} className="text-inherit hover:underline">
                Đã bán: <span style={{ color: 'red' }}>{product.totalSold || 0}</span>
              </Link>
            </p>

            <button
              className="w-full mt-1 inline-block px-3 py-2 rounded text-white text-sm font-semibold"
              style={{ background: NAVY }}
              onClick={() =>
                openBuyNow({
                  productSlug: product.slug,
                  productNameFallback: product.name,
                  productImageFallback: imageUrl,
                })
              }
            >
              Mua ngay
            </button>
          </div>

          <div className="right-sp">
            {/* ♥ mặc định xám (fill kín), bấm -> đỏ; hover hiện tooltip */}
            <button
              className="heart-btn"
              aria-pressed={isFav}
              aria-label={isFav ? 'Hủy yêu thích' : 'Yêu thích'}
              title={isFav ? 'Hủy yêu thích' : 'Yêu thích'}
              onClick={() => toggleFavourite(product)}
              disabled={isBusy}
            >
              {/* dùng solid để icon fill kín; màu do CSS qua currentColor */}
              <i className="fa-solid fa-heart" />
            </button>

            <button
              onClick={() =>
                openAddToCart({
                  productSlug: product.slug,
                  productNameFallback: product.name,
                  productImageFallback: imageUrl,
                })
              }
              title="Thêm vào giỏ"
            >
              <i className="fa-solid fa-cart-plus" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="new-sp">
      <div className="product-tabs">
        <div
          id="tab-new"
          className={`tab-item left-icon ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          <div className="tab-line" />
          <div className="tab-icon" />
          <span className="tab-label">SẢN PHẨM MỚI</span>
        </div>
        <span style={{ padding: '0px 0px 10px 0px' }}> |</span>
        <div
          id="tab-hot"
          className={`tab-item right-icon ${activeTab === 'hot' ? 'active' : ''}`}
          onClick={() => setActiveTab('hot')}
        >
          <span className="tab-label">SẢN PHẨM BÁN CHẠY</span>
          <div className="tab-icon" />
          <div className="tab-line" />
        </div>
      </div>

      <div className="product-box">
        <div className="row-3 relative">
          {/* 2 container tách biệt để không “đồng bộ” scroll */}
          <div
            ref={scrollNewRef}
            className={`flex gap-4 overflow-hidden no-scrollbar transition-all mx-auto ${
              activeTab === 'new' ? '' : 'hidden'
            }`}
            style={{ scrollSnapType: 'x mandatory', width: VIEWPORT_WIDTH }}
          >
            {newProducts.map(renderProductItem)}
          </div>
          <div
            ref={scrollHotRef}
            className={`flex gap-4 overflow-hidden no-scrollbar transition-all mx-auto ${
              activeTab === 'hot' ? '' : 'hidden'
            }`}
            style={{ scrollSnapType: 'x mandatory', width: VIEWPORT_WIDTH }}
          >
            {hotProducts.map(renderProductItem)}
          </div>
        </div>

        <div className="absolute left-1/2 bottom-[-30px] transform -translate-x-1/2 flex gap-4 mt-3">
          <button
            onClick={() => handleScroll('prev')}
            className="w-9 h-9 rounded-md bg-gray-200 hover:bg-gray-300 text-base flex items-center justify-center"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button
            onClick={() => handleScroll('next')}
            className="w-9 h-9 rounded-md bg-gray-200 hover:bg-gray-300 text-base flex items-center justify-center"
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
