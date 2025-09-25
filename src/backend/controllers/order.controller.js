import mongoose from "mongoose";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import Product from "../models/Product.js";
import { renderOrderEmail, sendMail } from "../utils/mailer.js";

const FE_URL = (process.env.FE_URL || "http://localhost:3000").trim();

function genOrderCode(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const Y = date.getFullYear();
    const M = pad(date.getMonth() + 1);
    const D = pad(date.getDate());
    const h = pad(date.getHours());
    const m = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    return `DH${Y}${M}${D}${h}${m}${s}`;
}

function calcDiscount(subtotal, voucher) {
    if (!voucher) return 0;
    const pct = Number(
        voucher.percent != null ?
        voucher.percent :
        voucher.percentage != null ?
        voucher.percentage :
        voucher.discountPercent != null ?
        voucher.discountPercent :
        voucher.percentOff != null ?
        voucher.percentOff :
        0
    );
    const amount = Number(
        voucher.amount != null ?
        voucher.amount :
        voucher.discountAmount != null ?
        voucher.discountAmount :
        voucher.discount != null ?
        voucher.discount :
        0
    );

    if (pct > 0) return Math.floor(subtotal * (pct / 100));
    if (amount > 0) return amount;
    return 0;
}

/* ---------------------- ✅ Helpers tồn kho ---------------------- */
const toOid = (x) => {
    try {
        return new mongoose.Types.ObjectId(String(x));
    } catch {
        return null;
    }
};

// bật lại sản phẩm nếu tổng tồn > 0
async function reactivateIfBackInStock(productId) {
    const pid = toOid(productId);
    if (!pid) return;

    const p = await Product.findById(pid).select("isActive variants").lean();
    if (!p) return;

    let remain = 0;
    for (const v of p.variants || []) {
        for (const s of v.sizes || []) {
            remain += Math.max(0, Number(s.quantity || 0) - Number(s.sold || 0));
        }
    }
    if (remain > 0 && p.isActive === false) {
        await Product.updateOne({ _id: pid }, { $set: { isActive: true } }).catch(() => {});
    }
}

/**
 * Hoàn tồn (giảm sold) cho một dòng biến thể.
 * Dùng 2 bước an toàn: (1) $inc âm, (2) clamp về 0 nếu lỡ âm.
 */
async function revertOneVariantSold(productId, colorId, sizeId, qty) {
    const pid = toOid(productId);
    const cid = toOid(colorId);
    const sid = toOid(sizeId);
    const n = Number(qty || 0);
    if (!pid || !cid || !sid || n <= 0) return;

    // B1: giảm sold
    await Product.updateOne({ _id: pid }, { $inc: { 'variants.$[v].sizes.$[s].sold': -n } }, { arrayFilters: [{ 'v.color': cid }, { 's.size': sid }] }).catch(() => {});

    // B2: nếu sold < 0 thì đặt lại 0
    await Product.updateOne({ _id: pid }, { $set: { 'variants.$[v].sizes.$[s].sold': 0 } }, { arrayFilters: [{ 'v.color': cid }, { 's.size': sid, 's.sold': { $lt: 0 } }] }).catch(() => {});
}


/** Hoàn tồn cho toàn bộ items của đơn (idempotent) */
async function revertStockForOrderItems(order) {
    const items = Array.isArray(order && order.items) ? order.items : [];
    const touched = new Set();

    for (const it of items) {
        let pid = null;
        if (it && typeof it.productId === "object" && it.productId) {
            pid = it.productId._id;
        } else if (it) {
            pid = it.productId;
        }
        await revertOneVariantSold(pid, it.colorId, it.sizeId, it.quantity);
        if (pid) touched.add(String(pid));
    }

    // hàng về dương → bật lại sản phẩm
    for (const pid of touched) await reactivateIfBackInStock(pid);
}

/* -------------------------- Controllers -------------------------- */

