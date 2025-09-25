import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/** Địa chỉ giao hàng (subdocument) */
const AddressSchema = new mongoose.Schema({
    receiver: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
});

/** User */
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, trim: true },

    // Email duy nhất, luôn lưu lowercase
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },

    // Mật khẩu có thể không bắt buộc (khi đăng nhập Google)
    // select:false để không trả về trong query mặc định
    password: { type: String, required: false, select: false },

    phone_number: { type: String, default: "" },

    // Quyền: 0 user, 1 admin, 2 owner (tùy backend bạn đang dùng)
    role: { type: Number, default: 0 },

    // Social / Google login
    provider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, default: "" },
    avatar: { type: String, default: "" },
    emailVerified: { type: Boolean, default: false },

    // Địa chỉ giao hàng
    addresses: [AddressSchema],

    // Thời điểm tạo (giữ nguyên key theo code cũ)
    created_at: { type: Date, default: Date.now },
    status: { type: String, enum: ["active", "blocked"], default: "active" },
}, { collection: "users" });

// Tạo index unique cho email (phòng khi chưa build)
userSchema.index({ email: 1 }, { unique: true });

/** Hash mật khẩu trước khi lưu (nếu có và thay đổi) */
userSchema.pre("save", async function(next) {
    if (!this.isModified("password") || !this.password) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

/** So sánh mật khẩu khi đăng nhập local */
userSchema.methods.comparePassword = async function(candidatePassword) {
    // Nếu tài khoản Google không có mật khẩu local
    if (!this.password || !candidatePassword) return false;

    // this.password có thể không được select nếu query mặc định
    // => đảm bảo model đã select('+password') khi gọi tới method này.
    return bcrypt.compare(candidatePassword, this.password);
};

/** Ẩn các trường nhạy cảm khi trả JSON */
userSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
    },
});

/** Xuất model */
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;