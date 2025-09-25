import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true, index: true },
    userName:  { type: String, required: true },
    rating:    { type: Number, min: 1, max: 5, required: true, index: true },
    content:   { type: String, default: "" },
    images:    [{ type: String }],
  },
  { timestamps: true }
);

// đã có index productId + createdAt; bổ sung index hỗn hợp phục vụ sort / filter
CommentSchema.index({ createdAt: -1, rating: -1 });

export default mongoose.model("Comment", CommentSchema);
