import mongoose from 'mongoose';

const PromotionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },

    // 'percent' = giảm %, 'fixed' = giảm tiền
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    discount: { type: Number, required: true, min: 0 },

    minOrderValue: { type: Number, default: 0, min: 0 }, // đơn tối thiểu
    maxDiscount:   { type: Number, default: 0, min: 0 }, // 0 = không giới hạn

    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },

    usageLimit:   { type: Number, default: 0, min: 0 }, // tổng lượt (0 = ∞)
    limitPerUser: { type: Number, default: 0, min: 0 }, // mỗi user (0 = ∞)
    usedCount:    { type: Number, default: 0, min: 0 },

    // Đếm số lượt đã dùng theo userId
    usedBy: { type: Map, of: Number, default: {} },

    active: { type: Boolean, default: true },
    description: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'promotion',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Validate
PromotionSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    return next(new Error('startDate must be before endDate'));
  }
  if (this.type === 'percent' && (this.discount < 0 || this.discount > 100)) {
    return next(new Error('Giá trị % phải trong 0..100'));
  }
  next();
});

PromotionSchema.pre('save', function (next) {
  if (this.code) this.code = this.code.trim().toUpperCase();
  next();
});

// Virtuals (tương thích code cũ nếu bạn từng dùng)
PromotionSchema.virtual('value').get(function(){return this.discount}).set(function(v){this.discount=v});
PromotionSchema.virtual('startTime').get(function(){return this.startDate}).set(function(v){this.startDate=v});
PromotionSchema.virtual('endTime').get(function(){return this.endDate}).set(function(v){this.endDate=v});
PromotionSchema.virtual('isActive').get(function(){return this.active}).set(function(v){this.active=v});
PromotionSchema.virtual('perUserLimit').get(function(){return this.limitPerUser}).set(function(v){this.limitPerUser=v});
PromotionSchema.virtual('minOrder').get(function(){return this.minOrderValue}).set(function(v){this.minOrderValue=v});
PromotionSchema.virtual('quantity').get(function(){return this.usageLimit}).set(function(v){this.usageLimit=v});

// “Còn lại” theo tổng lượt
PromotionSchema.virtual('remaining').get(function () {
  if (!this.usageLimit) return Infinity;
  return Math.max(0, this.usageLimit - this.usedCount);
});

const Promotion = mongoose.models.Promotion || mongoose.model('Promotion', PromotionSchema);
export default Promotion;
