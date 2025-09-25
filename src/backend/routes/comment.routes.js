import express from "express";
import { makeUploader } from "../middlewares/upload.js";
import { listAll, listByProduct, create, remove } from "../controllers/comment.controller.js";

const router = express.Router();

/** NEW: liệt kê TẤT CẢ bình luận (phân trang + lọc + sort + search) */
router.get("/", listAll);

/** CŨ: theo sản phẩm (giữ lại nếu FE nơi khác đang dùng) */
router.get("/product/:productId", listByProduct);

/** Tạo comment + upload ảnh (tối đa 4) */
const uploadComment = makeUploader("comments");
router.post("/", uploadComment.array("images", 4), create);

/** Xóa comment theo id */
router.delete("/:id", remove);

export default router;
