// app/admin/products/edit_product/[slug]/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from '@/utils/axiosConfig'
import dynamic from 'next/dynamic'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Image from 'next/image'
import { Disclosure } from '@headlessui/react'

const CKEditor = dynamic(() => import('@/components/common/CKEditor'), { ssr: false })

interface Option {
  _id: string
  name?: string
  height?: string
  weight?: string
}

interface VariantSize {
  size: string
  quantity: number | ''
  sold: number | ''
  isActive: boolean
}

interface Variant {
  color: string
  image: File | null
  oldImage?: string
  imagePreview: string
  isActive: boolean
  sizes: VariantSize[]
}

interface VariantFromAPI {
  color: string | { _id: string } | null
  image: string
  isActive: boolean
  sizes: {
    size: string | { _id: string } | null
    quantity: number
    sold: number
    isActive: boolean
  }[]
}

type IdLike = string | { _id: string } | null | undefined

const hasId = (obj: unknown): obj is { _id: string } =>
  typeof obj === 'object' &&
  obj !== null &&
  '_id' in obj &&
  typeof (obj as { _id?: unknown })._id === 'string'

const getId = (x: IdLike): string =>
  typeof x === 'string' ? x : hasId(x) ? x._id : ''


export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string

  const [productId, setProductId] = useState<string>('')

  const [name, setName] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [discount, setDiscount] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [colors, setColors] = useState<Option[]>([])
  const [sizes, setSizes] = useState<Option[]>([])
  const [categories, setCategories] = useState<Option[]>([])
  const [brands, setBrands] = useState<Option[]>([])

  const [variants, setVariants] = useState<Variant[]>([])

  useEffect(() => {
    const load = async () => {
      await fetchOptions()
      await fetchProduct()
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const fetchOptions = async () => {
    const [resColors, resSizes, resCategories, resBrands] = await Promise.all([
      axios.get('/api/colors?limit=1000'),
      axios.get('/api/sizes?limit=1000'),
      axios.get('/api/categories?limit=1000'),
      axios.get('/api/brands?limit=1000'),
    ])
    setColors(resColors.data.colors || [])
    setSizes(resSizes.data.sizes || [])
    setCategories(resCategories.data.categories || [])
    setBrands(resBrands.data.brands || [])
  }

  const fetchProduct = async () => {
    try {
      // 1) Lấy _id theo slug
      const slugRes = await axios.get(`/api/products/slug/${slug}`)
      const id = slugRes.data._id as string
      setProductId(id)

      // 2) Lấy đủ data theo _id (kể cả biến thể ẩn)
      const res = await axios.get(`/api/products/${id}`)
      const p = res.data

      setName(p.name)
      setPrice(p.price)
      setDiscount(p.discount)
      setDescription(p.description)
      setCategory(p.category?._id || '')
      setBrand(p.brand?._id || '')
      setIsActive(p.isActive)

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

setVariants(
  (Array.isArray(p.variants) ? (p.variants as VariantFromAPI[]) : []).map((v: VariantFromAPI) => {
    const colorId = getId(v.color)

    const img = v.image || ''
    const imagePreview = /^https?:\/\//.test(img) ? img : (img ? `${baseUrl}${img}` : '')

    return {
      color: colorId,
      image: null,
      oldImage: v.image,
      imagePreview,
      isActive: !!v.isActive,
      sizes: (Array.isArray(v.sizes) ? v.sizes : []).map((s) => ({
        size: getId(s.size),
        quantity: s.quantity,
        sold: s.sold,
        isActive: !!s.isActive,
      })),
    }
  })
)


    } catch (err) {
      console.error('❌ Lỗi khi lấy dữ liệu sản phẩm:', err)
      toast.error('Không thể tải sản phẩm để sửa')
    }
  }

  // ===== Variants handlers =====
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0]
    if (!file) return
    const updated = [...variants]
    updated[index].image = file
    updated[index].imagePreview = URL.createObjectURL(file)
    setVariants(updated)
  }

  const handleSizeToggle = (variantIndex: number, sizeIndex: number) => {
    const updated = [...variants]
    const variant = updated[variantIndex]

    if (!isActive) {
      toast.error('Sản phẩm đang ẩn. Không thể thay đổi trạng thái size.')
      return
    }
    if (!variant.isActive) {
      toast.error('Màu này đang ẩn. Không thể thay đổi trạng thái size.')
      return
    }

    variant.sizes[sizeIndex].isActive = !variant.sizes[sizeIndex].isActive
    setVariants(updated)
  }

  const handleVariantToggle = (index: number) => {
    const updated = [...variants]
    if (!isActive && !updated[index].isActive) {
      toast.error('Sản phẩm đang ẩn. Không thể bật màu.')
      return
    }

    updated[index].isActive = !updated[index].isActive
    if (!updated[index].isActive) {
      // tắt hết size nếu màu bị tắt
      updated[index].sizes = updated[index].sizes.map((s) => ({ ...s, isActive: false }))
    }
    setVariants(updated)
  }

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      { color: '', image: null, imagePreview: '', isActive: isActive, sizes: [] },
    ])
  }

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddSize = (variantIndex: number) => {
    const updated = [...variants]
    updated[variantIndex].sizes.push({
      size: '',
      quantity: '',
      sold: '',
      isActive: isActive && updated[variantIndex].isActive,
    })
    setVariants(updated)
  }

  const handleRemoveSize = (variantIndex: number, sizeIndex: number) => {
    const updated = [...variants]
    updated[variantIndex].sizes.splice(sizeIndex, 1)
    setVariants(updated)
  }

  // Product status cascades
  useEffect(() => {
    if (!isActive) {
      const updated = variants.map((variant) => ({
        ...variant,
        isActive: false,
        sizes: variant.sizes.map((s) => ({ ...s, isActive: false })),
      }))
      setVariants(updated)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  // For header summary
  const getColorName = (id: string) => colors.find((c) => c._id === id)?.name || 'Chưa chọn màu'
  const getTotalQty = (v: Variant) =>
    v.sizes.reduce((sum, s) => sum + (typeof s.quantity === 'number' ? s.quantity : 0), 0)

  const selectedColorIds = useMemo(() => variants.map((v) => v.color), [variants])

  // ===== Submit =====
  const handleSubmit = async () => {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('price', String(price))
    formData.append('discount', String(discount || 0))
    formData.append('description', description)
    formData.append('category', category)
    formData.append('brand', brand)
    formData.append('isActive', JSON.stringify(isActive))

    variants.forEach((variant, i) => {
      formData.append(`variants[${i}][color]`, variant.color)
      formData.append(`variants[${i}][isActive]`, JSON.stringify(variant.isActive))

      if (variant.image) {
        formData.append(`variants[${i}][image]`, variant.image)
      } else if (variant.oldImage) {
        formData.append(`variants[${i}][oldImage]`, variant.oldImage)
      }

      variant.sizes.forEach((s, j) => {
        formData.append(`variants[${i}][sizes][${j}][size]`, s.size)
        formData.append(`variants[${i}][sizes][${j}][quantity]`, String(s.quantity))
        formData.append(`variants[${i}][sizes][${j}][sold]`, String(s.sold))
        formData.append(`variants[${i}][sizes][${j}][isActive]`, JSON.stringify(s.isActive))
      })
    })

    try {
      await axios.put(`/api/products/${productId}`, formData)
      toast.success('✅ Cập nhật sản phẩm thành công!')
      setTimeout(() => router.push('/admin/products'), 1000)
    } catch (err) {
      console.error(err)
      toast.error('❌ Lỗi khi cập nhật sản phẩm')
    }
  }

  return (
    <main className="main-content p-4">
      <h2 className="text-xl font-bold mb-4">Cập nhật sản phẩm</h2>

      {/* Thông tin cơ bản */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Tên sản phẩm</label>
          <input
            className="p-2 border rounded w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên sản phẩm"
          />
        </div>
        <div>
          <label className="block mb-1">Giá sản phẩm</label>
          <input
            className="p-2 border rounded w-full"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : +e.target.value)}
            placeholder="VD: 499000"
          />
        </div>
        <div>
          <label className="block mb-1">Số tiền giảm</label>
          <input
            className="p-2 border rounded w-full"
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(e.target.value === '' ? '' : +e.target.value)}
            placeholder="VD: 50000"
          />
        </div>

        <div>
          <label className="block mb-1">Danh mục</label>
          <select
            className="p-2 border rounded w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">-- Chọn danh mục --</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Thương hiệu</label>
          <select
            className="p-2 border rounded w-full"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <option value="">-- Chọn thương hiệu --</option>
            {brands.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mô tả */}
        <div className="col-span-1 md:col-span-2">
          <label className="block mb-1 font-medium">Mô tả sản phẩm</label>
          <div className="border rounded">
            <CKEditor value={description} onChange={(data) => setDescription(data)} />
          </div>
        </div>

        {/* Trạng thái sản phẩm */}
        <div className="flex items-center gap-3 mt-2">
          <label>Trạng thái</label>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`w-14 h-7 rounded-full relative transition-colors duration-300 ${
              isActive ? 'bg-green-500' : 'bg-gray-400'
            }`}
          >
            <span
              className={`absolute w-6 h-6 bg-white rounded-full top-0.5 left-0.5 transform transition-transform duration-300 ${
                isActive ? 'translate-x-7' : ''
              }`}
            />
          </button>
          <span>{isActive ? 'Hiện' : 'Ẩn'}</span>
        </div>
      </div>

      {/* Biến thể — ACCORDION */}
      <div className="my-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">Biến thể (màu + size)</h3>
          <button
            onClick={handleAddVariant}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            + Thêm màu
          </button>
        </div>

        <div className="space-y-3">
          {variants.map((v, i) => {
            const headerName = getColorName(v.color)
            const headerQty = getTotalQty(v)
            const otherSelected = selectedColorIds.filter((_, idx) => idx !== i)
            const selectedSizeIds = v.sizes.map((s) => s.size)

            return (
              <Disclosure key={i} defaultOpen={false}>
                {() => (
                  <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 transition">
                      <Disclosure.Button className="flex-1 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
                            {v.imagePreview ? (
                              <img
                                src={v.imagePreview}
                                alt="thumb"
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <span className="text-[10px] text-gray-500 px-1 text-center">
                                No image
                              </span>
                            )}
                          </div>
                          <div className="text-left">
                            <div className="font-medium leading-tight">{headerName}</div>
                            <div className="text-xs text-gray-500">
                              {v.sizes.length} size • Tổng SL: {headerQty}
                            </div>
                          </div>
                        </div>
                      </Disclosure.Button>

                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(i)}
                        className="ml-3 text-red-600 text-xs hover:underline"
                        title="Xóa màu"
                      >
                        Xóa
                      </button>
                    </div>

                    {/* Body */}
                    <Disclosure.Panel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50">
                        {/* Cột trái: nhập liệu */}
                        <div>
                          {/* Chọn màu */}
                          <label className="font-medium">Chọn màu</label>
                          <select
                            className="p-2 border rounded w-full bg-white mt-1"
                            value={v.color}
                            onChange={(e) => {
                              const updated = [...variants]
                              updated[i].color = e.target.value
                              setVariants(updated)
                            }}
                          >
                            <option value="">-- Chọn màu --</option>
                            {colors
                              .filter((c) => !otherSelected.includes(c._id) || c._id === v.color)
                              .map((c) => (
                                <option key={c._id} value={c._id}>
                                  {c.name}
                                </option>
                              ))}
                          </select>
<div className='flex'>
  {/* Ảnh màu */}
                          <div className="mt-3">
                            <label className="block font-medium mb-1">Ảnh màu</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(e, i)}
                            />
                            {v.imagePreview && (
                              <img
                                src={v.imagePreview}
                                alt="Preview"
                                width={120}
                                height={120}
                                className="mt-2 rounded border w-[120px] h-[120px] object-cover"
                                onError={(e) => {
                                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            )}
                          </div>

                          {/* Trạng thái màu */}
                          <div className="mt-3 flex items-center gap-2">
                            <label className="font-medium">Trạng thái màu:</label>
                            <button
                              type="button"
                              onClick={() => handleVariantToggle(i)}
                              className={`w-14 h-7 rounded-full relative transition-colors duration-300 ${
                                v.isActive ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                            >
                              <span
                                className={`absolute w-6 h-6 bg-white rounded-full top-0.5 left-0.5 transform transition-transform duration-300 ${
                                  v.isActive ? 'translate-x-7' : ''
                                }`}
                              />
                            </button>
                            <span>{v.isActive ? 'Hiện' : 'Ẩn'}</span>
                          </div>
</div>
                          

                          {/* Sizes list */}
                          <div className="space-y-2 mt-3">
                            {v.sizes.map((s, j) => (
                              <div key={j} className="grid grid-cols-12 gap-2 items-center">
                                {/* Size */}
                                <div className="col-span-5">
                                  <select
                                    className="p-2 border rounded w-full bg-white"
                                    value={s.size}
                                    onChange={(e) => {
                                      const updated = [...variants]
                                      updated[i].sizes[j].size = e.target.value
                                      setVariants(updated)
                                    }}
                                  >
                                    <option value="">-- Size --</option>
                                    {sizes
                                      .filter(
                                        (sz) =>
                                          !v.sizes.map((x) => x.size).includes(sz._id) ||
                                          sz._id === s.size
                                      )
                                      .map((sz) => (
                                        <option key={sz._id} value={sz._id}>
                                          {sz.name} ({sz.height}cm - {sz.weight}kg)
                                        </option>
                                      ))}
                                  </select>
                                </div>

                                {/* Số lượng */}
                                <div className="col-span-2">
                                  <input
                                    className="p-2 border rounded w-full"
                                    type="number"
                                    min={0}
                                    placeholder="SL"
                                    value={s.quantity}
                                    onChange={(e) => {
                                      const updated = [...variants]
                                      updated[i].sizes[j].quantity =
                                        e.target.value === '' ? '' : +e.target.value
                                      setVariants(updated)
                                    }}
                                  />
                                </div>

                                {/* Đã bán */}
                                <div className="col-span-2">
                                  <input
                                    className="p-2 border rounded w-full"
                                    type="number"
                                    min={0}
                                    placeholder="Đã bán"
                                    value={s.sold}
                                    onChange={(e) => {
                                      const updated = [...variants]
                                      updated[i].sizes[j].sold =
                                        e.target.value === '' ? '' : +e.target.value
                                      setVariants(updated)
                                    }}
                                  />
                                </div>

                                {/* Toggle size */}
                                <div className="col-span-1 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleSizeToggle(i, j)}
                                    className={`w-10 h-6 rounded-full relative transition-colors duration-300 ${
                                      s.isActive ? 'bg-green-500' : 'bg-gray-400'
                                    }`}
                                    title={s.isActive ? 'Đang hiện' : 'Đang ẩn'}
                                  >
                                    <span
                                      className={`absolute w-5 h-5 bg-white rounded-full top-0.5 left-0.5 transform transition-transform duration-300 ${
                                        s.isActive ? 'translate-x-4' : ''
                                      }`}
                                    />
                                  </button>
                                </div>

                                {/* Xóa size */}
                                <div className="flex justify-end -mt-1 col-span-2 ">
                                  <button
                                    onClick={() => handleRemoveSize(i, j)}
                                    className="text-red-600 text-sm px-2 py-1"
                                    title="Xóa size"
                                  >
                                    Xóa size
                                  </button>
                                </div>
                              </div>
                            ))}

                            <button
                              onClick={() => handleAddSize(i)}
                              className="mt-2 text-sm text-blue-600 hover:underline"
                            >
                              + Thêm size
                            </button>
                          </div>
                        </div>

                        {/* Cột phải: preview */}
                        <div className="bg-white border rounded p-3">
                          <h4 className="font-semibold mb-2">Xem trước</h4>
                          <div className="flex gap-3 items-start">
                            <div className="w-28 h-28 border rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                              {v.imagePreview ? (
                                <img
                                  src={v.imagePreview}
                                  alt="Preview"
                                  width={112}
                                  height={112}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <span className="text-xs text-gray-500 px-2 text-center">
                                  Chưa có ảnh
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="mb-1">
                                <span className="font-medium">Màu:</span> {getColorName(v.color)}
                              </p>
                              <div>
                                <p className="font-medium mb-1">Size & số lượng:</p>
                                {v.sizes.length === 0 ? (
                                  <p className="text-sm text-gray-500">Chưa thêm size</p>
                                ) : (
                                  <ul className="space-y-1 text-sm">
                                    {v.sizes.map((s, j) => {
                                      const sz = sizes.find((_s) => _s._id === s.size)
                                      return (
                                        <li
                                          key={j}
                                          className="flex justify-between border rounded px-2 py-1"
                                        >
                                          <span>
                                            {sz?.name || '—'}
                                            {sz ? ` (${sz.height}cm - ${sz.weight}kg)` : ''}
                                          </span>
                                          <span className="font-medium">
                                            SL: {s.quantity || 0} — Đã bán: {s.sold || 0}
                                          </span>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Disclosure.Panel>
                  </div>
                )}
              </Disclosure>
            )
          })}

          {variants.length === 0 && (
            <div className="text-sm text-gray-500 border rounded-lg p-4 bg-gray-50">
              Chưa có màu nào. Nhấn <span className="font-medium text-gray-700">“+ Thêm màu”</span> để bắt đầu.
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={handleSubmit}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Lưu sản phẩm
      </button>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </main>
  )
}
