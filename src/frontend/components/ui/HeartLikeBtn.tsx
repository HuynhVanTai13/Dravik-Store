"use client";
import React from "react";
import { useLike } from "./LikeContext";

export default function HeartLikeBtn({ itemKey }: { itemKey: string }) {
  const { liked, setLiked, triggerPopup } = useLike();

  const handleLike = () => {
    setLiked((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
    if (!liked[itemKey]) triggerPopup();
  };

  return (
    <button
      className="heart-btn"
      onClick={handleLike}
      style={{
        color: liked[itemKey] ? "#e53a3a" : "#888",
        transition: "color 0.2s"
      }}
    >
      <i className="fa fa-heart" />
    </button>
  );
}
