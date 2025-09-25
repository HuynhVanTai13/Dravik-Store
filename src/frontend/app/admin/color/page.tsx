'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Color {
  _id: string;
  name: string;
}

export default function ColorPage() {
  const [colors, setColors] = useState<Color[]>([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [showConfirmId, setShowConfirmId] = useState<string | null>(null);

  const fetchColors = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/colors');
      if (Array.isArray(res.data.colors)) {
        setColors(res.data.colors);
      } else {
        setColors([]);
        toast.error('Dữ liệu màu không hợp lệ');
      }
    } catch {
      toast.error('Không thể tải danh sách màu');
    }
  };

  useEffect(() => {
    fetchColors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`http://localhost:5000/api/colors/${editId}`, { name });
        toast.success('Cập nhật thành công');
      } else {
        await axios.post('http://localhost:5000/api/colors', { name });
        toast.success('Thêm màu thành công');
      }
      setName('');
      setEditId(null);
      fetchColors();
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
      await axios.delete(`http://localhost:5000/api/colors/${id}`);
      toast.success('Xóa thành công');
      fetchColors();
      setShowConfirmId(null);
    } catch {
      toast.error('Xóa thất bại');
    }
  };

  const handleEdit = (color: Color) => {
    setName(color.name);
    setEditId(color._id);
  };

  return (
    <main className="main-content p-6">
      <ToastContainer position="top-right" autoClose={2000} style={{ top: '60px' }} />
      <h1 className="text-2xl font-bold mb-6">Quản lý màu sắc</h1>

      <form onSubmit={handleSubmit} className="mb-8 flex gap-4 items-end">
        <div>
          <label className="block mb-1">Tên màu</label>
          <input
            type="text"
            className="border rounded px-3 py-2 w-[300px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          {editId ? 'Cập nhật' : 'Thêm'}
        </button>
      </form>

      <table className="min-w-full bg-white border rounded shadow-md">
        <thead>
          <tr className="bg-gray-100 text-center">
            <th className="border px-4 py-2">STT</th>
            <th className="border px-4 py-2">Tên màu</th>
            <th className="border px-4 py-2">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {colors.map((color, index) => (
            <tr key={color._id} className="hover:bg-gray-50 text-center">
              <td className="border px-4 py-2">{index + 1}</td>
              <td className="border px-4 py-2">{color.name}</td>
              <td className="border px-4 py-2 space-x-2">
                <button
                  onClick={() => handleEdit(color)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                >
                  Sửa
                </button>
                <button
                  onClick={() => setShowConfirmId(color._id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                >
                  Xóa
                </button>

                {showConfirmId === color._id && (
                  <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded shadow-xl w-[300px]">
                      <h3 className="text-lg font-semibold mb-4 text-center">Bạn có chắc chắn muốn xóa?</h3>
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => handleDelete(color._id)}
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
