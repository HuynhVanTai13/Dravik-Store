import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: String,
  image: String,
  price: Number,
  quantity: Number,
  sizeId: String,
  colorId: String,
  sizeName: String,
  colorName: String,
});

const AddressSchema = new mongoose.Schema({
  receiver: String,
  phone: String,
  address: String,
});

const EmailFlagsSchema = new mongoose.Schema(
  {
    confirmationSent: { type: Boolean, default: false },
    paidSent: { type: Boolean, default: false },
  },
  { _id: false }
);

// ✅ Thêm schema lưu thông tin huỷ
const CancellationSchema = new mongoose.Schema(
  {
    reasonCode: { type: String, default: "other" }, // ví dụ: change_mind, wrong_item...
    reasonText: { type: String, default: "" },      // người dùng nhập
    cancelledAt: { type: Date },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    orderCode: { type: String }, // DHYYYYMMDDHHmmss

    items: [OrderItemSchema],
    address: AddressSchema,

    shippingFee: { type: Number, default: 0 },
    total: Number,

    voucher: Object,
    note: String,

    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    paymentType: String,

    paymentStatus: { type: String, enum: ["unpaid", "paid", "failed"], default: "unpaid" },
    vnpTxnRef: { type: String },

    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipping", "completed", "cancelled"],
      default: "pending",
    },

    paymentMeta: { type: Object },

    emailFlags: { type: EmailFlagsSchema, default: () => ({}) },

    // ✅ Trường mới
    cancellation: { type: CancellationSchema, default: undefined },
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
