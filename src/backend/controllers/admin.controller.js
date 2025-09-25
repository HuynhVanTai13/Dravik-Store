import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { OAuth2Client } from "google-auth-library";
import fetch from "node-fetch"; // nếu chưa có: npm i node-fetch

// ====== Helper ======
const signToken = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ====== Auth Controllers ======

/** Đăng ký local */
export const register = async(req, res) => {
    try {
        const { username, email, password, phone_number } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });
        }

        const existed = await User.findOne({ email });
        if (existed) return res.status(400).json({ message: "Email đã tồn tại" });

        const user = await User.create({
            username,
            email,
            password,
            phone_number,
            role: 0,
            provider: "local",
            status: "active", // mặc định khi đăng ký
        });

        res.status(201).json({
            user,
            token: signToken(user),
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

/** Đăng nhập local */
export const login = async(req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !user.password) {
            return res
                .status(401)
                .json({ message: "Email hoặc mật khẩu không đúng!" });
        }

        if (user.status === "blocked") {
            return res.status(403).json({ message: "Tài khoản đã bị khóa" });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok)
            return res
                .status(401)
                .json({ message: "Email hoặc mật khẩu không đúng!" });

        res.json({
            user,
            token: signToken(user),
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

/** Đăng nhập Google */
export const googleLogin = async(req, res) => {
    try {
        const { credential } = req.body;
        if (!credential)
            return res.status(400).json({ message: "Thiếu credential" });

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub, name, email, picture, email_verified } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                username: usernameAuto, // ← dùng biến đã tính
                email,
                provider: "google",
                googleId: sub,
                avatar: picture || "",
                emailVerified: !!email_verified,
                status: "active",
            });
        } else {
            let changed = false;
            if (!user.googleId) {
                user.googleId = sub;
                changed = true;
            }
            if (user.provider !== "google") {
                user.provider = "google";
                changed = true;
            }
            if (picture && user.avatar !== picture) {
                user.avatar = picture;
                changed = true;
            }
            if (
                typeof email_verified === "boolean" &&
                user.emailVerified !== email_verified
            ) {
                user.emailVerified = email_verified;
                changed = true;
            }
            if (changed) await user.save();
        }

        if (user.status === "blocked") {
            return res.status(403).json({ message: "Tài khoản đã bị khóa" });
        }

        res.json({ user, token: signToken(user) });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};


// ====== Admin Controllers ======

/** Lấy danh sách user */
export const getAllUsers = async(_req, res) => {
    try {
        const users = await User.find({}).select("-password");
        res.json(users);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

/** Xóa user (trừ admin) */
export const deleteUser = async(req, res) => {
    try {
        const r = await User.deleteOne({ _id: req.params.id, role: { $ne: 1 } });
        if (r.deletedCount === 0) {
            return res.json({ message: "Không xóa được" });
        }
        res.json({ message: "Đã xóa" });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

/** Cập nhật trạng thái user (active/blocked) */
export const updateUserStatus = async(req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["active", "blocked"].includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ" });
        }

        const user = await User.findByIdAndUpdate(
            id, { status }, { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy user" });
        }

        res.json(user);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};