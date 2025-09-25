import mongoose from 'mongoose';
import slugify from 'slugify';

const articleCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên danh mục là bắt buộc'],
        unique: true,
        trim: true,
    },
    image: {
        type: String,
        required: [true, 'Ảnh là bắt buộc'],
    },
    slug: {
        type: String,
        unique: true,
    },
}, { timestamps: true });

articleCategorySchema.pre('validate', function(next) {
    if (this.name) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

export default mongoose.model('ArticleCategory', articleCategorySchema);