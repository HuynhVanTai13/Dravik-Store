// src/backend/controllers/brand.controller.js
import Brand from '../models/Brand.js';
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
export const getAllBrands = async(req, res) => {
    try {
        const pageRaw = req.query.page;
        const limitRaw = req.query.limit;
        const search = req.query.search || '';

        const isAll = String(limitRaw).toLowerCase() === 'all';
        const page = Math.max(1, parseInt(pageRaw, 10) || 1);
        const limitNum = isAll ? null : Math.max(1, parseInt(limitRaw, 10) || 10);
        const skip = isAll ? 0 : (page - 1) * limitNum;

        const query = search ? { name: { $regex: search.trim(), $options: 'i' } } : {};
        const total = await Brand.countDocuments(query);

        let cursor = Brand.find(query).sort({ createdAt: -1 });
        if (!isAll) cursor = cursor.skip(skip).limit(limitNum);

        const brands = await cursor;

        res.json({
            brands: brands.map((b) => ({
                ...b.toObject(),
                image: /^https?:\/\//i.test(b.image) ? b.image : (BASE_URL + b.image),
            })),
            totalItems: total,
            currentPage: isAll ? 1 : page,
            totalPages: isAll ? 1 : Math.ceil(total / limitNum),
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh sách', detail: safeErr(err) });
    }
};

export const getBrandById = async(req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) return res.status(404).json({ message: 'Không tìm thấy thương hiệu' });
        res.json({...brand.toObject(), image: BASE_URL + brand.image });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi', detail: safeErr(err) });
    }
};

export const getBrandBySlug = async(req, res) => {
    try {
        const brand = await Brand.findOne({ slug: req.params.slug });
        if (!brand) return res.status(404).json({ message: 'Không tìm thấy thương hiệu' });
        res.json({...brand.toObject(), image: BASE_URL + brand.image });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi', detail: safeErr(err) });
    }
};

export const createBrand = async(req, res) => {
    try {
        const { name } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ message: 'Vui lòng chọn hình ảnh' });

        const existingName = await Brand.findOne({ name });
        if (existingName) return res.status(400).json({ message: 'Tên thương hiệu đã tồn tại' });

        const existingImage = await Brand.findOne({ originalname: file.originalname });
        if (existingImage) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ message: 'Ảnh đã tồn tại, vui lòng chọn ảnh khác' });
        }

        const brand = new Brand({
            name,
            image: `/uploads/${file.filename}`,
            originalname: file.originalname,
        });

        await brand.save();
        res.status(201).json({ message: 'Thêm thương hiệu thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Thêm thất bại', detail: safeErr(err) });
    }
};

export const updateBrandBySlug = async(req, res) => {
    try {
        const { name } = req.body;
        const file = req.file;

        const current = await Brand.findOne({ slug: req.params.slug });
        if (!current) return res.status(404).json({ message: 'Thương hiệu không tồn tại' });

        const nameExists = await Brand.findOne({ name });
        if (nameExists && String(nameExists._id) !== String(current._id)) {
            return res.status(400).json({ message: 'Tên thương hiệu đã tồn tại' });
        }

        if (file) {
            const imageExists = await Brand.findOne({ originalname: file.originalname });
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
export const deleteBrand = async(req, res) => {
    try {
        const { id } = req.params;

        const count = await Product.countDocuments({ brand: id });
        if (count > 0) {
            return res.status(409).json({
                error: 'BRAND_IN_USE',
                message: `Thương hiệu đang có ${count} sản phẩm, vui lòng xử lý trước.`,
                count,
            });
        }

        await Brand.findByIdAndDelete(id);
        res.json({ message: 'Xoá thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Xoá thất bại', detail: safeErr(err) });
    }
};

/* ================== REASSIGN RỒI XOÁ (TRANSACTION) ================== */
// POST /brands/:id/reassign   Body: { targetBrandId }
// dùng lại helper safeErr, pickModified, txnUnsupported như trên

export const reassignBrand = async(req, res) => {
    const session = await mongoose.startSession();
    try {
        const { id } = req.params;
        const { targetBrandId } = req.body;

        if (!targetBrandId) {
            return res.status(400).json({ message: 'Thiếu targetBrandId' });
        }
        if (id === targetBrandId) {
            return res.status(400).json({ message: 'Thương hiệu đích phải khác thương hiệu nguồn' });
        }

        const [source, target] = await Promise.all([
            Brand.findById(id),
            Brand.findById(targetBrandId),
        ]);
        if (!source) return res.status(404).json({ message: 'Không tìm thấy thương hiệu nguồn' });
        if (!target) return res.status(404).json({ message: 'Không tìm thấy thương hiệu đích' });

        let moved = 0;

        // Thử chạy TRANSACTION
        try {
            await session.withTransaction(async() => {
                const result = await Product.updateMany({ brand: id }, { $set: { brand: target._id } }, { session });
                moved = pickModified(result);
                await Brand.findByIdAndDelete(id, { session });
            });

            return res.json({
                message: 'Đã chuyển sản phẩm sang thương hiệu mới và xoá thương hiệu cũ.',
                moved,
                mode: 'transaction',
            });
        } catch (txErr) {
            // Fallback khi Mongo không hỗ trợ transaction
            if (!isTxnUnsupported(txErr)) throw txErr;

            const result = await Product.updateMany({ brand: id }, { $set: { brand: target._id } });
            moved = pickModified(result);
            await Brand.findByIdAndDelete(id);

            return res.json({
                message: 'Đã chuyển sản phẩm sang thương hiệu mới và xoá thương hiệu cũ.',
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