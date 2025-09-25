"use client";
import React, { useEffect, useState } from "react";
import "../../../public/css/blog.css";
import Link from "next/link";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface Article {
  _id: string;
  title: string;
  content?: string;
  summary?: string;
  image?: string;
  createdAt?: string;
  category?: Category;
  // Tất cả các flag được đồng bộ với dropdown
  isFeatured?: boolean;
  isMostViewed?: boolean;
  isHotEvent?: boolean;
  isStoreNew?: boolean;
  isNewPosts?: boolean;
}

export default function Blog() {
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

  const [articles, setArticles] = useState<Article[]>([]);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [mostViewedArticles, setMostViewedArticles] = useState<Article[]>([]);
  const [newPostsArticles, setNewPostsArticles] = useState<Article[]>([]);
  const [hotEvents, setHotEvents] = useState<Article[]>([]);
  const [storeNewArticles, setStoreNewArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);
  const limit = 6;
  const [total, setTotal] = useState(0);

  // style cắt text đa dòng
  const truncateStyle = (lines: number = 2): React.CSSProperties => ({
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: "1.4",
    maxHeight: `${lines * 1.4}em`,
    wordBreak: "break-word",
    whiteSpace: "normal",
  });

  // Chuẩn hoá dữ liệu articles từ BE
  const normalizeArticles = (raw: any): Article[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.result)) return raw.result;
    if (Array.isArray(raw.payload)) return raw.payload;
    console.warn("Unexpected articles response:", raw);
    return [];
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/article-categories?page=1&limit=100`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Fetch categories failed");
      const json = await res.json();
      const list: Category[] =
        json.categories || json.data || json.result || json.payload || [];
      setCategories(list);
    } catch (err) {
      console.error("Fetch categories error:", err);
    }
  };

  // Fetch bài viết nổi bật (không giới hạn)
  const fetchFeaturedArticles = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/articles?isFeatured=true&page=1&limit=100&sort=createdAt&order=desc`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const json = await res.json();
        const articles = normalizeArticles(json);
        setFeaturedArticles(articles);
      } else {
        // Fallback: dùng bài viết mới nhất
        const fallbackRes = await fetch(
          `${API_BASE}/articles?page=1&limit=10&sort=createdAt&order=desc`,
          { cache: "no-store" }
        );
        const json = await fallbackRes.json();
        const articles = normalizeArticles(json);
        setFeaturedArticles(articles);
      }
    } catch (err) {
      console.error("Fetch featured articles error:", err);
      setFeaturedArticles([]);
    }
  };

  // Fetch xem nhiều nhất - Ưu tiên flag isMostViewed, fallback views - GIỚI HẠN 3 BÀI
  const fetchMostViewedArticles = async () => {
    try {
      // Thử fetch theo flag isMostViewed trước - giới hạn 3 bài
      let res = await fetch(
        `${API_BASE}/articles?isMostViewed=true&page=1&limit=3&sort=createdAt&order=desc`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const json = await res.json();
        const articles = normalizeArticles(json);
        if (articles.length > 0) {
          // Đảm bảo chỉ lấy tối đa 3 bài
          setMostViewedArticles(articles.slice(0, 3));
          return;
        }
      }
      
      // Fallback: dùng views nếu không có flag - giới hạn 3 bài
      res = await fetch(
        `${API_BASE}/articles?page=1&limit=3&sort=views&order=desc`,
        { cache: "no-store" }
      );
      
      if (!res.ok) {
        // Fallback cuối: bài viết mới nhất - giới hạn 3 bài
        const fallbackRes = await fetch(`${API_BASE}/articles?page=1&limit=3`, {
          cache: "no-store",
        });
        const json = await fallbackRes.json();
        const articles = normalizeArticles(json);
        setMostViewedArticles(articles.slice(0, 3));
        return;
      }
      
      const json = await res.json();
      const articles = normalizeArticles(json);
      // Đảm bảo chỉ lấy tối đa 3 bài
      setMostViewedArticles(articles.slice(0, 3));
    } catch (err) {
      console.error("Fetch most viewed articles error:", err);
      setMostViewedArticles([]);
    }
  };

  // Fetch các bài viết mới - có thể lọc theo danh mục
  const fetchNewPostsArticles = async () => {
    try {
      let url = `${API_BASE}/articles?page=1&limit=100&sort=createdAt&order=desc`;
      
      // Nếu có danh mục được chọn, thêm filter
      if (selectedCategory) {
        url += `&categorySlug=${selectedCategory}`;
      } else {
        // Nếu không có danh mục, lấy từ flag isNewPosts hoặc tất cả bài viết mới
        url = `${API_BASE}/articles?isNewPosts=true&page=1&limit=100&sort=createdAt&order=desc`;
      }

      const res = await fetch(url, { cache: "no-store" });
      
      if (res.ok) {
        const json = await res.json();
        const articles = normalizeArticles(json);
        
        // Nếu có filter danh mục, filter thêm ở frontend để đảm bảo
        if (selectedCategory) {
          const filteredArticles = articles.filter(
            article => article.category?.slug === selectedCategory
          );
          setNewPostsArticles(filteredArticles);
        } else {
          setNewPostsArticles(articles);
        }
      } else {
        // Fallback: bài viết mới nhất
        const fallbackRes = await fetch(
          `${API_BASE}/articles?page=1&limit=100&sort=createdAt&order=desc`,
          { cache: "no-store" }
        );
        const json = await fallbackRes.json();
        const articles = normalizeArticles(json);
        
        if (selectedCategory) {
          const filteredArticles = articles.filter(
            article => article.category?.slug === selectedCategory
          );
          setNewPostsArticles(filteredArticles);
        } else {
          setNewPostsArticles(articles);
        }
      }
    } catch (err) {
      console.error("Fetch new posts error:", err);
      setNewPostsArticles([]);
    }
  };

  // Fetch sự kiện hot (không giới hạn)
  const fetchHotEvents = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/articles?isHotEvent=true&page=1&limit=100&sort=createdAt&order=desc`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const json = await res.json();
        const articles = normalizeArticles(json);
        setHotEvents(articles);
      } else {
        setHotEvents([]);
      }
    } catch (err) {
      console.error("Fetch hot events error:", err);
      setHotEvents([]);
    }
  };

  // Fetch Dravik Store có gì mới (không giới hạn)
  const fetchStoreNewArticles = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/articles?isStoreNew=true&page=1&limit=100&sort=createdAt&order=desc`,
        { cache: "no-store" }
      );
      
      if (res.ok) {
        const json = await res.json();
        const articles = normalizeArticles(json);
        setStoreNewArticles(articles);
      } else {
        setStoreNewArticles([]);
      }
    } catch (err) {
      console.error("Fetch store new articles error:", err);
      setStoreNewArticles([]);
    }
  };

  // Filter articles ở frontend
  const filterArticles = (articleList: Article[], categorySlug: string) => {
    console.log("🔍 Filtering articles:", {
      totalArticles: articleList.length,
      categorySlug,
      articles: articleList.map(a => ({
        title: a.title,
        categorySlug: a.category?.slug,
        categoryName: a.category?.name
      }))
    });

    if (!categorySlug) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedArticles = articleList.slice(startIndex, endIndex);
      setArticles(paginatedArticles);
      setTotal(articleList.length);
    } else {
      const filtered = articleList.filter(
        article => article.category?.slug === categorySlug
      );
      console.log("🔍 Filtered results:", filtered.length, "articles found");
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedFiltered = filtered.slice(startIndex, endIndex);
      
      setArticles(paginatedFiltered);
      setTotal(filtered.length);
    }
  };

  // Thử fetch với backend filter trước, nếu không thì dùng frontend filter
  const fetchLatestArticles = async () => {
    setLoading(true);
    try {
      // Thử backend filtering trước
      const url = `${API_BASE}/articles?page=${page}&limit=${limit}${
        selectedCategory ? `&categorySlug=${selectedCategory}` : ""
      }`;
      
      console.log("🔍 Trying backend filtering with URL:", url);
      console.log("🔍 Selected Category:", selectedCategory);
      
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Fetch articles failed");
      const json = await res.json();
      
      console.log("🔍 Backend API Response:", json);
      
      const list = normalizeArticles(json);
      console.log("🔍 Normalized Articles:", list);
      
      // Kiểm tra xem backend có filter đúng không
      if (selectedCategory && list.length > 0) {
        const hasCorrectCategory = list.every(article => 
          article.category?.slug === selectedCategory
        );
        
        if (hasCorrectCategory) {
          console.log("✅ Backend filtering works correctly");
          setArticles(list);
          setTotal(json.total || list.length);
        } else {
          console.log("⚠️ Backend filtering not working, using frontend filter");
          // Fallback to frontend filtering
          if (allArticles.length === 0) {
            // Fetch all articles first
            const allRes = await fetch(`${API_BASE}/articles?page=1&limit=100`, {
              cache: "no-store"
            });
            const allJson = await allRes.json();
            const allList = normalizeArticles(allJson);
            setAllArticles(allList);
            filterArticles(allList, selectedCategory);
          } else {
            filterArticles(allArticles, selectedCategory);
          }
        }
      } else if (!selectedCategory) {
        console.log("✅ Showing all articles");
        setArticles(list);
        setTotal(json.total || list.length);
        // Cũng lưu vào allArticles để dùng cho frontend filter sau
        if (allArticles.length === 0) {
          const allRes = await fetch(`${API_BASE}/articles?page=1&limit=100`, {
            cache: "no-store"
          });
          const allJson = await allRes.json();
          const allList = normalizeArticles(allJson);
          setAllArticles(allList);
        }
      } else {
        console.log("⚠️ No articles returned, might need frontend filtering");
        // Nếu không có bài viết nào trả về, thử frontend filter
        if (allArticles.length === 0) {
          const allRes = await fetch(`${API_BASE}/articles?page=1&limit=100`, {
            cache: "no-store"
          });
          const allJson = await allRes.json();
          const allList = normalizeArticles(allJson);
          setAllArticles(allList);
          filterArticles(allList, selectedCategory);
        } else {
          filterArticles(allArticles, selectedCategory);
        }
      }
      
    } catch (err) {
      console.error("Fetch latest articles error:", err);
      // Fallback to frontend filtering
      if (allArticles.length > 0) {
        console.log("🔄 Falling back to frontend filtering");
        filterArticles(allArticles, selectedCategory);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchFeaturedArticles();
    fetchMostViewedArticles();
    fetchHotEvents();
    fetchStoreNewArticles();
  }, []);

  useEffect(() => {
    fetchLatestArticles();
    fetchNewPostsArticles(); // Cập nhật bài viết mới khi danh mục thay đổi
  }, [page, selectedCategory]);

  // Khi selectedCategory hoặc allArticles thay đổi, thử frontend filter
  useEffect(() => {
    if (allArticles.length > 0 && selectedCategory !== "") {
      console.log("🔄 Frontend filtering triggered");
      filterArticles(allArticles, selectedCategory);
    }
  }, [selectedCategory, allArticles, page]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return "/images/placeholder.jpg";
    if (imagePath.startsWith("http")) return imagePath;
    return `${API_BASE.replace("/api", "")}/${imagePath}`;
  };

  const getArticleSummary = (article: Article) => {
    if (article.summary) return article.summary;
    if (article.content) {
      const textContent = article.content.replace(/<[^>]*>/g, "");
      return textContent.length > 150
        ? textContent.substring(0, 150) + "..."
        : textContent;
    }
    return "Không có mô tả...";
  };

  const totalPages = Math.ceil(total / limit);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    console.log("🔍 Category Changed to:", newCategory);
    setSelectedCategory(newCategory);
    setPage(1);
  };

  return (
    <main className="main container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link href="/"> Trang chủ</Link> /{" "}
        <span className="current">
          <Link href="/user/blog"> Tin tức</Link>
        </span>
      </nav>

      <h1 className="page-title">Tin tức</h1>

      {/* Filter Row */}
      <div className="filter-row">
        <select
          value={selectedCategory}
          onChange={handleCategoryChange}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c._id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main Row */}
      <div className="main-row">
        {/* LEFT */}
        <section className="main-left">
          <h2 className="sec-title">Bài viết nổi bật</h2>
          <div className="featured-articles-container">
            {featuredArticles.length > 0 ? (
              featuredArticles.map((article, index) => (
                <div
                  key={article._id}
                  className="news-highlight"
                  style={index > 0 ? { marginTop: 32 } : {}}
                >
                  <img
                    src={getImageUrl(article.image)}
                    alt={article.title}
                    className="news-highlight-img"
                  />
                  <div className="highlight-meta">
                    {formatDate(article.createdAt)} -{" "}
                    {article.category?.name || "Chưa có danh mục"}
                  </div>
                  <div className="highlight-title" style={truncateStyle(2)}>
                    {article.title}
                  </div>
                  <div className="highlight-desc">
                    {getArticleSummary(article)}
                  </div>
                  <Link
                    href={`/user/blog/${article._id}`}
                    style={{
                      color: "#007bff",
                      textDecoration: "none",
                      fontWeight: "500",
                      marginTop: "10px",
                      display: "inline-block",
                    }}
                  >
                    Xem thêm →
                  </Link>
                </div>
              ))
            ) : (
              <p>Chưa có bài viết nổi bật nào...</p>
            )}
          </div>
        </section>

        {/* RIGHT */}
        <aside className="main-right">
          <div className="side-block">
            <div className="side-title">Xem Nhiều nhất</div>
            <div className="side-news-list">
              {mostViewedArticles.length > 0 ? (
                mostViewedArticles.map((article) => (
                  <div
                    key={article._id}
                    className="side-news-item"
                    style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}
                  >
                    <img
                      src={getImageUrl(article.image)}
                      alt={article.title}
                      className="side-news-img"
                      style={{
                        width: "100px",
                        height: "100px",
                        flexShrink: 0,
                        objectFit: "cover",
                        borderRadius: "6px",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p className="xemnhieu">
                        {formatDate(article.createdAt)} -{" "}
                        {article.category?.name || "Chưa có danh mục"}
                      </p>
                      <Link href={`/user/blog/${article._id}`}>
                        <span style={truncateStyle(2)}>{article.title}</span>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p>Đang tải...</p>
              )}
            </div>
          </div>

          {/* Sự kiện hot - Updated */}
          <div className="side-block">
            <div className="side-title">Sự kiện hot</div>
            <div className="hot-events-list">
              {hotEvents.length > 0 ? (
                hotEvents.map((article) => (
                  <div key={article._id} className="hot-event-item">
                    <span className="event-date">
                      {formatDate(article.createdAt)?.split('/').slice(0, 2).join('/')}
                    </span>
                    <div>
                      <Link href={`/user/blog/${article._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={truncateStyle(2)}>{article.title}</div>
                      </Link>
                      <small>{article.category?.name || "Sự kiện"}</small>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                  Chưa có sự kiện hot nào...
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Dravik Store Có gì mới - Updated */}
      <section className="new-banner">
        <div className="new-banner-title">Dravik Store Có Gì Mới</div>
        <div className="new-banner-cards">
          {storeNewArticles.length > 0 ? (
            storeNewArticles.map((article) => (
              <div key={article._id} className="new-banner-card">
                <img src={getImageUrl(article.image)} alt={article.title} />
                <div className="event-desc">
                  <div className="event-meta">
                    {formatDate(article.createdAt)} -{" "}
                    {article.category?.name || "Chưa có danh mục"}
                  </div>
                  <div className="event-title" style={truncateStyle(2)}>{article.title}</div>
                  <Link href={`/user/blog/${article._id}`} className="event-link">
                    Xem thêm →
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', marginTop: '20px' }}>
              Chưa có bài viết mới nào...
            </p>
          )}
        </div>
      </section>

      {/* Grid tin mới nhất */}
      <section className="latest-news">
        <div className="sec-title">
          {selectedCategory 
            ? `Các bài viết mới - ${categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}` 
            : "Các bài viết mới"
          }
        </div>
        <div className="latest-grid">
          {loading ? (
            <p style={{ textAlign: "center", gridColumn: "1 / -1" }}>
              Đang tải...
            </p>
          ) : newPostsArticles.length > 0 ? (
            newPostsArticles.map((article) => (
              <div key={article._id} className="latest-card">
                <Link href={`/user/blog/${article._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <img 
                    src={getImageUrl(article.image)} 
                    alt={article.title}
                    style={{ cursor: 'pointer' }} 
                  />
                  <div className="latest-card-title" style={truncateStyle(2)}>
                    {article.title}
                  </div>
                  <div className="latest-card-desc">
                    {getArticleSummary(article)}
                  </div>
                </Link>
                <div className="latest-meta">
                  <span>
                    {formatDate(article.createdAt)} -{" "}
                    {article.category?.name || "Chưa có danh mục"}
                  </span>
                  <Link 
                    href={`/user/blog/${article._id}`}
                    style={{
                      color: '#007bff',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                  >
                    Xem thêm &gt;&gt;
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: "center", gridColumn: "1 / -1" }}>
              {selectedCategory 
                ? `Chưa có bài viết nào trong danh mục "${categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}"`
                : "Chưa có bài viết mới nào"
              }
            </p>
          )}
        </div>
      </section>
    </main>
  );
}