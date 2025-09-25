// src/backend/routes/category.routes.js
import express from 'express';
import multer from 'multer';
import {
    createCategory,
    deleteCategory,
    getAllCategories,
    getCategoryById,
    getCategoryBySlug,
    updateCategoryBySlug,
    reassignCategory, // ✅ thêm
} from '../controllers/category.controller.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
    filename: (_req, file, cb) =>
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')),
});
const upload = multer({ storage });

router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.get('/slug/:slug', getCategoryBySlug);
router.post('/', upload.single('image'), createCategory);
router.put('/slug/:slug', upload.single('image'), updateCategoryBySlug);

// ✅ chuyển toàn bộ sản phẩm sang danh mục khác rồi xoá
router.post('/:id/reassign', reassignCategory);

router.delete('/:id', deleteCategory);

export default router;