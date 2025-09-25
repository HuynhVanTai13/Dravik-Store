"use client";
import React from "react";
import { useLike } from "./LikeContext";

export default function LikePopup() {
  const { showPopup } = useLike();

  if (!showPopup) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        background: "#e53a3a",
        color: "#fff",
        padding: "12px 28px",
        borderRadius: 24,
        fontWeight: 500,
        boxShadow: "0 4px 16px #0002",
        animation: "fadePopup 1.2s"
      }}
    >
      Đã thêm vào yêu thích
    </div>
  );
}
