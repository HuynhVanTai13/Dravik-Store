import axios from "axios";

export const api = axios.create({
  // đổi PORT nếu backend của bạn khác 5000
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
  withCredentials: true,
});