export const createOrder = async(req, res) => {
    try {
        const {
            user_id,
            items = [],
            address,
            voucher,
            total,
            note,
            paymentId,
            paymentType,
            shippingFee: shippingFeeRaw,
            shipping_fee,
            shipping,
        } = req.body;

        let methodName = (paymentType || "").trim();
        let paymentDocId;
        if (paymentId) {
            paymentDocId = paymentId;
            try {
                const pm = await Payment.findById(paymentId).lean();
                if (pm && pm.method_name) methodName = pm.method_name;
            } catch {}
        }

        const subtotal = (items || []).reduce(
            (s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0),
            0
        );

        const shippingFee = Number(
            shippingFeeRaw != null ? shippingFeeRaw : shipping_fee != null ? shipping_fee : shipping != null ? shipping : 0
        );

        const discount = calcDiscount(subtotal, voucher);
        const computedTotal = Math.max(0, subtotal - discount + shippingFee);
        const finalTotal = Number(total != null ? total : computedTotal);

        const order = await Order.create({
            user_id,
            orderCode: genOrderCode(),
            items,
            address,
            voucher,
            shippingFee,
            total: finalTotal,
            note,
            payment: paymentDocId,
            paymentType: methodName,
            status: "pending",
            paymentStatus: "unpaid",
        });

        try {
            const user = await User.findById(user_id).lean();
            const lower = (methodName || "").toLowerCase();
            const isCOD = lower.indexOf("cod") >= 0 || lower.indexOf("cash") >= 0;

            const flags = order.emailFlags || {};
            if (user && user.email && isCOD && !flags.confirmationSent) {
                const html = renderOrderEmail({
                    order,
                    user,
                    statusLabel: "ĐÃ XÁC NHẬN (COD)",
                    ctaUrl: FE_URL + "/user/order/" + order._id,
                });
                await sendMail({
                    to: user.email,
                    subject: "DRAVIK STORE - Xác nhận đơn " + (order.orderCode || order._id),
                    html,
                });
                order.emailFlags = Object.assign({}, flags, { confirmationSent: true });
                await order.save();
            }
        } catch (err) {
            console.error("[ORDER] Send email (COD) error:", (err && err.message) || err);
        }

        res.status(201).json(order);
    } catch (e) {
        console.error("createOrder error:", e);
        res.status(500).json({ message: "Lỗi tạo đơn hàng", error: e.message });
    }
};

export const getAllOrders = async(_req, res) => {
    try {
        const data = await Order.find().sort({ createdAt: -1 }).populate("payment");
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Lỗi lấy tất cả đơn hàng", error: e.message });
    }
};

export const getOrdersByUserId = async(req, res) => {
    try {
        const data = await Order.find({ user_id: req.params.userId })
            .sort({ createdAt: -1 })
            .populate("payment");
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Lỗi lấy đơn người dùng", error: e.message });
    }
};

export const getOrderById = async(req, res) => {
    try {
        const data = await Order.findById(req.params.id).populate("payment");
        if (!data) return res.status(404).json({ message: "Không tìm thấy đơn" });
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Lỗi lấy chi tiết đơn", error: e.message });
    }
};

/**
 * Cập nhật trạng thái đơn.
 * Nếu chuyển sang "cancelled" và chưa hoàn tồn → hoàn tồn một lần.
 */
export const updateOrderStatus = async(req, res) => {
    try {
        const { status, paymentStatus, shippingFee } = req.body;

        const order = await Order.findById(req.params.id).populate("payment");
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn" });

        if (status !== undefined) order.status = status;
        if (paymentStatus !== undefined) order.paymentStatus = paymentStatus;
        if (shippingFee !== undefined) order.shippingFee = Number(shippingFee);

        if (order.status === "cancelled" && !order.stockReverted) {
            await revertStockForOrderItems(order);
            order.stockReverted = true;
        }

        const saved = await order.save();
        res.json({ message: "Cập nhật thành công", order: saved });
    } catch (e) {
        res.status(500).json({ message: "Lỗi cập nhật đơn", error: e.message });
    }
};

