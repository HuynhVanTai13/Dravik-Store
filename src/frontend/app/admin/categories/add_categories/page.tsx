"use client";
import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaArrowLeft } from "react-icons/fa";

interface Category {
  _id: string;
  name: string;
  image: string;
}

export default function AddCategoryPage() {
  const [name, setName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !image) {
      toast.error("Tên và ảnh là bắt buộc");
      return;
    }

    try {
      const checkRes = await fetch("http://localhost:5000/api/categories");
      const data = await checkRes.json();
      const isNameExist = (data.categories as Category[]).some(
        (cat) => cat.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      const isImageExist = (data.categories as Category[]).some(
        (cat) => cat.image?.split("/").pop() === image.name
      );

      if (isNameExist) {
        toast.error("Tên danh mục đã tồn tại");
        return;
      }
      if (isImageExist) {
        toast.error("Ảnh đã được sử dụng");
        return;
      }

      const formData = new FormData();
      formData.append("name", name);
      formData.append("image", image);

      const res = await fetch("http://localhost:5000/api/categories", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Thêm thất bại");

      toast.success(" Thêm danh mục thành công");
      setTimeout(() => router.push("/admin/categories"), 1500);
    } catch (err) {
      toast.error(" Ảnh đã được sử dụng");
    }
  };

  return (
    <main className="main-content flex justify-center p-6">
      <ToastContainer position="top-right" autoClose={2000} style={{ top: 60 }} />
      <div className="w-full max-w-md">
        <button
          onClick={() => router.push("/admin/categories")}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 transition"
        >
          <FaArrowLeft />
          <span>Quay lại danh sách</span>
        </button>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded p-8"
        >
          <h2 className="text-2xl font-semibold mb-6 text-center">Thêm Danh Mục</h2>
          <input
            type="text"
            placeholder="Tên danh mục"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-full mb-4"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="mb-4"
          />
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 object-cover mb-4 mx-auto rounded"
            />
          )}
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 w-full"
          >
            Thêm
          </button>
        </form>
      </div>
    </main>
  );
}
