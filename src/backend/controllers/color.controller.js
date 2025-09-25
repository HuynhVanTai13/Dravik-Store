// src/backend/controllers/color.controller.js
import Color from '../models/Color.js';

export const getAllColors = async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        const query = search ?
            { name: { $regex: search.trim(), $options: 'i' } } :
            {};

        const total = await Color.countDocuments(query);

        const colors = await Color.find(query)
            .sort({ _id: -1 })
            .skip(limit === 0 ? 0 : (page - 1) * limit)
            .limit(limit === 0 ? 0 : limit); // limit=0 → không giới hạn

        res.json({
            colors,
            totalItems: total,
            currentPage: page,
            totalPages: limit === 0 ? 1 : Math.ceil(total / limit),
        });
    } catch (err) {
        console.error('[getAllColors] Error:', err);
        res.status(500).json({ message: 'Failed to fetch colors' });
    }
};


export const getColorById = async(req, res) => {
    try {
        const color = await Color.findById(req.params.id);
        if (!color) return res.status(404).json({ message: 'Color not found' });
        res.json(color);
    } catch {
        res.status(500).json({ message: 'Failed to fetch color' });
    }
};

export const createColor = async(req, res) => {
    try {
        const { name } = req.body;
        const existingColor = await Color.findOne({ name });
        if (existingColor) return res.status(400).json({ message: 'Color already exists' });

        const newColor = new Color({ name });
        await newColor.save();
        res.status(201).json({ message: 'Color created successfully' });
    } catch {
        res.status(500).json({ message: 'Failed to create color' });
    }
};

export const updateColor = async(req, res) => {
    try {
        const { name } = req.body;
        const color = await Color.findById(req.params.id);
        if (!color) return res.status(404).json({ message: 'Color not found' });

        const nameExists = await Color.findOne({ name });
        if (nameExists && nameExists._id.toString() !== color._id.toString()) {
            return res.status(400).json({ message: 'Color name already exists' });
        }

        color.name = name;
        await color.save();

        res.json({ message: 'Color updated successfully' });
    } catch {
        res.status(500).json({ message: 'Failed to update color' });
    }
};

export const deleteColor = async(req, res) => {
    try {
        await Color.findByIdAndDelete(req.params.id);
        res.json({ message: 'Color deleted successfully' });
    } catch {
        res.status(500).json({ message: 'Failed to delete color' });
    }
};