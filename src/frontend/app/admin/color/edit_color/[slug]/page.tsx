'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useRouter } from 'next/navigation';

export default function EditColorPage() {
  const [name, setName] = useState('');
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const fetchColor = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/colors/slug/${params.slug}`);
        setName(res.data.name);
      } catch {
        toast.error('Không tìm thấy màu');
      }
    };
    fetchColor();
  }, [params.slug]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/colors/${params.slug}`, { name });
      toast.success('Cập nhật thành công');
      router.push('/admin/color');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || 'Lỗi xử lý');
      } else {
        toast.error('Lỗi không xác định');
      }
    }
  };
  

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-[#002855] mb-4">Cập nhật màu sắc</h1>
      <form onSubmit={handleUpdate} className="max-w-md space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border px-4 py-2 rounded"
        />
        <button
          type="submit"
          className="bg-yellow-500 text-white px-6 py-2 rounded hover:bg-yellow-600"
        >
          Cập nhật
        </button>
      </form>
    </main>
  );
}
