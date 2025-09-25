import ArticleCategory from '../models/ArticleCategory.js';
import fs from 'fs';
import slugify from 'slugify';

// Thêm danh mục bài viết
export const createArticleCategory = async(req, res) => {
    try {
        const { name } = req.body;

        let image = '';
        if (req.file && req.file.path) {
            image = req.file.path.replace(/\\/g, '/');
        }

        if (!name || !image) {
            return res.status(400).json({ message: 'Vui lòng nhập tên và chọn ảnh' });
        }

        const existing = await ArticleCategory.findOne({ name });
        if (existing) {
            return res.status(400).json({ message: 'Tên danh mục đã tồn tại' });
        }

        const slug = slugify(name, { lower: true, strict: true });
        const newCategory = new ArticleCategory({ name, slug, image });
        await newCategory.save();

        res.status(201).json({ message: 'Tạo thành công', category: newCategory });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
};

// Lấy danh sách có phân trang và tìm kiếm
export const getArticleCategories = async(req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const query = search ? { name: { $regex: search, $options: 'i' } } : {};

        const categories = await ArticleCategory.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await ArticleCategory.countDocuments(query);

        res.json({ categories, total });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
};

// Cập nhật danh mục theo ID hoặc Slug
export const updateArticleCategory = async(req, res) => {
    try {
        const { id, slug } = req.params;
        const { name } = req.body;

        let image = '';
        if (req.file && req.file.path) {
            image = req.file.path.replace(/\\/g, '/');
        }

        const query = id ? { _id: id } : { slug };

        const existing = await ArticleCategory.findOne({
            name,
            ...(id ? { _id: { $ne: id } } : { slug: { $ne: slug } })
        });

        if (existing) {
            return res.status(400).json({ message: 'Tên danh mục đã tồn tại' });
        }

        const updated = await ArticleCategory.findOneAndUpdate(
            query, {
                name,
                ...(image && { image }),
                slug: slugify(name, { lower: true, strict: true }),
            }, { new: true }
        );

        if (!updated) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        res.json({ message: 'Cập nhật thành công', category: updated });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
};

// GET theo slug
export const getArticleCategoryBySlug = async(req, res) => {
    try {
        const { slug } = req.params;
        const category = await ArticleCategory.findOne({ slug });
        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy danh mục theo slug' });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
};

// Xoá danh mục
export const deleteArticleCategory = async(req, res) => {
    try {
        const { id, slug } = req.params;
        const query = id ? { _id: id } : { slug };

        const category = await ArticleCategory.findOneAndDelete(query);
        if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });

        if (category.image && fs.existsSync(category.image)) {
            fs.unlinkSync(category.image);
        }

        res.json({ message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
};