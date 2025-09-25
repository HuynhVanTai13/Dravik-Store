import { validationResult } from 'express-validator';
import Promotion from '../models/Promotion.js';

const bad = (res, err, code = 400) =>
  res.status(code).json({ message: err?.message || 'Promotion error' });

function computeDiscount(voucher, orderTotal) {
  let d = voucher.type === 'percent'
    ? Math.floor(orderTotal * (voucher.discount / 100))
    : Number(voucher.discount || 0);
  if (voucher.maxDiscount && voucher.maxDiscount > 0) d = Math.min(d, voucher.maxDiscount);
  return Math.max(0, d);
}

/* ===== LIST / CRUD ===== */
export const listPromotions = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const skip = (page - 1) * limit;
    const q = String(req.query.q || '').trim();
    const status = String(req.query.status || '');

    const where = {};
    if (q) where.$or = [{ code: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }];
    if (status === 'active') where.active = true;
    if (status === 'inactive') where.active = false;

    const [items, total] = await Promise.all([
      Promotion.find(where).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Promotion.countDocuments(where),
    ]);

    res.json({ page, limit, total, items });
  } catch (err) { bad(res, err); }
};

export const getPromotionByCode = async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase().trim();
    if (!code) return bad(res, new Error('Thiếu mã khuyến mãi'));
    const doc = await Promotion.findOne({ code });
    if (!doc) return bad(res, new Error('Không tìm thấy promotion'), 404);
    res.json(doc);
  } catch (err) { bad(res, err); }
};

export const createPromotion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const body = { ...req.body };
    if (!body.code) return bad(res, new Error('Thiếu mã khuyến mãi'));
    body.code = String(body.code).toUpperCase().trim();

    const exists = await Promotion.findOne({ code: body.code });
    if (exists) return bad(res, new Error('Mã đã tồn tại'));

    const created = await Promotion.create(body);
    res.status(201).json(created);
  } catch (err) { bad(res, err); }
};

export const updatePromotionByCode = async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase().trim();
    const body = { ...req.body };
    if (body.code) body.code = String(body.code).toUpperCase().trim();

    const updated = await Promotion.findOneAndUpdate({ code }, { $set: body }, { new: true });
    if (!updated) return bad(res, new Error('Không tìm thấy promotion'), 404);
    res.json(updated);
  } catch (err) { bad(res, err); }
};

export const togglePromotionByCode = async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase().trim();
    const doc = await Promotion.findOne({ code });
    if (!doc) return bad(res, new Error('Không tìm thấy promotion'), 404);
    doc.active = !doc.active;
    await doc.save();
    res.json({ message: 'Đã cập nhật trạng thái', promotion: doc });
  } catch (err) { bad(res, err); }
};

export const removePromotionByCode = async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase().trim();
    const doc = await Promotion.findOne({ code });
    if (!doc) return bad(res, new Error('Không tìm thấy promotion'), 404);
    await Promotion.deleteOne({ code });
    res.json({ message: 'Đã xoá promotion' });
  } catch (err) { bad(res, err); }
};

/* ===== VALIDATE (áp mã) ===== */
export const validateVoucher = async (req, res) => {
  try {
    const code = String(req.body.code || '').toUpperCase().trim();
    const userId = String(req.body.userId || '').trim();
    const orderTotal = Number(req.body.total || 0);

    if (!code) return bad(res, new Error('Thiếu mã'));
    const v = await Promotion.findOne({ code });
    if (!v) return bad(res, new Error('Mã không tồn tại hoặc đã bị xoá'), 404);

    const now = new Date();
    if (!v.active) return bad(res, new Error('Mã đang tạm ẩn'));
    if (v.startDate && now < v.startDate) return bad(res, new Error('Chương trình chưa bắt đầu'));
    if (v.endDate && now > v.endDate) return bad(res, new Error('Chương trình đã kết thúc'));
    if (v.usageLimit && v.usedCount >= v.usageLimit) return bad(res, new Error('Mã đã hết lượt'));
    if (v.minOrderValue && orderTotal < v.minOrderValue) return bad(res, new Error('Chưa đạt giá trị đơn tối thiểu'));

    const usedByUser = userId ? (v.usedBy.get(userId) || 0) : 0;
    if (v.limitPerUser && usedByUser >= v.limitPerUser)
      return bad(res, new Error('Bạn đã dùng tối đa số lần cho phép'));

    const discountValue = computeDiscount(v, orderTotal);
    const remaining = v.usageLimit ? Math.max(0, v.usageLimit - v.usedCount) : Infinity;
    const remainingForUser = v.limitPerUser ? Math.max(0, v.limitPerUser - usedByUser) : Infinity;

    res.json({ ok: true, voucher: v, discountValue, remaining, remainingForUser });
  } catch (err) { bad(res, err); }
};

