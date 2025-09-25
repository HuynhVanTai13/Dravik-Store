'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/utils/axiosConfig';
import dynamic from 'next/dynamic';
import type { AxiosError } from 'axios'
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image'
import { Listbox, Disclosure } from '@headlessui/react'

const CKEditor = dynamic(() => import('@/components/common/CKEditor'), { ssr: false })

interface Option {
  _id: string
  name: string
  height: string
  weight: string
}

interface VariantSize {
  size: string
  quantity: number | ''
  sold: number | ''        // giữ để tương thích backend
  isActive: boolean        // giữ để tương thích backend
}

interface Variant {
  color: string
  image: File | null
  imagePreview: string
  isActive: boolean        // giữ để tương thích backend
  sizes: VariantSize[]
}

export default function AddProductPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [discount, setDiscount] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [isActive] = useState(true) // mặc định luôn true

  const [colors, setColors] = useState<Option[]>([])
  const [sizes, setSizes] = useState<Option[]>([])
  const [categories, setCategories] = useState<Option[]>([])
  const [brands, setBrands] = useState<Option[]>([])

  const [variants, setVariants] = useState<Variant[]>([])
  const [submitMessage, setSubmitMessage] = useState<string>('')
  const [submitError, setSubmitError] = useState<boolean>(false)

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
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
    } catch (err) {
      setSubmitMessage('Lỗi khi tải dữ liệu')
      setSubmitError(true)
      toast.error('Lỗi khi tải dữ liệu')
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0]
    if (file) {
      const updated = [...variants]
      updated[index].image = file
      updated[index].imagePreview = URL.createObjectURL(file)
      setVariants(updated)
    }
  }

  const handleAddVariant = () => {
    setVariants(v => ([
      ...v,
      { color: '', image: null, imagePreview: '', isActive: true, sizes: [] }
    ]))
  }

  const handleRemoveVariant = (index: number) => {
    setVariants(v => v.filter((_, i) => i !== index))
  }

  const handleAddSize = (variantIndex: number) => {
    const updated = [...variants]
    updated[variantIndex].sizes.push({ size: '', quantity: '', sold: 0, isActive: true })
    setVariants(updated)
  }

  const handleRemoveSize = (variantIndex: number, sizeIndex: number) => {
    const updated = [...variants]
    updated[variantIndex].sizes.splice(sizeIndex, 1)
    setVariants(updated)
  }

  // Helpers cho header accordion
  const getColorName = (id: string) => colors.find(c => c._id === id)?.name || 'Chưa chọn màu'
  const getTotalQty = (v: Variant) =>
    v.sizes.reduce((sum, s) => sum + (typeof s.quantity === 'number' ? s.quantity : 0), 0)

  const handleSubmit = async () => {
    setSubmitMessage('')
    setSubmitError(false)

    if (!name || price === '' || !category || !brand || variants.length === 0) {
      const msg = 'Vui lòng nhập đầy đủ thông tin sản phẩm và biến thể.'
      setSubmitMessage(msg)
      setSubmitError(true)
      toast.error(msg)
      return
    }

    const validVariants = variants
      .map((variant) => {
        const validSizes = variant.sizes.filter(size =>
          size.size &&
          String(size.quantity).trim() !== '' &&
          !isNaN(Number(size.quantity))
        )
        if (variant.color && variant.image && validSizes.length > 0) {
          const normalizedSizes = validSizes.map(s => ({
            ...s,
            sold: 0,
            isActive: true
          }))
          return { ...variant, isActive: true, sizes: normalizedSizes }
        }
        return null
      })
      .filter(Boolean) as Variant[]

    if (validVariants.length === 0) {
      const msg = 'Chưa nhập biến thể nào hợp lệ (có size).'
      setSubmitMessage(msg)
      setSubmitError(true)
      toast.error(msg)
      return
    }

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('price', String(price))
      formData.append('discount', String(discount || 0))
      formData.append('description', description)
      formData.append('category', category)
      formData.append('brand', brand)
      formData.append('isActive', 'true')

      validVariants.forEach((variant, i) => {
        formData.append(`variants[${i}][color]`, variant.color)
        if (variant.image) formData.append(`variants[${i}][image]`, variant.image)
        formData.append(`variants[${i}][isActive]`, 'true')

        variant.sizes.forEach((size, j) => {
          formData.append(`variants[${i}][sizes][${j}][size]`, size.size)
          formData.append(`variants[${i}][sizes][${j}][quantity]`, String(size.quantity))
          formData.append(`variants[${i}][sizes][${j}][sold]`, '0')
          formData.append(`variants[${i}][sizes][${j}][isActive]`, 'true')
        })
      })

      await axios.post('/api/products', formData)

      const successMsg = '✅ Thêm sản phẩm thành công!'
      toast.success(successMsg)
      setSubmitMessage(successMsg)
      setTimeout(() => router.push('/admin/products'), 1000)
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>
      let msg = 'Lỗi không xác định khi gửi sản phẩm.'
      if (error.response) msg = error.response.data?.message || 'Thêm sản phẩm thất bại.'
      else if (error.request) msg = 'Không nhận được phản hồi từ server.'

      toast.error(msg)
      setSubmitMessage(msg)
      setSubmitError(true)
    }
  }

  // danh sách id màu đã chọn (dùng để filter Listbox mỗi item)
  const selectedColorIds = useMemo(() => variants.map(v => v.color), [variants])

  return (
    <main className="main-content p-4">
      <h2 className="text-xl font-bold mb-4">Thêm sản phẩm mới</h2>

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

        {/* Danh mục */}
        <div>
          <label className="block mb-1">Danh mục</label>
          <Listbox value={category} onChange={setCategory}>
            <div className="relative">
              <Listbox.Button className="p-2 border rounded w-full text-left">
                {categories.find(c => c._id === category)?.name || '-- Chọn danh mục --'}
              </Listbox.Button>
              <Listbox.Options className="absolute z-10 mt-1 max-h-40 overflow-y-auto bg-white border rounded w-full">
                {categories.map(c => (
                  <Listbox.Option
                    key={c._id}
                    value={c._id}
                    className={({ active }) => `cursor-pointer p-2 ${active ? 'bg-gray-100' : ''}`}
                  >
                    {c.name}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

        {/* Thương hiệu */}
        <div>
          <label className="block mb-1">Thương hiệu</label>
          <Listbox value={brand} onChange={setBrand}>
            <div className="relative">
              <Listbox.Button className="p-2 border rounded w-full text-left">
                {brands.find(b => b._id === brand)?.name || '-- Chọn thương hiệu --'}
              </Listbox.Button>
              <Listbox.Options className="absolute z-10 mt-1 max-h-40 overflow-y-auto bg-white border rounded w-full">
                {brands.map(b => (
                  <Listbox.Option
                    key={b._id}
                    value={b._id}
                    className={({ active }) => `cursor-pointer p-2 ${active ? 'bg-gray-100' : ''}`}
                  >
                    {b.name}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>
      </div>

      {/* Mô tả */}
      <div className="my-4">
        <label className="font-semibold mb-1 block">Mô tả sản phẩm</label>
        <CKEditor value={description} onChange={setDescription} />
      </div>

      {/* Biến thể - ACCORDION */}
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
    const otherSelected = variants.map(x => x.color).filter((_, idx) => idx !== i)
    const selectedSizeIds = v.sizes.map(s => s.size)
    const totalQty = v.sizes.reduce((t, s) => t + (typeof s.quantity === 'number' ? s.quantity : 0), 0)
    const colorName = colors.find(c => c._id === v.color)?.name || 'Chưa chọn màu'

    return (
      <Disclosure key={i} defaultOpen={false}>
        {() => (
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Header (KHÔNG lồng button bên trong) */}
            <div className="flex items-center justify-between p-3 hover:bg-gray-50 transition">
              <Disclosure.Button className="flex-1 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
                    {v.imagePreview ? (
                      <Image src={v.imagePreview} alt="thumb" width={40} height={40} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-[10px] text-gray-500 px-1 text-center">No image</span>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-medium leading-tight">{colorName}</div>
                    <div className="text-xs text-gray-500">
                      {v.sizes.length} size • Tổng SL: {totalQty}
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

            {/* BODY: form nhập + preview (ĐÂY LÀ PHẦN BẠN ĐANG THIẾU) */}
            <Disclosure.Panel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50">
                {/* Cột trái: nhập liệu */}
                <div>
                  <label className="font-medium">Chọn màu</label>
                  <Listbox
                    value={v.color}
                    onChange={(value) => {
                      const updated = [...variants]
                      updated[i].color = value
                      setVariants(updated)
                    }}
                  >
                    <div className="relative mb-3 mt-1">
                      <Listbox.Button className="p-2 border rounded w-full text-left bg-white">
                        {colors.find(c => c._id === v.color)?.name || '-- Chọn màu --'}
                      </Listbox.Button>
                      <Listbox.Options className="absolute z-10 mt-1 max-h-48 overflow-y-auto bg-white border rounded w-full shadow-lg">
                        {colors
                          .filter(c => !otherSelected.includes(c._id))
                          .map(c => (
                            <Listbox.Option
                              key={c._id}
                              value={c._id}
                              className={({ active }) => `cursor-pointer p-2 ${active ? 'bg-gray-100' : ''}`}
                            >
                              {c.name}
                            </Listbox.Option>
                          ))}
                      </Listbox.Options>
                    </div>
                  </Listbox>

                  {/* Ảnh màu */}
                  <div className="mb-3">
                    <label className="block font-medium mb-1">Ảnh màu</label>
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, i)} />
                    {v.imagePreview && (
                      <Image src={v.imagePreview} alt="Preview" width={120} height={120} className="mt-2 rounded border" />
                    )}
                  </div>

                  {/* Danh sách size */}
                  <div className="space-y-2">
                    {v.sizes.map((s, j) => (
                      <div key={j} className="grid grid-cols-12 gap-2 items-center">
                        {/* Size */}
                        <div className="col-span-6">
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
                              .filter(sz => !selectedSizeIds.includes(sz._id) || sz._id === s.size)
                              .map(sz => (
                                <option key={sz._id} value={sz._id}>
                                  {sz.name} ({sz.height}cm - {sz.weight}kg)
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Số lượng */}
                        <div className="col-span-5">
                          <input
                            className="p-2 border rounded w-full"
                            type="number"
                            min={0}
                            placeholder="Số lượng"
                            value={s.quantity}
                            onChange={(e) => {
                              const updated = [...variants]
                              updated[i].sizes[j].quantity = e.target.value === '' ? '' : +e.target.value
                              setVariants(updated)
                            }}
                          />
                        </div>

                        {/* Xóa size */}
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => handleRemoveSize(i, j)}
                            className="text-red-600 text-sm px-2 py-1"
                            title="Xóa size"
                          >
                            ×
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
                        <Image src={v.imagePreview} alt="Preview" width={112} height={112} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-xs text-gray-500 px-2 text-center">Chưa có ảnh</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="mb-1">
                        <span className="font-medium">Màu:</span> {colorName}
                      </p>
                      <div>
                        <p className="font-medium mb-1">Size & số lượng:</p>
                        {v.sizes.length === 0 ? (
                          <p className="text-sm text-gray-500">Chưa thêm size</p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {v.sizes.map((s, j) => {
                              const sz = sizes.find(_ => _._id === s.size)
                              return (
                                <li key={j} className="flex justify-between border rounded px-2 py-1">
                                  <span>
                                    {sz?.name || '—'}
                                    {sz ? ` (${sz.height}cm - ${sz.weight}kg)` : ''}
                                  </span>
                                  <span className="font-medium">SL: {s.quantity || 0}</span>
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
</div>

      </div>

      {/* Actions */}
      <button
        onClick={handleSubmit}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Lưu sản phẩm
      </button>

      {submitMessage && (
        <p className={`mt-2 text-sm ${submitError ? 'text-red-600' : 'text-green-600'}`}>
          {submitMessage}
        </p>
      )}

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
