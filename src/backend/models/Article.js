import mongoose from 'mongoose';
import slugify from 'slugify';

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  summary: { type: String, default: '' },
  content: { type: String, default: '' }, // HTML hoặc text
  image: { type: String, default: '' }, // path tới file
  originalname: { type: String, default: '' }, // tên file gốc
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ArticleCategory', default: null },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  published: { type: Boolean, default: false },
  views: { type: Number, default: 0 }, // Số lượt xem
  
  // Các flag hiển thị - đồng bộ với dropdown frontend
  isFeatured: { type: Boolean, default: false },     // Bài viết nổi bật
  isMostViewed: { type: Boolean, default: false },   // Xem nhiều nhất
  isHotEvent: { type: Boolean, default: false },     // Sự kiện hot
  isStoreNew: { type: Boolean, default: false },     // Dravik Store Có Gì Mới
  isNewPosts: { type: Boolean, default: false }      // Các bài viết mới
}, {
  timestamps: true
});

// Tự động tạo slug từ title nếu chưa có
articleSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const Article = mongoose.model('Article', articleSchema);
export default Article;