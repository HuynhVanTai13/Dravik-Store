"use client";
import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  TooltipItem,
  ChartOptions,
} from "chart.js";
import axios from "@/utils/axiosConfig";

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* ========= Types ========= */
type Order = {
  _id: string;
  status?: string;
  createdAt?: string;

  // các field tổng tiền thường gặp
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

/* ========= Chart options (giữ nguyên giao diện) ========= */
const options: ChartOptions<"bar"> = {
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
        label: function (context: TooltipItem<"bar">) {
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
export default function YearlyRevenueChart() {
  const [labels, setLabels] = useState<string[]>([]);
  const [values, setValues] = useState<number[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const orders = await fetchAllOrders();

      // Chỉ tính đơn completed
      const completed = orders.filter((o) => (o.status ?? "").toLowerCase() === "completed");

      // Gom theo năm
      let minYear = Infinity;
      let maxYear = -Infinity;
      const byYear = new Map<number, number>();

      for (const o of completed) {
        if (!o.createdAt) continue;
        const d = new Date(o.createdAt);
        if (Number.isNaN(d.getTime())) continue;

        const y = d.getFullYear();
        minYear = Math.min(minYear, y);
        maxYear = Math.max(maxYear, y);

        byYear.set(y, (byYear.get(y) ?? 0) + getOrderAmount(o));
      }

      // Nếu không có dữ liệu, hiển thị năm hiện tại với 0
      if (!isFinite(minYear) || !isFinite(maxYear)) {
        const y = new Date().getFullYear();
        if (alive) {
          setLabels([String(y)]);
          setValues([0]);
        }
        return;
      }

      const lbls: string[] = [];
      const vals: number[] = [];
      for (let y = minYear; y <= maxYear; y++) {
        lbls.push(String(y));
        vals.push(byYear.get(y) ?? 0);
      }

      if (alive) {
        setLabels(lbls);
        setValues(vals);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Giữ style như cũ (màu lặp lại theo palette)
  const paletteBg = [
    "rgba(255, 99, 132, 0.7)",
"rgba(54, 162, 235, 0.7)",
    "rgba(255, 206, 86, 0.7)",
    "rgba(75, 192, 192, 0.7)",
    "rgba(153, 102, 255, 0.7)",
  ];
  const paletteBd = [
    "rgba(255, 99, 132, 1)",
    "rgba(54, 162, 235, 1)",
    "rgba(255, 206, 86, 1)",
    "rgba(75, 192, 192, 1)",
    "rgba(153, 102, 255, 1)",
  ];

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Doanh thu năm (VNĐ)",
          data: values,
          backgroundColor: labels.map((_, i) => paletteBg[i % paletteBg.length]),
          borderColor: labels.map((_, i) => paletteBd[i % paletteBd.length]),
          borderWidth: 1,
        },
      ],
    }),
    [labels, values]
  );

  return (
    <div style={{ minHeight: 200, height: 200 }}>
      <Bar data={data} options={options} />
    </div>
  );
}
