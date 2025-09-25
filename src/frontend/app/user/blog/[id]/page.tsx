"use client";
import React, { useEffect, useState } from "react";
import "../../../../public/css/ct_blog.css";
import Link from "next/link";
import { useParams } from "next/navigation";

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
  views?: number;
  tags?: string[];
}

export default function CTBlog() {
  const params = useParams();
  const articleId = params.id;

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeArticles = (raw: any): Article[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.result)) return raw.result;
    if (Array.isArray(raw.payload)) return raw.payload;
    return [];
  };

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return "/images/placeholder.jpg";
    if (imagePath.startsWith("http")) return imagePath;
    return `${API_BASE.replace("/api", "")}/${imagePath}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" });
  };

  const fetchArticle = async () => {
    if (!articleId) return;
    try {
      const res = await fetch(`${API_BASE}/articles/${articleId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Không tìm thấy bài viết");
      const json = await res.json();
      const articleData = json.data || json.result || json.article || json.payload || json;
      setArticle(articleData);

      // Fetch related
      if (articleData.category?.slug) fetchRelated(articleData.category.slug, articleData._id);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  const fetchRelated = async (categorySlug: string, currentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/articles?page=1&limit=5&categorySlug=${categorySlug}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const list = normalizeArticles(json).filter(a => a._id !== currentId);
        setRelatedArticles(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  if (loading) return <p>Đang tải bài viết...</p>;
  if (error || !article) return <p>{error || "Không tìm thấy bài viết"}</p>;

  return (
    <main className="main-content">
      <div className="container-tt">
        <nav className="breadcrumb">
          <Link href="/">Trang chủ</Link> / <Link href="/user/blog">Tin tức</Link> / <span>{article.title}</span>
        </nav>

        <h1>{article.title}</h1>
        <div>{formatDate(article.createdAt)} · {article.category?.name || "Tin tức"} · {article.views} lượt xem</div>

        {article.image && <img src={getImageUrl(article.image)} alt={article.title} style={{ width:'100%', borderRadius:'8px' }} />}
        {article.summary && <p style={{ fontWeight:'500', margin:'12px 0' }}>{article.summary}</p>}
        {article.content && <div dangerouslySetInnerHTML={{ __html: article.content }} />}

        {relatedArticles.length > 0 && (
          <section className="related-articles">
            <h3>Bài viết liên quan</h3>
            <ul>
              {relatedArticles.map(a => (
                <li key={a._id}>
                  <Link href={`/user/blog/${a._id}`}>{a.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
