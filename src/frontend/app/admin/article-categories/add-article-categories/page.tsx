'use client'

import { useState, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { FaArrowLeft } from 'react-icons/fa'

interface Category {
  _id: string
  name: string
  image: string
}

export default function AddCategoryPage() {
  const [name, setName] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const router = useRouter()

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name || !image) {
      toast.error('Tên và ảnh là bắt buộc')
      return
    }

    try {
      const checkRes = await fetch('http://localhost:5000/api/article-categories')
      const data = await checkRes.json()

      const isNameExist = (data.categories as Category[]).some(
        (cat) => cat.name.trim().toLowerCase() === name.trim().toLowerCase()
      )
      const isImageExist = (data.categories as Category[]).some(
        (cat) => cat.image?.split('/').pop() === image.name
      )

      if (isNameExist) {
        toast.error('Tên danh mục đã tồn tại')
        return
      }

      if (isImageExist) {
        toast.error('Ảnh đã được sử dụng')
        return
      }

      const formData = new FormData()
      formData.append('name', name)
      formData.append('image', image)

      const res = await fetch('http://localhost:5000/api/article-categories', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Thêm thất bại')

      toast.success('✅ Thêm danh mục thành công')
      setTimeout(() => router.push('/admin/article-categories'), 1500)
    } catch (err) {
      toast.error('❌ Có lỗi xảy ra khi thêm')
    }
  }

  return (
    <main className="main-content min-h-screen bg-gray-50 flex justify-center items-start p-6">
      <ToastContainer position="top-right" autoClose={2000} style={{ top: 60 }} />

      <div className="w-full max-w-lg bg-white p-8 rounded shadow-md">
        <button
          onClick={() => router.push('/admin/article-categories')}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 transition"
        >
          <FaArrowLeft />
          <span>Quay lại danh sách</span>
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Thêm Danh Mục</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700">Tên danh mục</label>
            <input
              type="text"
              placeholder="Nhập tên danh mục"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">Chọn ảnh</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full"
            />
          </div>

          {preview && (
            <div className="text-center">
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 object-cover mx-auto rounded border"
              />
            </div>
          )}

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 w-full font-semibold transition"
          >
            Thêm
          </button>
        </form>
      </div>
    </main>
  )
}
