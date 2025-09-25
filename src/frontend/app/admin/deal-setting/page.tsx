'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from '@/utils/axiosConfig'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import CustomDropdown from '@/components/common/CustomDropdown'
import Pagination from '@/components/common/Pagination'
import Link from 'next/link'

interface Product {
  _id: string
  name: string
  price: number
  discount: number
  isActive: boolean
  slug: string
  category: { name: string; _id: string } | null
  brand: { name: string; _id: string } | null
  variants: {
    image: string
    sizes: { quantity: number; sold: number }[]
  }[]
}

type IdOrProduct = string | { _id: string } | Product

export default function DealSettingPage() {
  const [programName, setProgramName] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime,   setEndTime]   = useState('')
  // KHÔNG mặc định 0 nữa
  const [discountPercent, setDiscountPercent] = useState<number | ''>('')

  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const limit = 10
  const [tab, setTab] = useState<'all' | 'deal'>('all')
  const [dealProducts, setDealProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<{ _id: string; name: string } | null>(null)
  const [filterBrand, setFilterBrand] = useState<{ _id: string; name: string } | null>(null)
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([])
  const [brands, setBrands] = useState<{ _id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)

  // ---- type guard + helper id (không dùng any)
  const hasStringId = (obj: unknown): obj is { _id: string } => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      '_id' in obj &&
      typeof (obj as { _id?: unknown })._id === 'string'
    )
  }

  const asId = (x: IdOrProduct): string => {
    if (typeof x === 'string') return x
    if (hasStringId(x)) return x._id
    return ''
  }

  const normalizeDealProducts = (arr: IdOrProduct[], all: Product[]) => {
    const map = new Map<string, Product>()
    for (const item of arr || []) {
      if (typeof item === 'object' && item && 'name' in item && '_id' in item) {
        const p = item as Product
        map.set(String(p._id), p)
      } else {
        const id = asId(item)
        const p = all.find((x) => String(x._id) === String(id))
        if (p) map.set(String(p._id), p)
      }
    }
    return Array.from(map.values())
  }

  const fetchData = async () => {
    try {
      const [productRes, dealRes, categoryRes, brandRes] = await Promise.all([
        axios.get(`/api/products?limit=1000`),
        axios.get('/api/deal'),
        axios.get('/api/categories?limit=all'),
        axios.get('/api/brands?limit=all'),
      ])

      const list: Product[] =
        (productRes.data?.items as Product[]) ||
        (productRes.data?.products as Product[]) ||
        []

      const allProducts = list.filter((p) => p?.isActive)
      allProducts.sort((a, b) => {
        const stockA = a.variants.reduce(
          (sum, v) => sum + v.sizes.reduce((s, s2) => s + s2.quantity, 0),
          0
        )
        const stockB = b.variants.reduce(
          (sum, v) => sum + v.sizes.reduce((s, s2) => s + s2.quantity, 0),
          0
        )
        return stockB - stockA
      })
      setProducts(allProducts)

      const deal = dealRes.data
      setProgramName(deal?.programName || deal?.name || deal?.title || '')
      setStartTime(deal?.startTime ? String(deal.startTime).slice(0, 16) : '')
      setEndTime(deal?.endTime ? String(deal.endTime).slice(0, 16) : '')

      // nếu có % giảm hợp lệ (>0) thì set, ngược lại để rỗng
      const pct = Number(deal?.discountPercent)
      setDiscountPercent(Number.isFinite(pct) && pct > 0 ? pct : '')

      const dealIds = (deal?.productIds as IdOrProduct[]) || []
      const uniqueIds = [...new Set(dealIds.map((x) => String(asId(x))))].filter(Boolean)
      setSelectedProducts(uniqueIds)
      setDealProducts(normalizeDealProducts(dealIds, allProducts))

      setCategories(Array.isArray(categoryRes.data?.categories) ? categoryRes.data.categories : [])
      setBrands(Array.isArray(brandRes.data?.brands) ? brandRes.data.brands : [])
    } catch (error) {
      console.error(error)
      toast.error('Lỗi khi tải dữ liệu')
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, filterCategory, filterBrand, tab])

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const strId = String(id)
      return prev.includes(strId) ? prev.filter((pid) => pid !== strId) : [...prev, strId]
    })
  }

  // Chương trình đang active?
  const now = Date.now()
  const isActive =
    !!startTime &&
    !!endTime &&
    now >= new Date(startTime).getTime() &&
    now <= new Date(endTime).getTime()

  const calcDealPrice = (p: Product) => {
    if (typeof discountPercent !== 'number' || discountPercent <= 0) return null
    const price = p.price || 0
    const computed = Math.round(price * (1 - discountPercent / 100))
    return Math.max(0, computed)
  }

  const handleSave = async () => {
    if (!startTime || !endTime) {
      return toast.error('Vui lòng chọn thời gian bắt đầu và kết thúc')
    }

    const start = new Date(startTime)
    const end   = new Date(endTime)

    if (isNaN(+start) || isNaN(+end)) {
      return toast.error('Thời gian không hợp lệ')
    }
    if (end <= start) {
      return toast.error('Thời gian kết thúc phải sau thời gian bắt đầu')
    }
    if (selectedProducts.length === 0) {
      return toast.warning('Vui lòng chọn ít nhất một sản phẩm để áp dụng khuyến mãi')
    }
    if (
      discountPercent === '' ||
      typeof discountPercent !== 'number' ||
      discountPercent < 1 || discountPercent > 100
    ) {
      return toast.error('Vui lòng nhập % giảm từ 1 đến 100')
    }

    try {
      setLoading(true)
      await axios.put('/api/deal', {
        startTime,
        endTime,
        productIds: selectedProducts,
        programName,
        name: programName,
        title: programName,
        discountPercent: Number(discountPercent),
      })
      toast.success('Cập nhật khuyến mãi thành công!')
      fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi cập nhật khuyến mãi')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) &&
          (!filterCategory || p.category?._id === filterCategory._id) &&
          (!filterBrand || p.brand?._id === filterBrand._id)
      ),
    [products, search, filterCategory, filterBrand]
  )
  const paginatedProducts = filteredProducts.slice((page - 1) * limit, page * limit)
  const totalPages = Math.ceil(filteredProducts.length / limit)

  return (
    <main className="main-content p-6">
      <div className="bg-white rounded shadow p-6 max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">Cài đặt chương trình khuyến mãi</h2>

        {/* Thông tin chương trình */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-1">
            <label className="font-medium">Tên chương trình</label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="VD: Flash Sale 9.9"
              className="w-full border px-4 py-2 rounded mt-1"
            />
          </div>

          <div>
            <label className="font-medium">Thời gian bắt đầu</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border px-4 py-2 rounded mt-1"
            />
          </div>

          <div>
            <label className="font-medium">Thời gian kết thúc</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full border px-4 py-2 rounded mt-1"
            />
          </div>

          {/* % giảm giá */}
          <div>
            <label className="font-medium">% giảm giá trên giá gốc</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                placeholder="Nhập 1 - 100"
                value={discountPercent}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') { setDiscountPercent(''); return }
                  const n = Math.floor(Number(v))
                  if (!Number.isFinite(n)) return
                  setDiscountPercent(Math.max(1, Math.min(100, n)))
                }}
                className="w-full border px-4 py-2 rounded"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Áp dụng trên <b>giá gốc</b> của sản phẩm, chỉ trong khoảng thời gian đã cài đặt.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 rounded ${tab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Tất cả sản phẩm
          </button>
          <button
            onClick={() => setTab('deal')}
            className={`px-4 py-2 rounded ${tab === 'deal' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Sản phẩm đang Deal
          </button>
        </div>

        {/* Bộ lọc */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex flex-col">
            <label className="font-medium mb-1">Tìm kiếm sản phẩm</label>
            <input
              type="text"
              placeholder="Nhập sản phẩm cần tìm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border px-3 py-2 rounded w-full h-[40px]"
            />
          </div>
          <div className="flex flex-col">
            <label className="font-medium mb-1">Danh mục</label>
            <CustomDropdown
              label=""
              options={categories}
              selected={filterCategory}
              setSelected={setFilterCategory}
              placeholder="Tất cả danh mục"
              height="h-[40px]"
            />
          </div>
          <div className="flex flex-col">
            <label className="font-medium mb-1">Thương hiệu</label>
            <CustomDropdown
              label=""
              options={brands}
              selected={filterBrand}
              setSelected={setFilterBrand}
              placeholder="Tất cả thương hiệu"
              height="h-[40px]"
            />
          </div>
        </div>

        {/* Danh sách tất cả sản phẩm */}
        {tab === 'all' && (
          <div>
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr className="text-left">
                  <th className="p-2">Chọn</th>
                  <th className="p-2">Tên</th>
                  <th className="p-2">Giá</th>
                  <th className="p-2">Danh mục</th>
                  <th className="p-2">Thương hiệu</th>
                  <th className="p-2">Tồn kho</th>
                  <th className="p-2">Sửa</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p) => (
                  <tr key={p._id} className="border-t">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(p._id.toString())}
                        onChange={() => toggleProduct(p._id)}
                      />
                    </td>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">
                      <span className="text-gray-500 line-through mr-1">
                        {p.price.toLocaleString()}₫
                      </span>
                      <span className="text-red-600">
                        {(p.price - p.discount).toLocaleString()}₫
                      </span>
                      {/* Preview deal nếu đang active */}
                      {isActive && typeof discountPercent === 'number' && discountPercent > 0 && (
                        <div className="text-green-600 text-xs mt-1">
                          Giá deal {discountPercent}%: {calcDealPrice(p)?.toLocaleString()}₫
                        </div>
                      )}
                    </td>
                    <td className="p-2">{p.category?.name}</td>
                    <td className="p-2">{p.brand?.name}</td>
                    <td className="p-2">
                      {p.variants.reduce(
                        (total, v) => total + v.sizes.reduce((s, s2) => s + s2.quantity, 0),
                        0
                      )}
                    </td>
                    <td className="p-2">
                      <Link
                        href={`/admin/products/edit_product/${p.slug}`}
                        className="text-blue-500 hover:underline"
                      >
                        Sửa
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination page={page} setPage={setPage} totalPages={totalPages} />

            <button
              onClick={handleSave}
              disabled={loading}
              className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
        )}

        {/* Danh sách sản phẩm đang deal */}
        {tab === 'deal' && (
          <div className="mt-4">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr className="text-left">
                  <th className="p-2">Chọn</th>
                  <th className="p-2">Tên</th>
                  <th className="p-2">Giá</th>
                  <th className="p-2">Đã bán</th>
                  <th className="p-2">Tồn kho</th>
                  <th className="p-2">Sửa</th>
                </tr>
              </thead>
              <tbody>
                {dealProducts
                  .filter(
                    (p) =>
                      p.name.toLowerCase().includes(search.toLowerCase()) &&
                      (!filterCategory || p.category?._id === filterCategory._id) &&
                      (!filterBrand || p.brand?._id === filterBrand._id)
                  )
                  .map((p) => (
                    <tr
                      key={p._id}
                      className={`border-t ${selectedProducts.includes(p._id.toString()) ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedProducts.map((id) => id.toString()).includes(p._id.toString())}
                          onChange={() => toggleProduct(p._id)}
                        />
                      </td>
                      <td className="p-2">{p.name}</td>
                      <td className="p-2">
                        <span className="text-gray-500 line-through mr-1">
                          {p.price.toLocaleString()}₫
                        </span>
                        <span className="text-red-600">
                          {(p.price - p.discount).toLocaleString()}₫
                        </span>
                        {isActive && typeof discountPercent === 'number' && discountPercent > 0 && (
                          <div className="text-green-600 text-xs mt-1">
                            Giá deal {discountPercent}%: {calcDealPrice(p)?.toLocaleString()}₫
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        {p.variants.reduce(
                          (total, v) => total + v.sizes.reduce((s, s2) => s + s2.sold, 0),
                          0
                        )}
                      </td>
                      <td className="p-2">
                        {p.variants.reduce(
                          (total, v) => total + v.sizes.reduce((s, s2) => s + s2.quantity, 0),
                          0
                        )}
                      </td>
                      <td className="p-2">
                        <Link
                          href={`/admin/products/edit_product/${p.slug}`}
                          className="text-blue-500 hover:underline"
                        >
                          Sửa
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <button
              onClick={handleSave}
              disabled={loading}
              className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </main>
  )
}
