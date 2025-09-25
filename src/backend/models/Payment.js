import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    method_name: { type: String, required: true }, // "COD", "VNPay", ...
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    meta: { type: Object }, // dữ liệu mở rộng cho cổng thanh toán nếu cần
  },
  { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);
