'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import '../../../public/css/product.css';
import axios from 'axios';
import VariantPickerModal from '@/components/ui/VariantPickerModal';

// ================== Types ==================
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
interface Category { _id: string; name: string; slug: string; }
interface Brand { _id: string; name: string; image?: string; }
type SortKey = 'featured' | 'sold' | 'discount' | 'new' | 'price_asc' | 'price_desc';
interface ProductQueryParams {
  page: number; limit: number; search: string; status: 'active' | 'inactive'; sort: SortKey;
  minPrice?: number; maxPrice?: number; category?: string; brand?: string;
}

// ================== Const ==================
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// =======================================================
// ================== COMPONENT CHÍNH =====================
// =======================================================
export default function Products() {
  // -------- products meta --------
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15; // desktop mặc định
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('featured');

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // -------- Variant picker --------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'buy' | 'cart'>('buy');
  const [pickerSlug, setPickerSlug] = useState<string>('');
  const [pickerName, setPickerName] = useState<string>('');
  const [pickerImage, setPickerImage] = useState<string>('/images/no-image.png');

  const openPicker = (p: Product, mode: 'buy' | 'cart', fallbackImg?: string) => {
    setPickerSlug(p.slug);
    setPickerName(p.name);
    setPickerImage(fallbackImg || '/images/no-image.png');
    setPickerMode(mode);
    setPickerOpen(true);
  };

  // --------- FAVOURITES ----------
  const [userId, setUserId] = useState<string>('');
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [busyFav, setBusyFav] = useState<Set<string>>(new Set());

  // đọc user từ localStorage
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
        const res = await fetch(`${API}/api/favourites/${userId}`, { credentials: 'include' });
        const arr = await res.json();
        const ids = new Set<string>((Array.isArray(arr) ? arr : []).map((p: any) => p?._id).filter(Boolean));
        setFavSet(ids);
      } catch {
        setFavSet(new Set());
      }
    })();
  }, [userId]);

  const toggleFavourite = async (p: Product) => {
    if (!userId) {
      alert('Bạn cần đăng nhập để dùng Yêu thích!');
      router.push('/user/login');
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
        // Thêm yêu thích
        const r = await fetch(`${API}/api/favourites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ users_id: userId, products_id: pid }),
        });
        if (r.ok) {
          const s = new Set(favSet); s.add(pid); setFavSet(s);
          window.dispatchEvent(new Event('favourite:updated'));
          localStorage.setItem('favourite_updated', String(Date.now()));
          try { new BroadcastChannel('favourites').postMessage('updated'); } catch {}
        }
      } else {
        // Bỏ yêu thích
        const r = await fetch(`${API}/api/favourites/${userId}/${pid}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (r.ok) {
          const s = new Set(favSet); s.delete(pid); setFavSet(s);
          window.dispatchEvent(new Event('favourite:updated'));
          localStorage.setItem('favourite_updated', String(Date.now()));
          try { new BroadcastChannel('favourites').postMessage('updated'); } catch {}
        }
      }
    } finally {
      mark(false);
    }
  };
  // ---------------------------------------

  // ===== tiện ích URL / chips =====
  const setCategoryParamInUrl = (slugs: string[]) => {
    const qs = new URLSearchParams(searchParams.toString());
    if (slugs.length > 0) qs.set('category', slugs.join(','));
    else qs.delete('category');
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  };

  const clearSearch = () => {
    setSearch('');
    setPage(1);
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete('q');
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  };

  const quickPriceChips = [
    { label: 'Dưới 300k', min: 0, max: 300000 },
    { label: '300k - 500k', min: 300000, max: 500000 },
    { label: '500k - 700k', min: 500000, max: 700000 },
    { label: 'Trên 1.5 triệu', min: 1500000, max: 999999999 },
  ];

  const [activeChips, setActiveChips] = useState<{
    brands: string[];
    categories: string[]; // lưu SLUG
    price?: { min: number; max: number };
  }>({ brands: [], categories: [] });

  // popup filter (state tạm)
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempSelectedBrandIds, setTempSelectedBrandIds] = useState<string[]>([]);
  const [tempSelectedCategoryIds, setTempSelectedCategoryIds] = useState<string[]>([]); // SLUG
  const [tempPriceRange, setTempPriceRange] = useState<{ min: number; max: number } | null>(null);

  const openFilter = () => {
    setTempSelectedBrandIds([...activeChips.brands]);
    setTempSelectedCategoryIds([...activeChips.categories]);
    setTempPriceRange(activeChips.price ?? null);
    setFilterOpen(true);
  };
  const closeFilter = () => setFilterOpen(false);
  const clearTempFilter = () => {
    setTempSelectedBrandIds([]);
    setTempSelectedCategoryIds([]);
    setTempPriceRange(null);
  };
  const applyTempFilter = () => {
    setActiveChips({
      brands: tempSelectedBrandIds,
      categories: tempSelectedCategoryIds,
      price: tempPriceRange || undefined,
    });
    setCategoryParamInUrl(tempSelectedCategoryIds);
    setPage(1);
    setFilterOpen(false);
  };

  // chip brand nhanh
  const toggleBrandChip = (brandId: string) => {
    setActiveChips(prev => {
      const exists = prev.brands.includes(brandId);
      const brands = exists ? prev.brands.filter(b => b !== brandId) : [...prev.brands, brandId];
      return { ...prev, brands };
    });
    setPage(1);
  };
  const setPriceChip = (min: number, max: number) => {
    setActiveChips(prev => ({
      ...prev,
      price: prev.price && prev.price.min === min && prev.price.max === max ? undefined : { min, max },
    }));
    setPage(1);
  };

  // load brands & categories
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [brandRes, catRes] = await Promise.all([
          axios.get(`${API}/api/brands`, { params: { limit: 'all' } }),
          axios.get(`${API}/api/categories`, { params: { limit: 'all' } }),
        ]);
        setBrands(brandRes.data.brands || []);
        setCategories(catRes.data.categories || []);
      } catch {
        setBrands([]); setCategories([]);
      }
    };
    fetchMeta();
  }, []);

  // khởi tạo từ URL (?category=slug,slug)
  useEffect(() => {
    const qs = searchParams.get('category') || '';
    const slugs = qs.split(',').map(s => s.trim()).filter(Boolean);
    setActiveChips(prev => ({ ...prev, categories: slugs }));
    setPage(1);
  }, [searchParams]);

  // lấy q từ URL (Header đẩy sang)
  useEffect(() => {
    const q = (searchParams.get('q') || '').trim();
    if (q !== search) {
      setSearch(q);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ====== Responsive page size (mobile: 2 cột × 10 hàng = 20/sp trang) ======
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handle = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 640);
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  const pageSize = isMobile ? 20 : limit;

  // ====== Lấy dữ liệu từ API ======
  useEffect(() => { fetchProducts(); /* eslint-disable-next-line */ }, [page, search, sort, JSON.stringify(activeChips), categories, pageSize]);

  const sortOptions: { k: SortKey; t: string }[] = [
    { k: 'featured', t: 'Tất cả' },
    { k: 'sold', t: 'Bán chạy' },
    { k: 'discount', t: 'Giảm giá' },
    { k: 'new', t: 'Mới' },
  ];

  const fetchProducts = async () => {
    const clientWide = sort === 'discount' || sort === 'sold' || sort === 'new' || sort === 'price_asc' || sort === 'price_desc';
    const reqLimit = clientWide ? 1000 : pageSize; // mobile -> 20/sp trang

    const query: ProductQueryParams = {
      page: clientWide ? 1 : page,
      limit: reqLimit,
      search: search.trim(),
      status: 'active',
      sort,
    };

    if (activeChips.brands.length > 0) query.brand = activeChips.brands.join(',');

    // categories trong state là SLUG => map sang _id để API hiểu
    if (activeChips.categories.length > 0) {
      const catIds = activeChips.categories
        .map(slugOrId => {
          const found = categories.find(c => c.slug === slugOrId || c._id === slugOrId);
          return found?._id;
        })
        .filter(Boolean) as string[];
      query.category = catIds.length > 0 ? catIds.join(',') : activeChips.categories.join(',');
    }

    if (activeChips.price) {
      query.minPrice = activeChips.price.min;
      query.maxPrice = activeChips.price.max;
    }

    try {
      const res = await axios.get(`${API}/api/products`, { params: query });
      const list = res.data.items || res.data.products || [];
      setProducts(Array.isArray(list) ? list : []);
      setTotal(Number(res.data.total) || 0);
    } catch {
      setProducts([]); setTotal(0);
    }
  };

  // ===== Helpers + sort client =====
  const getTotalSold = (p: Product) =>
    (p.variants || []).reduce((sum, v) => {
      if (!v.isActive) return sum;
      const soldInVariant = (v.sizes || []).reduce((s, sz) => s + (sz.isActive ? (sz.sold || 0) : 0), 0);
      return sum + soldInVariant;
    }, 0);

  const getFinalPrice = (p: Product) => (p.price || 0) - (p.discount || 0);

  // 👉 helper: tổng tồn
  const getTotalAvailable = (p: Product) =>
    (p.variants || []).reduce((sum, v) => {
      if (!v.isActive) return sum;
      const left = (v.sizes || []).reduce((s, sz) => {
        if (!sz.isActive) return s;
        const remain = Math.max(0, (sz.quantity || 0) - (sz.sold || 0));
        return s + remain;
      }, 0);
      return sum + left;
    }, 0);

  const displayedAll = useMemo(() => {
    let arr = [...products];
    arr = arr.filter(p => {
      const activeVariants = p.variants?.filter(v => v.isActive && v.sizes?.some(s => s.isActive)) || [];
      // ⚠️ GIỮ SẢN PHẨM DÙ HẾT HÀNG: chỉ cần sản phẩm đang active
      return p.isActive; // (không loại khi activeVariants.length === 0)
    });
    switch (sort) {
      case 'sold': arr.sort((a, b) => getTotalSold(b) - getTotalSold(a)); break;
      case 'discount': arr = arr.filter(p => (p.discount || 0) > 0).sort((a, b) => (b.discount || 0) - (a.discount || 0)); break;
      case 'new':
        arr.sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        });
        break;
      case 'price_asc': arr.sort((a, b) => getFinalPrice(a) - getFinalPrice(b)); break;
      case 'price_desc': arr.sort((a, b) => getFinalPrice(b) - getFinalPrice(a)); break;
      default: break;
    }
    return arr;
  }, [products, sort]);

  const isClientWide =
    sort === 'discount' || sort === 'sold' || sort === 'new' || sort === 'price_asc' || sort === 'price_desc';

  const localTotalPages = useMemo(
    () => (isClientWide ? Math.max(1, Math.ceil(displayedAll.length / pageSize)) : Math.max(1, Math.ceil(total / pageSize))),
    [isClientWide, displayedAll.length, total, pageSize]
  );

  const itemsForGrid = useMemo(
    () => (isClientWide ? displayedAll.slice((page - 1) * pageSize, page * pageSize) : displayedAll),
    [isClientWide, displayedAll, page, pageSize]
  );

  // ================== RENDER ==================
  return (
    <main className="main-content products-page">
      <div className="container">
        <nav className="breadcrumb">
        <Link href="/">Trang chủ</Link> /{' '}
        <span className="current">
          <Link href="/user/products" style={{ color: '#2c2929ff' }}>Sản phẩm</Link>
        </span>
      </nav>

        {/* Dải chip filter + brand + price nhanh */}
        <div className="flex gap-2 flex-wrap items-center mb-3">
          <button type="button" className="px-3 py-1 rounded-full border text-sm flex items-center gap-2" onClick={openFilter}>
            <i className="fa fa-filter" /> Lọc
          </button>

          {/* Chip từ khóa (bấm × để xóa) */}
          {search?.trim() && (
            <span className="px-3 py-1 rounded-full border text-sm bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-2 mobile-hide">
              Từ khóa: “{search}”
              <button type="button" onClick={clearSearch} className="ml-1 leading-none" aria-label="Xóa từ khóa tìm kiếm" title="Xóa từ khóa tìm kiếm">×</button>
            </span>
          )}

          {/* Brand chips (logo) */}
          <div className="flex flex-wrap gap-3 mobile-hide">
            {brands.map(b => {
              const active = activeChips.brands.includes(b._id);
              const src = b.image?.startsWith('http') ? b.image : b.image ? `${API}${b.image}` : '/images/brand-placeholder.png';
              return (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => toggleBrandChip(b._id)}
                  title={b.name}
                  className={`rounded-2xl border px-4 py-2 flex items-center justify-center transition ${
                    active ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={{ minWidth: 60, minHeight: 40 }}
                >
                  <img src={src} alt={b.name} style={{ width: 86, height: 24, objectFit: 'contain', display: 'block' }} />
                </button>
              );
            })}
          </div>

          {/* Price quick chips */}
          <div className="flex gap-2 mobile-hide">
            {quickPriceChips.map(ch => {
              const active = !!activeChips.price && activeChips.price.min === ch.min && activeChips.price.max === ch.max;
              return (
                <button key={ch.label} type="button" onClick={() => setPriceChip(ch.min, ch.max)}
                        className={`px-3 py-1 rounded-full text-sm ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* sort */}
        <div className="flex items-center gap-3 text-sm mb-3 mobile-hide">
          <span className="text-gray-600">Sắp xếp theo:</span>
          {['featured','sold','discount','new'].map((k) => {
            const opt = { featured:'Tất cả', sold:'Bán chạy', discount:'Giảm giá', new:'Mới' } as Record<string,string>;
            return (
              <button key={k} onClick={() => { setSort(k as SortKey); setPage(1); }}
                      className={sort === k ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-black'}>
                {opt[k]}
              </button>
            );
          })}
          <div className="relative">
            <select value={sort} onChange={(e: ChangeEvent<HTMLSelectElement>) => { setSort(e.target.value as SortKey); setPage(1); }}
                    className="border rounded px-2 py-1">
              <option value="featured">Tất cả</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
            </select>
          </div>
        </div>

        {/* danh sách sản phẩm */}
        <section className="product-content">
          <h2 className="product-title">TẤT CẢ SẢN PHẨM</h2>

          {!Array.isArray(itemsForGrid) || itemsForGrid.length === 0 ? (
            <div className="text-center text-gray-500 text-lg py-12">Không có sản phẩm nào phù hợp.</div>
          ) : (
            <>
              <div className="row-3">
                {itemsForGrid.map(p => {
                  const activeVariants = p.variants.filter(v => v.isActive && v.sizes.some(s => s.isActive));
                  const discountPrice = (p.price || 0) - (p.discount || 0);
                  const firstImage = activeVariants[0]?.image;
                  const imageUrl = firstImage ? `${API}${firstImage}` : '/images/no-image.png';
                  const totalSold = (p.variants || []).reduce((sum, v) => {
                    if (!v.isActive) return sum;
                    const soldInVariant = (v.sizes || []).reduce((s, sz) => s + (sz.isActive ? (sz.sold || 0) : 0), 0);
                    return sum + soldInVariant;
                  }, 0);
                  const detailHref = `/user/products/${p.slug}`;

                  const isFav = favSet.has(p._id);
                  const isBusy = busyFav.has(p._id);

                  // 👉 tính còn hàng
                  const totalAvailable = getTotalAvailable(p);
                  const outOfStock = totalAvailable <= 0;

                  return (
                    <div key={p._id} className="col-5-sp">
                      <div className="img-sp" style={{ position: 'relative' }}>
                        <Link href={detailHref} aria-label={p.name} className="block" style={{ width: '100%', height: '100%'}}>
                          <img
                            src={imageUrl}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }}
                          />
                        </Link>

                        {outOfStock && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 10,
                              left: 10,
                              background: 'rgba(0,0,0,0.7)',
                              color: '#fff',
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              letterSpacing: 0.2,
                            }}
                          >
                            Hết hàng
                          </span>
                        )}
                      </div>

                      <div className="trang-sp">
                        <div className="text-sp">
                          <div className="left-sp">
                            <p className="name-sp">{p.name}</p>
                            <p style={{ color: '#cd1919', fontSize: 16, fontWeight: 550, marginBottom: 7 }}>
                              {p.discount > 0 ? (
                                <>
                                  {discountPrice.toLocaleString()}₫{' '}
                                  <del style={{ color: '#979797', fontSize: 14 }}>{p.price.toLocaleString()}₫</del>
                                </>
                              ) : (<>{p.price.toLocaleString()}₫</>)}
                            </p>

                            <p style={{ color: '#333', marginBottom: 8 }}>
                              Đã bán: <span style={{ color: '#cd1919' }}>{totalSold.toLocaleString()}</span>
                            </p>

                            {/* Mua ngay: mở VariantPickerModal */}
                            {/* Nút mua: đổi thành “Hết hàng” nhưng giữ giao diện cũ (anchor styled) */}
                            {outOfStock ? (
                              <a
                                href={detailHref}
                                onClick={(e) => e.preventDefault()}
                                style={{
                                  pointerEvents: 'none',
                                  cursor: 'not-allowed',
                                  background: '#e5e7eb',
                                  color: '#6b7280',
                                  border: '1px solid #e5e7eb',
                                  opacity: 0.95
                                }}
                                aria-disabled="true"
                                title="Hết hàng"
                              >
                                Hết hàng
                              </a>
                            ) : (
                              <Link
                                href={detailHref}
                                onClick={(e) => { e.preventDefault(); openPicker(p, 'buy', imageUrl); }}
                                title="Mua ngay"
                              >
                                Mua ngay
                              </Link>
                            )}
                          </div>

                          <div className="right-sp">
                            {/* ♥ vẫn cho yêu thích kể cả hết hàng */}
                            <button
                              className="heart-btn"
                              aria-pressed={isFav}
                              aria-label={isFav ? 'Hủy yêu thích' : 'Yêu thích'}
                              title={isFav ? 'Hủy yêu thích' : 'Yêu thích'}
                              onClick={() => toggleFavourite(p)}
                              disabled={isBusy}
                            >
                              <i className="fa-solid fa-heart" />
                            </button>

                            {/* thêm vào giỏ: nếu hết hàng -> disable (ẩn trên mobile bằng CSS) */}
                            <button
                              title={outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
                              onClick={() => !outOfStock && openPicker(p, 'cart', imageUrl)}
                              disabled={outOfStock}
                              style={outOfStock ? { cursor: 'not-allowed', opacity: 0.6 } : undefined}
                            >
                              <i className="fa-solid fa-cart-plus"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {localTotalPages > 1 && (
                <div className="flex justify-center mt-10 space-x-2 text-sm">
                  <button className="px-3 py-1 border rounded-md bg-gray-100 text-gray-400 disabled:cursor-not-allowed"
                          onClick={() => page > 1 && setPage(page - 1)} disabled={page === 1}>
                    <i className="fa-solid fa-angle-left"></i>
                  </button>
                  {Array.from({ length: localTotalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    if (pageNum === 1 || pageNum === localTotalPages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                      return (
                        <button key={pageNum} onClick={() => setPage(pageNum)}
                                className={`px-3 py-1 border rounded-md ${page === pageNum ? 'bg-blue-600 text-white font-semibold shadow' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                          {pageNum}
                        </button>
                      );
                    } else if ((pageNum === page - 2 && page > 3) || (pageNum === page + 2 && page < localTotalPages - 2)) {
                      return <span key={`dots-${pageNum}`} className="px-3 py-1 text-gray-500">...</span>;
                    } else return null;
                  })}
                  <button className="px-3 py-1 border rounded-md bg-white text-gray-700 hover:bg-gray-100"
                          onClick={() => page < localTotalPages && setPage(page + 1)} disabled={page === localTotalPages}>
                    <i className="fa-solid fa-angle-right"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* POPUP LỌC (đã thu nhỏ chuẩn mobile) */}
{filterOpen && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3">
    {/* nền mờ */}
    <div className="absolute inset-0 bg-black/45" onClick={closeFilter} />

    {/* KHUNG POPUP: luôn nhỏ gọn trên mobile */}
    <div className="filter-modal relative bg-white w-full max-w-[420px] sm:max-w-[560px] rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">

      {/* Header sticky */}
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2 text-blue-600 font-semibold">
          <i className="fa fa-filter" />
          <span>Lọc sản phẩm</span>
        </div>
        <button onClick={closeFilter} className="px-3 py-1 rounded border">Đóng</button>
      </div>

      {/* Nội dung (cuộn trong khung) */}
      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {/* Hãng */}
        <div>
          <h4 className="font-semibold mb-3">Hãng</h4>
          <div className="flex flex-wrap gap-3">
            {brands.map(b => {
              const checked = tempSelectedBrandIds.includes(b._id);
              const src = b.image?.startsWith('http') ? b.image : b.image ? `${API}${b.image}` : '/images/brand-placeholder.png';
              return (
                <button
                  key={b._id}
                  onClick={() =>
                    setTempSelectedBrandIds(prev =>
                      prev.includes(b._id) ? prev.filter(id => id !== b._id) : [...prev, b._id]
                    )
                  }
                  className={`rounded-2xl border px-4 py-2 flex items-center justify-center transition ${
                    checked ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 bg-gray-100 hover:bg-gray-200'
                  }`}
                  title={b.name}
                  style={{ minWidth: 35, minHeight: 25 }}
                >
                  <img src={src} alt={b.name} style={{ width: 86, height: 24, objectFit: 'contain', display: 'block' }} />
                </button>
              );
            })}
          </div>
        </div>

        <hr />

        {/* Danh mục */}
        <div>
          <h4 className="font-semibold mb-3">Danh mục</h4>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => {
              const active = tempSelectedCategoryIds.includes(c.slug);
              return (
                <button
                  key={c._id}
                  onClick={() =>
                    setTempSelectedCategoryIds(prev =>
                      prev.includes(c.slug) ? prev.filter(slug => slug !== c.slug) : [...prev, c.slug]
                    )
                  }
                  className={`px-3 py-2 rounded-md border text-sm ${
                    active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <hr />

        {/* Giá */}
        <div>
          <h4 className="font-semibold mb-3">Giá</h4>
          <div className="flex flex-wrap gap-2">
            {quickPriceChips.map(ch => {
              const active = !!tempPriceRange && tempPriceRange.min === ch.min && tempPriceRange.max === ch.max;
              return (
                <button
                  key={ch.label}
                  onClick={() => setTempPriceRange(active ? null : { min: ch.min, max: ch.max })}
                  className={`px-3 py-2 rounded-md border text-sm ${
                    active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer sticky */}
      <div className="p-4 border-t flex items-center justify-between sticky bottom-0 bg-white">
        <button
          onClick={() => {
            clearTempFilter();
            setActiveChips(prev => ({ ...prev, categories: [] }));
            setCategoryParamInUrl([]);
            setPage(1);
          }}
          className="px-4 py-2 rounded bg-red-50 text-red-600 border border-red-200"
        >
          Bỏ chọn
        </button>
        <button onClick={applyTempFilter} className="px-4 py-2 rounded bg-blue-600 text-white">
          Áp dụng
        </button>
      </div>
    </div>
  </div>
)}



        {/* Popup chọn biến thể */}
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
