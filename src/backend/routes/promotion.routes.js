import { Router } from 'express';
import {
  listPromotions,
  createPromotion,
  getPromotionByCode,
  updatePromotionByCode,
  togglePromotionByCode,
  removePromotionByCode,
  validateVoucher,
  redeemVoucher,
  listForUser,             // NEW
} from '../controllers/promotion.controller.js';

const router = Router();

router.get('/', listPromotions);
router.get('/for-user', listForUser);         // NEW

router.get('/code/:code', getPromotionByCode);
router.post('/', createPromotion);
router.put('/code/:code', updatePromotionByCode);
router.patch('/code/:code/toggle', togglePromotionByCode);
router.delete('/code/:code', removePromotionByCode);

router.post('/validate', validateVoucher);
router.post('/redeem', redeemVoucher);

export default router;
