// src/backend/controllers/category.controller.js
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import fs from 'fs';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000';
// ==== Helpers (SAFE, không dùng optional chaining) ====
const safeErr = (e) => {
    if (e && typeof e === 'object' && typeof e.message === 'string') return e.message;
    try { return JSON.stringify(e); } catch { return String(e); }
};
const pickModified = (r) => {
    if (!r) return 0;
    if (typeof r.modifiedCount === 'number') return r.modifiedCount; // Mongoose 6/7
    if (typeof r.nModified === 'number') return r.nModified; // Mongoose 5
    if (typeof r.matchedCount === 'number') return r.matchedCount; // fallback
    return 0;
};
const isTxnUnsupported = (err) => {
    let msg = '';
    if (err && typeof err === 'object' && typeof err.message === 'string') msg = err.message;
    return /Transaction numbers are only allowed on a replica set member|Transaction.*not allowed/i.test(msg);
};


/* ================== GIỮ NGUYÊN LOGIC CŨ ================== */
export const getAllCategories = async(req, res) => {
    try {
        const pageRaw = req.query.page;
        const limitRaw = req.query.limit;
        const search = req.query.search || '';

        const isAll = String(limitRaw).toLowerCase() === 'all';
        const page = Math.max(1, parseInt(pageRaw, 10) || 1);
        const limitNum = isAll ? null : Math.max(1, parseInt(limitRaw, 10) || 10);
        const skip = isAll ? 0 : (page - 1) * limitNum;

        const query = search ? { name: { $regex: search.trim(), $options: 'i' } } : {};
        const total = await Category.countDocuments(query);

        let cursor = Category.find(query).sort({ createdAt: -1 });
        if (!isAll) cursor = cursor.skip(skip).limit(limitNum);

        const categories = await cursor;

        res.json({
            categories: categories.map((cat) => ({
                ...cat.toObject(),
                image: /^https?:\/\//i.test(cat.image) ? cat.image : (BASE_URL + cat.image),
            })),
            totalItems: total,
            currentPage: isAll ? 1 : page,
            totalPages: isAll ? 1 : Math.ceil(total / limitNum),
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh mục', detail: safeErr(err) });
    }
};

export const getCategoryById = async(req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        res.json({...category.toObject(), image: BASE_URL + category.image });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi', detail: safeErr(err) });
    }
};

export const getCategoryBySlug = async(req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug });
        if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        res.json({...category.toObject(), image: BASE_URL + category.image });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi', detail: safeErr(err) });
    }
};

export const createCategory = async(req, res) => {
    try {
        const { name } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ message: 'Vui lòng chọn hình ảnh' });

        const existingName = await Category.findOne({ name });
        if (existingName) return res.status(400).json({ message: 'Tên danh mục đã tồn tại' });

        const existingImage = await Category.findOne({ originalname: file.originalname });
        if (existingImage) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ message: 'Ảnh đã tồn tại, vui lòng chọn ảnh khác' });
        }

        const category = new Category({
            name,
            image: `/uploads/${file.filename}`,
            originalname: file.originalname,
        });

        await category.save();
        res.status(201).json({ message: 'Thêm danh mục thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Thêm thất bại', detail: safeErr(err) });
    }
};

export const updateCategoryBySlug = async(req, res) => {
    try {
        const { name } = req.body;
        const file = req.file;

        const current = await Category.findOne({ slug: req.params.slug });
        if (!current) return res.status(404).json({ message: 'Danh mục không tồn tại' });

        const nameExists = await Category.findOne({ name });
        if (nameExists && String(nameExists._id) !== String(current._id)) {
            return res.status(400).json({ message: 'Tên danh mục đã tồn tại' });
        }

        if (file) {
            const imageExists = await Category.findOne({ originalname: file.originalname });
            if (imageExists && String(imageExists._id) !== String(current._id)) {
                fs.unlinkSync(file.path);
                return res.status(400).json({ message: 'Ảnh đã tồn tại, vui lòng chọn ảnh khác' });
            }

            current.image = `/uploads/${file.filename}`;
            current.originalname = file.originalname;
        }

        current.name = name;
        await current.save();

        res.json({ message: 'Cập nhật thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Cập nhật thất bại', detail: safeErr(err) });
    }
};

/* ================== XOÁ: CHẶN KHI CÒN SẢN PHẨM ================== */
export const deleteCategory = async(req, res) => {
    try {
        const { id } = req.params;

        const count = await Product.countDocuments({ category: id });
        if (count > 0) {
            return res.status(409).json({
                error: 'CATEGORY_IN_USE',
                message: `Danh mục đang có ${count} sản phẩm, vui lòng xử lý trước.`,
                count,
            });
        }

        await Category.findByIdAndDelete(id);
        res.json({ message: 'Xoá thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Xoá thất bại', detail: safeErr(err) });
    }
};


// ====== HÀM CẦN THAY ======
export const reassignCategory = async(req, res) => {
    const session = await mongoose.startSession();
    try {
        const { id } = req.params;
        const { targetCategoryId } = req.body;

        if (!targetCategoryId) {
            return res.status(400).json({ message: 'Thiếu targetCategoryId' });
        }
        if (id === targetCategoryId) {
            return res.status(400).json({ message: 'Danh mục đích phải khác danh mục nguồn' });
        }

        const [source, target] = await Promise.all([
            Category.findById(id),
            Category.findById(targetCategoryId),
        ]);
        if (!source) return res.status(404).json({ message: 'Không tìm thấy danh mục nguồn' });
        if (!target) return res.status(404).json({ message: 'Không tìm thấy danh mục đích' });

        let moved = 0;

        // Thử chạy bằng TRANSACTION trước
        try {
            await session.withTransaction(async() => {
                const result = await Product.updateMany({ category: id }, { $set: { category: target._id } }, { session });
                moved = pickModified(result);
                await Category.findByIdAndDelete(id, { session });
            });

            return res.json({
                message: 'Đã chuyển sản phẩm sang danh mục mới và xoá danh mục cũ.',
                moved,
                mode: 'transaction',
            });
        } catch (txErr) {
            // Nếu không hỗ trợ transaction -> fallback
            if (!isTxnUnsupported(txErr)) throw txErr;

            const result = await Product.updateMany({ category: id }, { $set: { category: target._id } });
            moved = pickModified(result);
            await Category.findByIdAndDelete(id);

            return res.json({
                message: 'Đã chuyển sản phẩm sang danh mục mới và xoá danh mục cũ.',
                moved,
                mode: 'fallback_no_txn',
            });
        }
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi máy chủ', detail: safeErr(err) });
    } finally {
        try { await session.endSession(); } catch {}
    }
};