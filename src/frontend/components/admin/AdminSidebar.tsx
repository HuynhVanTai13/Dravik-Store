"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "../../styles/hmf.css";

export default function AdminSidebar({
  openSidebar,
  setOpenSidebar,
}: {
  openSidebar: boolean;
  setOpenSidebar: (open: boolean) => void;
}) {
  const pathname = usePathname() || "";
  const [productOpen, setProductOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  // Active menu logic
  const isActive = (pattern: string) => {
    if (pattern === "/admin") return pathname === "/admin";
    return pathname === pattern || pathname.startsWith(pattern + "/");
  };

  useEffect(() => {
    if (pathname.startsWith("/admin/products")) setProductOpen(true);
    if (pathname.startsWith("/admin/account")) setAccountOpen(true);
  }, [pathname]);

  // Overlay đóng sidebar mobile
  useEffect(() => {
    if (!openSidebar) return;
    const closeSidebar = (e: MouseEvent) => {
      const sidebar = document.querySelector(".sidebar");
      if (sidebar && !sidebar.contains(e.target as Node)) setOpenSidebar(false);
    };
    document.addEventListener("mousedown", closeSidebar);
    return () => document.removeEventListener("mousedown", closeSidebar);
  }, [openSidebar, setOpenSidebar]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[998] bg-black/50 lg:hidden transition-opacity duration-300 ${openSidebar ? "block" : "hidden"
          }`}
        onClick={() => setOpenSidebar(false)}
        aria-hidden="true"
      />
      <aside className={`sidebar${openSidebar ? " open" : ""}`}>
        <nav className="main-menu">
          <ul>
            <li>
              <Link href="/admin" className={isActive("/admin") ? "active" : ""}>
                <i className="fas fa-home" />
                <span className="menu-text">Trang chủ</span>
              </Link>
            </li>
            <li className="menu-section-header">Quản lý</li>

            {/* Sản phẩm có sub-menu */}
            <li className={`menu-item-has-children${productOpen ? " open" : ""}`}>
              {/* Nút cha mở sub-menu */}
              <a
                href="#"
                className={isActive("/admin/products") ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setProductOpen((open) => !open);
                }}
              >
                <i className="fas fa-box-open" />
                <span className="menu-text">Sản phẩm</span>
                <i className="fas fa-caret-down menu-arrow" />
              </a>
              <ul className="sub-menu" style={productOpen ? { maxHeight: 300 } : {}}>
                <li>
                  <Link
                    href="/admin/products"
                    className={isActive("/admin/products") ? "active" : ""}
                  >
                    <i className="fas fa-boxes" />
<span className="menu-text">Tất cả sản phẩm</span>
                  </Link>
                </li>
                <li>
              <Link href="/admin/color" className={isActive("/admin/color") ? "active" : ""}>
                <i className="fa-solid fa-palette" />
                <span className="menu-text">Quản lý màu sắc</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/size" className={isActive("/admin/size") ? "active" : ""}>
                <i className="fa-solid fa-maximize" />
                <span className="menu-text">Quản lý size</span>
              </Link>
            </li>
                <li>
                  <Link
                    href="/admin/deal-setting"
                    className={isActive("/admin/deal-setting") ? "active" : ""}
                  >
                    <i className="fas fa-tag" />
                    <span className="menu-text">Sản phẩm giảm giá</span>
                  </Link>
                </li>
              </ul>
            </li>
            <li>
              <Link href="/admin/categories" className={isActive("/admin/categories") ? "active" : ""}>
                <i className="fas fa-sitemap" />
                <span className="menu-text">Danh mục sản phẩm</span>
              </Link>
            </li>

            <li>
              <Link href="/admin/brand" className={isActive("/admin/brand") ? "active" : ""}>
                <i className="fas fa-award" />
                <span className="menu-text">Thương hiệu</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/order" className={isActive("/admin/order") ? "active" : ""}>
                <i className="fas fa-receipt" />
                <span className="menu-text">Đơn hàng</span>
              </Link>
            </li>

            <li>
              <Link href="/admin/account_user" className={isActive("/admin/account_user") ? "active" : ""}>
                <i className="fas fa-users" />
                <span className="menu-text">Tài khoản</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/article-categories" className={isActive("/admin/article-categories") ? "active" : ""}>
                <i className="fa-solid fa-table-list" />
                <span className="menu-text">Danh mục bài viết</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/blog" className={isActive("/admin/blog") ? "active" : ""}>
                <i className="fa-solid fa-newspaper" />
                <span className="menu-text">Bài viết</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/voucher" className={isActive("/admin/voucher") ? "active" : ""}>
                <i className="fa-regular fa-comment"></i>
                <span className="menu-text">Voucher</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/comment" className={isActive("/admin/comment") ? "active" : ""}>
                <i className="fas fa-ticket-alt" />
                <span className="menu-text">Comment</span>
              </Link>
            </li>
            

          </ul>
        </nav>
      </aside>
    </>
  );
}
