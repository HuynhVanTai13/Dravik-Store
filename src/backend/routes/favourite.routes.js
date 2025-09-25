import express from "express";
import {
  getUserFavourites,
  addFavourite,
  deleteFavourite,
} from "../controllers/favourite.controller.js";

const router = express.Router();

// GET /api/favourites/:userId - Lấy danh sách yêu thích
router.get("/:userId", getUserFavourites);

// POST /api/favourites - Thêm vào yêu thích
router.post("/", addFavourite);

// DELETE /api/favourites/:userId/:productId - Xoá khỏi yêu thích
router.delete("/:userId/:productId", deleteFavourite);

export default router;
