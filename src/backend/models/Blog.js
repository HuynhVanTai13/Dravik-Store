import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // ví dụ: "top-5-set-do-nen-mua-2025"
  posted_date: { type: Date, default: Date.now },
  image_url: String,
  content: String,
  view: { type: Number, default: 0 },
  desc: String,
  users_id: { type: mongoose.Types.ObjectId, ref: 'User' },
});

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;
