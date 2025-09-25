import express from 'express';
import Blog from '../models/Blog.js';

const router = express.Router();

// Lấy tất cả blog
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find({}).sort({ posted_date: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy chi tiết blog theo slug
router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
