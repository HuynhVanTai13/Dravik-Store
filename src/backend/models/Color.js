// src/backend/models/Color.js
import mongoose from 'mongoose';
import slugify from 'slugify';

const ColorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, unique: true },
});

ColorSchema.pre('save', function(next) {
    if (!this.slug || this.isModified('name')) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

ColorSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.name) {
        update.slug = slugify(update.name, { lower: true, strict: true });
        this.setUpdate(update);
    }
    next();
});

export default mongoose.models.Color || mongoose.model('Color', ColorSchema);