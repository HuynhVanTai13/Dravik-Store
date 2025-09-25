"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

// Định nghĩa type cho context
interface LikeContextProps {
  liked: { [key: string]: boolean };
  setLiked: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  showPopup: boolean;
  triggerPopup: () => void;
}

// Tạo context
const LikeContext = createContext<LikeContextProps | undefined>(undefined);

// Provider
export function LikeProvider({ children }: { children: ReactNode }) {
  const [liked, setLiked] = useState<{ [key: string]: boolean }>({});
  const [showPopup, setShowPopup] = useState(false);

  // Hàm show popup 1s
  const triggerPopup = () => {
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 1200);
  };

  return (
    <LikeContext.Provider value={{ liked, setLiked, showPopup, triggerPopup }}>
      {children}
    </LikeContext.Provider>
  );
}

// Hook dùng context
export function useLike() {
  const context = useContext(LikeContext);
  if (!context) {
    throw new Error("useLike must be used within a LikeProvider");
  }
  return context;
}
