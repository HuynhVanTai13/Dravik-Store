// src/routes/user.routes.js
import express from "express";
import User from "../models/User.js";

import {
    // Auth
    register as registerUser, // alias để tương thích cả tên register & registerUser
    login as loginUser,
    loginAdmin,
    googleLogin,
    getAllUsers,
    getUsersByRole,
    updateUser,
    deleteUser,
    addAddress,
    updateAddressById,
    updateAddress, // (tuỳ chọn) cập nhật theo index
    deleteAddress,
    sendOtp,
    verifyOtp,
    resetPassword,
    testMail,
    sendTestMailToUser,
} from "../controllers/user.controller.js";

const router = express.Router();
router.get("/mail/test", testMail);
router.post("/mail/test", testMail);
router.get("/:id/mail/test", sendTestMailToUser);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleLogin);
router.post("/login-admin", loginAdmin);
router.post("/admin/login", loginAdmin);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.put("/:id/status", updateUser);
router.get("/", getAllUsers);
// GET    /api/users/role/:role
router.get("/role/:role", getUsersByRole);
// PUT    /api/users/:id
router.put("/:id", updateUser);
// DELETE /api/users/:id
router.delete("/:id", deleteUser);

/* ========= USER BY ID ========= */
// GET /api/users/:id
router.get("/:id", async(req, res) => {
    try {
        const u = await User.findById(req.params.id);
        if (!u) return res.status(404).json({ message: "User không tồn tại" });
        res.json(u);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/* ========= ADDRESSES ========= */
// GET  /api/users/:id/addresses
router.get("/:id/addresses", async(req, res) => {
    try {
        const u = await User.findById(req.params.id);
        if (!u) return res.status(404).json({ message: "User không tồn tại" });
        res.json(u.addresses || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/users/:id/addresses
router.post("/:id/addresses", addAddress);

// DELETE /api/users/:id/addresses/:addressId (xoá theo _id của subdocument)
router.delete("/:id/addresses/:addressId", deleteAddress);

// PUT  /api/users/:id/addresses/:addressId (cập nhật theo _id của subdocument)
router.put("/:id/addresses/:addressId", updateAddressById);

// (Tuỳ chọn) cập nhật theo index nếu bạn muốn dùng:
// PUT  /api/users/:id/addresses/index/:addressIdx
// router.put("/:id/addresses/index/:addressIdx", updateAddress);

/* ========= EXPORT ========= */
export default router;