"use client";
import React, { useEffect, useState } from "react";
import "../../../styles/blog.css";
import Link from "next/link";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Category {
  _id: string;
  name: string;
}

interface Article {
  _id: string;
  title: string;
  summary?: string;
  image?: string;
  createdAt?: string;
  category?: Category;
  views?: number;
  isFeatured?: boolean;
  isMostViewed?: boolean;
  isHotEvent?: boolean;
  isStoreNew?: boolean;
  isNewPosts?: boolean;
}

export default function BlogPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const limit = 5;
  const [total, setTotal] = useState(0);

  const normalizeArticles = (raw: any): Article[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.result)) return raw.result;
    if (Array.isArray(raw.payload)) return raw.payload;
    console.warn("Unexpected articles response:", raw);
    return [];
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/articles?page=${page}&limit=${limit}&search=${searchTerm}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Fetch articles failed");
      const json = await res.json();

      const list = normalizeArticles(json).map(a => ({
        ...a,
        isFeatured: a.isFeatured ?? false,
        isMostViewed: a.isMostViewed ?? false,
        isHotEvent: a.isHotEvent ?? false,
        isStoreNew: a.isStoreNew ?? false,
        isNewPosts: a.isNewPosts ?? false,
      }));

      setArticles(list);
      setTotal(json.total || list.length);
    } catch (err) {
      console.error("Fetch articles error:", err);
      toast.error("Lấy danh sách bài viết thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [page, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xoá bài viết này?")) return;
    try {
      const res = await fetch(`${API_BASE}/articles/${id}?noView=true`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Xoá thành công");
        fetchArticles();
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(j.message || "Xoá không thành công");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi xoá");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="main-content p-6">
      <section className="bg-white rounded shadow">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center border-b px-4 py-3 gap-4">
          <h2 className="text-lg font-bold">Danh sách bài viết</h2>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Nhập bài viết cần tìm kiếm..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-l-md focus:outline-none w-64 h-10"
              />
              <button
                onClick={() => setPage(1)}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-r-md hover:bg-blue-700 border border-blue-600 flex items-center justify-center h-10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>

            <Link href="/admin/blog/add_blog">
              <button className="bg-blue-600 text-white px-4 py-2.5 rounded hover:bg-blue-700 whitespace-nowrap h-10">
                + Thêm bài viết
              </button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-4">Đang tải...</p>
          ) : (
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-4 py-2 text-center w-12">STT</th>
                  <th className="px-4 py-2 text-center w-20">Ảnh</th>
                  <th className="px-4 py-2 text-center w-56">Tiêu đề</th>
                  <th className="px-4 py-2 text-center w-32">Ngày tạo</th>
                  <th className="px-4 py-2 text-center w-32">Hiển thị</th>
                  <th className="px-4 py-2 text-center w-28">Danh mục</th>
                  <th className="px-4 py-2 text-center w-21">Lượt xem</th>
                  <th className="px-4 py-2 text-center w-39">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {articles.length > 0 ? (
                  articles.map((a, index) => (
                    <tr
                      key={a._id}
                      className="border-b hover:bg-gray-50 transition-colors align-middle"
                    >
                      <td className="px-4 py-2 text-center font-semibold align-middle">
                        {(page - 1) * limit + index + 1}
                      </td>
                      <td className="px-4 py-2 text-center align-middle">
                        {a.image ? (
                          <img
                            src={`${API_BASE.replace("/api", "")}/${a.image}`}
                            alt={a.title}
                            className="w-16 h-12 object-cover rounded mx-auto"
                          />
                        ) : (
                          <div className="w-16 h-12 bg-gray-200 rounded mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-center align-middle whitespace-normal break-words">
                        {a.title}
                      </td>
                      <td className="px-4 py-2 text-center align-middle">
                        {a.createdAt
                          ? new Date(a.createdAt).toLocaleDateString("vi-VN")
                          : "-"}
                      </td>

                      {/* Cột Hiển thị - Cập nhật với tất cả flags */}
                      <td className="px-4 py-2 text-center align-middle">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {a.isFeatured && <span className="bg-green-500 text-white px-2 py-0.5 rounded text-xs">Nổi bật</span>}
                          {a.isMostViewed && <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs">Xem nhiều</span>}
                          {a.isHotEvent && <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs">Hot</span>}
                          {a.isStoreNew && <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs">Store</span>}
                          {a.isNewPosts && <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-xs">Mới</span>}
                          {!a.isFeatured && !a.isMostViewed && !a.isHotEvent && !a.isStoreNew && !a.isNewPosts && (
                            <span className="text-gray-500 text-xs">Thường</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2 text-center align-middle whitespace-normal break-words">
                        {a.category?.name || "-"}
                      </td>
                      <td className="px-4 py-2 text-center align-middle">{a.views ?? 0}</td>
                      <td className="px-4 py-2 text-center align-middle">
                        <Link href={`/admin/blog/edit_blog?id=${a._id}`}>
                          <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded mr-2">
                            Sửa
                          </button>
                        </Link>
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                          onClick={() => handleDelete(a._id)}
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
                      {searchTerm ? "Không tìm thấy bài viết nào" : "Không có bài viết nào"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 py-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              &lt; Trước
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 border rounded ${
                  page === i + 1 ? "bg-blue-600 text-white" : "bg-white"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Sau &gt;
            </button>
          </div>
        )}
      </section>
    </main>
  );
}