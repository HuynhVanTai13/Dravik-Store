"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic";

const CKEditor = dynamic(() => import("@/components/common/CKEditor"), {
  ssr: false,
});

type Cat = {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  [k: string]: any;
};
type ErrorKeys = "title" | "category" | "image" | "display";
type FlagType =
  | "featured"
  | "mostViewed"
  | "hotEvent"
  | "storeNew"
  | "newPosts";

export default function AddBlogPage() {
  const router = useRouter();
  const API_BASE =
    (process.env.NEXT_PUBLIC_API_BASE as string) ||
    "http://localhost:5000/api";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<Cat[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [catLoading, setCatLoading] = useState(false);

  // "" = chưa chọn (bắt buộc phải chọn)
  const [activeFlag, setActiveFlag] = useState<FlagType | "">("");

  const [errors, setErrors] = useState<Partial<Record<ErrorKeys, string>>>({});

  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const [titleExpanded, setTitleExpanded] = useState(false);

  const collapseTitle = () => {
    if (titleRef.current) titleRef.current.style.height = "auto";
  };
  const expandTitle = () => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  };

  const removeError = (key: ErrorKeys) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const normalizeCategories = (raw: any): Cat[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.categories)) return raw.categories;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.result)) return raw.result;
    if (Array.isArray(raw.payload)) return raw.payload;
    const maybe = Object.values(raw).find((v) => Array.isArray(v));
    if (Array.isArray(maybe)) return maybe as Cat[];
    if (typeof raw === "object" && (raw.name || raw.title)) return [raw];
    console.warn("Unexpected categories response shape:", raw);
    return [];
  };

  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const res = await fetch(`${API_BASE}/article-categories`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Fetch categories failed");
      const json = await res.json();
      const list = normalizeCategories(json);
      setCategories(list);
    } catch (err) {
      console.error("Error loading categories:", err);
      toast.error("Không thể tải danh mục bài viết");
      setCategories([]);
    } finally {
      setCatLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    loadCategories();
    const onFocus = () => loadCategories();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadCategories]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setTitle(v);
    if (v.trim()) removeError("title");
    if (titleExpanded) expandTitle();
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setSelectedCategory(v);
    if (v) removeError("category");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setImageFile(file);

    if (file) {
      removeError("image");
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<ErrorKeys, string>> = {};
    if (!title.trim()) newErrors.title = "Vui lòng nhập tiêu đề bài viết";
    if (!selectedCategory) newErrors.category = "Vui lòng chọn danh mục bài viết";
    if (!imageFile) newErrors.image = "Vui lòng chọn ảnh đại diện cho bài viết";
    if (!activeFlag)
      newErrors.display = "Vui lòng chọn hiển thị trên trang chính";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: any) => {
    e?.preventDefault();
    if (!validateForm()) {
      toast.error("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("category", selectedCategory);
    if (imageFile) formData.append("image", imageFile);

    // Map flags theo lựa chọn bắt buộc
    formData.append("isFeatured", String(activeFlag === "featured"));
    formData.append("isMostViewed", String(activeFlag === "mostViewed"));
    formData.append("isHotEvent", String(activeFlag === "hotEvent"));
    formData.append("isStoreNew", String(activeFlag === "storeNew"));
    formData.append("isNewPosts", String(activeFlag === "newPosts"));

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/articles`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await res.json();
        toast.success("Thêm bài viết thành công");
        router.push("/admin/blog");
      } else {
        const j = await res.json().catch(() => ({}));
        console.error("API error:", j);
        toast.error(j.message || `Lỗi server (${res.status})`);
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Lỗi khi gửi lên server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        .ck-editor-wrapper {
          width: 100%;
        }
        .ck-editor-wrapper .ck-editor {
          width: 100% !important;
        }
        .ck-editor-wrapper .ck-editor__editable {
          min-height: 300px !important;
          max-width: 100% !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          box-sizing: border-box !important;
        }
        .ck-editor-wrapper .ck-content {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          hyphens: auto !important;
          max-width: 100% !important;
        }
        .ck-editor-wrapper .ck-editor__editable p {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
      `}</style>

      <div className="min-h-screen flex bg-gray-100">
        <aside className="w-64 bg-blue-900 text-white hidden md:block">
          Sidebar
        </aside>

        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-lg p-8 shadow-md">
            <h2 className="text-center mb-8 text-2xl font-semibold text-gray-800">
              Thêm bài viết mới
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Cột trái */}
                <div className="flex-1">
                  <div className="mb-5">
                    <label className="block mb-2 font-medium">
                      Tiêu đề bài viết
                    </label>
                    <textarea
                      ref={titleRef}
                      placeholder="Nhập tiêu đề bài viết"
                      value={title}
                      onFocus={() => {
                        setTitleExpanded(true);
                        requestAnimationFrame(() => expandTitle());
                      }}
                      onBlur={() => {
                        setTitleExpanded(false);
                        collapseTitle();
                      }}
                      onChange={handleTitleChange}
                      rows={1}
                      className={`w-full p-3 rounded border resize-none overflow-hidden leading-relaxed ${
                        errors.title ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.title && (
                      <p className="text-red-500 text-sm">{errors.title}</p>
                    )}
                  </div>

                  <div className="mb-5">
                    <label className="block mb-2 font-medium">
                      Danh mục bài viết
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={handleCategoryChange}
                      className={`w-full p-3 rounded border ${
                        errors.category ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">
                        {catLoading
                          ? "-- Đang tải..."
                          : "-- Chọn danh mục --"}
                      </option>
                      {Array.isArray(categories) && categories.length > 0 ? (
                        categories.map((c, idx) => {
                          const val = String(
                            c._id ?? c.id ?? c.slug ?? idx
                          );
                          const label = String(
                            c.name ?? c.title ?? c.label ?? val
                          );
                          return (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          );
                        })
                      ) : (
                        <option disabled>Không có danh mục</option>
                      )}
                    </select>
                    {errors.category && (
                      <p className="text-red-500 text-sm">
                        {errors.category}
                      </p>
                    )}
                  </div>

                  {/* Flags hiển thị (bắt buộc) */}
                  <div className="mb-5">
                    <label className="block mb-2 font-medium">
                      Hiển thị trên trang chính
                    </label>
                    <select
                      value={activeFlag}
                      onChange={(e) => {
                        const v = e.target.value as FlagType | "";
                        setActiveFlag(v);
                        if (v) removeError("display");
                      }}
                      className={`w-full p-3 rounded border ${
                        errors.display ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">-- Chọn hiển thị --</option>
                      <option value="featured">Bài viết nổi bật</option>
                      <option value="mostViewed">Xem nhiều nhất</option>
                      <option value="hotEvent">Sự kiện hot</option>
                      <option value="storeNew">
                        Dravik Store Có Gì Mới
                      </option>
                      <option value="newPosts">Các bài viết mới</option>
                    </select>
                    {errors.display && (
                      <p className="text-red-500 text-sm">
                        {errors.display}
                      </p>
                    )}
                  </div>

                  <div className="mb-5">
                    <label className="block mb-2 font-medium">
                      Nội dung bài viết
                    </label>
                    <div className="ck-editor-wrapper">
                      <CKEditor value={content} onChange={setContent} />
                    </div>
                  </div>
                </div>

                {/* Cột phải */}
                <div className="w-full lg:w-1/3 flex flex-col gap-5">
                  <div>
                    <label className="block mb-2 font-medium">
                      Ảnh đại diện
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById("fileInput")?.click()
                      }
                      className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
                    >
                      Chọn tệp
                    </button>
                    <div className="text-sm text-gray-600 mt-2">
                      {imageFile ? (
                        <span className="text-green-600">
                          Đã chọn: {imageFile.name}
                        </span>
                      ) : (
                        "Tệp chưa được chọn"
                      )}
                    </div>
                    <input
                      id="fileInput"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {imagePreview && (
                      <div className="mt-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-w-full max-h-64 rounded border border-gray-300"
                        />
                      </div>
                    )}
                    {errors.image && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.image}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-4 justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className={`py-2 px-6 rounded text-white ${
                    loading
                      ? "bg-gray-400"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  💾 {loading ? "Đang lưu..." : "Lưu bài viết"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/admin/blog")}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
