import express from "express";
import {
  getCartByUserId,
  addToCart,
  updateQuantity,
  removeItemFromCart,
  removeSelectedItems,  // xoá nhiều dòng đã chọn
  clearCart,
} from "../controllers/cart.controller.js";

const router = express.Router();

router.get("/:userId", getCartByUserId);
router.post("/add", addToCart);
router.put("/update-qty", updateQuantity);
router.put("/remove-item", removeItemFromCart);
router.put("/remove-selected", removeSelectedItems); // bulk remove sau khi đặt hàng
router.put("/clear", clearCart);


export default router;
