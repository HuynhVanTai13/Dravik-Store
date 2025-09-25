import express from 'express';
import uploadArticle from '../middlewares/uploadArticle.js';
import {
  createArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  updateStatus
} from '../controllers/article.controller.js';

const router = express.Router();

router.get('/', getAllArticles);
router.get('/:id', getArticleById);
router.post('/', uploadArticle.single('image'), createArticle);
router.put('/:id', uploadArticle.single('image'), updateArticle);
router.patch('/:id/status', updateStatus);
router.delete('/:id', deleteArticle);


export default router;
