import mongoose from 'mongoose';
import slugify from 'slugify';

// ===== Schema cho từng size trong biến thể màu =====
const variantSizeSchema = new mongoose.Schema(
  {
    size: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Size',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    sold: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

// ===== Schema cho từng màu (kèm ảnh) =====
const variantColorSchema = new mongoose.Schema(
  {
    color: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Color',
      required: true,
    },
    image: {
      type: String,
      required: true, // ảnh đại diện cho màu
    },
    sizes: [variantSizeSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

// ===== Product =====
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },

    // Ảnh mức sản phẩm (tuỳ chọn — không ảnh hưởng DB cũ nếu chưa có)
    mainImage: { type: String },
    images: [{ type: String }],

    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    discount: { type: Number, default: 0, min: 0 },

    // Mô tả HTML
    description: { type: String, required: true },

    // Liên kết
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
    },

    // Biến thể
    variants: [variantColorSchema],

    // Trạng thái
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Tạo slug tự động
productSchema.pre('save', function (next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

productSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update?.name) {
    update.slug = slugify(update.name, { lower: true, strict: true });
    this.setUpdate(update);
  }
  next();
});

const Product =
  mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
