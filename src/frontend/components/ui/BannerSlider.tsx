"use client";
import React, { useRef, useEffect, useState } from "react";

const images = [
  "/images/banner1.png",
  "/images/banner2.png",
  "/images/banner3.png",
];

export default function BannerSlider() {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto next slide mỗi 4 giây
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [current]);

  const nextSlide = () => setCurrent((current + 1) % images.length);
  const prevSlide = () => setCurrent((current - 1 + images.length) % images.length);

  return (
    <div className="slider">
      <div className="slides">
        {images.map((img, i) => (
          <img
            key={img}
            src={img}
            className={`slide${current === i ? " active" : ""}`}
            style={{ display: current === i ? "block" : "none" }}
            alt=""
          />
        ))}
      </div>
      <button className="prev" onClick={prevSlide}>❮</button>
      <button className="next" onClick={nextSlide}>❯</button>
    </div>
  );
}
