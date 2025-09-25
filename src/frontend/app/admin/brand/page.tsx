'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { toast, ToastContainer } from 'react-toastify';
import {
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrashAlt,
} from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';

interface Brand {
  _id: string;
  name: string;
  image: string;
  slug: string;
}

interface ReassignModalState {
  open: boolean;
  sourceId: string | null;
  sourceName: string;
  count: number;
  targets: { _id: string; name: string }[];
  targetId: string;
  submitting: boolean;
}

export default function BrandListPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [reassign, setReassign] = useState<ReassignModalState>({
    open: false,
    sourceId: null,
    sourceName: '',
    count: 0,
    targets: [],
    targetId: '',
    submitting: false,
  });

  const limit = 10;

  const fetchBrands = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/brands?page=${currentPage}&limit=${limit}&search=${search}`
      );
      setBrands(res.data.brands || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      toast.error('Lỗi tải thương hiệu');
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [currentPage, search]);

  // mở modal reassign khi server trả 409
  const openReassignModal = async (sourceId: string, count: number) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/brands?limit=all&search=`);
      const all: Brand[] = res.data.brands || [];
      const targets = all
        .filter((b) => b._id !== sourceId)
        .map((b) => ({ _id: b._id, name: b.name }));

      setReassign((s) => ({
        ...s,
        open: true,
        sourceId,
        sourceName: brands.find((x) => x._id === sourceId)?.name || '',
        count,
        targets,
        targetId: targets[0]?._id || '',
        submitting: false,
      }));
    } catch {
      toast.error('Không tải được thương hiệu đích');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`http://localhost:5000/api/brands/${id}`);
      toast.success('Xóa thành công');
      setConfirmDeleteId(null);
      fetchBrands();
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 409 && e.response.data?.error === 'BRAND_IN_USE') {
        const count = Number(e.response.data?.count || 0);
        setConfirmDeleteId(null);
        openReassignModal(id, count);
      } else {
        toast.error('Xóa thất bại');
      }
    }
  };

  const submitReassign = async () => {
    if (!reassign.sourceId) return;
    if (!reassign.targetId) {
      toast.info('Vui lòng chọn thương hiệu đích');
      return;
    }
    try {
      setReassign((s) => ({ ...s, submitting: true }));
      await axios.post(
        `http://localhost:5000/api/brands/${reassign.sourceId}/reassign`,
        { targetBrandId: reassign.targetId }
      );
      toast.success('Đã chuyển sản phẩm & xoá thương hiệu nguồn');
      setReassign({
        open: false,
        sourceId: null,
        sourceName: '',
        count: 0,
        targets: [],
        targetId: '',
        submitting: false,
      });
      fetchBrands();
    } catch {
      toast.error('Chuyển & xoá thất bại');
      setReassign((s) => ({ ...s, submitting: false }));
    }
  };

  const renderPagination = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
      start = 1;
      end = Math.min(5, totalPages);
    }

    if (currentPage >= totalPages - 2) {
      end = totalPages;
      start = Math.max(1, totalPages - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-4 py-1 rounded border ${
            currentPage === i
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-blue-100 transition'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex gap-2 items-center mt-4">
        {/* Bạn đã đặt ToastContainer ở layout thì có thể bỏ dòng dưới,
            còn nếu chưa thì dùng ToastContainer tại top trang như trang Category */}
        <ToastContainer position="top-right" autoClose={3000} style={{ top: '60px' }} />

        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="p-2 rounded border bg-gray-100 hover:bg-blue-100 transition disabled:opacity-50"
        >
          <FaChevronLeft className="text-gray-500" />
        </button>

        {pages}

        {end < totalPages && <span className="px-2">...</span>}
        {end < totalPages && (
          <button
            onClick={() => setCurrentPage(totalPages)}
            className="px-4 py-1 border rounded bg-gray-100 hover:bg-blue-100 transition"
          >
            {totalPages}
          </button>
        )}

        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="p-2 rounded border bg-gray-100 hover:bg-blue-100 transition disabled:opacity-50"
        >
          <FaChevronRight className="text-gray-500" />
        </button>
      </div>
    );
  };

  return (
    <main className="main-content p-6">
      {/* Popup xác nhận XÓA cũ */}
      {confirmDeleteId && (
        <div className="fixed top-[60px] right-4 bg-white border shadow-lg z-50 p-4 rounded">
          <p className="mb-4">Bạn có chắc chắn muốn xóa thương hiệu này không?</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDelete(confirmDeleteId!)}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Xóa
            </button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Modal REASSIGN mới */}
      {reassign.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-xl">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold">Chuyển sản phẩm rồi xoá thương hiệu</h3>
            </div>
            <div className="p-5 space-y-4">
              <p>
                Thương hiệu <b>{reassign.sourceName}</b> đang có{' '}
                <b className="text-red-600">{reassign.count}</b> sản phẩm.
              </p>

              {reassign.targets.length === 0 ? (
                <div className="text-sm text-red-600">
                  Hiện chưa có thương hiệu đích khác. Vui lòng tạo thương hiệu mới trước khi chuyển.
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="min-w-[140px]">Thương hiệu đích:</label>
                  <select
                    value={reassign.targetId}
                    onChange={(e) => setReassign((s) => ({ ...s, targetId: e.target.value }))}
                    className="border rounded px-3 py-2 w-full"
                  >
                    {reassign.targets.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button
                onClick={() =>
                  setReassign({
                    open: false,
                    sourceId: null,
                    sourceName: '',
                    count: 0,
                    targets: [],
                    targetId: '',
                    submitting: false,
                  })
                }
                className="px-4 py-2 rounded bg-gray-200"
                disabled={reassign.submitting}
              >
                Hủy
              </button>
              <button
                onClick={submitReassign}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                disabled={reassign.submitting || reassign.targets.length === 0}
              >
                {reassign.submitting ? 'Đang chuyển…' : 'Chuyển & Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-semibold text-[#002855]">Thương hiệu sản phẩm</h1>

        <div className="flex items-center gap-2">
          <div className="flex">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập thương hiệu cần tìm kiếm..."
              className="border px-4 py-2 rounded-l w-64 focus:outline-none"
            />
            <button
              onClick={fetchBrands}
              className="bg-blue-600 text-white px-4 rounded-r hover:bg-blue-700"
            >
              <FaSearch />
            </button>
          </div>

          <Link
            href="/admin/brand/add_brand"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus /> Thêm thương hiệu
          </Link>
        </div>
      </div>

      <table className="w-full table-auto border-collapse border bg-white text-center">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">STT</th>
            <th className="border px-4 py-2">Tên</th>
            <th className="border px-4 py-2">Hình ảnh</th>
            <th className="border px-4 py-2">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((brand, index) => (
            <tr key={brand._id} className="hover:bg-gray-50">
              <td className="border px-4 py-2 align-middle">
                {(currentPage - 1) * limit + index + 1}
              </td>
              <td className="border px-4 py-2 align-middle">{brand.name || '-'}</td>
              <td className="border px-4 py-2 align-middle">
                {brand.image ? (
                  <img
                    src={brand.image.startsWith('http') ? brand.image : `http://localhost:5000${brand.image}`}
                    alt={brand.name}
                    className="w-16 h-12 mx-auto object-contain rounded"
                  />
                ) : (
                  '-'
                )}
              </td>
              <td className="border px-4 py-2 align-middle">
                <div className="flex justify-center gap-2">
                  <Link
                    href={`/admin/brand/edit_brand/${brand.slug}`}
                    className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500 transition flex items-center gap-1"
                  >
                    <FaEdit /> Sửa
                  </Link>
                  <button
                    onClick={() => setConfirmDeleteId(brand._id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition flex items-center gap-1"
                  >
                    <FaTrashAlt /> Xóa
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-center">{renderPagination()}</div>
    </main>
  );
}
