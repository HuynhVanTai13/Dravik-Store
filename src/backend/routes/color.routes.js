// src/backend/routes/color.routes.js
import express from 'express';
import {
    createColor,
    getAllColors,
    getColorById,
    updateColor,
    deleteColor,
} from '../controllers/color.controller.js';

const router = express.Router();

// CRUD Routes
router.get('/', getAllColors);
router.get('/:id', getColorById);
router.post('/', createColor);
router.put('/:id', updateColor);
router.delete('/:id', deleteColor);

export default router;