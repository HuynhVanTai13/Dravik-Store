import express from 'express';
import multer from 'multer';
import path from 'path';
import {
    createArticleCategory,
    getArticleCategories,
    updateArticleCategory,
    deleteArticleCategory,
    getArticleCategoryBySlug
} from '../controllers/articleCategory.controller.js';

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Route chính
router.post('/', upload.single('image'), createArticleCategory);
router.get('/', getArticleCategories);
router.put('/:slug', upload.single('image'), updateArticleCategory);
router.delete('/slug/:slug', deleteArticleCategory);
router.get('/slug/:slug', getArticleCategoryBySlug); // ✅ route cần thêm

export default router;