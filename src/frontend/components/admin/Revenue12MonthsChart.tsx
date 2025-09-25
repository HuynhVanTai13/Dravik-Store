"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  TooltipItem,
} from "chart.js";
import axios from "@/utils/axiosConfig";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/* ========= Types ========= */
type Order = {
  _id: string;
  status?: string;
  createdAt?: string;

  // các field tổng tiền thường gặp (string/number)
  total?: number | string;
  totalAmount?: number | string;
  finalAmount?: number | string;
  grandTotal?: number | string;
  amount?: number | string;
  totalPrice?: number | string;
  summaryTotal?: number | string;
  paymentTotal?: number | string;

  payment?: { total?: number | string } | null;
  pricing?: { total?: number | string } | null;
  invoice?: { total?: number | string } | null;
  summary?: { total?: number | string } | null;

  [key: string]: unknown;
};

// Orders API có thể trả mảng hoặc {data|orders}
type OrdersApiArray = Order[];
type OrdersApiDataObj = { data: Order[]; total?: number };
type OrdersApiOrdersObj = { orders: Order[]; total?: number };
type OrdersApiData = OrdersApiArray | OrdersApiDataObj | OrdersApiOrdersObj;

/* ========= Helpers ========= */
const PAGE_SIZE = 500;

function extractOrders(payload: OrdersApiData): Order[] {
  if (Array.isArray(payload)) return payload;
  if ("data" in payload) return payload.data ?? [];
  if ("orders" in payload) return payload.orders ?? [];
  return [];
}

async function fetchAllOrders(): Promise<Order[]> {
  try {
    const first = await axios.get<OrdersApiData>("/api/orders", {
      params: { page: 1, limit: PAGE_SIZE },
    });
    let list = extractOrders(first.data);
    const total =
      (Array.isArray(first.data)
        ? list.length
        : "total" in first.data
        ? first.data.total ?? list.length
        : list.length) || list.length;

    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages > 1) {
      const reqs: Promise<Order[]>[] = [];
      for (let p = 2; p <= pages; p++) {
        reqs.push(
          axios
            .get<OrdersApiData>("/api/orders", { params: { page: p, limit: PAGE_SIZE } })
            .then((r) => extractOrders(r.data))
            .catch(() => [])
        );
      }
      const rest = await Promise.all(reqs);
      for (const chunk of rest) list = list.concat(chunk);
    }
    return list;
  } catch {
    try {
      const res = await axios.get<OrdersApiData>("/api/orders");
      return extractOrders(res.data);
    } catch {
      return [];
    }
  }
}

function getOrderAmount(o: Order): number {
  const tryKeys = [
    "total",
    "totalAmount",
    "finalAmount",
    "grandTotal",
    "amount",
    "totalPrice",
    "summaryTotal",
    "paymentTotal",
  ] as const;

  for (const k of tryKeys) {
const v = o?.[k as keyof Order];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  const nested =
    o?.payment?.total ?? o?.pricing?.total ?? o?.invoice?.total ?? o?.summary?.total;
  if (typeof nested === "number") return nested;
  if (typeof nested === "string" && nested.trim() !== "" && !Number.isNaN(Number(nested)))
    return Number(nested);

  return 0;
}

function aggregateRevenueByMonth(orders: Order[], year: number): number[] {
  const sum = new Array(12).fill(0) as number[];
  const completed = orders.filter((o) => (o.status ?? "").toLowerCase() === "completed");

  for (const o of completed) {
    if (!o.createdAt) continue;
    const d = new Date(o.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() !== year) continue;

    const m = d.getMonth(); // 0..11
    sum[m] += getOrderAmount(o);
  }
  return sum;
}

/** Lấy danh sách năm có đơn hàng (completed) */
function getAvailableYears(orders: Order[]): number[] {
  const years = new Set<number>();
  for (const o of orders) {
    if ((o.status ?? "").toLowerCase() !== "completed") continue;
    if (!o.createdAt) continue;
    const d = new Date(o.createdAt);
    if (!Number.isNaN(d.getTime())) years.add(d.getFullYear());
  }
  return Array.from(years).sort((a, b) => a - b);
}

/* ========= Chart options (giữ nguyên giao diện) ========= */
const labels = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const options: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function (value: number | string) {
          if (typeof value === "number" && value >= 1_000_000) return value / 1_000_000 + " triệu";
          return value;
        },
      },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: function (context: TooltipItem<"bar">) {
          let label = context.dataset.label || "";
          if (label) label += ": ";
          if (context.parsed.y !== null) {
            label += new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(context.parsed.y);
          }
          return label;
        },
      },
    },
  },
};

/* ========= Component ========= */
export default function Revenue12MonthsChart() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [series, setSeries] = useState<number[]>(new Array(12).fill(0));

  // Lấy năm từ <select id="yearSelect"> có sẵn trên Dashboard (không đổi giao diện)
  useEffect(() => {
    const el = document.getElementById("yearSelect") as HTMLSelectElement | null;
    if (!el) return;
const initial = parseInt(el.value, 10);
    if (!Number.isNaN(initial)) setYear(initial);

    const onChange = () => {
      const v = parseInt(el.value, 10);
      if (!Number.isNaN(v)) setYear(v);
    };
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, []);

  // Fetch orders -> bơm options năm + build data
  useEffect(() => {
    let alive = true;
    (async () => {
      const orders = await fetchAllOrders();

      // 1) Bơm danh sách năm vào #yearSelect (không đổi cấu trúc DOM)
      const years = getAvailableYears(orders);
      const el = document.getElementById("yearSelect") as HTMLSelectElement | null;
      if (el && years.length) {
        // xóa option cũ, thêm option mới
        el.innerHTML = "";
        for (const y of years) {
          const opt = document.createElement("option");
          opt.value = String(y);
          opt.textContent = String(y);
          el.appendChild(opt);
        }
        // nếu năm hiện tại không có trong danh sách -> chọn năm mới nhất
        if (!years.includes(year)) {
          const latest = years[years.length - 1];
          el.value = String(latest);
          if (alive) setYear(latest);
        } else {
          el.value = String(year);
        }
        // lưu ý: native select sẽ tự có scroll khi danh sách dài
      }

      // 2) Build data theo năm đang chọn
      const monthly = aggregateRevenueByMonth(orders, el ? parseInt(el.value, 10) : year);
      if (alive) setSeries(monthly);
    })();
    return () => {
      alive = false;
    };
    // chạy lại khi năm thay đổi để tính lại series từ orders đã fetch
  }, [year]);

  const data: ChartData<"bar"> = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Doanh thu (VND)",
          data: series,
          backgroundColor: "#1976d2",
        },
      ],
    }),
    [series]
  );

  return (
    <div style={{ minHeight: 320, height: 320 }}>
      <Bar data={data} options={options} />
    </div>
  );
}
