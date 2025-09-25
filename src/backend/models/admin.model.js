import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String },
    // 1: admin, 0: user thường (mặc định cứ tạo admin thì set 1)
    role: { type: Number, default: 1 },
}, { timestamps: true });

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;