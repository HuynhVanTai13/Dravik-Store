'use client';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

export default function AddColorPage() {
  const [name, setName] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/colors', { name });
      toast.success('Thêm màu thành công');
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
      <h1 className="text-2xl font-semibold text-[#002855] mb-4">Thêm màu sắc</h1>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nhập tên màu..."
          required
          className="w-full border px-4 py-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Thêm
        </button>
      </form>
    </main>
  );
}
