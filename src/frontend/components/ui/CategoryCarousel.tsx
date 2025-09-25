'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import "../../public/css/category.css";

interface Category {
  _id: string;
  name: string;
  image?: string; // có thể là "uploads/...", "src/backend/uploads/...", hoặc absolute URL
  slug: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Chuẩn hoá mọi kiểu path ảnh → URL tuyệt đối hợp lệ
const toImg = (p?: string) => {
  if (!p) return '/images/default.jpg';

  // absolute URL thì trả luôn
  if (/^https?:\/\//i.test(p)) return p;

  // chuẩn hoá slash & cắt về /uploads/...
  let norm = p.replace(/\\/g, '/');
  const at = norm.toLowerCase().lastIndexOf('uploads/');
  if (at >= 0) norm = norm.slice(at);      // giữ phần "/uploads/xxx"
  if (!norm.startsWith('/')) norm = '/' + norm;

  // /uploads/... → http://localhost:5000/uploads/...
  return `${API_BASE}${norm}`;
};

export default function CategoryCarousel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [startIdx, setStartIdx] = useState(0);
  const [slidesPerView, setSlidesPerView] = useState(5);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/categories`, { params: { limit: 'all' } });
      const payload = Array.isArray(res.data)
        ? res.data
        : (res.data.items || res.data.categories || []);
      setCategories(payload || []);
    } catch (error) {
      console.error('Lỗi tải danh mục:', error);
      setCategories([]);
    }
  };

  useEffect(() => {
  fetchCategories();

  const handleResize = () => {
    const w = window.innerWidth;

    // ✅ Mobile: 2 danh mục/khung cho to, rõ
    if (w <= 640) setSlidesPerView(2);
    else if (w < 1024) setSlidesPerView(8);
    else setSlidesPerView(9);
  };

  handleResize();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);


  const handlePrev = () => {
    if (!categories.length) return;
    setStartIdx((prev) => (prev - 1 + categories.length) % categories.length);
  };
  const handleNext = () => {
    if (!categories.length) return;
    setStartIdx((prev) => (prev + 1) % categories.length);
  };

  const visible: Category[] = [];
  for (let i = 0; i < Math.min(slidesPerView, categories.length); i++) {
    visible.push(categories[(startIdx + i) % (categories.length || 1)]);
  }

  return (
    <div className="category-full-row">
      <div className="category-nav-wrapper prev-wrapper">
        <div className="swiper-button category-swiper-prev" onClick={handlePrev} style={{ cursor: 'pointer' }}>
          <i className="fas fa-chevron-left"></i>
        </div>
      </div>

      <div className="main-carousel-area">
        <div className="carousel-content" style={{ display: 'flex', gap: '5px' }}>
          {visible.map((item, idx) => (
            <Link
              key={item?._id || idx}
              href={`/user/products?category=${encodeURIComponent(item?.slug || '')}`}
              className="col-9 text-center"
            >
              <div className="img-cate">
                <img
                  src={toImg(item?.image)}
                  alt={item?.name || 'Danh mục'}
                  className="rounded"
                  style={{ objectFit: 'contain', display: 'block', margin: '0 auto' }}
                />
              </div>
              <p className="text-sm mt-2">{item?.name || 'Không tên'}</p>
            </Link>
          ))}
          {!categories.length && <div className="text-gray-500 text-sm py-6">Không có danh mục.</div>}
        </div>
      </div>

      <div className="category-nav-wrapper next-wrapper">
        <div className="swiper-button category-swiper-next" onClick={handleNext} style={{ cursor: 'pointer' }}>
          <i className="fas fa-chevron-right"></i>
        </div>
      </div>
    </div>
  );
}
