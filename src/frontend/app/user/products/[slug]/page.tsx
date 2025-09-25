'use client';

import "../../../../public/css/product_detail.css";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/utils/axiosConfig';
import type { AxiosError } from 'axios';
import { createPortal } from 'react-dom';
import ProductComments from '@/components/ProductComments/ProductComments';

/* ========= Helpers tên màu & ảnh ========= */
type ColorField = string | { _id: string; name?: string } | null | undefined;

const getColorName = (c: ColorField, fallback = 'màu') => {
  if (!c) return fallback;
  if (typeof c === 'string') return fallback;
  return c.name || fallback;
};
const isColorObj = (c: ColorField): c is { _id: string; name?: string } =>
  typeof c === 'object' && c !== null && '_id' in c;
const getColorId = (c: ColorField) => (isColorObj(c) ? c._id : '');

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const toImg = (img?: string) =>
  !img ? '/images/no-image.png' : /^https?:\/\//.test(img) ? img : `${API_BASE}${img}`;

/* ========= Types ========= */
interface VariantSize {
  size: { _id: string; name: string; height: string; weight: string };
  quantity: number;
  sold: number;
  isActive: boolean;
}
interface Variant {
  _id?: string;
  color: { _id: string; name: string } | string | null;
  image: string;
  sizes: VariantSize[];
  isActive: boolean;
}
interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discount: number;
  isActive: boolean;
  category: { name: string };
  brand: { name: string };
  variants: Variant[];
}

/* ========= Modal state ========= */
type ModalKind = 'info' | 'success' | 'error' | 'login';
interface ModalBtn { label: string; onClick: () => void }
interface ModalState {
  open: boolean;
  kind: ModalKind;
  title: string;
  message?: string;
  primary?: ModalBtn;
  secondary?: ModalBtn;
}

