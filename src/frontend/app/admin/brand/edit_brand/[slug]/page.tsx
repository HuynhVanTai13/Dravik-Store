'use client';
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaArrowLeft } from 'react-icons/fa';

interface Brand {
  _id: string;
  name: string;
  image: string;
  slug: string;
}

export default function EditBrandPage() {
  const router = useRouter();
  const { slug } = useParams();
  const [name, setName] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/brands/slug/${slug}`);
        const data = await res.json();
        if (!res.ok || !data.name) throw new Error();
        setName(data.name);
        const fullImageUrl = data.image?.startsWith('http')
          ? data.image
          : `http://localhost:5000${data.image}`;
        setPreview(fullImageUrl);
        setCurrentBrand(data);
      } catch (error) {
        toast.error('Không thể tải dữ liệu thương hiệu');
      }
    };
    fetchBrand();
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
    if (!name.trim()) {
      toast.error('⚠️ Vui lòng nhập tên thương hiệu');
      return;
    }

    try {
      const allRes = await fetch('http://localhost:5000/api/brands');
      const allData = await allRes.json();
      const otherBrands = allData.brands.filter(
        (b: Brand) => b._id !== currentBrand?._id
      );

      const nameExists = otherBrands.some(
        (b: Brand) => b.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      const imageExists =
        image &&
        otherBrands.some(
          (b: Brand) => b.image.split('/').pop() === image.name
        );

      if (nameExists) {
        toast.error('Tên thương hiệu đã tồn tại');
        return;
      }

      if (imageExists) {
        toast.error('Ảnh đã được sử dụng');
        return;
      }

      const formData = new FormData();
      formData.append('name', name);
      if (image) {
        formData.append('image', image);
      }

      const res = await fetch(`http://localhost:5000/api/brands/slug/${slug}`, {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) throw new Error();
      toast.success('Cập nhật thương hiệu thành công');
      setTimeout(() => router.push('/admin/brand'), 1500);
    } catch (err) {
      toast.error('Cập nhật thất bại');
    }
  };

  return (
    <main className="main-content flex justify-center p-6">
      <ToastContainer position="top-right" autoClose={3000} style={{ top: 60 }} />
      <div className="w-full max-w-md">
        <button
          onClick={() => router.push('/admin/brand')}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 transition"
        >
          <FaArrowLeft /> <span>Quay lại danh sách</span>
        </button>

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Sửa Thương Hiệu</h2>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên thương hiệu"
            className="w-full px-4 py-2 border rounded mb-4"
          />

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full mb-4"
          />

          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 object-cover mx-auto mb-4 rounded shadow"
            />
          )}

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white w-full py-2 rounded"
          >
            Cập nhật
          </button>
        </form>
      </div>
    </main>
  );
}
