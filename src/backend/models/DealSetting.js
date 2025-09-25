import mongoose from 'mongoose';

const dealSettingSchema = new mongoose.Schema({
    programName: {
        type: String,
        trim: true,
        default: '',
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    // Danh sách sản phẩm áp dụng deal
    productIds: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    ],

    // % giảm giá theo chương trình (áp dụng trên giá gốc)
    discountPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },

    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.DealSetting || mongoose.model('DealSetting', dealSettingSchema);