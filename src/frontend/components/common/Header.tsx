'use client';

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import "../../public/css/hmf.css";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

/* ===== Helpers ===== */
function getShortName(fullName: string = "") {
  if (!fullName) return "";
  const arr = fullName.trim().split(/\s+/);
  if (arr.length === 1) return arr[0];
  return arr[0] + " " + arr[arr.length - 1];
}

type CartItem = { quantity?: number };
type CartResponse = { items?: CartItem[] };

const Header = () => {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const [userName, setUserName] = useState<string | null>(null);

  const [cartCount, setCartCount] = useState<number>(0);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [favCount, setFavCount] = useState<number>(0);

  const [query, setQuery] = useState<string>("");
  const [mQuery, setMQuery] = useState<string>("");

  const userId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("userId") || "";
  }, []);

  // NEW: cờ ngăn Header refetch lại số liệu ngay sau khi vừa logout
  const [forceZero, setForceZero] = useState(false);

  const getUserNameFromLocalStorage = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("userInfo") || localStorage.getItem("user");
      if (!raw) return null;
      const u = JSON.parse(raw);
      return u?.username || u?.fullName || u?.name || null;
    } catch { }
    return null;
  };

  /* ===== API helpers ===== */
  // CART
  const fetchCartCount = async () => {
    const id = userId || (typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "");
    if (!id) return setCartCount(0);
    try {
      const res = await fetch(`${API}/api/cart/${id}`, { credentials: "include" });
      const data: CartResponse = await res.json();
      const items: CartItem[] = Array.isArray(data?.items) ? data.items : [];
      const totalQty = items.reduce<number>(
        (sum, item) => sum + (typeof item.quantity === "number" ? item.quantity : 0),
        0
      );
      setCartCount(totalQty);
    } catch {
      setCartCount(0);
    }
  };

  // ORDERS
  const fetchOrderCount = async () => {
    const id = userId || (typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "");
    if (!id) return setOrderCount(0);

    const endpoints = [
      `${API}/api/orders/user/${id}`,
      `${API}/api/orders?userId=${encodeURIComponent(id)}`,
      `${API}/api/order?userId=${encodeURIComponent(id)}`
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) continue;
        const data = await res.json();
        const arr =
          data?.orders ??
          data?.docs ??
          (Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
        if (Array.isArray(arr)) {
          setOrderCount(arr.length);
          return;
        }
      } catch { }
    }
    setOrderCount(0);
  };

  // FAVOURITES
  const fetchFavouriteCount = async () => {
    const id = userId || (typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "");
    if (!id) return setFavCount(0);

    const endpoints = [
      `${API}/api/favourites/${id}`,
      `${API}/api/favorites/${id}`,
      `${API}/api/favourite?userId=${encodeURIComponent(id)}`,
      `${API}/api/favorite?userId=${encodeURIComponent(id)}`
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) continue;
        const data = await res.json();
        const arr =
          data?.favourites ??
          data?.favorites ??
          (Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []));
        if (Array.isArray(arr)) {
          setFavCount(arr.length);
          return;
        }
      } catch { }
    }
    setFavCount(0);
  };

  /* ===== Init & listeners ===== */
  useEffect(() => {
    setUserName(getUserNameFromLocalStorage());
    fetchCartCount();
    fetchOrderCount();
    fetchFavouriteCount();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart_updated") fetchCartCount();
      if (e.key === "order_updated") fetchOrderCount();
      if (e.key === "favourite_updated" || e.key === "favorite_updated") fetchFavouriteCount();
      if (e.key === "userInfo" || e.key === "userId") {
        setUserName(getUserNameFromLocalStorage());
        fetchCartCount();
        fetchOrderCount();
        fetchFavouriteCount();
      }
    };
    window.addEventListener("storage", onStorage);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchCartCount();
        fetchOrderCount();
        fetchFavouriteCount();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // NEW: nghe custom events phát từ AccountMiniPage sau khi logout
  useEffect(() => {
    const onLogout = () => {
      setForceZero(true);
      setUserName(null);
      setCartCount(0);
      setOrderCount(0);
      setFavCount(0);
    };
    const onCartChanged = (e: Event) => {
      // @ts-ignore
      const n = e?.detail?.count ?? 0;
      setCartCount(typeof n === "number" ? n : 0);
    };
    const onFavChanged = (e: Event) => {
      // @ts-ignore
      const n = e?.detail?.count ?? 0;
      setFavCount(typeof n === "number" ? n : 0);
    };

    window.addEventListener("auth:logout", onLogout);
    window.addEventListener("cart:changed", onCartChanged as EventListener);
    window.addEventListener("favourite:changed", onFavChanged as EventListener);

    return () => {
      window.removeEventListener("auth:logout", onLogout);
      window.removeEventListener("cart:changed", onCartChanged as EventListener);
      window.removeEventListener("favourite:changed", onFavChanged as EventListener);
    };
  }, []);

  // Khi đổi route: cập nhật lại tên + badge
  useEffect(() => {
    // NEW: nếu vừa logout, không refetch lại để tránh dùng nhầm userId cũ
    if (forceZero) return;

    const n = getUserNameFromLocalStorage();
    if (n !== userName) setUserName(n);
    fetchCartCount();
    fetchOrderCount();
    fetchFavouriteCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, forceZero]);

  // Đồng bộ query khi đang ở trang sản phẩm
  useEffect(() => {
    if (pathname?.startsWith("/user/products")) {
      const q = sp.get("q") || "";
      setQuery(q);
      setMQuery(q);
    }
  }, [sp, pathname]);

  // Mobile menu
  useEffect(() => {
    const mobileMenuBtn = document.querySelector(".menu-icon");
    const mobileMenu = document.getElementById("mobileMenu");
    const menuOverlay = document.getElementById("menuOverlay");
    const closeBtn = document.getElementById("closeMobileMenu");

    function openMenu() {
      mobileMenu?.classList.add("open");
      menuOverlay?.classList.add("open");
    }
    function closeMenu() {
      mobileMenu?.classList.remove("open");
      menuOverlay?.classList.remove("open");
    }
    mobileMenuBtn?.addEventListener("click", openMenu);
    closeBtn?.addEventListener("click", closeMenu);
    menuOverlay?.addEventListener("click", closeMenu);

    return () => {
      mobileMenuBtn?.removeEventListener("click", openMenu);
      closeBtn?.removeEventListener("click", closeMenu);
      menuOverlay?.removeEventListener("click", closeMenu);
    };
  }, []);

  // Mobile SEARCH toggle (icon trên header)
  useEffect(() => {
    const openBtn = document.getElementById("openMobileSearch");
    const bar = document.getElementById("mobileSearchBar");
    const overlay = document.getElementById("menuOverlay");
    const closeBtn = document.getElementById("closeMobileSearch");

    const openSearch = () => {
      document.getElementById("mobileMenu")?.classList.remove("open");
      bar?.classList.add("open");
      overlay?.classList.add("open");
      setTimeout(() => (document.getElementById("mSearchInput") as HTMLInputElement | null)?.focus(), 0);
    };
    const closeSearch = () => {
      bar?.classList.remove("open");
      overlay?.classList.remove("open");
    };

    openBtn?.addEventListener("click", openSearch);
    closeBtn?.addEventListener("click", closeSearch);
    overlay?.addEventListener("click", closeSearch);

    return () => {
      openBtn?.removeEventListener("click", openSearch);
      closeBtn?.removeEventListener("click", closeSearch);
      overlay?.removeEventListener("click", closeSearch);
    };
  }, []);

  // Điều hướng tìm kiếm
  const goSearch = (text: string) => {
    const q = text.trim();
    document.getElementById("mobileSearchBar")?.classList.remove("open");
    document.getElementById("mobileMenu")?.classList.remove("open");
    document.getElementById("menuOverlay")?.classList.remove("open");
    if (!q) router.push("/user/products");
    else router.push(`/user/products?q=${encodeURIComponent(q)}`);
  };
  const handleSubmitDesktop = (e: React.FormEvent) => { e.preventDefault(); goSearch(query); };
  const handleSubmitMobile = (e: React.FormEvent) => { e.preventDefault(); goSearch(mQuery); };

  /* ===== Active link helpers ===== */
  const BLUE = "#3BA2DB";
  const isActive = (href: string, mode: 'exact' | 'prefix' = 'prefix') => {
    const path = pathname || '';
    return mode === 'exact'
      ? path === href
      : path === href || path.startsWith(href + "/");
  };
  const navClass = (href: string, mode: 'exact' | 'prefix' = 'prefix') =>
    `nav-link${isActive(href, mode) ? " active-link" : ""}`;
  const navStyle = (href: string, mode: 'exact' | 'prefix' = 'prefix') =>
    isActive(href, mode) ? ({ color: BLUE, fontWeight: 600 } as React.CSSProperties) : undefined;

  // Đóng mọi overlay (menu + search + overlay mờ)
  const closeAllOverlays = () => {
    document.getElementById("mobileMenu")?.classList.remove("open");
    document.getElementById("mobileSearchBar")?.classList.remove("open");
    document.getElementById("menuOverlay")?.classList.remove("open");
  };

  // Auto-đóng khi đổi route
  useEffect(() => {
    closeAllOverlays();
  }, [pathname]);

  return (
    <>
      {/* HEADER */}
      <header>
        <div className="header-main">
          <Link href="/user" ><div className="img-logo">
            <img src="/images/logo.png" alt="Dravik Store" />
          </div></Link>

          <div className="header-nav">
            <div className="header-search">
              {/* Search DESKTOP */}
              <form className="search" onSubmit={handleSubmitDesktop} role="search" aria-label="Tìm kiếm sản phẩm">
                <input
                  type="text"
                  placeholder="Nhập sản phẩm cần tìm kiếm ..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Ô tìm kiếm sản phẩm"
                />
                <button type="submit" className="icon-search" aria-label="Tìm kiếm">
                  <i className="fas fa-search"></i>
                </button>
              </form>

              <div className="nav-top">
                <Link href="/user/account"
                  className={isActive("/user/account", "exact") ? "active-text" : ""}
                  aria-current={isActive("/user/account", "exact") ? "page" : undefined}>
                  <i className="fas fa-user"></i>
                  <p>{userName ? getShortName(userName) : "Tài khoản"}</p>
                </Link>

                <Link href="/user/account/order"
                  className={`cart ${isActive("/user/account/order", "prefix") ? "active-text" : ""}`}
                  aria-current={isActive("/user/account/order", "prefix") ? "page" : undefined}>
                  <i className="fas fa-file-alt"></i>
                  <p>Đơn hàng</p>
                  <span className="badge">{orderCount}</span>
                </Link>

                <Link href="/user/favourite"
                  className={`cart ${isActive("/user/favourite", "prefix") ? "active-text" : ""}`}
                  aria-current={isActive("/user/favourite", "prefix") ? "page" : undefined}>
                  <i className="fas fa-heart"></i>
                  <p>Yêu thích</p>
                  <span className="badge">{favCount}</span>
                </Link>

                <Link href="/user/cart"
                  className={`cart ${isActive("/user/cart", "prefix") ? "active-text" : ""}`}
                  aria-current={isActive("/user/cart", "prefix") ? "page" : undefined}>
                  <i className="fas fa-shopping-cart"></i>
                  <p>Giỏ hàng</p>
                  <span className="badge">{cartCount}</span>
                </Link>
              </div>
            </div>

            <div className="nav-bottom">
              <Link href="/user"
                className={navClass("/user", "exact")}
                style={navStyle("/user", "exact")}
                aria-current={isActive("/user", "exact") ? "page" : undefined}>
                Trang chủ
              </Link>
              <Link href="/user/introduce" className={navClass("/user/introduce", "prefix")} style={navStyle("/user/introduce", "prefix")} aria-current={isActive("/user/introduce", "prefix") ? "page" : undefined}>Giới thiệu</Link>
              <Link href="/user/products" className={navClass("/user/products", "prefix")} style={navStyle("/user/products", "prefix")} aria-current={isActive("/user/products", "prefix") ? "page" : undefined}>Sản phẩm</Link>
              <Link href="/user/blog" className={navClass("/user/blog", "prefix")} style={navStyle("/user/blog", "prefix")} aria-current={isActive("/user/blog", "prefix") ? "page" : undefined}>Tin tức</Link>
              <Link href="/user/sp_new" className={navClass("/user/sp_new", "prefix")} style={navStyle("/user/sp_new", "prefix")} aria-current={isActive("/user/sp_new", "prefix") ? "page" : undefined}>Hàng mới</Link>
              <Link href="/user/contact" className={navClass("/user/contact", "prefix")} style={navStyle("/user/contact", "prefix")} aria-current={isActive("/user/contact", "prefix") ? "page" : undefined}>Liên hệ</Link>
              <Link href="/user/sp_sale" className={navClass("/user/sp_sale", "prefix")} style={navStyle("/user/sp_sale", "prefix")} aria-current={isActive("/user/sp_sale", "prefix") ? "page" : undefined}>Sản phẩm giảm giá</Link>
            </div>
          </div>
        </div>
      </header>

      {/* HEADER MOBILE */}
      <div className="mobile-header">
        <span className="menu-icon"><i className="fas fa-bars"></i></span>
        <div className="img-logo"><img src="/images/logo-footer.png" alt="Dravik Store" /></div>
        <div className="icon-group">
          {/* Nút mở thanh tìm kiếm mobile */}
          <span id="openMobileSearch" role="button" aria-label="Mở tìm kiếm">
            <i className="fas fa-search"></i>
          </span>

          {/* Giỏ hàng mobile (link + badge) */}
          <Link
            href="/user/cart"
            className="cart"
            aria-label="Giỏ hàng"
            onClick={() => {
              document.getElementById("menuOverlay")?.classList.remove("open");
              document.getElementById("mobileMenu")?.classList.remove("open");
              document.getElementById("mobileSearchBar")?.classList.remove("open");
            }}
          >
            <i className="fas fa-shopping-cart"></i>
            <span className="badge">{cartCount}</span>
          </Link>
        </div>
      </div>

      {/* Thanh tìm kiếm trượt xuống (mobile) */}
      <div id="mobileSearchBar" className="mobile-search-bar" aria-hidden="true">
        <form className="mobile-search-form" onSubmit={handleSubmitMobile} role="search" aria-label="Tìm kiếm sản phẩm (mobile)">
          <i className="fas fa-search" aria-hidden="true"></i>
          <input
            id="mSearchInput"
            type="text"
            placeholder="Tìm sản phẩm..."
            value={mQuery}
            onChange={(e) => setMQuery(e.target.value)}
            aria-label="Ô tìm kiếm sản phẩm (mobile)"
          />
          <button type="button" id="closeMobileSearch" className="close" aria-label="Đóng tìm kiếm">
            <i className="fas fa-times"></i>
          </button>
        </form>
      </div>

      {/* OFFCANVAS MENU */}
      <div id="mobileMenu" className="mobile-offcanvas">
        <div className="mobile-menu-header">
          <span className="close-btn" id="closeMobileMenu">&times;</span>
          <img src="/images/logo.png" alt="Dravik Store" className="offcanvas-logo" />
        </div>
        <nav className="mobile-menu-nav">
          <Link href="/user" onClick={closeAllOverlays} className={navClass("/user", "exact")} style={navStyle("/user", "exact")} aria-current={isActive("/user", "exact") ? "page" : undefined}>Trang chủ</Link>
          <Link href="/user/introduce" onClick={closeAllOverlays} className={navClass("/user/introduce", "prefix")} style={navStyle("/user/introduce", "prefix")} aria-current={isActive("/user/introduce", "prefix") ? "page" : undefined}>Giới thiệu</Link>
          <Link href="/user/products" onClick={closeAllOverlays} className={navClass("/user/products", "prefix")} style={navStyle("/user/products", "prefix")} aria-current={isActive("/user/products", "prefix") ? "page" : undefined}>Sản phẩm</Link>
          <Link href="/user/blog" onClick={closeAllOverlays} className={navClass("/user/blog", "prefix")} style={navStyle("/user/blog", "prefix")} aria-current={isActive("/user/blog", "prefix") ? "page" : undefined}>Tin tức</Link>
          <Link href="/user/sp_new" onClick={closeAllOverlays} className={navClass("/user/sp_new", "prefix")} style={navStyle("/user/sp_new", "prefix")} aria-current={isActive("/user/sp_new", "prefix") ? "page" : undefined}>Hàng mới</Link>
          <Link href="/user/contact" onClick={closeAllOverlays} className={navClass("/user/contact", "prefix")} style={navStyle("/user/contact", "prefix")} aria-current={isActive("/user/contact", "prefix") ? "page" : undefined}>Liên hệ</Link>
          <Link href="/user/sp_sale" onClick={closeAllOverlays} className={navClass("/user/sp_sale", "prefix")} style={navStyle("/user/sp_sale", "prefix")} aria-current={isActive("/user/sp_sale", "prefix") ? "page" : undefined}>Sản phẩm giảm giá</Link>

          <hr />

          {/* Các mục tài khoản – KHÔNG còn badge trong menu */}
          <Link href="/user/account" onClick={closeAllOverlays}>
            <i className="fas fa-user"></i>
            <span>&nbsp;{userName ? getShortName(userName) : "Tài khoản"}</span>
          </Link>
          <Link href="/user/favourite" onClick={closeAllOverlays}>
            <i className="fas fa-heart"></i>
            <span>&nbsp;Yêu thích</span>
          </Link>
          <Link href="/user/account/order" onClick={closeAllOverlays}>
            <i className="fas fa-file-alt"></i>
            <span>&nbsp;Đơn hàng</span>
          </Link>
          <Link
            href="/user/cart"
            onClick={() => {
              closeAllOverlays();
            }}
          >
            <i className="fas fa-shopping-cart"></i>
            <span>&nbsp;Giỏ hàng</span>
          </Link>
        </nav>
      </div>

      <div id="menuOverlay" className="menu-overlay"></div>
    </>
  );
};

export default Header;
