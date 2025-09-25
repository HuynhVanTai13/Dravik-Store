import express from 'express';
import { getDealSetting, updateDealSetting } from '../controllers/deal.controller.js';

const router = express.Router();

router.get('/', getDealSetting);
router.put('/', updateDealSetting);

export default router;