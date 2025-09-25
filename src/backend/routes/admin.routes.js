import express from "express";
import {
    register,
    login,
    getAllUsers,
    updateUserStatus,
} from "../controllers/admin.controller.js";
import { protect, isAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// ✅ Admin
router.get("/", protect, isAdmin, getAllUsers);
router.put("/:id/status", protect, isAdmin, updateUserStatus); // ✅ đổi trạng thái

export default router;