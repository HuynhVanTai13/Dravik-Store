"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic";

const CKEditor = dynamic(() => import("@/components/common/CKEditor"), { ssr: false });

type Cat = { _id?: string; id?: string; name?: string; slug?: string; [k: string]: any };
type ErrorKeys = "title" | "category";

export default function EditBlogPage() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || "http://localhost:5000/api";
  const API_ROOT = API_BASE.replace("/api", "");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string>("");

  // Flag states (ẩn, dùng để gửi dữ liệu, vẫn giữ 4 flag để server nhận)
  const [isFeatured, setIsFeatured] = useState(false);
  const [isHotEvent, setIsHotEvent] = useState(false);
  const [isStoreNew, setIsStoreNew] = useState(false);
  const [isNewPosts, setIsNewPosts] = useState(false);

  // Dropdown trạng thái hiển thị trên trang chính (giá trị string để map)
  const [displayStatus, setDisplayStatus] = useState<
    "" | "featured" | "hotEvent" | "storeNew" | "newPosts"
  >("");

  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<Cat[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [catLoading, setCatLoading] = useState(false);

  const [errors, setErrors] = useState<Partial<Record<ErrorKeys, string>>>({});

  // Title expand-on-focus
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
      const res = await fetch(`${API_BASE}/article-categories`, { cache: "no-store" });
      if (!res.ok) throw new Error("Fetch categories failed");
      const json = await res.json();
      setCategories(normalizeCategories(json));
    } catch {
      toast.error("Không thể tải danh mục bài viết");
      setCategories([]);
    } finally {
      setCatLoading(false);
    }
  }, [API_BASE]);

  const loadArticle = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/articles/${id}`);
      if (!res.ok) throw new Error("Bài viết không tồn tại");
      const data = await res.json();

      setTitle(data.title || "");
      setContent(data.content || "");

      // Lấy categoryId rõ ràng
      const catId = data.category?._id || data.category || "";
      setSelectedCategory(String(catId));

      // Các flag
      setIsFeatured(Boolean(data.isFeatured));
      setIsHotEvent(Boolean(data.isHotEvent));
      setIsStoreNew(Boolean(data.isStoreNew));
      setIsNewPosts(Boolean(data.isNewPosts));

      // Xác định displayStatus dựa trên flag (ưu tiên thứ tự: featured > hotEvent > storeNew > newPosts)
      if (data.isFeatured) setDisplayStatus("featured");
      else if (data.isHotEvent) setDisplayStatus("hotEvent");
      else if (data.isStoreNew) setDisplayStatus("storeNew");
      else if (data.isNewPosts) setDisplayStatus("newPosts");
      else setDisplayStatus("");

      // Ảnh hiện tại (thêm prefix nếu cần)
      const imgUrl = data.image
        ? data.image.startsWith("http")
          ? data.image
          : `${API_ROOT}/${data.image}`
        : "";

      setCurrentImage(imgUrl);
      setImagePreview(imgUrl || null);

      collapseTitle();
    } catch {
      toast.error("Không thể tải dữ liệu bài viết");
    }
  }, [API_BASE, API_ROOT, id]);

  useEffect(() => {
    loadCategories();
    loadArticle();
  }, [loadCategories, loadArticle]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(currentImage || null);
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<ErrorKeys, string>> = {};
    if (!title.trim()) newErrors.title = "Vui lòng nhập tiêu đề bài viết";
    if (!selectedCategory) newErrors.category = "Vui lòng chọn danh mục bài viết";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Khi user chọn dropdown hiển thị, update lại 4 flag tương ứng
  const handleDisplayStatusChange = (value: typeof displayStatus) => {
    setDisplayStatus(value);
    // Reset all flags
    setIsFeatured(false);
    setIsHotEvent(false);
    setIsStoreNew(false);
    setIsNewPosts(false);
    // Set đúng flag theo giá trị
    if (value === "featured") setIsFeatured(true);
    else if (value === "hotEvent") setIsHotEvent(true);
    else if (value === "storeNew") setIsStoreNew(true);
    else if (value === "newPosts") setIsNewPosts(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    const selCategoryObj = categories.find(
      (c) => String(c._id ?? c.id ?? c.slug) === selectedCategory
    );
    const selName = selCategoryObj?.name ?? "";

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("category", selectedCategory);
    if (selName) formData.append("categoryName", selName);

    formData.append("isFeatured", isFeatured.toString());
    formData.append("isHotEvent", isHotEvent.toString());
    formData.append("isStoreNew", isStoreNew.toString());
    formData.append("isNewPosts", isNewPosts.toString());

    if (imageFile) {
      formData.append("image", imageFile);
    } else {
      formData.append("currentImage", currentImage);
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/articles/${id}`, {
        method: "PUT",
        body: formData,
      });
      if (res.ok) {
        toast.success("Cập nhật bài viết thành công");
        router.push("/admin/blog");
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(j.message || `Lỗi server (${res.status})`);
      }
    } catch {
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
        {/* Sidebar giả định */}
        <aside className="w-64 bg-blue-900 text-white hidden md:block">Sidebar</aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-lg p-8 shadow-md">
            <h2 className="text-center mb-8 text-2xl font-semibold text-gray-800">
              Chỉnh sửa bài viết
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Cột trái */}
                <div className="flex-1">
                  {/* Tiêu đề */}
                  <div className="mb-5">
                    <label className="block mb-2 font-medium">Tiêu đề bài viết</label>
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
                      onChange={(e) => {
                        const v = e.target.value;
                        setTitle(v);
                        if (v.trim()) removeError("title");
                        if (titleExpanded) expandTitle();
                      }}
                      rows={1}
                      className={`w-full p-3 rounded border resize-none overflow-hidden leading-relaxed ${
                        errors.title ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
                  </div>

                  {/* Danh mục */}
                  <div className="mb-5">
                    <label className="block mb-2 font-medium">Danh mục bài viết</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedCategory(v);
                        if (v) removeError("category");
                      }}
                      className={`w-full p-3 rounded border ${
                        errors.category ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">
                        {catLoading ? "-- Đang tải..." : "-- Chọn danh mục --"}
                      </option>
                      {Array.isArray(categories) && categories.length > 0 ? (
                        categories.map((c, idx) => {
                          const val = String(c._id ?? c.id ?? c.slug ?? idx);
                          const label = String(c.name ?? c.title ?? c.label ?? val);
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
                      <p className="text-red-500 text-sm">{errors.category}</p>
                    )}
                  </div>

                  {/* Hiển thị trên trang chính */}
                  <div className="mb-5">
                    <label className="block mb-2 font-medium">Hiển thị trên trang chính</label>
                    <select
                      value={displayStatus}
                      onChange={(e) => handleDisplayStatusChange(e.target.value as typeof displayStatus)}
                      className="w-full p-3 rounded border border-gray-300"
                    >
                      <option value="">Không hiển thị</option>
                      <option value="featured">Bài viết nổi bật</option>
                      <option value="hotEvent">Sự kiện hot</option>
                      <option value="storeNew">Dravik Store có gì mới</option>
                      <option value="newPosts">Bài viết mới</option>
                    </select>
                  </div>

                  {/* Nội dung */}
                  <div className="mb-5">
                    <label className="block mb-2 font-medium">Nội dung bài viết</label>
                    <div className="ck-editor-wrapper">
                      <CKEditor value={content} onChange={setContent} />
                    </div>
                  </div>
                </div>

                {/* Cột phải */}
                <div className="w-full lg:w-1/3">
                  <div className="mb-5">
                    <label className="block mb-2 font-medium">Ảnh đại diện</label>

                    <button
                      type="button"
                      onClick={() => document.getElementById("fileInput")?.click()}
                      className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
                    >
                      Chọn tệp
                    </button>

                    <div className="text-sm text-gray-600 mt-2">
                      {imageFile ? (
                        <span className="text-green-600">Đã chọn: {imageFile.name}</span>
                      ) : currentImage ? (
                        <span className="text-blue-600">Đang dùng ảnh hiện tại</span>
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

                    {/* Preview ảnh (ưu tiên ảnh mới) */}
                    {(imagePreview || currentImage) && (
                      <div className="mt-3">
                        <img
                          src={imagePreview || currentImage}
                          alt="Preview"
                          className="max-w-full max-h-64 rounded border border-gray-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-8 flex gap-4 justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className={`py-2 px-6 rounded text-white ${
                    loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
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
