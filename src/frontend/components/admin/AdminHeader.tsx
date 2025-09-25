"use client";
import React, { useRef, useState, useEffect } from "react";
import "../../styles/hmf.css";
import AccountPopup from "./AccountPopup";
import AdminSidebar from "./AdminSidebar"; // Import sidebar

export default function AdminHeader() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [accountPopupOpen, setAccountPopupOpen] = useState(false);
  const [openSidebar, setOpenSidebar] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <>
      <AdminSidebar openSidebar={openSidebar} setOpenSidebar={setOpenSidebar} />

      <header className="header">
        <button
          id="hamburgerButton"
          className="hamburger-menu-btn"
          onClick={() => setOpenSidebar((prev) => !prev)}
        >
          <i className="fas fa-bars" />
        </button>

        <div className="logo">
          <img src="/images/logo-footer.png" alt="DRAVIK STORE Logo" className="logo-image" />
        </div>

        <div className="header-right">
          
          
        </div>
      </header>
    </>
  );
}
