import express from "express";
import {
    createOrder,
    getOrdersByUserId,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
    cancelOrder, // ✅ mới
    reorderOrder,
    updateOrderAddress, // ✅ mới
} from "../controllers/order.controller.js";

const router = express.Router();

router.post("/", createOrder);
router.get("/", getAllOrders);
router.get("/user/:userId", getOrdersByUserId);
router.get("/:id", getOrderById);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/address", updateOrderAddress);
router.patch("/:id/cancel", cancelOrder);
router.post("/:id/reorder", reorderOrder);
router.delete("/:id", deleteOrder);

export default router;