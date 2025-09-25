import mongoose from "mongoose";
import Comment from "../models/Comment.js";

/**
 * GET /api/comments
 * Liệt kê TẤT CẢ bình luận (phân trang + lọc + sắp xếp + tìm kiếm)
 * Query:
 *  - page (default 1)
 *  - limit (default 8)
 *  - stars: 0(all) | 1..5
 *  - sort: 'recent' | 'old' | 'top'
 *  - q: tìm theo tên sản phẩm HOẶC tên người dùng (case-insensitive)
 */
export const listAll = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 8);
    const stars = parseInt(req.query.stars) || 0;
    const sort  = String(req.query.sort || "recent");
    const q     = String(req.query.q || "").trim();

    let sortOpt = { createdAt: -1 };
    if (sort === "old") sortOpt = { createdAt: 1 };
    if (sort === "top") sortOpt = { rating: -1, createdAt: -1 };

    // Pipeline chung: join Product để lấy tên sản phẩm
    const baseLookup = [
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
          pipeline: [{ $project: { name: 1, images: 1 } }],
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    ];

    // Điều kiện search (theo tên sp hoặc userName)
    const searchMatch = q
      ? {
          $match: {
            $or: [
              { "product.name": { $regex: q, $options: "i" } },
              { userName: { $regex: q, $options: "i" } },
            ],
          },
        }
      : null;

    // Thống kê theo sao (tính trên toàn bộ tập đang search, KHÔNG áp dụng filter stars)
    const byStarsAgg = await Comment.aggregate([
      ...baseLookup,
      ...(searchMatch ? [searchMatch] : []),
      { $group: { _id: "$rating", n: { $sum: 1 } } },
    ]);

    // Danh sách + tổng
    const result = await Comment.aggregate([
      ...baseLookup,
      ...(searchMatch ? [searchMatch] : []),
      ...(stars ? [{ $match: { rating: stars } }] : []),
      { $sort: sortOpt },
      {
        $facet: {
          items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: "n" }],
        },
      },
    ]);

    const items = result?.[0]?.items || [];
    const total = result?.[0]?.total?.[0]?.n || 0;

    const byStars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    byStarsAgg.forEach((s) => {
      byStars[s._id] = s.n;
    });

    // Chuẩn hoá output: thêm productName
    res.json({
      items: items.map((i) => ({
        _id: i._id,
        productId: i.productId,
        productName: i.product?.name || null,
        userId: i.userId,
        userName: i.userName,
        rating: i.rating,
        content: i.content,
        images: i.images,
        createdAt: i.createdAt,
      })),
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      byStars,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Cannot load comments" });
  }
};

/**
 * CÁI CŨ (giữ nguyên): GET /api/comments/product/:productId (phân trang theo sản phẩm)
 * CÁI CŨ (giữ nguyên): POST /api/comments (tạo)
 * CÁI CŨ (giữ nguyên): DELETE /api/comments/:id (xóa)
 * -> chúng ta vẫn có trong file cũ của bạn. :contentReference[oaicite:3]{index=3}
 */

// === Giữ nguyên các hàm cũ để dùng song song (nếu FE đang gọi) ===
export const listByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "productId không hợp lệ" });
    }
    const pid = new mongoose.Types.ObjectId(productId);
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 6);
    const stars = parseInt(req.query.stars) || 0;
    const sort  = String(req.query.sort || "recent");
    const q = { productId: pid };
    if (stars >= 1 && stars <= 5) q.rating = stars;

    let sortOpt = { createdAt: -1 };
    if (sort === "old") sortOpt = { createdAt: 1 };
    if (sort === "top") sortOpt = { rating: -1, createdAt: -1 };

    const [items, total, stat] = await Promise.all([
      Comment.find(q).sort(sortOpt).skip((page - 1) * limit).limit(limit),
      Comment.countDocuments(q),
      Comment.aggregate([{ $match: { productId: pid } }, { $group: { _id: "$rating", n: { $sum: 1 } } }]),
    ]);
    const byStars = { 1:0,2:0,3:0,4:0,5:0 }; stat.forEach(s => { byStars[s._id] = s.n; });

    res.json({ items, page, pages: Math.max(1, Math.ceil(total / limit)), byStars });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Cannot load comments" });
  }
};

export const create = async (req, res) => {
  try {
    const { productId, userId, userName, rating, content } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: "productId không hợp lệ" });
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: "userId không hợp lệ" });
    const r = Number(rating); if (!(r >= 1 && r <= 5)) return res.status(400).json({ message: "rating phải 1..5" });
    const images = (req.files || []).map((f) => `/uploads/comments/${f.filename}`);
    const c = await Comment.create({ productId, userId, userName, rating: r, content: content || "", images });
    res.status(201).json(c);
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: e.message || "Create comment failed" });
  }
};

export const remove = async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(404).json({ message: "Comment not found" });
  }
};
