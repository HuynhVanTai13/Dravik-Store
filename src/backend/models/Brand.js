// src/backend/models/Brand.js
import mongoose from 'mongoose';
import slugify from 'slugify';

const BrandSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    originalname: { type: String, required: true },
    slug: { type: String, unique: true },
});

BrandSchema.pre('save', function(next) {
    if (!this.slug || this.isModified('name')) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

BrandSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.name) {
        update.slug = slugify(update.name, { lower: true, strict: true });
        this.setUpdate(update);
    }
    next();
});

export default mongoose.models.Brand || mongoose.model('Brand', BrandSchema);