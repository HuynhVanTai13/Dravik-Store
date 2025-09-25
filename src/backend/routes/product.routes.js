// routes/product.routes.js
import express from 'express';
import upload from '../middlewares/upload.js';
import {
    createProduct,
    getAllProducts,
    getProductById,
    getProductBySlug,
    updateProduct,
    updateProductStatus,
    updateVariantStatus,
    updateSizeStatus,
    deleteProduct,
    applyPurchase,
} from '../controllers/product.controller.js';

const router = express.Router();

router.get('/', getAllProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProductById);

router.post('/', upload.any(), createProduct);
router.put('/:id', upload.any(), updateProduct);
router.patch('/status/:id', updateProductStatus);
router.patch('/variant/:productId/:variantIndex', updateVariantStatus);
router.patch('/size/:productId/:variantIndex/:sizeIndex', updateSizeStatus);
router.delete('/:id', deleteProduct);

// ✅ ĐÚNG: router đã mount ở /api/products rồi
router.post('/purchase/apply', applyPurchase);
router.post('/apply-purchase', applyPurchase); // alias

export default router;