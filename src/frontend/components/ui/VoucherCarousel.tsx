"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// ⛔ Bỏ import popup
// import VoucherCongrats, { Voucher } from "./VoucherCongrats";
import "@/public/css/voucher.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type RawPromotion = {
  _id?: string;
  id?: string;
  code?: string;
  type?: string;                 // "percent" | "fixed"
  discount?: number | string;
  maxDiscount?: number | string;
  minOrderValue?: number | string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  active?: boolean;
  isActive?: boolean;
  remaining?: number | string;
  quantity?: number | string;
  description?: string;
};

const asArray = (x: any): any[] => (Array.isArray(x) ? x : []);
const toNum = (v: unknown) => (v === "" || v == null ? undefined : Number(v));

const fmtMoneyShort = (n?: number) => {
  if (!n) return "0";
  const v = Math.round(Number(n));
  if (v >= 1_000_000) return `${Math.floor(v / 1_000_000)} triệu`;
  if (v >= 1_000) return `${Math.floor(v / 1_000)}k`;
  return `${v}`;
};

export default function VoucherCarousel() {
  const [raw, setRaw] = useState<RawPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  // ⛔ Bỏ popup state
  // const [open, setOpen] = useState(false);
  // const [selected, setSelected] = useState<Voucher | null>(null);

  // số thẻ/khung theo viewport (4/3/2/1)
  const [perView, setPerView] = useState(4);
  const wrapRef = useRef<HTMLDivElement>(null);

  // --- fetch all pages robust ---
  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const first = await fetch(`${API}/api/promotion?limit=50&page=1`, {
          cache: "no-store",
        }).then((r) => r.json());

        const getItems = (p: any): RawPromotion[] =>
          asArray(p.items).length
            ? p.items
            : asArray(p.data).length
            ? p.data
            : asArray(p.promotions).length
            ? p.promotions
            : asArray(p);

        const items1 = getItems(first);
        let list = [...items1];

        const total = (typeof first.total === "number" && first.total) || list.length;
        const limit = (typeof first.limit === "number" && first.limit) || 50;
        const pages = Math.max(1, Math.ceil(total / limit));

        if (pages > 1) {
          const reqs: Promise<RawPromotion[]>[] = [];
          for (let p = 2; p <= pages; p++) {
            reqs.push(
              fetch(`${API}/api/promotion?page=${p}&limit=${limit}`, {
                cache: "no-store",
              })
                .then((r) => r.json())
                .then((j) => getItems(j))
                .catch(() => [])
            );
          }
          const rest = await Promise.all(reqs);
          for (const chunk of rest) list = list.concat(chunk);
        }

        if (mounted) setRaw(list);
      } catch {
        if (mounted) setRaw([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      mounted = false;
    };
  }, []);

  // --- perView theo kích thước ---
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w <= 560) return setPerView(2);   // <= mobile: 2 voucher/khung
      if (w <= 900) return setPerView(2);
      if (w <= 1200) return setPerView(3);
      return setPerView(4);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // lọc những voucher hoạt động
  const vouchers = useMemo(() => {
    const now = Date.now();
    return raw
      .filter((r) => (r.active ?? r.isActive ?? true))
      .filter((r) => {
        const s = r.startTime || r.startDate;
        const e = r.endTime || r.endDate;
        const okStart = s ? now >= new Date(s).getTime() : true;
        const okEnd = e ? now <= new Date(e).getTime() : true;
        return okStart && okEnd;
      })
      .filter((r) => {
        const remaining = toNum(r.remaining);
        if (typeof remaining === "number") return remaining > 0;
        return true;
      });
  }, [raw]);

  const showArrows = vouchers.length > perView;

  // === CUỘN 1 THẺ / LẦN & ẨN THANH CUỘN ===
  const scrollOne = (dir: "left" | "right") => {
    const el = wrapRef.current;
    if (!el) return;

    // lấy đúng width 1 card thực tế + khoảng cách
    const firstCard = el.querySelector<HTMLElement>(".voucher-card");
    let cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 0;

    // lấy gap từ CSS variable, fallback 14
    const styles = getComputedStyle(el);
    const gapVar = styles.getPropertyValue("--gap").trim();
    const gap = gapVar ? Number(gapVar.replace("px", "")) : 14;

    // nếu chưa render card -> ước lượng theo container/perView
    if (!cardWidth) {
      const container = el.clientWidth;
      cardWidth = (container - (perView - 1) * gap) / perView;
    }

    const delta = cardWidth + gap;
    el.scrollBy({
      left: dir === "left" ? -delta : delta,
      behavior: "smooth",
    });
  };

  if (loading && vouchers.length === 0) return null;
  if (vouchers.length === 0) return null;

  return (
    <section className="voucher-section">
      <div className="voucher-row">
        {showArrows && (
          <button
            className="vc-arrow static"
            aria-label="Trước"
            onClick={() => scrollOne("left")}
          >
            <i className="fas fa-chevron-left" />
          </button>
        )}

        <div
          className={`voucher-track ${showArrows ? "" : "centered"}`}
          ref={wrapRef}
        >
          {vouchers.map((v) => {
            const isPercent = String(v.type).toLowerCase() === "percent";
            const discountLabel = isPercent
              ? `${Number(v.discount ?? 0)}%`
              : `${fmtMoneyShort(Number(v.discount))}`;

            // “Ưu đãi” giữ nguyên (hoặc bạn có thể bỏ)
            const capLabel =
              isPercent && toNum(v.maxDiscount)
                ? `Tối đa ${fmtMoneyShort(toNum(v.maxDiscount))}`
                : "Ưu đãi";

            return (
              <div className="voucher-card" key={(v._id || v.id || v.code) as string}>
                <div className="vc-head">
                  {/* 1) VOUCHER -> % giảm */}
                  <span className="vc-tag">GIẢM {discountLabel}</span>
                  <span className="vc-cap">{capLabel}</span>
                </div>

                {/* 2) Dòng “Giảm …” -> mô tả */}
                <div className="vc-discount">
                  {v.description || "Ưu đãi hấp dẫn"}
                </div>

                <div className="vc-foot">
                  <span className="vc-code-inline">
                    Nhập mã: <b>{v.code}</b>
                  </span>
                  {/* 3) Nhận -> Mua ngay (link trang sản phẩm) */}
                  <a className="vc-claim" href="/user/products">
                    Sử dụng
                  </a> 
                </div>
              </div>
            );
          })}
        </div>

        {showArrows && (
          <button
            className="vc-arrow static"
            aria-label="Sau"
            onClick={() => scrollOne("right")}
          >
            <i className="fas fa-chevron-right" />
          </button>
        )}
      </div>
    </section>
  );
}
