// src/backend/routes/brand.routes.js
import express from 'express';
import multer from 'multer';
import {
    createBrand,
    deleteBrand,
    getAllBrands,
    getBrandById,
    getBrandBySlug,
    updateBrandBySlug,
    reassignBrand, // ✅ thêm
} from '../controllers/brand.controller.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) =>
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')),
});
const upload = multer({ storage });

router.get('/', getAllBrands);
router.get('/:id', getBrandById);
router.get('/slug/:slug', getBrandBySlug);
router.post('/', upload.single('image'), createBrand);
router.put('/slug/:slug', upload.single('image'), updateBrandBySlug);

// ✅ chuyển toàn bộ sản phẩm sang thương hiệu khác rồi xoá
router.post('/:id/reassign', reassignBrand);

router.delete('/:id', deleteBrand);

export default router;