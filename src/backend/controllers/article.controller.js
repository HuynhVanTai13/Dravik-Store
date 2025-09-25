import Article from '../models/Article.js';
import fs from 'fs';
import slugify from 'slugify';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000';

// GET /?page=&limit=&search=&isFeatured=&isMostViewed=&isHotEvent=&isStoreNew=&isNewPosts=&categorySlug=&sort=&order=
export const getAllArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sort = req.query.sort || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;

    // Build query object
    let query = {};

    // Text search
    if (search) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    // Flag filters - đồng bộ với frontend
    if (req.query.isFeatured === 'true') query.isFeatured = true;
    if (req.query.isMostViewed === 'true') query.isMostViewed = true;
    if (req.query.isHotEvent === 'true') query.isHotEvent = true;
    if (req.query.isStoreNew === 'true') query.isStoreNew = true;
    if (req.query.isNewPosts === 'true') query.isNewPosts = true;

    // Category filter by slug
    if (req.query.categorySlug) {
      // First find the category by slug
      const ArticleCategory = mongoose.model('ArticleCategory');
      const category = await ArticleCategory.findOne({ slug: req.query.categorySlug });
      if (category) {
        query.category = category._id;
      }
    }

    // Category filter by ID
    if (req.query.categoryId) {
      query.category = req.query.categoryId;
    }

    // Published filter
    if (req.query.published !== undefined) {
      query.published = req.query.published === 'true';
    }

    const total = await Article.countDocuments(query);
    
    // Build sort object
    let sortObj = {};
    sortObj[sort] = order;

    const articles = await Article.find(query)
      .populate('category')
      .populate('author')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ total, page, limit, data: articles });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// GET /:id
// ...existing code...
export const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    let article;

    if (mongoose.Types.ObjectId.isValid(id)) {
      article = await Article.findById(id).populate('category').populate('author');
    } else {
      article = await Article.findOne({ slug: id }).populate('category').populate('author');
    }

    if (!article) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    // Nếu không có ?noView=true thì mới tăng view
    if (req.query.noView !== 'true') {
      article.views = (article.views || 0) + 1;
      await article.save();
    }

    res.json(article);
  } catch (error) {
    console.error('Get article by ID error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
// ...existing code...
// POST /
export const createArticle = async (req, res) => {
  try {
    const {
      title,
      summary,
      content,
      categoryId,
      category,
      published,
      author,
      isFeatured,
      isMostViewed,
      isHotEvent,
      isStoreNew,
      isNewPosts
    } = req.body;

    if (!title) return res.status(400).json({ message: 'Thiếu title' });

    let image = '';
    let originalname = '';
    if (req.file && req.file.path) {
      image = req.file.path.replace(/\\/g, '/');
      originalname = req.file.originalname;
    }

    const categoryValue = categoryId || category || null;

    const article = new Article({
      title,
      summary,
      content,
      image,
      originalname,
      category: categoryValue,
      author: author || null,
      published: published === 'true' || published === true,
      views: 0,
      
      // Các flag hiển thị - đồng bộ với dropdown frontend
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isMostViewed: isMostViewed === 'true' || isMostViewed === true,
      isHotEvent: isHotEvent === 'true' || isHotEvent === true,
      isStoreNew: isStoreNew === 'true' || isStoreNew === true,
      isNewPosts: isNewPosts === 'true' || isNewPosts === true
    });

    await article.save();

    const populatedArticle = await Article.findById(article._id)
      .populate('category')
      .populate('author');

    res.status(201).json(populatedArticle);
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// PUT /:id
export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      summary,
      content,
      categoryId,
      category,
      published,
      isFeatured,
      isMostViewed,
      isHotEvent,
      isStoreNew,
      isNewPosts
    } = req.body;

    const article = await Article.findById(id);
    if (!article) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    // Handle image upload
    if (req.file && req.file.path) {
      if (article.image && fs.existsSync(article.image)) {
        try {
          fs.unlinkSync(article.image);
        } catch (e) {
          // ignore
        }
      }
      article.image = req.file.path.replace(/\\/g, '/');
      article.originalname = req.file.originalname;
    }

    // Update fields
    if (title) {
      article.title = title;
      article.slug = slugify(title, { lower: true, strict: true });
    }

    if (typeof summary !== 'undefined') article.summary = summary;
    if (typeof content !== 'undefined') article.content = content;

    const categoryValue = categoryId || category;
    if (categoryValue) article.category = categoryValue;

    article.published = published === 'true' || published === true;
    
    // Update all flags - đồng bộ với dropdown frontend
    article.isFeatured = isFeatured === 'true' || isFeatured === true;
    article.isMostViewed = isMostViewed === 'true' || isMostViewed === true;
    article.isHotEvent = isHotEvent === 'true' || isHotEvent === true;
    article.isStoreNew = isStoreNew === 'true' || isStoreNew === true;
    article.isNewPosts = isNewPosts === 'true' || isNewPosts === true;

    await article.save();

    const populatedArticle = await Article.findById(article._id)
      .populate('category')
      .populate('author');

    res.json(populatedArticle);
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// PATCH /:id/status
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { published } = req.body;

    const article = await Article.findByIdAndUpdate(
      id,
      { published: published === 'true' || published === true },
      { new: true }
    ).populate('category').populate('author');

    if (!article) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    
    res.json({ message: 'Cập nhật trạng thái thành công', data: article });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// DELETE /:id
export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findByIdAndDelete(id);
    if (!article) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    // Delete associated image file
    if (article.image && fs.existsSync(article.image)) {
      try {
        fs.unlinkSync(article.image);
      } catch (e) {
        // ignore
      }
    }

    res.json({ message: 'Xoá thành công' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};