import jwt from "jsonwebtoken";
import User from "../models/User.js";

const getToken = (req) => {
    const h = req.headers.authorization || "";
    return h.startsWith("Bearer ") ? h.split(" ")[1] : null;
};

export const protect = async(req, res, next) => {
    try {
        const token = getToken(req);
        if (!token) return res.status(401).json({ message: "No token" });

        const secret = process.env.JWT_SECRET || "dev_jwt_secret_key";
        const decoded = jwt.verify(token, secret);
        const user = await User.findById(decoded.id).select("-password");
        if (!user) return res.status(401).json({ message: "User not found" });

        // ✳️ THÊM: token của user bị khóa không được dùng
        if (user.status === "blocked") {
            return res.status(403).json({ message: "Tài khoản đã bị khóa" });
        }

        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({ message: "Token invalid" });
    }
};