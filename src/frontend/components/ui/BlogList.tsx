"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

interface Article {
  _id: string;
  title: string;
  summary?: string;
  slug: string;
  image: string;
  createdAt: string;
}

export default function BlogList() {
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/articles?limit=3");
        setArticles(res.data.data); // API trả về { data: [...] }
      } catch (err) {
        console.error("Lỗi tải bài viết:", err);
      }
    };
    fetchArticles();
  }, []);

  return (
    <div className="blog">
      <h1
        style={{
          fontSize: 30,
          textAlign: "center",
          marginTop: 30,
          fontWeight: 500,
        }}
      >
        Bài viết
      </h1>
      <div className="row-5">
        {articles.map((article) => (
          <div className="col-3" key={article._id}>
            <Link href={`/bai-viet/${article.slug}`}>
              <div className="img-title">
                <div className="title">
                  <p>Tip</p>
                  <div className="title-3">
                    <h4 style={{ marginBottom: 5, fontSize: 17 }}>
                      {article.title}
                    </h4>
                  </div>
                  <h5 style={{ fontSize: 14 }}>Dravik Store</h5>
                </div>
                <img
                style={{
                  height:300,
                }}
                  src={`http://localhost:5000/${article.image}`}
                  alt={article.title}
                />
              </div>
            </Link>
            <div className="noidung">
              <h4>{article.title}</h4>
              <p
                style={{
                  fontSize: 14,
                  color: "#979797",
                  margin: "10px 0px",
                }}
              >
                {new Date(article.createdAt).toLocaleDateString("vi-VN")}
              </p>
              
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
