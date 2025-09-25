// src/backend/models/Size.js
import mongoose from 'mongoose';
import slugify from 'slugify';

const SizeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    height: { type: String, required: true }, // Đổi từ length
    weight: { type: String, required: true }, // Đổi từ width
    slug: { type: String, unique: true },
});

SizeSchema.pre('save', function(next) {
    if (!this.slug || this.isModified('name')) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

SizeSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.name) {
        update.slug = slugify(update.name, { lower: true, strict: true });
        this.setUpdate(update);
    }
    next();
});

export default mongoose.models.Size || mongoose.model('Size', SizeSchema);