export default function ProductDetailPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'return' | 'reviews'>('details');
  const [loading, setLoading] = useState(false);

  const [showNeedSize, setShowNeedSize] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    kind: 'info',
    title: '',
  });

  const [mounted, setMounted] = useState(false);
  const sizeRef = useRef<HTMLDivElement>(null);
  const openNeedSize = () => setShowNeedSize(true);

  useEffect(() => setMounted(true), []);

  // Khóa cuộn khi có bất kỳ popup nào mở
  useEffect(() => {
    const anyOpen = showNeedSize || modal.open;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showNeedSize, modal.open]);

  const user =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') || localStorage.getItem('userInfo') || 'null')
      : null;

  /* ===== Helpers tồn kho ===== */
  const getSizeAvailable = (s: VariantSize) => Math.max(0, s.quantity - s.sold);
  const getVariantAvailable = (v: Variant) => v.sizes.reduce((sum, s) => sum + getSizeAvailable(s), 0);
  const getTotalAvailable = (p: Product) => p.variants.reduce((sumV, v) => sumV + getVariantAvailable(v), 0);
  const stockBadge = (available: number) => {
    if (available === 0) return <span className="text-red-500 font-semibold">Hết hàng</span>;
    if (available <= 5) return <span className="text-red-500 font-semibold">Sắp hết hàng</span>;
    return <span className="text-green-600 font-semibold">Còn hàng</span>;
  };

  useEffect(() => {
    if (!slug) return;
    axios
      .get(`/api/products/slug/${slug}`)
      .then((res) => {
        setProduct(res.data);
        const firstImg = res.data?.variants?.[0]?.image;
        setMainImage(toImg(firstImg));
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [slug]);

  useEffect(() => { setSelectedSize(null); }, [selectedColor]);

  // CLAMP số lượng theo tồn kho
  useEffect(() => {
    if (!product) return;
    if (selectedSize === null || !product.variants[selectedColor]) {
      setQuantity(1); return;
    }
    const v = product.variants[selectedColor];
    const remain = Math.max(0, v.sizes[selectedSize].quantity - v.sizes[selectedSize].sold);
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, remain)));
  }, [product, selectedColor, selectedSize]);

  if (isLoading || !product) {
    return <div className="w-full h-[60vh] flex items-center justify-center text-gray-500 text-sm">Đang tải sản phẩm...</div>;
  }

  const variant = product.variants[selectedColor];
  const size = selectedSize !== null ? variant?.sizes[selectedSize] : null;
  const discountPrice = Math.max(0, (product.price || 0) - (product.discount || 0));
  const selectedRemain =
    selectedSize !== null && variant
      ? Math.max(0, variant.sizes[selectedSize].quantity - variant.sizes[selectedSize].sold)
      : null;

  /* ===== Add to cart / Buy now ===== */
  const handleAddToCart = async (redirectToPayment: boolean = false) => {
    if (!user?._id) {
      setModal({
        open: true,
        kind: 'login',
        title: 'Bạn cần đăng nhập',
        message: 'Vui lòng đăng nhập để tiếp tục mua hàng.',
        primary: { label: 'Đăng nhập', onClick: () => { setModal((m) => ({ ...m, open: false })); router.push('/user/login'); } },
        secondary: { label: 'Hủy', onClick: () => setModal((m) => ({ ...m, open: false })) },
      });
      return;
    }
    // chưa chọn size/màu
    if (!variant || selectedSize === null) {
      openNeedSize();
      return;
    }
    // size hết hàng
    if (size && getSizeAvailable(size) === 0) {
      setModal({
        open: true,
        kind: 'error',
        title: 'Size này đã hết hàng',
        message: 'Vui lòng chọn size khác.',
        primary: { label: 'Đã hiểu', onClick: () => setModal((m) => ({ ...m, open: false })) },
      });
      return;
    }
    // vượt tồn kho
    const maxQty = selectedRemain ?? 0;
    if (quantity > maxQty) {
      setQuantity(Math.max(1, maxQty));
      setModal({
        open: true,
        kind: 'info',
        title: 'Vượt quá tồn kho',
        message: `Số lượng tối đa còn lại là ${maxQty}.`,
        primary: { label: 'Đã hiểu', onClick: () => setModal((m) => ({ ...m, open: false })) },
      });
      return;
    }

    setLoading(true);
    const payload = {
      user_id: user._id,
      productId: product._id,
      sizeId: size?.size._id || '',
      sizeName: size?.size.name || '',
      colorId: getColorId(variant.color),
      colorName: getColorName(variant.color, ''),
      name: product.name,
      image: variant.image,
      price: discountPrice,
      oldPrice: product.price,
      quantity,
    };

    try {
      await axios.post('/api/cart/add', payload);
      if (redirectToPayment) {
        const buyNowItems = [{
          _id: undefined,
          productId: payload.productId,
          name: payload.name,
          image: payload.image,
          price: payload.price,
          quantity: payload.quantity,
          sizeId: payload.sizeId,
          sizeName: payload.sizeName,
          colorId: payload.colorId,
          colorName: payload.colorName,
        }];

        if (!localStorage.getItem('userId')) localStorage.setItem('userId', user._id);
        localStorage.setItem('payment_products', JSON.stringify(buyNowItems));
        localStorage.removeItem('payment_voucher');
        router.push('/user/payment');
      } else {
        // Thêm vào giỏ hàng thành công
        setModal({
          open: true,
          kind: 'success',
          title: 'Đã thêm vào giỏ hàng',
          message: 'Sản phẩm đã được thêm vào giỏ của bạn.',
          primary: { label: 'Xem giỏ hàng', onClick: () => { setModal((m) => ({ ...m, open: false })); router.push('/user/cart'); } },
          secondary: { label: 'Tiếp tục mua', onClick: () => setModal((m) => ({ ...m, open: false })) },
        });
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      setModal({
        open: true,
        kind: 'error',
        title: 'Không thêm được vào giỏ hàng',
        message: e.response?.data?.message || 'Đã xảy ra lỗi, vui lòng thử lại.',
        primary: { label: 'Đã hiểu', onClick: () => setModal((m) => ({ ...m, open: false })) },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex gap-1 pd-grid">
        {/* Hình ảnh */}
        <div className="w-39">
          <div className="rounded-md border overflow-hidden image-product anh-sp">
            <img src={toImg(mainImage)} alt="Ảnh sản phẩm" className="w-full h-full aspect-[4/5] object-contain"/>
          </div>

          {/* Thumbnail */}
          <div className="mt-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar w-39">
              {product.variants.map((v, i) => {
                const thumbUrl = toImg(v.image);
                const isActive = selectedColor === i;
                return (
                  <div
                    key={i}
                    className="w-20 aspect-[3/4] flex-shrink-0 cursor-pointer overflow-hidden relative anh-phu rounded-md border border-[#ccc]"
                    onClick={() => { setSelectedColor(i); setMainImage(thumbUrl); setSelectedSize(null); }}
                    title={getColorName(v.color)}
                  >
                    <img src={thumbUrl} alt={`Ảnh ${getColorName(v.color)}`} className="w-full h-full object-cover"/>
                    {isActive && (
                      <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-md z-10">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Thông tin sản phẩm */}
        <div className="wi-60">
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>

          <p className="text-sm mb-2 flex flex-wrap gap-4 items-center">
            <span>Danh mục: <span className="text-color-blue">{product.category.name}</span></span>
            <span>Thương hiệu: <span className="text-color-blue">{product.brand.name}</span></span>
            <span>Đã bán: <span className="text-color-red">
              {product.variants.reduce((t, v) => t + v.sizes.reduce((s, sz) => s + sz.sold, 0), 0)}
            </span></span>
            <span>
              Tình trạng:&nbsp;
              {(() => {
                if (selectedSize === null) {
                  const v = product.variants[selectedColor];
                  if (v) return stockBadge(getVariantAvailable(v));
                  return stockBadge(getTotalAvailable(product));
                }
                const v = product.variants[selectedColor];
                const s = v?.sizes[selectedSize] || null;
                return stockBadge(s ? getSizeAvailable(s) : 0);
              })()}
            </span>
          </p>

          <p className="mb-2">
            <span className="text-black-600 text-xl font-bold mr-2">Giá:</span>
            <span className="text-red-600 text-xl font-bold mr-2">{discountPrice.toLocaleString()}₫</span>
            {product.discount > 0 && (
              <>
                <del className="text-gray-400 mr-2">{product.price.toLocaleString()}₫</del>
                <span className="text-xs text-red-400">(-{product.discount.toLocaleString()}₫)</span>
              </>
            )}
          </p>

          {/* Mô tả NGẮN */}
          <div className="bg-gray-50 p-4 rounded-md text-sm mb-4 border border-[#ccc] an-mobile">
            <p><strong>Thiết kế thời thượng, chất liệu thoáng mát</strong> – mỗi sản phẩm đều mang đến
              sự tự tin và thoải mái tối đa cho mọi phong cách sống hiện đại.</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Thời trang năng động – phong cách hiện đại</li>
              <li>Chất liệu cao cấp, form dáng chuẩn</li>
              <li>Thoải mái, tự tin trong từng chuyển động</li>
              <li>Đa dạng mẫu mã, bắt kịp xu hướng</li>
              <li>Phù hợp mọi cá tính – sẵn sàng mọi hoàn cảnh</li>
            </ul>
          </div>

          {/* Màu sắc */}
          <div className="my-4">
            <label className="block font-semibold mb-1">Màu sắc:</label>
            <div className="flex gap-2">
              {product.variants.map((v, i) => (
                <div key={i} className="relative">
                  <button
                    onClick={() => { setSelectedColor(i); setMainImage(toImg(v.image)); setSelectedSize(null); }}
                    className="px-3 py-1 rounded border text-sm relative bg-white text-black border-gray-300"
                  >
                    {getColorName(v.color)}
                  </button>
                  {i === selectedColor && (
                    <span className="absolute -top-2 -right-2 bg-green-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-md z-10">✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="my-4" ref={sizeRef}>
            <label className="block font-semibold mb-1">
              Kích thước:
              {size && <span className="ml-2 text-sm text-gray-500">{size.size.name} ({size.size.height}cm | {size.size.weight}kg)</span>}
            </label>
            <div className="flex items-center flex-wrap gap-2">
              {variant?.sizes.map((s, i) => {
                const available = Math.max(0, s.quantity - s.sold);
                const picked = selectedSize === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedSize(i)}
                    className={`px-3 py-1 rounded border text-sm ${picked ? 'text-white' : 'bg-white text-black border-gray-300'} ${available === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={picked ? { backgroundColor: '#001F5D' } : {}}
                    disabled={available === 0}
                    title={available === 0 ? 'Hết hàng' : ''}
                  >
                    {s.size.name}
                  </button>
                );
              })}
              {selectedSize !== null && (
                <span className="ml-3 text-sm font-semibold text-gray-600 whitespace-nowrap">
                  {(() => {
                    const s = variant.sizes[selectedSize];
                    const remain = Math.max(0, s.quantity - s.sold);
                    return remain <= 0 ? 'Hết' : `Còn lại: ${remain}`;
                  })()}
                </span>
              )}
            </div>
          </div>

          {/* Số lượng + nút */}
          <div className="my-4 items-center gap-4 xuong-dong">
            <label className="font-semibold">Số lượng:</label>

            <div className="inline-flex items-stretch overflow-hidden rounded-md border border-[#ccc] bg-gray-100">
              <button
                type="button"
                aria-label="Giảm"
                onClick={() => { if (selectedSize === null) { setShowNeedSize(true); return; } setQuantity((p) => Math.max(1, p - 1)); }}
                className="h-10 px-4 grid place-items-center text-lg select-none hover:bg-gray-200 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={quantity <= 1}
              >–</button>

              <div className="h-10 px-5 min-w-[72px] grid place-items-center bg-white border-x border-[#ccc] text-base font-medium select-none">{quantity}</div>

              <button
                type="button"
                aria-label="Tăng"
                onClick={() => { if (selectedSize === null) { setShowNeedSize(true); return; } setQuantity((p) => Math.min(p + 1, selectedRemain ?? 1)); }}
                className="h-10 px-4 grid place-items-center text-lg select-none hover:bg-gray-200 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedRemain !== null && quantity >= selectedRemain}
              >+</button>
            </div>

            <button className="bg-white border px-4 py-2 font-semibold rounded-md khoang-cach" style={{ borderColor: '#001F5D' }} disabled={loading} onClick={() => handleAddToCart(false)}>
              {loading ? 'Đang thêm...' : 'THÊM VÀO GIỎ HÀNG'}
            </button>
            <button className="text-white px-4 py-2 font-semibold rounded-md" style={{ backgroundColor: '#001F5D' }} disabled={loading} onClick={() => handleAddToCart(true)}>
              MUA NGAY
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <div className="border-b mb-4 flex gap-8 text-sm font-semibold">
          <button className={`${activeTab === 'details' ? 'border-b-2 border-black text-black' : 'text-gray-500'}`} onClick={() => setActiveTab('details')}>Chi tiết sản phẩm</button>
          <button className={`${activeTab === 'return' ? 'border-b-2 border-black text-black' : 'text-gray-500'}`} onClick={() => setActiveTab('return')}>Chính sách đổi & trả hàng</button>
          <button className={`${activeTab === 'reviews' ? 'border-b-2 border-black text-black' : 'text-gray-500'}`} onClick={() => setActiveTab('reviews')}>Đánh giá & Nhận xét</button>
        </div>

        {/* Nội dung tab */}
        {activeTab === 'details' && (
          <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: product.description }} />
        )}

        {activeTab === 'return' && (
          <div className="text-sm">
            {/* … (giữ nguyên nội dung chính sách như trước) … */}
            <p>Miễn phí nếu lỗi từ shop. Khách đổi do lý do cá nhân chịu phí 2 chiều, …</p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <ProductComments productId={product._id} userId={user?._id} />
        )}
      </div>

      {/* Popup chọn size */}
      {mounted && showNeedSize &&
        createPortal(
          <div className="fixed inset-0 z-[2147483647] bg-black/50 flex items-center justify-center" onClick={() => setShowNeedSize(false)}>
            <div className="relative bg-white rounded-lg shadow-2xl p-5 w-[92%] max-w-[360px] text-center" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-2">Vui lòng chọn size</h3>
              <p className="text-sm text-gray-600 mb-4">Bạn cần chọn kích thước trước khi thay đổi số lượng hoặc mua hàng.</p>
              <button className="px-4 py-2 rounded-md text-white" style={{ backgroundColor: '#001F5D' }} onClick={() => setShowNeedSize(false)}>Đã hiểu</button>
            </div>
          </div>,
          document.body
        )
      }

      {/* Popup chung (đăng nhập / thành công / lỗi / info) */}
      {mounted && modal.open &&
        createPortal(
          <div className="fixed inset-0 z-[2147483647] bg-black/50 flex items-center justify-center" onClick={() => setModal((m) => ({ ...m, open: false }))}>
            <div className="relative bg-white rounded-xl shadow-2xl p-6 w-[92%] max-w-[420px]" onClick={(e) => e.stopPropagation()}>
              {/* Header icon theo loại */}
              <div className="mx-auto mb-3 w-12 h-12 rounded-full grid place-items-center"
                   style={{
                     backgroundColor:
                       modal.kind === 'success' ? '#E8F5E9' :
                       modal.kind === 'error'   ? '#FDECEA' :
                       modal.kind === 'login'   ? '#E3F2FD' : '#F3F4F6'
                   }}>
                <span className="text-xl">
                  {modal.kind === 'success' ? '✓' : modal.kind === 'error' ? '!' : modal.kind === 'login' ? '🔒' : 'ℹ️'}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-center mb-1">{modal.title}</h3>
              {modal.message && <p className="text-sm text-gray-600 text-center mb-5">{modal.message}</p>}

              <div className="flex items-center justify-center gap-3">
                {modal.secondary && (
                  <button
                    className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                    onClick={modal.secondary.onClick}
                  >
                    {modal.secondary.label}
                  </button>
                )}
                {modal.primary && (
                  <button
                    className="px-4 py-2 rounded-md text-white hover:opacity-95"
                    style={{ backgroundColor: '#001F5D' }}
                    onClick={modal.primary.onClick}
                  >
                    {modal.primary.label}
                  </button>
                )}
                {!modal.primary && !modal.secondary && (
                  <button
                    className="px-4 py-2 rounded-md text-white"
                    style={{ backgroundColor: '#001F5D' }}
                    onClick={() => setModal((m) => ({ ...m, open: false }))}
                  >
                    Đã hiểu
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
}
