'use client'

import { useEffect, useState } from 'react'
import axios from '@/utils/axiosConfig'
import Link from 'next/link'
import { toast, ToastContainer } from 'react-toastify'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { FaSearch, FaPlus, FaChevronLeft, FaChevronRight, FaEdit, FaTrash } from 'react-icons/fa'
import 'react-toastify/dist/ReactToastify.css'

interface ArticleCategory {
  _id: string
  name: string
  slug: string
  image: string
}

export default function ArticleCategoryPage() {
  const [categories, setCategories] = useState<ArticleCategory[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 5
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [page, search])

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/article-categories', {
        params: { page, limit, search }
      })
      setCategories([...res.data.categories].reverse())
      setTotal(res.data.total)
    } catch {
      toast.error('Lỗi khi tải danh mục')
    }
  }

  const handleDelete = async (slug: string) => {
    try {
      await axios.delete(`/api/article-categories/slug/${slug}`)
      toast.success('🗑️ Xóa thành công')
      fetchData()
    } catch {
      toast.error('❌ Xóa thất bại')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <main className="main-content p-6 bg-gray-50 min-h-screen">
      <ToastContainer position="top-right" autoClose={2000} style={{ top: 60 }} />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-gray-800">Danh mục bài viết</h2>



        <div className="flex items-center gap-2">
          <div className="flex">
            <input
              type="text"
              placeholder="Nhập danh mục cần tìm..."
              className="border px-4 py-2 rounded-l w-64 focus:outline-none"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <button
              className="bg-blue-600 text-white px-4 rounded-r hover:bg-blue-700"
              onClick={() => setPage(1)}
            >
              <FaSearch size={14} />
            </button>
          </div>

          <Link
            href="/admin/article-categories/add-article-categories"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus size={12} /> Thêm danh mục
          </Link>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="w-full text-center border">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-3 border">STT</th>
              <th className="py-3 border">Tên</th>
              <th className="py-3 border">Hình ảnh</th>
              <th className="py-3 border">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c._id} className="border-t">
                <td className="py-2 border">{(page - 1) * limit + i + 1}</td>
                <td className="py-2 border">{c.name}</td>
                <td className="py-2 border">
                  <img
                    src={`http://localhost:5000/${c.image}`}
                    alt={c.name}
                    className="w-16 h-16 object-cover mx-auto rounded-md border"
                  />
                </td>
                <td className="py-2 border">
                  <Link
                    href={`/admin/article-categories/edit-article-categories/${c.slug}`}
                    className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded mr-2 inline-flex items-center gap-1"
                  >
                    <FaEdit size={12} /> Sửa
                  </Link>
                  <button
                    onClick={() => setConfirmSlug(c.slug)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded inline-flex items-center gap-1"
                  >
                    <FaTrash size={12} /> Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination UI */}
        <div className="flex justify-center mt-6 mb-4">
          <div className="inline-flex items-center space-x-1 rounded-md overflow-hidden shadow-sm">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="p-2 rounded border bg-gray-100 hover:bg-blue-100 transition disabled:opacity-50"
            >
              <FaChevronLeft size={12} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-4 py-1 border rounded bg-gray-100 hover:bg-blue-100 transition ${
                  page === i + 1
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              className="p-2 rounded border bg-gray-100 hover:bg-blue-100 transition disabled:opacity-50"
            >
              <FaChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmSlug}
        message="Bạn có chắc chắn muốn xóa danh mục này không?"
        onConfirm={() => {
          if (confirmSlug) handleDelete(confirmSlug)
          setConfirmSlug(null)
        }}
        onCancel={() => setConfirmSlug(null)}
      />
    </main>
  )
}
