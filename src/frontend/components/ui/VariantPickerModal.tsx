'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios, { isAxiosError } from 'axios'
import { createPortal } from 'react-dom'

type SizeObj =
  | { _id?: string; name?: string; height?: string; weight?: string }
  | string

type VariantSize = {
  size?: SizeObj
  quantity?: number
  sold?: number
  isActive?: boolean
}

type Variant = {
  color?: { _id?: string; name?: string } | null
  image: string
  isActive?: boolean
  sizes: VariantSize[]
}

interface DetailProduct {
  _id: string
  name: string
  price: number
  discount: number
  slug: string
  category?: { _id: string; name: string } | null
  brand?: { _id: string; name: string } | null
  variants: Variant[]
}

interface Props {
  open: boolean
  onClose: () => void
  productSlug: string
  productNameFallback: string
  productImageFallback: string
  dealPercent?: number | null
  mode: 'buy' | 'cart'
}

const NAVY = '#001F5D'
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const toAbsImg = (img?: string, fallback = '') =>
  !img ? fallback : /^https?:\/\//.test(img) ? img : `${API_BASE}${img}`

// ===== Helpers tồn kho =====
const num = (v: unknown, d = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : d

const remainOf = (sz?: VariantSize): number =>
  Math.max(num(sz?.quantity) - num(sz?.sold), 0)

const sizeTitle = (s?: SizeObj) =>
  typeof s === 'string' ? s : s?.name || 'Size'

export default function VariantPickerModal({
  open,
  onClose,
  productSlug,
  productNameFallback,
  productImageFallback,
  dealPercent,
  mode,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [product, setProduct] = useState<DetailProduct | null>(null)
  const [colorIdx, setColorIdx] = useState<number | null>(null)
  const [sizeIdx, setSizeIdx] = useState<number | null>(null)
  const [qty, setQty] = useState(1)

  // Portal mount + khoá scroll nền khi mở
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted) return
    const prev = document.body.style.overflow
    if (open) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, mounted])

  // ===== Popups =====
  const [needSize, setNeedSize] = useState(false)   // nhắc chọn size
  const [needLogin, setNeedLogin] = useState(false) // nhắc đăng nhập
  const [addedOk, setAddedOk] = useState(false)     // NEW: thông báo thêm giỏ thành công

  // fetch chi tiết theo slug
  useEffect(() => {
    if (!open) return
    let alive = true
    const tryUrls = [
      `${API_BASE}/api/products/slug/${productSlug}`,
      `${API_BASE}/api/products/by-slug/${productSlug}`,
      `${API_BASE}/api/products/${productSlug}`,
    ]
    ;(async () => {
      setLoading(true)
      for (const url of tryUrls) {
        try {
          const res = await axios.get(url)
          if (!alive) return
          const p = res.data?.product || res.data
          if (p && p.slug) {
            setProduct(p)
            const firstIdx = (p.variants || []).findIndex(
              (v: Variant) => v?.isActive !== false
            )
            setColorIdx(firstIdx >= 0 ? firstIdx : 0)
            setSizeIdx(null)
            setQty(1)
            break
          }
        } catch {
          // thử url tiếp theo
        }
      }
      if (alive) setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [open, productSlug])

  const selectedVariant = useMemo(
    () =>
      product && colorIdx !== null ? product.variants?.[colorIdx] || null : null,
    [product, colorIdx]
  )

  // ===== Số lượng tối đa = quantity - sold (còn lại)
  const maxQty = useMemo(() => {
    const sz = selectedVariant?.sizes?.[sizeIdx ?? -1]
    const left = remainOf(sz)
    return Math.max(1, left)
  }, [selectedVariant, sizeIdx])

  const priceNow = useMemo(() => {
    const base = product?.price || 0
    const pct =
      typeof dealPercent === 'number' && dealPercent > 0
        ? clamp01(dealPercent / 100)
        : null
    if (pct !== null) return Math.round(base * (1 - pct))
    return Math.max(0, base - (product?.discount || 0))
  }, [product, dealPercent])

  const percentBadge = useMemo(() => {
    if (typeof dealPercent === 'number' && dealPercent > 0)
      return Math.round(dealPercent)
    if (product && product.discount > 0)
      return Math.round((product.discount / product.price) * 100)
    return 0
  }, [product, dealPercent])

  const colorTitle = (v: Variant, i: number) => v?.color?.name || `Màu ${i + 1}`

  // disable size khi hết hàng hoặc bị ẩn
  const disableSize = (sz: VariantSize) =>
    sz?.isActive === false || remainOf(sz) <= 0

  // ======= XÁC NHẬN (GỌI API CART + ĐIỀU HƯỚNG) =======
  const confirm = async () => {
    // Chưa chọn size → nhắc
    if (sizeIdx === null) {
      setNeedSize(true)
      return
    }
    if (!product || colorIdx === null) return

    // Chưa đăng nhập → chỉ lúc bấm CTA mới nhắc đăng nhập
    const user =
      typeof window !== 'undefined'
        ? JSON.parse(
            localStorage.getItem('user') ||
              localStorage.getItem('userInfo') ||
              'null'
          )
        : null
    if (!user?._id) {
      setNeedLogin(true)
      return
    }

    const v = product.variants[colorIdx]
    const sz = v?.sizes?.[sizeIdx]

    const sizeId =
      typeof sz?.size === 'string' ? sz?.size || '' : sz?.size?._id || ''
    const sizeName =
      typeof sz?.size === 'string' ? sz?.size || '' : sz?.size?.name || ''
    const colorId = v?.color?._id || ''
    const colorName = v?.color?.name || ''

    // CHẶN theo tồn kho (dù UI đã giới hạn)
    const safeQty = Math.min(qty, maxQty)

    const payload = {
      user_id: user._id,
      productId: product._id,
      sizeId,
      colorId,
      price: priceNow,
      quantity: safeQty,
      name: product.name,
      image: v?.image || '',
      sizeName,
      colorName,
      oldPrice: product.price,
    }

    try {
      setLoading(true)
      await axios.post(`${API_BASE}/api/cart/add`, payload)

      if (mode === 'buy') {
        const buyNowItems = [
          {
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
          },
        ]
        if (!localStorage.getItem('userId')) {
          localStorage.setItem('userId', user._id)
        }
        localStorage.setItem('payment_products', JSON.stringify(buyNowItems))
        localStorage.removeItem('payment_voucher')
        localStorage.setItem('payment_from', 'buyNow')

        onClose()
        router.push('/user/payment')
      } else {
        // NEW: đảm bảo userId có trong localStorage để trang giỏ đọc được
        if (!localStorage.getItem('userId')) {
          localStorage.setItem('userId', user._id)
        }
        // NEW: hiện popup thông báo thành công (thay vì alert)
        setAddedOk(true)
        // KHÔNG đóng modal ngay để người dùng thấy popup (giữ nguyên các phần khác)
      }
    } catch (error: unknown) {
      let message = 'Không thêm được vào giỏ hàng!'
      if (isAxiosError(error)) {
        message += '\n' + (error.response?.data?.message || error.message)
      } else if (error instanceof Error) {
        message += '\n' + error.message
      }
      alert(message)
    } finally {
      setLoading(false)
    }
  }
  // ====================================================

  if (!open || !mounted) return null

  const detailHref = `/user/products/${product?.slug || productSlug}`
  const totalSold =
    product?.variants?.reduce(
      (sum, v) => sum + (v.sizes?.reduce((s, sz) => s + num(sz.sold), 0) || 0),
      0
    ) || 0

  const inStock =
    product?.variants?.some((v) => v.sizes?.some((sz) => remainOf(sz) > 0)) ??
    true

  // Popup “Vui lòng chọn size”
  const needSizePortal =
    mounted && needSize
      ? createPortal(
          <div
            className="fixed inset-0 z-[2147483647] bg-black/50 flex items-center justify-center"
            onClick={() => setNeedSize(false)}
          >
            <div
              className="relative bg-white rounded-lg shadow-2xl p-5 w-[92%] max-w-[360px] text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">Vui lòng chọn size</h3>
              <p className="text-sm text-gray-600 mb-4">
                Bạn cần chọn kích thước trước khi mua hàng.
              </p>
              <button
                className="px-4 py-2 rounded-md text-white"
                style={{ backgroundColor: NAVY }}
                onClick={() => setNeedSize(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>,
          document.body
        )
      : null

  // Popup “Cần đăng nhập”
  const needLoginPortal =
    mounted && needLogin
      ? createPortal(
          <div
            className="fixed inset-0 z-[2147483647] bg-black/50 flex items-center justify-center"
            onClick={() => setNeedLogin(false)}
          >
            <div
              className="relative bg-white rounded-xl shadow-2xl p-6 w-[92%] max-w-[420px]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-2 text-center">
                Cần đăng nhập
              </h3>
              <p className="text-sm text-gray-600 text-center mb-5">
                Vui lòng đăng nhập để tiếp tục mua hàng.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  className="px-4 py-2 rounded-lg font-semibold border"
                  style={{ borderColor: NAVY, color: NAVY }}
                  onClick={() => setNeedLogin(false)}
                >
                  Để sau
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: NAVY }}
                  onClick={() => {
                    setNeedLogin(false)
                    onClose()
                    router.push('/user/login')
                  }}
                >
                  Đăng nhập
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  // NEW: Popup “Đã thêm vào giỏ hàng!”
  const addedOkPortal =
    mounted && addedOk
      ? createPortal(
          <div
            className="fixed inset-0 z-[2147483647] bg-black/50 flex items-center justify-center"
            onClick={() => setAddedOk(false)}
          >
            <div
              className="relative bg-white rounded-xl shadow-2xl p-6 w-[92%] max-w-[420px]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-2 text-center">
                Đã thêm vào giỏ hàng
              </h3>
              <p className="text-sm text-gray-600 text-center mb-5">
                Sản phẩm của bạn đã được thêm vào giỏ hàng.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  className="px-4 py-2 rounded-lg font-semibold border"
                  style={{ borderColor: NAVY, color: NAVY }}
                  onClick={() => {
                    setAddedOk(false)
                    onClose()
                  }}
                >
                  Tiếp tục mua
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: NAVY }}
                  onClick={() => {
                    setAddedOk(false)
                    onClose()
                    router.push('/user/cart')
                  }}
                >
                  Xem giỏ hàng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[2147483647]">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/60 z-[2147483646]"
            onClick={onClose}
          />

          {/* modal */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden z-[2147483647]"
            style={{ width: '800px', height: '550px', maxWidth: '95vw', maxHeight: '90vh' }}
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <Link
                href={detailHref}
                className="text-base font-semibold hover:underline"
                onClick={onClose}
              >
                {product?.name || productNameFallback}
              </Link>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* body */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 overflow-y-auto h-[calc(400px-56px)]">
              {/* LEFT */}
              <div className="space-y-3">
                <Link href={detailHref} onClick={onClose} className="block">
                  <div
                    className="rounded-xl border hover:shadow"
                    style={{
                      width: '90%',
                      height: 370,
                      background: '#fff',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={toAbsImg(selectedVariant?.image, productImageFallback)}
                      alt={product?.name || 'product'}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  </div>
                </Link>

                {/* thumbnails */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(product?.variants || []).map((v, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setColorIdx(i)
                        setSizeIdx(null)
                      }}
                      className="w-14 h-14 rounded-lg overflow-hidden border transition"
                      style={{
                        borderColor: colorIdx === i ? NAVY : '#e5e7eb',
                      }}
                      title={colorTitle(v, i)}
                    >
                      <img
                        src={toAbsImg(v?.image, productImageFallback)}
                        alt={colorTitle(v, i)}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col">
                {/* Info */}
                <div className="mb-2">
                  <div className="flex items-end gap-2">
                    <Link
                      href={detailHref}
                      onClick={onClose}
                      className="text-2xl font-semibold text-red-600"
                    >
                      {priceNow.toLocaleString()}₫
                    </Link>
                    <Link
                      href={detailHref}
                      onClick={onClose}
                      className="text-gray-400 line-through"
                    >
                      {product?.price?.toLocaleString()}₫
                    </Link>
                    {percentBadge > 0 && (
                      <span
                        className="ml-2 text-xs font-semibold px-2 py-1 rounded"
                        style={{ background: '#ffe2e2', color: '#cd1919' }}
                      >
                        -{percentBadge}%
                      </span>
                    )}
                  </div>

                  <div className="text-sm mt-2 flex flex-wrap gap-3">
                    {product?.category?.name && (
                      <span>
                        Danh mục: <b>{product.category.name}</b>
                      </span>
                    )}
                    {product?.brand?.name && (
                      <span>
                        Thương hiệu: <b>{product.brand.name}</b>
                      </span>
                    )}
                    <Link href={detailHref} onClick={onClose} className="hover:underline">
                      Đã bán: <span style={{ color: 'red' }}>{totalSold}</span>
                    </Link>
                    <span>
                      Tình trạng:{' '}
                      <b className={inStock ? 'text-green-600' : 'text-red-600'}>
                        {inStock ? 'Còn hàng' : 'Hết hàng'}
                      </b>
                    </span>
                  </div>
                </div>

                {/* Màu */}
                <div className="mb-3">
                  <div className="font-medium mb-2">Màu sắc</div>
                  <div className="flex flex-wrap gap-2">
                    {(product?.variants || []).map((v, i) => {
                      const active = colorIdx === i
                      const name = v?.color?.name || `Màu ${i + 1}`
                      return (
                        <button
                          key={`color-name-${i}`}
                          onClick={() => {
                            setColorIdx(i)
                            setSizeIdx(null)
                          }}
                          className="px-3 py-1 rounded-full border text-sm"
                          style={{
                            background: active ? NAVY : 'transparent',
                            color: active ? '#fff' : '#000',
                            borderColor: active ? NAVY : '#e5e7eb',
                          }}
                          title={name}
                        >
                          {name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Size */}
                <div className="mb-3">
                  <div className="font-medium mb-2">Kích thước</div>
                  <div className="flex flex-wrap gap-2">
                    {(selectedVariant?.sizes || []).map((sz, i) => {
                      const disabled = disableSize(sz)
                      const active = sizeIdx === i
                      return (
                        <button
                          key={i}
                          disabled={disabled}
                          onClick={() => {
                            setSizeIdx(i)
                            setQty(1)
                          }}
                          className={`px-3 py-2 rounded-lg border text-sm transition ${
                            disabled
                              ? 'opacity-40 cursor-not-allowed'
                              : 'hover:border-gray-400'
                          }`}
                          style={{
                            background: active ? NAVY : 'transparent',
                            color: active ? '#fff' : '#000',
                            borderColor: active ? NAVY : '#e5e7eb',
                          }}
                          title={sizeTitle(sz?.size)}
                        >
                          {sizeTitle(sz?.size)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Qty */}
                <div className="mb-4">
                  <div className="font-medium mb-2">Số lượng</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-lg border hover:bg-gray-50"
                      aria-label="Giảm"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={qty}
                      onChange={(e) => {
                        const n = Math.floor(Number(e.target.value) || 1)
                        setQty(Math.max(1, Math.min(maxQty, n)))
                      }}
                      className="w-14 h-9 text-center border rounded-lg"
                    />
                    <button
                      onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                      className="w-9 h-9 rounded-lg border hover:bg-gray-50"
                      aria-label="Tăng"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-500">Tối đa: {maxQty}</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="grid grid-cols-3 gap-3 mt-auto">
                  <button
                    onClick={confirm}
                    disabled={loading || colorIdx === null}
                    className="col-span-2 h-11 rounded-xl text-white font-semibold hover:opacity-95 disabled:opacity-50 whitespace-nowrap px-4"
                    style={{ background: NAVY }}
                  >
                    {mode === 'buy' ? 'MUA NGAY' : 'THÊM VÀO GIỎ HÀNG'}
                  </button>

                  <button
                    onClick={onClose}
                    className="col-span-1 h-11 rounded-xl font-semibold border hover:bg-gray-50 whitespace-nowrap px-4"
                    style={{ borderColor: NAVY, color: NAVY }}
                  >
                    HỦY
                  </button>
                </div>
              </div>
            </div>

            {/* progress bar */}
            {loading && (
              <div
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ background: NAVY, opacity: 0.8 }}
              />
            )}
          </div>
        </div>,
        document.body
      )}
      {needSizePortal}
      {needLoginPortal}
      {addedOkPortal}
    </>
  )
}
