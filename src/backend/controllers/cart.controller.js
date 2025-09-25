// backend/src/controllers/cart.controller.js
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

// --- Tiện ích kiểm tra tồn & trạng thái (KHÔNG dùng ?. hoặc ??) ---
const getStockMeta = async(productId, colorId, sizeId) => {
    const p = await Product.findById(productId).lean();
    if (!p) return { ok: false, message: "Không tìm thấy sản phẩm" };

    // Chuẩn hoá lấy id dưới dạng string cho cả object {_id} hoặc ObjectId/string
    const toId = (val) => {
        if (val && typeof val === "object") {
            if (val._id) return String(val._id);
            try { return String(val); } catch { return ""; }
        }
        return String(val || "");
    };

    const colorIdStr = String(colorId || "");
    const sizeIdStr = String(sizeId || "");

    const v = (Array.isArray(p.variants) ? p.variants : []).find((x) => {
        const c = toId(x && x.color);
        return c === colorIdStr;
    });
    if (!v) return { ok: false, message: "Không tìm thấy màu trong sản phẩm" };

    const s = (Array.isArray(v.sizes) ? v.sizes : []).find((x) => {
        const sid = toId(x && x.size);
        return sid === sizeIdStr;
    });
    if (!s) return { ok: false, message: "Không tìm thấy size trong màu" };

    const active =
        (p.isActive !== false) &&
        (v.isActive !== false) &&
        (s.isActive !== false);

    const qty = Number(s.quantity || 0);
    const sold = Number(s.sold || 0);
    const left = Math.max(0, qty - sold);

    return { ok: true, left, active, product: p };
};


