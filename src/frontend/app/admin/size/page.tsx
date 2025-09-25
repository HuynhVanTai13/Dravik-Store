'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Size {
  _id: string;
  name: string;
  height: string;
  weight: string;
}

export default function SizePage() {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [showConfirmId, setShowConfirmId] = useState<string | null>(null);

  const fetchSizes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/sizes');
      if (Array.isArray(res.data.sizes)) {
        setSizes(res.data.sizes);
      } else {
        setSizes([]);
        toast.error('Dữ liệu kích cỡ không hợp lệ');
      }
    } catch {
      toast.error('Không thể tải danh sách kích cỡ');
    }
  };

  useEffect(() => {
    fetchSizes();
  }, []);

  const isValidRange = (val: string) => /^\d{1,3}(\s*-\s*\d{1,3})?$/.test(val.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!isValidRange(height) || !isValidRange(weight)) {
        return toast.error('Chiều cao và cân nặng phải là số hoặc khoảng hợp lệ, ví dụ: 165 hoặc 165 - 175');
      }

      const payload = { name, height, weight };

      if (editId) {
        await axios.put(`http://localhost:5000/api/sizes/${editId}`, payload);
        toast.success('Cập nhật thành công');
      } else {
        await axios.post('http://localhost:5000/api/sizes', payload);
        toast.success('Thêm kích cỡ thành công');
      }
      setName('');
      setHeight('');
      setWeight('');
      setEditId(null);
      fetchSizes();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || 'Lỗi xử lý');
      } else {
        toast.error('Lỗi không xác định');
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`http://localhost:5000/api/sizes/${id}`);
      toast.success('Xóa thành công');
      fetchSizes();
      setShowConfirmId(null);
    } catch {
      toast.error('Xóa thất bại');
    }
  };

  const handleEdit = (size: Size) => {
    setName(size.name);
    setHeight(size.height);
    setWeight(size.weight);
    setEditId(size._id);
  };

  return (
    <main className="main-content p-6">
      <ToastContainer position="top-right" autoClose={2000} style={{ top: '60px' }} />
      <h1 className="text-2xl font-bold mb-6">Quản lý kích cỡ</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-md rounded w-full mb-6">
        <h2 className="text-xl font-semibold mb-4">{editId ? 'Cập nhật kích cỡ' : 'Thêm kích cỡ mới'}</h2>
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="w-full md:w-1/4">
            <label className="block mb-1">Tên size</label>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nhập tên size"
            />
          </div>
          <div className="w-full md:w-1/4">
            <label className="block mb-1">Chiều cao (cm)</label>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              required
              placeholder="Ví dụ: 165 hoặc 165 - 175"
            />
          </div>
          <div className="w-full md:w-1/4">
            <label className="block mb-1">Cân nặng (kg)</label>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
              placeholder="Ví dụ: 55 hoặc 55 - 65"
            />
          </div>
          <div className="w-full md:w-1/4">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">
              {editId ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </div>
      </form>

      <table className="min-w-full bg-white border rounded shadow-md">
        <thead>
          <tr className="bg-gray-100 text-center">
            <th className="border px-4 py-2">STT</th>
            <th className="border px-4 py-2">Tên size</th>
            <th className="border px-4 py-2">Chiều cao (cm)</th>
            <th className="border px-4 py-2">Cân nặng (kg)</th>
            <th className="border px-4 py-2">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((size, index) => (
            <tr key={size._id} className="hover:bg-gray-50 text-center">
              <td className="border px-4 py-2">{index + 1}</td>
              <td className="border px-4 py-2">{size.name}</td>
              <td className="border px-4 py-2">{size.height}</td>
              <td className="border px-4 py-2">{size.weight}</td>
              <td className="border px-4 py-2 space-x-2">
                <button
                  onClick={() => handleEdit(size)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                >
                  Sửa
                </button>
                <button
                  onClick={() => setShowConfirmId(size._id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                >
                  Xóa
                </button>

                {showConfirmId === size._id && (
                  <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded shadow-xl w-[300px]">
                      <h3 className="text-lg font-semibold mb-4 text-center">Bạn có chắc chắn muốn xóa?</h3>
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => handleDelete(size._id)}
                          className="bg-red-600 text-white px-4 py-2 rounded"
                        >
                          Xóa
                        </button>
                        <button
                          onClick={() => setShowConfirmId(null)}
                          className="bg-gray-300 text-black px-4 py-2 rounded"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}