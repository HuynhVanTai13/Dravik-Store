// src/backend/controllers/size.controller.js
import Size from '../models/Size.js';

export const getAllSizes = async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        const query = search ?
            { name: { $regex: search.trim(), $options: 'i' } } :
            {};

        const total = await Size.countDocuments(query);

        const sizes = await Size.find(query)
            .sort({ _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            sizes,
            totalItems: total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error('[getAllSizes] Error:', err);
        res.status(500).json({ message: 'Failed to fetch sizes' });
    }
};


export const getSizeById = async(req, res) => {
    try {
        const size = await Size.findById(req.params.id);
        if (!size) return res.status(404).json({ message: 'Size not found' });
        res.json(size);
    } catch {
        res.status(500).json({ message: 'Failed to fetch size' });
    }
};

const isValidRange = (val) => /^\d{1,3}(\s*-\s*\d{1,3})?$/.test(val.trim());

export const createSize = async(req, res) => {
    try {
        const { name, height, weight } = req.body;

        if (!isValidRange(height) || !isValidRange(weight)) {
            return res.status(400).json({ message: 'Chiều cao và cân nặng phải hợp lệ: ví dụ 160 hoặc 160 - 170' });
        }

        const exist = await Size.findOne({ name });
        if (exist) return res.status(400).json({ message: 'Size đã tồn tại' });

        const size = await Size.create({ name, height, weight });
        res.status(201).json({ message: 'Thêm size thành công', size });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

export const updateSize = async(req, res) => {
    try {
        const { name, height, weight } = req.body;

        if (!isValidRange(height) || !isValidRange(weight)) {
            return res.status(400).json({ message: 'Chiều cao và cân nặng phải hợp lệ: ví dụ 160 hoặc 160 - 170' });
        }

        const size = await Size.findById(req.params.id);
        if (!size) return res.status(404).json({ message: 'Size not found' });

        const nameExists = await Size.findOne({ name });
        if (nameExists && nameExists._id.toString() !== size._id.toString()) {
            return res.status(400).json({ message: 'Size name already exists' });
        }

        size.name = name;
        size.height = height;
        size.weight = weight;
        await size.save();

        res.json({ message: 'Size updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update size', error: err.message });
    }
};


export const deleteSize = async(req, res) => {
    try {
        await Size.findByIdAndDelete(req.params.id);
        res.json({ message: 'Size deleted successfully' });
    } catch {
        res.status(500).json({ message: 'Failed to delete size' });
    }
};