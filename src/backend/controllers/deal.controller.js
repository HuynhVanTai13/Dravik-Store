import DealSetting from '../models/DealSetting.js';
import Product from '../models/Product.js';
import _ from 'lodash';

export const getDealSetting = async(req, res) => {
    try {
        const deal = await DealSetting.findOne().sort({ createdAt: -1 });

        // Nếu chưa có deal, trả về rỗng nhưng vẫn kèm discountPercent/status để FE hiển thị
        if (!deal) {
            return res.json({
                programName: '',
                startTime: null,
                endTime: null,
                productIds: [],
                discountPercent: 0,
                status: 'waiting',
            });
        }

        // Nếu có deal nhưng chưa chọn sản phẩm
        if (!Array.isArray(deal.productIds) || deal.productIds.length === 0) {
            const now = new Date();
            const status =
                now < deal.startTime ? 'waiting' :
                now > deal.endTime ? 'expired' : 'active';

            const rawPct = Number(deal.discountPercent)
            const safePct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, rawPct)) : 0

            return res.json({
                ...deal.toObject(),
                productIds: [],
                status,
                discountPercent: safePct, // không dùng ?? nên không bị auto tách '? ?'
            })

        }

        // Populate đầy đủ như hiện tại
        const populatedProducts = await Product.find({ _id: { $in: deal.productIds } })
            .populate({ path: 'category', model: 'Category', select: '_id name' })
            .populate({ path: 'brand', model: 'Brand', select: '_id name' })
            .populate({ path: 'variants.color', model: 'Color', select: 'name' })
            .populate({ path: 'variants.sizes.size', model: 'Size', select: 'name height weight' });

        const uniqueProducts = _.uniqBy(populatedProducts, (p) => p._id.toString());

        // Trạng thái hiện tại của chương trình
        const now = new Date();
        const status =
            now < deal.startTime ? 'waiting' :
            now > deal.endTime ? 'expired' : 'active';
        const pct = Number.isFinite(deal.discountPercent) ? Number(deal.discountPercent) : 0;

        // Gắn thêm trường preview dealPrice (giảm theo % trên giá gốc) nếu đang ACTIVE
        const withDealPrice = uniqueProducts.map((p) => {
            let dealPrice = null;
            if (status === 'active' && pct > 0) {
                const computed = Math.round((p.price || 0) * (1 - pct / 100));
                dealPrice = Math.max(0, computed);
            }
            return {...p.toObject(), dealPrice };
        });

        return res.json({
            ...deal.toObject(),
            status,
            discountPercent: pct,
            productIds: withDealPrice,
        });
    } catch (error) {
        console.error('❌ Lỗi getDealSetting:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy deal.' });
    }
};

export const updateDealSetting = async(req, res) => {
    try {
        const {
            startTime,
            endTime,
            productIds,
            programName,
            name,
            title,
            discountPercent,
        } = req.body;

        // Tên chương trình (giữ tương thích như trước)
        const program = programName || name || title || '';

        // Validate thời gian
        if (!startTime || !endTime) {
            return res.status(400).json({ message: 'Thiếu thời gian bắt đầu/kết thúc.' });
        }
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (isNaN(+start) || isNaN(+end) || end <= start) {
            return res.status(400).json({ message: 'Thời gian không hợp lệ.' });
        }

        // Chuẩn hoá productIds -> mảng string duy nhất
        const uniqueIds = Array.isArray(productIds) ? [...new Set(
            productIds.map((x) => {
                const id = (x && typeof x === 'object' && '_id' in x) ? x._id : x;
                return String(id);
            })
        )] : [];

        // Chuẩn hoá % giảm
        let pct = Number(discountPercent);
        if (!Number.isFinite(pct)) pct = 0;
        pct = Math.max(0, Math.min(100, pct));

        // Lưu/ cập nhật deal
        const deal = await DealSetting.findOneAndUpdate({}, {
            startTime: start,
            endTime: end,
            productIds: uniqueIds,
            programName: program,
            discountPercent: pct,
        }, { new: true, upsert: true });

        return res.json(deal);
    } catch (error) {
        console.error('Lỗi updateDealSetting:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật deal.' });
    }
};