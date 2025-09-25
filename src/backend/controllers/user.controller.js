// src/controllers/user.controller.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { sendMail } from "../utils/mailer.js";

/* ================== Helpers ================== */
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_key";
const signToken = (user) =>
    jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
);

// OTP lưu tạm trong bộ nhớ (phục vụ demo/dev). Triển khai thật nên dùng DB/Redis.
const otpStore = new Map(); // key: email => { code, expiresAt }

/* ================== AUTH ================== */
/** Đăng ký local (alias: register, registerUser) */
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
            getuserid
        });

        res.status(201).json({
            user,
            token: signToken(user),
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};
export const registerUser = register;

/** Đăng nhập local (email hoặc username) (alias: loginUser) */
export const login = async(req, res) => {
    try {
        const { email, identifier, password } = req.body;
        const rawId = String(
            (identifier !== undefined && identifier !== null) ? identifier :
            ((email !== undefined && email !== null) ? email : "")
        ).trim();
        if (!rawId || !password) {
            return res.status(400).json({ message: "Thiếu thông tin đăng nhập" });
        }

        const query = rawId.includes("@") ? { email: rawId.toLowerCase() } : { username: rawId };
        const user = await User.findOne(query).select("+password");
        if (!user || !user.password) {
            return res.status(401).json({ message: "Email/Username hoặc mật khẩu không đúng!" });
        }

        // ✳️ THÊM: chặn tài khoản bị khóa
        if (user.status === "blocked") {
            return res.status(403).json({ message: "Tài khoản đã bị khóa" });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ message: "Email/Username hoặc mật khẩu không đúng!" });
        }

        const { password: pw, ...userData } = user.toObject();
        res.json({ user: userData, token: signToken(user) });
    } catch (e) {
        res.status(500).json({ message: e.message || "Đăng nhập thất bại" });
    }
};

export const loginUser = login;

/** Đăng nhập admin (role 1|2) */
export const loginAdmin = async(req, res) => {
    try {
        const { email, identifier, password } = req.body;
        const rawId = String(
            (identifier !== undefined && identifier !== null) ? identifier :
            ((email !== undefined && email !== null) ? email : "")
        ).trim();
        const query = rawId.includes("@") ? { email: rawId.toLowerCase() } : { username: rawId };

        const user = await User.findOne(query).select("+password");
        if (!user) return res.status(401).json({ message: "Tài khoản không tồn tại!" });

        const ok = await bcrypt.compare(password, user.password || "");
        if (!ok) return res.status(401).json({ message: "Sai mật khẩu!" });

        if (user.role !== 1 && user.role !== 2) {
            return res
                .status(403)
                .json({ message: "Chỉ tài khoản admin/chủ hệ thống được đăng nhập!" });
        }

        const { password: pw, ...userData } = user.toObject();
        res.json({ user: userData, token: signToken(user) });
    } catch (err) {
        res.status(500).json({ message: "Đăng nhập thất bại", error: err.message });
    }
};

