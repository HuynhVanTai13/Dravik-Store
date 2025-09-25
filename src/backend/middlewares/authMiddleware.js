// src/backend/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const getToken = (req) => {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.split(" ")[1] : null;
};

export const protect = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: "Thiếu token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "Token không hợp lệ" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Token không hợp lệ hoặc hết hạn" });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user?.role === 1) return next();
  return res.status(403).json({ message: "Chỉ Admin được phép truy cập" });
};
