'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import axios from '@/utils/axiosConfig'
import Toggle from '@/components/common/Toggle'
import Pagination from '@/components/common/Pagination'
import { FaSearch } from 'react-icons/fa'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useSearchParams, useRouter } from 'next/navigation'

interface Product {
  _id: string
  name: string
  price: number
  discount: number
  isActive: boolean
  slug: string
  category: { name: string }
  brand: { name: string }
  variants: {
    color: { name: string }
    image: string
    sizes: {
      size: { name: string; height: string; weight: string }
      quantity: number
      sold: number
    }[]
  }[]
}

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showDetailPopup, setShowDetailPopup] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const limit = 10

  // ==== Chuẩn hoá rule TRÙNG dashboard ====
  const LOW_STOCK_LT = 5      // còn lại >0 & <5
  const STOCK_GTE    = 200    // tồn kho >= 200

  const remain = (qty: number, sold: number) => Math.max(qty - sold, 0)
  const productRemain = (p: Product) =>
    p.variants.reduce(
      (sum, v) => sum + v.sizes.reduce((s, sz) => s + remain(sz.quantity, sz.sold), 0),
      0
    )

  // ====== Đọc filter từ URL NGAY LẦN ĐẦU ======
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialFromURL = useMemo(() => {
    const ls = (searchParams.get('lowStock') || searchParams.get('filter') || '').toLowerCase()
    const stock = (searchParams.get('stock') || '').toLowerCase()
    const wantLow = ls === '1' || ls === 'lowstock'
    const m = stock.match(/(?:gte|>=)\s*(\d+)/)
    const n = m && m[1] ? parseInt(m[1], 10) || STOCK_GTE : null
    return { wantLow, minRemain: n, sort: !!n }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // chỉ đọc 1 lần theo URL khi mở trang

  const [lowStockOnly, setLowStockOnly] = useState(initialFromURL.wantLow)
  const [minRemainForStock, setMinRemainForStock] = useState<number | null>(initialFromURL.minRemain)
  const [sortByStock, setSortByStock] = useState(initialFromURL.sort)

  // Nếu URL đổi khi đang ở trang (ví dụ bấm nút), đồng bộ lại
  useEffect(() => {
    const ls = (searchParams.get('lowStock') || searchParams.get('filter') || '').toLowerCase()
    const stock = (searchParams.get('stock') || '').toLowerCase()
    const wantLow = ls === '1' || ls === 'lowstock'
    const m = stock.match(/(?:gte|>=)\s*(\d+)/)
    const n = m && m[1] ? parseInt(m[1], 10) || STOCK_GTE : null

    setLowStockOnly(wantLow)
setMinRemainForStock(n)
    setSortByStock(!!n)
    setPage(1)
  }, [searchParams])

  // ====== Fetch ======
  const fetchData = async () => {
    try {
      // Lọc client (lowStock / tồn kho) -> lấy ALL để lọc trên toàn bộ dữ liệu
      const needClientFilter = lowStockOnly || minRemainForStock !== null

      const res = await axios.get('/api/products', {
        params: {
          page: needClientFilter ? 1 : page,     // ép về 1 khi lấy all
          limit: needClientFilter ? 'all' : limit,
          search,
          showHidden: 'true',
          isActive:
            statusFilter === 'active'
              ? true
              : statusFilter === 'inactive'
              ? false
              : undefined,
        },
      })

      let fetched: Product[] = res.data.items || res.data.products || []

      if (lowStockOnly) {
        fetched = fetched.filter((p) =>
          p.variants.some((v) =>
            v.sizes.some((s) => {
              const left = remain(s.quantity, s.sold)
              return left > 0 && left < LOW_STOCK_LT
            })
          )
        )
      }

      if (minRemainForStock !== null) {
        fetched = fetched.filter((p) => productRemain(p) >= minRemainForStock)
      }

      if (sortByStock) {
        fetched = [...fetched].sort((a, b) => productRemain(b) - productRemain(a))
      }

      setProducts(fetched)
      setTotal(res.data.total)
    } catch (err) {
      console.error('Lỗi khi load sản phẩm:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, search, statusFilter, sortByStock, lowStockOnly, minRemainForStock])

  // ====== Hành động ======
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'delete' | 'toggle' | null>(null)
  const [toggleValue, setToggleValue] = useState<boolean | null>(null)

  const askDelete = (id: string) => {
    setSelectedId(id)
    setActionType('delete')
    setConfirmOpen(true)
  }

  const askToggle = (id: string, current: boolean) => {
    setSelectedId(id)
    setToggleValue(!current)
    setActionType('toggle')
    setConfirmOpen(true)
  }

  const exportToExcel = async () => {
    try {
      const res = await axios.get('/api/products', {
        params: {
          page: 1,
          limit: 'all',
          status: 'active',
          search,
        },
      })

      const list: Product[] = res.data.items || res.data.products || []

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Danh sách sản phẩm')

      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Tên', key: 'name', width: 30 },
        { header: 'Giá', key: 'price', width: 15 },
        { header: 'Giá sau giảm', key: 'discount', width: 20 },
        { header: 'Danh mục', key: 'category', width: 20 },
{ header: 'Thương hiệu', key: 'brand', width: 20 },
        { header: 'Đã bán', key: 'sold', width: 10 },
        { header: 'Tồn kho', key: 'stock', width: 10 },
        { header: 'Trạng thái', key: 'status', width: 15 },
      ]

      list.forEach((p, index) => {
        const sold = calcSold(p)
        const stock = calcStock(p) - sold
        worksheet.addRow({
          stt: index + 1,
          name: p.name,
          price: `${p.price.toLocaleString()}₫`,
          discount: `${(p.price - p.discount).toLocaleString()}₫`,
          category: p.category?.name,
          brand: p.brand?.name,
          sold,
          stock,
          status: p.isActive ? 'Hiện' : 'Ẩn',
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, 'danh_sach_san_pham.xlsx')
    } catch (err) {
      console.error('Xuất Excel lỗi:', err)
    }
  }

  const handleConfirm = async () => {
    if (!selectedId || !actionType) return
    try {
      if (actionType === 'delete') {
        await axios.delete(`/api/products/${selectedId}`)
        setProducts(products.filter((p) => p._id !== selectedId))
      } else if (actionType === 'toggle' && toggleValue !== null) {
        await axios.patch(`/api/products/status/${selectedId}`, { isActive: toggleValue })
        fetchData()
      }
    } catch (err) {
      console.error('Lỗi khi xử lý hành động:', err)
    } finally {
      setConfirmOpen(false)
      setSelectedId(null)
      setActionType(null)
      setToggleValue(null)
    }
  }

  const calcSold = (product: Product) =>
    product.variants.reduce((sum, v) => sum + v.sizes.reduce((s, sz) => s + sz.sold, 0), 0)

  const calcStock = (product: Product) =>
    product.variants.reduce((sum, v) => sum + v.sizes.reduce((s, sz) => s + sz.quantity, 0), 0)

  // ===== Phân trang client khi lọc toàn bộ dữ liệu =====
  const needClientFilterView = lowStockOnly || minRemainForStock !== null
  const paginatedProducts = needClientFilterView
    ? products.slice((page - 1) * limit, page * limit)
    : products
  const totalPages = Math.ceil((needClientFilterView ? products.length : total) / limit)

  return (
    <main className="main-content p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Danh sách sản phẩm</h2>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/products/add_product"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Thêm sản phẩm
          </Link>
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Xuất Excel
          </button>

          <button
            onClick={() => {
const next = !sortByStock
              setSortByStock(next)
              const params = new URLSearchParams(Array.from(searchParams.entries()))
              if (next) {
                setMinRemainForStock(STOCK_GTE)
                params.set('stock', `gte${STOCK_GTE}`)
              } else {
                setMinRemainForStock(null)
                params.delete('stock')
              }
              router.replace(`/admin/products?${params.toString()}`)
              setPage(1)
            }}
            className={`px-4 py-2 rounded text-white ${
              sortByStock ? 'bg-gray-600 hover:bg-gray-700' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {sortByStock ? 'Mặc định' : 'Tồn kho ↓'}
          </button>

          <button
            onClick={() => {
              const next = !lowStockOnly
              setLowStockOnly(next)
              const params = new URLSearchParams(Array.from(searchParams.entries()))
              if (next) {
                params.set('lowStock', '1')
              } else {
                params.delete('lowStock')
                params.delete('filter')
              }
              router.replace(`/admin/products?${params.toString()}`)
              setPage(1)
            }}
            className={`px-4 py-2 rounded text-white ${
              lowStockOnly ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {lowStockOnly ? 'Tất cả SP' : 'Sắp hết hàng'}
          </button>
        </div>
      </div>

      {/* Tìm kiếm + lọc trạng thái */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-4 mb-4">
        <div className="flex flex-1 border border-gray-300 rounded-lg overflow-hidden shadow-sm">
          <input
            type="text"
            placeholder="Nhập sản phẩm cần tìm kiếm..."
            className="px-4 py-2 w-full outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="px-4 bg-blue-600 hover:bg-blue-700 text-white text-lg">
            <FaSearch />
          </button>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 shadow-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hiện</option>
          <option value="inactive">Ẩn</option>
        </select>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="w-full table-auto border-collapse text-center">
          <colgroup>
            <col className="w-auto" />
            <col />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
<col className="w-auto" />
            <col className="w-auto" />
            <col className="w-auto" />
          </colgroup>

          <thead className="bg-gray-100">
            <tr className="text-sm font-semibold whitespace-nowrap">
              <th className="p-3 border whitespace-nowrap">STT</th>
              <th className="p-3 border text-center">Tên</th>
              <th className="p-3 border whitespace-nowrap">Ảnh</th>
              <th className="p-3 border whitespace-nowrap">Giá</th>
              <th className="p-3 border whitespace-nowrap">Danh mục</th>
              <th className="p-3 border whitespace-nowrap">Thương hiệu</th>
              <th className="p-3 border whitespace-nowrap">Đã bán</th>
              <th className="p-3 border whitespace-nowrap">Tồn kho</th>
              <th className="p-3 border whitespace-nowrap">Trạng thái</th>
              <th className="p-3 border whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {paginatedProducts.map((p, index) => (
              <tr key={p._id} className="text-sm border-t hover:bg-gray-50">
                <td className="p-3 border">{(page - 1) * limit + index + 1}</td>

                {/* Cột tên + badge sắp hết hàng */}
                <td className="p-3 border text-left whitespace-normal break-words">
                  <div className="flex flex-col items-start gap-1">
                    <span>{p.name}</span>
                    {p.variants.some(v =>
                      v.sizes.some(s => {
                        const left = remain(s.quantity, s.sold)
                        return left > 0 && left < LOW_STOCK_LT
                      })
                    ) && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        Sắp hết hàng
                      </span>
                    )}
                  </div>
                </td>

                {/* Ảnh */}
                <td className="p-3 border">
                  <img
                    src={p.variants[0]?.image ? `http://localhost:5000${p.variants[0].image}` : '/no-image.png'}
                    alt={p.name}
                    width={120}
                    height={120}
                    className="rounded object-cover inline-block"
                  />
                </td>

                {/* Giá */}
                <td className="p-3 border font-semibold truncate">
                  {p.discount > 0 ? (
                    <>
                      <span className="line-through text-gray-500 mr-1">{p.price.toLocaleString()}₫</span>
                      <span className="text-red-600">{(p.price - p.discount).toLocaleString()}₫</span>
                    </>
                  ) : (
                    <span className="text-gray-500">{p.price.toLocaleString()}₫</span>
                  )}
                </td>
<td className="p-3 border truncate">{p.category?.name}</td>
                <td className="p-3 border truncate">{p.brand?.name}</td>
                <td className="p-3 border">{calcSold(p)}</td>

                <td className="p-3 border">
                  <div className="flex flex-col items-center">
                    <span>{calcStock(p) - calcSold(p)}</span>

                    <button
                      className="text-blue-600 underline text-sm hover:text-blue-800 mt-1"
                      onClick={() => {
                        setSelectedProduct(p)
                        setShowDetailPopup(true)
                      }}
                    >
                      Chi tiết
                    </button>

                    {(calcStock(p) - calcSold(p)) <= 20 && (
                      <span className="text-red-600 font-bold mt-1 text-xs">(Sắp hết)</span>
                    )}
                  </div>
                </td>

                {/* Trạng thái */}
                <td className="p-3 border">
                  <div className="flex items-center justify-center gap-2">
                    <Toggle checked={p.isActive} onChange={() => askToggle(p._id, p.isActive)} />
                    <span className="text-sm">{p.isActive ? 'Hiện' : 'Ẩn'}</span>
                  </div>
                </td>

                {/* Thao tác */}
                <td className="p-3 border">
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`/admin/products/edit_product/${p.slug}`}
                      className="px-3 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500"
                    >
                      Sửa
                    </Link>
                    <button
                      onClick={() => askDelete(p._id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginatedProducts.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center p-4 text-gray-500">
                  Không có sản phẩm nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} setPage={setPage} totalPages={totalPages} />

      {/* Popup xác nhận */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-xl w-full max-w-sm text-center">
            <p className="text-lg font-medium mb-4">
              {actionType === 'delete'
                ? 'Bạn có chắc chắn muốn xóa sản phẩm này không?'
                : `Bạn có chắc muốn ${toggleValue ? 'hiện' : 'ẩn'} sản phẩm này không?`}
</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Xác nhận
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailPopup && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-xl w-full max-w-xl max-h-screen overflow-y-auto relative">
            <button
              onClick={() => {
                setShowDetailPopup(false)
                setSelectedProduct(null)
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl font-bold"
            >
              &times;
            </button>

            <h3 className="text-xl font-semibold mb-4 text-center">Chi tiết tồn kho</h3>

            <div className="mt-4 max-h-96 overflow-y-auto overflow-x-auto border rounded">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className="border p-2 text-center">Màu</th>
                    <th className="border p-2 text-center">Size</th>
                    <th className="border p-2 text-center">Chiều cao</th>
                    <th className="border p-2 text-center">Cân nặng</th>
                    <th className="border p-2 text-center">Còn lại</th>
                    <th className="border p-2 text-center">Đã bán</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.variants.map((v, i) =>
                    v.sizes.map((s, j) => {
                      const stockLeft = s.quantity - s.sold
                      return (
                        <tr key={`${i}-${j}`} className={stockLeft <= 5 ? 'bg-yellow-100' : ''}>
                          <td className="border p-2 text-center">{v.color.name}</td>
                          <td className="border p-2 text-center">{s.size.name}</td>
                          <td className="border p-2 text-center">{s.size.height}</td>
                          <td className="border p-2 text-center">{s.size.weight}</td>
                          <td className="border p-2 text-center">{stockLeft}</td>
                          <td className="border p-2 text-center">{s.sold}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