/** Đăng nhập bằng Google Identity Services */
export const googleLogin = async(req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: "Thiếu credential" });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub, name, email, picture, email_verified } = payload;

        const normEmail = String(email || "").toLowerCase();
        if (!normEmail) {
            return res.status(400).json({ message: "Không lấy được email từ Google" });
        }

        let user = await User.findOne({ email: normEmail });
        if (!user) {
            user = await User.create({
                username: name || normEmail.split("@")[0],
                email: normEmail,
                provider: "google",
                googleId: sub,
                avatar: picture || "",
                emailVerified: !!email_verified,
                role: 0,
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

        if (user && user.status === "blocked") {
            return res.status(403).json({ message: "Tài khoản đã bị khóa" });
        }

        res.json({ user: user.toJSON(), token: signToken(user) });
    } catch (e) {
        res.status(500).json({ message: e.message || "Google đăng nhập thất bại" });
    }
};
export const facebookLogin = async(req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken)
            return res.status(400).json({ message: "Thiếu accessToken" });

        const fields = "id,name,email,picture.type(large)";
        const graphRes = await fetch(
            `https://graph.facebook.com/me?fields=${fields}&access_token=${accessToken}`
        );
        const profile = await graphRes.json();

        if (profile.error) {
            return res
                .status(401)
                .json({ message: "Token không hợp lệ", detail: profile.error });
        }

        const facebookId = profile.id;
        const name = profile.name || "";
        const email = profile.email || "";
        const picture =
            (profile && profile.picture && profile.picture.data && profile.picture.data.url) ?
            profile.picture.data.url :
            "";

        const lookupEmail = email || `${facebookId}@facebook.local`;

        let user = await User.findOne({
            $or: [{ facebookId }, { email: lookupEmail }],
        });

        if (!user) {
            user = await User.create({
                username: name || `fb_${facebookId}`,
                email: lookupEmail,
                provider: "facebook",
                facebookId,
                avatar: picture,
                emailVerified: !!email,
                status: "active",
            });
        } else {
            let changed = false;
            if (!user.facebookId) {
                user.facebookId = facebookId;
                changed = true;
            }
            if (user.provider !== "facebook") {
                user.provider = "facebook";
                changed = true;
            }
            if (picture && user.avatar !== picture) {
                user.avatar = picture;
                changed = true;
            }
            if (email && user.email !== email) {
                user.email = email;
                changed = true;
                user.emailVerified = true;
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

/* ================== OTP: Quên mật khẩu ================== */
/** Gửi OTP về email */
export const sendOtp = async(req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        if (!email) return res.status(400).json({ message: "Thiếu email" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Email không tồn tại" });

        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút
        otpStore.set(email, { code, expiresAt });

        const html = `
      <div style="font-family:system-ui">
        <h2>Mã xác thực OTP</h2>
        <p>Mã của bạn là: <b style="font-size:20px">${code}</b> (hết hạn sau 5 phút)</p>
      </div>`;
        try {
            await sendMail({
                to: email,
                subject: "DRAVIK STORE - Mã OTP khôi phục mật khẩu",
                html,
            });
        } catch (err) {
            // Không chặn nếu SMTP lỗi trong môi trường dev
            console.warn("[sendOtp] SMTP error:", (err && err.message));
        }

        res.json({ message: "Đã gửi mã OTP về email" });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

/** Xác thực OTP */
export const verifyOtp = async(req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const code = String(req.body.otp || "").trim();
        const record = otpStore.get(email);
        if (!record) return res.status(400).json({ message: "OTP đã hết hạn hoặc không hợp lệ" });
        if (Date.now() > record.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ message: "OTP đã hết hạn" });
        }
        if (record.code !== code) {
            return res.status(400).json({ message: "Mã OTP không đúng" });
        }
        // Đánh dấu email đã xác thực OTP (tạm thời)
        otpStore.set(email, {...record, verified: true });
        res.json({ message: "Xác thực OTP thành công" });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

/** Đặt lại mật khẩu mới (sau khi OTP hợp lệ) */
export const resetPassword = async(req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const newPassword = String(req.body.password || "");
        if (!email || !newPassword) {
            return res.status(400).json({ message: "Thiếu email hoặc mật khẩu mới" });
        }
        const record = otpStore.get(email);
        if (!(record && record.verified)) {
            return res.status(400).json({ message: "Chưa xác thực OTP cho email này" });
        }

        const user = await User.findOne({ email }).select("+password");
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

        user.password = newPassword; // để model pre('save') hash
        await user.save();
        otpStore.delete(email);

        res.json({ message: "Đổi mật khẩu thành công" });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

/* ================== USER CRUD ================== */
export const getAllUsers = async(_req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const getUsersByRole = async(req, res) => {
    try {
        const users = await User.find({ role: Number(req.params.role) });
        res.json(users);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

export const updateUser = async(req, res) => {
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

export const deleteUser = async(req, res) => {
    try {
        // Chặn xoá admin role=1 để an toàn
        const target = await User.findById(req.params.id);
        if (!target) return res.json({ message: "Không tìm thấy người dùng" });
        if (target.role === 1) {
            return res
                .status(403)
                .json({ message: "Không được xoá tài khoản admin" });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Xoá thành công" });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

/* ================== ADDRESS ================== */
export const addAddress = async(req, res) => {
    try {
        const { id } = req.params;
        const { receiver, phone, address, isDefault } = req.body;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User không tồn tại" });

        if (isDefault) user.addresses.forEach((a) => (a.isDefault = false));
        user.addresses.push({ receiver, phone, address, isDefault: !!isDefault });
        await user.save();

        res.json({ success: true, message: "Thêm địa chỉ thành công" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateAddress = async(req, res) => {
    try {
        const { id, addressIdx } = req.params;
        const idx = Number(addressIdx);
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: "User không tồn tại" });
        if (!user.addresses || !user.addresses[idx]) {
            return res.status(404).json({ success: false, message: "Địa chỉ không tồn tại" });
        }
        const { receiver, phone, address, isDefault } = req.body;
        if (isDefault) user.addresses.forEach((a, i) => (i !== idx ? (a.isDefault = false) : a));
        user.addresses[idx] = { receiver, phone, address, isDefault: !!isDefault };
        await user.save();
        res.json({ success: true, message: "Cập nhật địa chỉ thành công" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateAddressById = async(req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User không tồn tại" });
        const idx = user.addresses.findIndex(
            (a) => a._id.toString() === req.params.addressId
        );
        if (idx === -1) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });

        const d = req.body;
        if (d.isDefault) user.addresses.forEach((a, i) => { if (i !== idx) a.isDefault = false; });
        user.addresses[idx] = {...user.addresses[idx].toObject(), ...d };
        await user.save();
        res.json({ success: true, message: "Địa chỉ đã được cập nhật" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteAddress = async(req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
        user.addresses = user.addresses.filter(
            (a) => a._id.toString() !== req.params.addressId
        );
        await user.save();
        res.json({ success: true, message: "Đã xoá địa chỉ" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server khi xoá địa chỉ" });
    }
};

/* ================== MAIL TEST ================== */
export const testMail = async(req, res) => {
    try {
        const to =
            req.query.to || process.env.SHOP_NOTIFY_EMAIL || process.env.SMTP_USER;
        const html = `
      <div style="font-family:system-ui">
        <h2>Test mail từ DRAVIK STORE</h2>
        <p>Xin chào, đây là email test SMTP.</p>
      </div>`;
        const info = await sendMail({
            to,
            subject: "DRAVIK STORE - Test SMTP",
            html,
        });
        res.json({ ok: true, to, messageId: (info && info.messageId) });
    } catch (e) {
        console.error("[MAIL TEST] error:", (e && e.message));
        res.status(500).json({ ok: false, message: (e && e.message) });
    }
};

export const sendTestMailToUser = async(req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).lean();
        if (!user || !user.email) {
            return res
                .status(404)
                .json({ ok: false, message: "User không tồn tại hoặc không có email" });
        }

        const html = `
      <div style="font-family:system-ui">
        <h2>Test mail từ DRAVIK STORE</h2>
        <p>Xin chào <b>${user.username || user.email}</b>, đây là email test SMTP gửi bằng userId.</p>
      </div>`;
        const info = await sendMail({
            to: user.email,
            subject: "DRAVIK STORE - Test email (by userId)",
            html,
        });

        res.json({ ok: true, to: user.email, messageId: (info && info.messageId) });
    } catch (e) {
        console.error("[sendTestMailToUser] error:", (e && e.message));
        res.status(500).json({ ok: false, message: (e && e.message) });

    }
};