export const deleteOrder = async(req, res) => {
    try {
        const ok = await Order.findByIdAndDelete(req.params.id);
        if (!ok) return res.status(404).json({ message: "Không tìm thấy đơn" });
        res.json({ message: "Đã xoá" });
    } catch (e) {
        res.status(500).json({ message: "Lỗi xoá đơn", error: e.message });
    }
};

/* ========== ✅ API: Huỷ đơn (chỉ áp dụng COD) ========== */
export const cancelOrder = async(req, res) => {
    try {
        const { id } = req.params;
        const body = req.body || {};
        const reasonCode = body.reasonCode || "other";
        const reasonText = body.reasonText || "";

        // lấy kèm payment để biết loại thanh toán
        const order = await Order.findById(id).populate("payment");
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn" });

        // Lấy tên phương thức thanh toán KHÔNG dùng optional chaining
        const payTypeRaw =
            (order.paymentType ? String(order.paymentType) : "") ||
            (order.payment && order.payment.method_name ? String(order.payment.method_name) : "");
        const typeStr = payTypeRaw.toLowerCase();

        // ❌ Không cho huỷ nếu là thanh toán online (VNPay/bank/online)
        const isOnline =
            typeStr.indexOf("vnpay") >= 0 ||
            typeStr.indexOf("bank") >= 0 ||
            typeStr.indexOf("online") >= 0 ||
            typeStr.indexOf("card") >= 0 ||
            typeStr.indexOf("qr") >= 0;

        if (isOnline) {
            return res.status(400).json({ message: "Đơn thanh toán online (VNPay) không thể huỷ." });
        }

        // Chỉ cho huỷ khi còn ở trạng thái pending (COD)
        if (order.status !== "pending") {
            return res.status(400).json({ message: "Chỉ có thể huỷ đơn ở trạng thái Chờ xác nhận" });
        }

        order.status = "cancelled";
        order.cancellation = { reasonCode, reasonText, cancelledAt: new Date() };

        // Hoàn tồn (giảm sold) 1 lần nếu chưa hoàn
        if (!order.stockReverted) {
            await revertStockForOrderItems(order); // dùng hàm bạn đang có trong file
            order.stockReverted = true;
        }

        await order.save();
        return res.json({ message: "Đã huỷ đơn hàng", order });
    } catch (e) {
        return res.status(500).json({ message: "Lỗi huỷ đơn", error: e.message });
    }
};


/* ========== ✅ API mới: Mua lại (trả về items) ========== */
export const reorderOrder = async(req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn" });

        const items = (order.items || []).map((it) => ({
            productId: it.productId,
            name: it.name,
            image: it.image,
            price: it.price,
            quantity: it.quantity,
            sizeId: it.sizeId,
            sizeName: it.sizeName,
            colorId: it.colorId,
            colorName: it.colorName,
        }));

        res.json({ items });
    } catch (e) {
        res.status(500).json({ message: "Lỗi mua lại", error: e.message });
    }
};
export const updateOrderAddress = async(req, res) => {
    try {
        const { id } = req.params;
        // chấp nhận { address: {...} } hoặc payload phẳng
        const raw = req.body || {};
        const adr = raw.address || raw;

        if (!adr || !adr.receiver || !adr.phone || !adr.address) {
            return res.status(400).json({ message: "Thiếu thông tin địa chỉ." });
        }

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn" });

        // chỉ sửa khi đơn còn chờ xác nhận
        if (order.status !== "pending") {
            return res.status(400).json({ message: "Chỉ được cập nhật địa chỉ khi đơn đang Chờ xác nhận." });
        }

        order.address = {
            receiver: String(adr.receiver).trim(),
            phone: String(adr.phone).trim(),
            address: String(adr.address).trim(),
        };

        const saved = await order.save();
        return res.json({ message: "Cập nhật địa chỉ thành công", order: saved });
    } catch (e) {
        return res.status(500).json({ message: "Lỗi cập nhật địa chỉ", error: e.message });
    }
};