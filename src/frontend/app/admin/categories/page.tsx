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

interface Category {
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

export default function CategoryListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
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

  const fetchCategories = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/categories?page=${currentPage}&limit=${limit}&search=${search}`
      );
      setCategories(res.data.categories || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      toast.error('Lỗi tải danh mục');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [currentPage, search]);

  // mở modal reassign khi server trả 409
  const openReassignModal = async (sourceId: string, count: number) => {
    try {
      // lấy tất cả danh mục để chọn đích (loại trừ chính nó)
      const res = await axios.get(
        `http://localhost:5000/api/categories?limit=all&search=`
      );
      const all: Category[] = res.data.categories || [];
      const targets = all
        .filter((c) => c._id !== sourceId)
        .map((c) => ({ _id: c._id, name: c.name }));

      setReassign((s) => ({
        ...s,
        open: true,
        sourceId,
        sourceName: categories.find((x) => x._id === sourceId)?.name || '',
        count,
        targets,
        targetId: targets[0]?._id || '',
        submitting: false,
      }));
    } catch {
      toast.error('Không tải được danh mục đích');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`http://localhost:5000/api/categories/${id}`);
      toast.success('Xóa thành công');
      setConfirmDeleteId(null);
      fetchCategories();
    } catch (e: any) {
      // Nếu bị chặn xoá vì còn sản phẩm -> mở modal reassign
      if (axios.isAxiosError(e) && e.response?.status === 409 && e.response.data?.error === 'CATEGORY_IN_USE') {
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
      toast.info('Vui lòng chọn danh mục đích');
      return;
    }
    try {
      setReassign((s) => ({ ...s, submitting: true }));
      await axios.post(
        `http://localhost:5000/api/categories/${reassign.sourceId}/reassign`,
        { targetCategoryId: reassign.targetId }
      );
      toast.success('Đã chuyển sản phẩm & xoá danh mục nguồn');
      setReassign({
        open: false,
        sourceId: null,
        sourceName: '',
        count: 0,
        targets: [],
        targetId: '',
        submitting: false,
      });
      fetchCategories();
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
      <ToastContainer position="top-right" autoClose={3000} style={{ top: '60px' }} />

      {/* Popup xác nhận XÓA cũ */}
      {confirmDeleteId && (
        <div className="fixed top-[60px] right-4 bg-white border shadow-lg z-50 p-4 rounded">
          <p className="mb-4">Bạn có chắc chắn muốn xóa danh mục này không?</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDelete(confirmDeleteId)}
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

      {/* Modal REASSIGN mới (mở khi server trả 409) */}
      {reassign.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-xl">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold">Chuyển sản phẩm rồi xoá danh mục</h3>
            </div>
            <div className="p-5 space-y-4">
              <p>
                Danh mục <b>{reassign.sourceName}</b> đang có{' '}
                <b className="text-red-600">{reassign.count}</b> sản phẩm.
              </p>

              {reassign.targets.length === 0 ? (
                <div className="text-sm text-red-600">
                  Hiện chưa có danh mục đích khác. Vui lòng tạo danh mục mới trước khi chuyển.
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="min-w-[120px]">Danh mục đích:</label>
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
        <h1 className="text-2xl font-semibold text-[#002855]">Danh mục sản phẩm</h1>

        <div className="flex items-center gap-2">
          <div className="flex">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập danh mục cần tìm kiếm..."
              className="border px-4 py-2 rounded-l w-64 focus:outline-none"
            />
            <button
              onClick={fetchCategories}
              className="bg-blue-600 text-white px-4 rounded-r hover:bg-blue-700"
            >
              <FaSearch />
            </button>
          </div>

          <Link
            href="/admin/categories/add_categories"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus /> Thêm danh mục
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
          {categories.map((cat, index) => (
            <tr key={cat._id} className="hover:bg-gray-50">
              <td className="border px-4 py-2 align-middle">
                {(currentPage - 1) * limit + index + 1}
              </td>
              <td className="border px-4 py-2 align-middle">{cat.name || '-'}</td>
              <td className="border px-4 py-2 align-middle">
                {cat.image ? (
                  <img
                    src={cat.image.startsWith('http') ? cat.image : `http://localhost:5000${cat.image}`}
                    alt={cat.name}
                    className="w-16 h-12 mx-auto object-cover rounded"
                  />
                ) : (
                  '-'
                )}
              </td>
              <td className="border px-4 py-2 align-middle">
                <div className="flex justify-center gap-2">
                  <Link
                    href={`/admin/categories/edit_categories/${cat.slug}`}
                    className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500 transition flex items-center gap-1"
                  >
                    <FaEdit /> Sửa
                  </Link>
                  <button
                    onClick={() => setConfirmDeleteId(cat._id)}
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