/* -------------------------- Lấy giỏ theo user_id --------------------------- */
export const getCartByUserId = async(req, res) => {
    try {
        const { userId } = req.params;
        const cart = await Cart.findOne({ user_id: userId });
        return res.json(cart || { user_id: userId, items: [] });
    } catch (err) {
        console.error("getCartByUserId error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ------------------------------ Thêm vào giỏ ------------------------------- */
/**
 * body: { user_id, productId, sizeId, colorId, price, quantity, name, image, sizeName, colorName, oldPrice? }
 * - CỘNG DỒN nhưng KẸP không vượt quá tồn còn lại (left)
 * - Nếu biến thể ẩn/hết hàng => chặn
 */
export const addToCart = async(req, res) => {
    try {
        const {
            user_id,
            productId,
            sizeId,
            colorId,
            price = 0,
            quantity = 1,
            name = "",
            image = "",
            sizeName = "",
            colorName = "",
            oldPrice = null,
        } = req.body || {};

        if (!user_id || !productId || !colorId || !sizeId) {
            return res.status(400).json({ message: "Thiếu tham số" });
        }

        // Kiểm tra tồn/active
        const meta = await getStockMeta(productId, colorId, sizeId);
        if (!meta.ok) return res.status(404).json({ message: meta.message });
        if (!meta.active) {
            return res.status(400).json({ message: "Biến thể đang ẩn" });
        }
        if (meta.left <= 0) {
            return res.status(400).json({ message: "Hết hàng" });
        }

        // Lấy/khởi tạo giỏ
        let cart = await Cart.findOne({ user_id });
        if (!cart) cart = await Cart.create({ user_id, items: [] });

        const keyOf = (i) => `${i.productId}-${i.sizeId || ""}-${i.colorId || ""}`;
        const findKey = `${productId}-${sizeId || ""}-${colorId || ""}`;

        // Tính số lượng mới nhưng kẹp theo tồn còn lại
        const existed = cart.items.find((i) => keyOf(i) === findKey);
        const existedQty = existed ? Number(existed.quantity || 0) : 0;
        const addQty = Math.max(1, Number(quantity) || 1);
        const wanted = existedQty + addQty;
        const newQty = Math.min(meta.left, Math.max(1, wanted)); // KẸP

        if (existed) {
            existed.quantity = newQty;
            // cập nhật các field hiển thị nếu cần
            if (name) existed.name = name;
            if (image) existed.image = image;
            if (sizeName) existed.sizeName = sizeName;
            if (colorName) existed.colorName = colorName;
            if (price != null) existed.price = Number(price) || 0;
            if (oldPrice != null) existed.oldPrice = Number(oldPrice) || undefined;
        } else {
            cart.items.push({
                productId,
                sizeId,
                colorId,
                price: Number(price) || 0,
                oldPrice: oldPrice != null ? Number(oldPrice) || 0 : undefined,
                quantity: newQty,
                name,
                image,
                sizeName,
                colorName,
            });
        }

        await cart.save();

        return res.json({
            ok: true,
            cart,
            // thông tin thêm để FE có thể báo người dùng khi đã chạm trần
            quantityAfter: newQty,
            left: meta.left,
            capped: newQty < wanted,
        });
    } catch (err) {
        console.error("addToCart error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ---------------------------- Cập nhật số lượng ---------------------------- */
/**
 * body: { user_id, productId, sizeId, colorId, quantity }
 * - Đặt số lượng mới nhưng KẸP không vượt quá tồn còn lại (left)
 */
export const updateQuantity = async(req, res) => {
    try {
        const { user_id, productId, sizeId, colorId, quantity } = req.body || {};
        if (!user_id || !productId || !colorId || !sizeId || typeof quantity !== "number") {
            return res.status(400).json({ message: "Invalid payload" });
        }

        const cart = await Cart.findOne({ user_id });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const keyOf = (i) => `${i.productId}-${i.sizeId || ""}-${i.colorId || ""}`;
        const key = `${productId}-${sizeId || ""}-${colorId || ""}`;
        const item = cart.items.find((i) => keyOf(i) === key);
        if (!item) return res.status(404).json({ message: "Item not found" });

        // Kiểm tra tồn/active
        const meta = await getStockMeta(productId, colorId, sizeId);
        if (!meta.ok) return res.status(404).json({ message: meta.message });

        // Nếu hết hàng: không set về 0 (để FE có thể làm mờ + cho phép xóa),
        // vẫn giữ số lượng hiện tại nhưng báo capped
        const want = Math.max(1, Number(quantity) || 1);
        const newQty = meta.left > 0 ? Math.min(meta.left, want) : Math.max(1, Number(item.quantity) || 1);

        item.quantity = newQty;
        await cart.save();

        res.json({
            ok: true,
            cart,
            quantityAfter: newQty,
            left: meta.left,
            capped: newQty < want || meta.left <= 0,
        });
    } catch (err) {
        console.error("updateQuantity error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ------------------------------ Xoá 1 dòng ------------------------------ */
/**
 * body: { user_id, productId, sizeId, colorId }
 */
export const removeItemFromCart = async(req, res) => {
    try {
        const { user_id, productId, sizeId, colorId } = req.body || {};
        if (!user_id || !productId) {
            return res.status(400).json({ message: "Invalid payload" });
        }

        const cart = await Cart.findOne({ user_id });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const keyOf = (i) => `${i.productId}-${i.sizeId || ""}-${i.colorId || ""}`;
        const key = `${productId}-${sizeId || ""}-${colorId || ""}`;

        cart.items = cart.items.filter((i) => keyOf(i) !== key);
        await cart.save();
        res.json({ ok: true, cart });
    } catch (err) {
        console.error("removeItemFromCart error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* -------------------------- Xoá nhiều dòng đã chọn ------------------------- */
/**
 * body: { user_id, items: [{productId,sizeId,colorId}, ...] }
 */
export const removeSelectedItems = async(req, res) => {
    try {
        const { user_id, items } = req.body || {};
        if (!user_id || !Array.isArray(items) || !items.length) {
            return res.status(400).json({ message: "Invalid payload" });
        }

        const cart = await Cart.findOne({ user_id });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const toRemove = new Set(
            items.map((i) => `${i.productId}-${i.sizeId || ""}-${i.colorId || ""}`)
        );
        const keyOf = (i) => `${i.productId}-${i.sizeId || ""}-${i.colorId || ""}`;

        cart.items = cart.items.filter((i) => !toRemove.has(keyOf(i)));
        await cart.save();
        res.json({ ok: true, cart });
    } catch (err) {
        console.error("removeSelectedItems error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ------------------------------- Xoá toàn bộ ------------------------------- */
/**
 * body: { user_id }
 */
export const clearCart = async(req, res) => {
    try {
        const { user_id } = req.body || {};
        const cart = await Cart.findOne({ user_id });
        if (!cart) return res.json({ ok: true });

        cart.items = [];
        await cart.save();
        res.json({ ok: true });
    } catch (err) {
        console.error("clearCart error:", err);
        res.status(500).json({ message: "Server error" });
    }
};