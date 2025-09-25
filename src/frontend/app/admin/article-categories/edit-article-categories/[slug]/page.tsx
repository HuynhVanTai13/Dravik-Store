'use client';

import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Category {
  _id: string;
  name: string;
  image: string;
  slug: string;
}

export default function EditArticleCategoryPage() {
  const [name, setName] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();
  const { slug } = useParams() as { slug: string };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/article-categories/slug/${slug}`);
        const data = await res.json();
        setName(data.name);
        setPreview(`http://localhost:5000/${data.image}`);
      } catch (error) {
        toast.error('Không tìm thấy danh mục!');
      }
    };
    fetchData();
  }, [slug]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error('Tên là bắt buộc');
      return;
    }

    try {
      const checkRes = await fetch('http://localhost:5000/api/article-categories');
      const data = await checkRes.json();

      const isNameExist = (data.categories as Category[]).some(
        (cat) =>
          cat.name.trim().toLowerCase() === name.trim().toLowerCase() &&
          cat.slug !== slug
      );

      const isImageExist =
        image &&
        (data.categories as Category[]).some(
          (cat) => cat.image?.split('/').pop() === image.name
        );

      if (isNameExist) {
        toast.error('Tên danh mục đã tồn tại');
        return;
      }

      if (isImageExist) {
        toast.error('Ảnh đã được sử dụng');
        return;
      }

      const formData = new FormData();
      formData.append('name', name);
      if (image) formData.append('image', image);

      const res = await fetch(`http://localhost:5000/api/article-categories/${slug}`, {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) throw new Error();

      toast.success('Cập nhật danh mục thành công!');
      setTimeout(() => router.push('/admin/article-categories'), 1500);
    } catch (err) {
      toast.error('Cập nhật thất bại!');
    }
  };

  return (
    <main className="main-content flex justify-center p-6">
      <ToastContainer position="top-right" autoClose={2000} style={{ top: 60 }} />
      <div className="w-full max-w-md">
        <button
          onClick={() => router.push('/admin/article-categories')}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 transition"
        >
          ← Quay lại danh sách
        </button>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded p-8"
        >
          <h2 className="text-2xl font-semibold mb-6 text-center">Chỉnh sửa danh mục</h2>
          <input
            type="text"
            placeholder="Tên danh mục"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-full mb-4"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="mb-4"
          />
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 object-cover mb-4 mx-auto rounded"
            />
          )}
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 w-full"
          >
            Cập nhật
          </button>
        </form>
      </div>
    </main>
  );
}
