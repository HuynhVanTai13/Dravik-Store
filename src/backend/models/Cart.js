import mongoose from "mongoose";
const Schema = mongoose.Schema;

const cartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  sizeId: { type: Schema.Types.ObjectId, ref: "Size", required: true },
  sizeName: String,     // ✅ tên size
  colorId: { type: Schema.Types.ObjectId, ref: "Color", required: true },
  colorName: String,    // ✅ tên màu
  name: String,
  image: String,
  price: Number,
  oldPrice: Number,
  quantity: Number,
});

const cartSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [cartItemSchema],
    voucher: {
      type: Object,
      default: {},
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model("Cart", cartSchema);