/* ===== REDEEM (trừ lượt) — ATOMIC =====
   Chặn race-condition, đảm bảo 1 user không thể “ăn hết 100 lượt”.
*/
export const redeemVoucher = async (req, res) => {
  try {
    const code = String(req.body.code || '').toUpperCase().trim();
    const userId = String(req.body.userId || '').trim();
    if (!code || !userId) return bad(res, new Error('Thiếu code hoặc userId'));

    const now = new Date();
    const userKey = `usedBy.${userId}`;

    const filter = {
      code,
      active: true,
      startDate: { $lte: now },
      endDate:   { $gte: now },
      $or: [
        { usageLimit: 0 },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      ],
      $and: [
        {
          $or: [
            { limitPerUser: 0 },
            { $expr: { $lt: [ { $ifNull: [ `$${userKey}`, 0 ] }, '$limitPerUser' ] } },
          ]
        }
      ]
    };

    const update = { $inc: { usedCount: 1, [userKey]: 1 } };

    const updated = await Promotion.findOneAndUpdate(filter, update, { new: true });

    if (!updated) {
      return bad(res, new Error('Mã đã hết lượt hoặc bạn đã dùng tối đa số lần cho phép'), 409);
    }

    res.json({ ok: true, promotion: updated });
  } catch (err) { bad(res, err); }
};

/* ===== NEW: danh sách voucher cho USER (để hiển thị popup)
   - Trả về mỗi voucher kèm:
     + remainingForUser: số lượt còn lại của chính user
     + displayRemaining: "X/Y" (ví dụ 5/5). Nếu không giới hạn, trả "∞".
     + canSelect: true/false (false => render mờ & không cho chọn)
     + disabledReason: 'minOrder' | 'soldOut' | 'expired' | 'notStarted' | 'inactive' | 'quota'
   - Ẩn những voucher mà remainingForUser == 0 hoặc đã sold out tổng.
*/
export const listForUser = async (req, res) => {
  try {
    const userId = String(req.query.userId || '').trim();
    const orderTotal = Number(req.query.total || 0);
    const now = new Date();

    const docs = await Promotion.find({
      active: true,
      startDate: { $lte: now },
      endDate:   { $gte: now },
    }).sort({ createdAt: -1 });

    const payload = [];
    for (const d of docs) {
      const usedByUser = userId ? (d.usedBy.get(userId) || 0) : 0;
      const perLimit = d.limitPerUser || 0;
      const perRemain = perLimit ? Math.max(0, perLimit - usedByUser) : Infinity;

      const soldOut = d.usageLimit && d.usedCount >= d.usageLimit;
      const notMeetMin = d.minOrderValue && orderTotal < d.minOrderValue;

      // filter: hết lượt theo user hoặc sold out tổng thì ẩn hẳn
      if (perRemain === 0 || soldOut) continue;

      const canSelect = !notMeetMin;
      const disabledReason = canSelect ? null : 'minOrder';
      const displayRemaining = perLimit ? `${perRemain}/${perLimit}` : '∞';

      payload.push({
        _id: d._id,
        code: d.code,
        description: d.description,
        type: d.type,
        discount: d.discount,
        minOrderValue: d.minOrderValue,
        maxDiscount: d.maxDiscount,
        usageLimit: d.usageLimit,
        usedCount: d.usedCount,
        limitPerUser: d.limitPerUser,
        remainingForUser: perRemain,
        displayRemaining,
        canSelect,
        disabledReason,
        startDate: d.startDate,
        endDate: d.endDate,
      });
    }

    res.json({ items: payload });
  } catch (err) { bad(res, err); }
};
