"use client";
import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from "chart.js";
import axios from "@/utils/axiosConfig";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

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

const PAGE_SIZE = 500;

/* ========= Helpers ========= */
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

// Bắt đầu tuần (Thứ 2, 00:00) và kết thúc tuần (đầu Thứ 2 kế tiếp)
function startOfThisWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0..6 (CN..T7)
  const diff = (dow + 6) % 7; // số ngày lùi về Thứ 2
  d.setDate(d.getDate() - diff);
  return d;
}
function endOfThisWeek(start: Date): Date {
  const e = new Date(start);
  e.setDate(start.getDate() + 7);
  return e;
}

/* ========= Chart options (giữ nguyên giao diện) ========= */
const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const options: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function (value: string | number) {
          if (typeof value === "number" && value >= 1_000_000) return value / 1_000_000 + " triệu";
          return value;
        },
      },
    },
    x: { grid: { display: false } },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: function (context: TooltipItem<"line">) {
          let label = context.dataset.label || "";
          if (label) label += ": ";
          if (context.parsed.y !== null)
            label += new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(context.parsed.y);
          return label;
        },
      },
    },
  },
};

/* ========= Component ========= */
export default function WeeklyRevenueChart() {
  const [series, setSeries] = useState<number[]>(new Array(7).fill(0));

  useEffect(() => {
    let alive = true;
    (async () => {
      const orders = await fetchAllOrders();

      const start = startOfThisWeek();
      const end = endOfThisWeek(start);
      const buckets = new Array(7).fill(0) as number[];

      const completed = orders.filter((o) => (o.status ?? "").toLowerCase() === "completed");
      for (const o of completed) {
        if (!o.createdAt) continue;
        const d = new Date(o.createdAt);
        if (Number.isNaN(d.getTime())) continue;
        if (d < start || d >= end) continue;

        // Map về index 0..6 theo labels: T2..CN
        const idx = (d.getDay() + 6) % 7; // Monday=0 ... Sunday=6
        buckets[idx] += getOrderAmount(o);
      }

      if (alive) setSeries(buckets);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Doanh thu tuần (VNĐ)",
data: series,
          backgroundColor: "rgba(40, 167, 69, 0.2)",
          borderColor: "rgba(40, 167, 69, 1)",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    }),
    [series]
  );

  return (
    <div style={{ minHeight: 200, height: 200 }}>
      <Line data={data} options={options} />
    </div>
  );
}
