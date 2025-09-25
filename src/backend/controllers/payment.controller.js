import dotenv from "dotenv";
import moment from "moment";
import crypto from "crypto";
import mongoose from "mongoose"; // ✅ thêm
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { sendMail, renderOrderEmail } from "../utils/mailer.js";

dotenv.config();

// ===== Helpers =====
const env = (k) => {
    const v = process.env[k];
    return (v === undefined || v === null ? "" : String(v)).trim();
};

const FE_URL = (process.env.FE_URL ? String(process.env.FE_URL) : "http://localhost:3000").trim();

const cleanAndSort = (obj) =>
    Object.keys(obj)
    .filter((k) => obj[k] !== null && obj[k] !== undefined && obj[k] !== "")
    .sort()
    .reduce((acc, k) => {
        acc[k] = String(obj[k]);
        return acc;
    }, {});

const buildQuery = (paramsObj) => new URLSearchParams(paramsObj).toString();

const hmac512 = (secret, data) =>
    crypto.createHmac("sha512", secret).update(Buffer.from(data, "utf-8")).digest("hex");

/* ===== Email khi VNPay thành công ===== */
async function sendPaidEmail(order) {
    try {
        const user = await User.findById(order.user_id).lean();
        if (!user || !user.email) return;

        const flags = order.emailFlags || {};
        if (flags.paidSent) return;

        const html = renderOrderEmail({
            order,
            user,
            statusLabel: "ĐÃ THANH TOÁN",
            ctaUrl: FE_URL + "/user/order/" + order._id,
        });

        await sendMail({
            to: user.email,
            subject: "DRAVIK STORE - Thanh toán thành công " + (order.orderCode || order._id),
            html,
        });

        order.emailFlags = Object.assign({}, flags, { paidSent: true });
        await order.save();
    } catch (err) {
        console.error("Send email (PAID) error:", (err && err.message) || err);
    }
}

/* ===== ✅ TỒN KHO: hoàn tồn khi huỷ / thất bại VNPay ===== */
const toOid = (x) => {
    try {
        return new mongoose.Types.ObjectId(String(x)); // ✅ dùng import mongoose (ESM), không dùng require
    } catch {
        return null;
    }
};

// Hoàn sold cho 1 biến thể (2 bước an toàn)
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


// Sau khi hoàn, nếu tổng tồn >0 thì tự bật lại isActive
async function reactivateIfBackInStock(pid) {
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

// Hoàn tồn kho cả order (idempotent nhờ flag stockReverted)
async function revertStockForOrder(order) {
    if (!order) return;

    const touched = new Set();
    for (const it of order.items || []) {
        let pid;
        if (it && typeof it.productId === "object" && it.productId) {
            pid = it.productId._id;
        } else if (it) {
            pid = it.productId;
        }

        await revertOneVariantSold(pid, it.colorId, it.sizeId, it.quantity);
        if (pid) touched.add(String(pid));
    }

    for (const pid of touched) {
        await reactivateIfBackInStock(pid);
    }
}

/* ===== APIs ===== */

// GET /api/payments
export const listPayments = async(_req, res) => {
    try {
        const methods = await Payment.find({}).sort({ sortOrder: 1, _id: 1 }).lean();
        res.json(methods);
    } catch (e) {
        res.status(500).json({ message: "Lỗi khi lấy phương thức thanh toán", error: e.message });
    }
};

// POST /api/payments/create-payment  { amount, orderId }
export const createPaymentUrl = async(req, res) => {
    try {
        const { amount, orderId } = req.body;
        if (!amount || !orderId)
            return res.status(400).json({ success: false, message: "Thiếu amount hoặc orderId" });

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });

        const tmnCode = env("VNP_TMNCODE");
        const secretKey = env("VNP_HASH_SECRET");
        const vnpUrl = env("VNP_URL");
        const returnUrl = env("VNP_RETURN_URL");
        if (!tmnCode || !secretKey || !vnpUrl || !returnUrl)
            return res.status(500).json({ success: false, message: "Thiếu cấu hình VNPay (.env)" });

        // TxnRef duy nhất (dạng số)
        const vnp_TxnRef = String(Date.now());
        order.vnpTxnRef = vnp_TxnRef;
        order.paymentStatus = "unpaid";
        await order.save();

        const ipAddr = (
            (req.headers && req.headers["x-forwarded-for"]) ||
            (req.socket && req.socket.remoteAddress) ||
            req.ip ||
            ""
        ).toString();

        const createDate = moment().format("YYYYMMDDHHmmss");

        // 1) Tham số để KÝ (KHÔNG có vnp_SecureHashType)
        const paramsToSign = cleanAndSort({
            vnp_Version: "2.1.0",
            vnp_Command: "pay",
            vnp_TmnCode: tmnCode,
            vnp_Locale: "vn",
            vnp_CurrCode: "VND",
            vnp_TxnRef,
            vnp_OrderInfo: `Thanh toan don hang ${order._id}`,
            vnp_OrderType: "other",
            vnp_Amount: String(Math.round(Number(amount) * 100)),
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate,
        });

        // 2) Ký trên chuỗi đã URL-ENCODE
        const signData = buildQuery(paramsToSign);
        const vnp_SecureHash = hmac512(secretKey, signData);

        // 3) Ghép URL (thêm SecureHashType sau khi ký)
        const finalParams = {
            ...paramsToSign,
            vnp_SecureHashType: "SHA512",
            vnp_SecureHash,
        };
        const paymentUrl = `${vnpUrl}?${buildQuery(finalParams)}`;
        return res.json({ success: true, paymentUrl, txnRef: vnp_TxnRef });
    } catch (error) {
        console.error("createPaymentUrl error:", error);
        return res.status(500).json({ success: false, message: "Không thể tạo URL thanh toán" });
    }
};

// GET /api/payments/vnpay-return
export const vnpayReturn = async(req, res) => {
    try {
        const vnp_Params = {...req.query };
        const secureHash = vnp_Params["vnp_SecureHash"];
        delete vnp_Params["vnp_SecureHash"];
        delete vnp_Params["vnp_SecureHashType"];

        const sorted = cleanAndSort(vnp_Params);
        const signData = buildQuery(sorted);
        const signed = hmac512(env("VNP_HASH_SECRET"), signData);

        const ok = secureHash === signed && vnp_Params["vnp_ResponseCode"] === "00";
        const txnRef = vnp_Params["vnp_TxnRef"];
        const order = await Order.findOne({ vnpTxnRef: txnRef });

        if (order) {
            const amountFromVnp = Number(vnp_Params["vnp_Amount"] || 0) / 100;
            if (ok && amountFromVnp === Number(order.total)) {
                order.paymentStatus = "paid";
                order.status = "confirmed";
                order.paymentMeta = {
                    vnp_ResponseCode: vnp_Params["vnp_ResponseCode"],
                    vnp_TransactionNo: vnp_Params["vnp_TransactionNo"],
                    vnp_BankCode: vnp_Params["vnp_BankCode"],
                    vnp_CardType: vnp_Params["vnp_CardType"],
                    vnp_PayDate: vnp_Params["vnp_PayDate"],
                };
                await order.save();
                await sendPaidEmail(order);
            } else {
                order.paymentStatus = "failed";
                order.status = "cancelled";
                order.paymentMeta = {
                    vnp_ResponseCode: vnp_Params["vnp_ResponseCode"],
                    vnp_TransactionNo: vnp_Params["vnp_TransactionNo"],
                    vnp_BankCode: vnp_Params["vnp_BankCode"],
                    vnp_CardType: vnp_Params["vnp_CardType"],
                    vnp_PayDate: vnp_Params["vnp_PayDate"],
                };
                if (!order.stockReverted) {
                    await revertStockForOrder(order); // ✅ hoàn tồn 1 lần
                    order.stockReverted = true;
                }
                await order.save();
            }
        }

        const u = new URL(`${FE_URL}/user/payment-result`);
        u.searchParams.set("status", ok ? "success" : "failed");
        if (order) u.searchParams.set("orderId", order._id.toString());
        return res.redirect(302, u.toString());
    } catch (error) {
        console.error("vnpayReturn error:", error);
        return res.status(500).json({ success: false, message: "Lỗi xử lý callback VNPay" });
    }
};

// GET /api/payments/vnpay-ipn  (server-to-server)
export const vnpayIpn = async(req, res) => {
    try {
        const vnp_Params = {...req.query };
        const secureHash = vnp_Params["vnp_SecureHash"];
        delete vnp_Params["vnp_SecureHash"];
        delete vnp_Params["vnp_SecureHashType"];

        const sorted = cleanAndSort(vnp_Params);
        const signData = buildQuery(sorted);
        const signed = hmac512(env("VNP_HASH_SECRET"), signData);

        if (secureHash !== signed) {
            return res.status(200).json({ RspCode: "97", Message: "Checksum failed" });
        }

        const txnRef = vnp_Params["vnp_TxnRef"];
        const order = await Order.findOne({ vnpTxnRef: txnRef });
        if (!order) return res.status(200).json({ RspCode: "01", Message: "Order not found" });

        const amount = Number(vnp_Params["vnp_Amount"] || 0) / 100;
        if (amount !== Number(order.total)) {
            return res.status(200).json({ RspCode: "04", Message: "Invalid amount" });
        }

        if (order.paymentStatus === "paid") {
            return res.status(200).json({ RspCode: "02", Message: "Order already confirmed" });
        }

        const rspCode = vnp_Params["vnp_ResponseCode"];
        if (rspCode === "00") {
            order.paymentStatus = "paid";
            order.status = "confirmed";
            order.paymentMeta = {
                vnp_ResponseCode: rspCode,
                vnp_TransactionNo: vnp_Params["vnp_TransactionNo"],
                vnp_BankCode: vnp_Params["vnp_BankCode"],
                vnp_CardType: vnp_Params["vnp_CardType"],
                vnp_PayDate: vnp_Params["vnp_PayDate"],
            };
            await order.save();
            await sendPaidEmail(order);
        } else {
            order.paymentStatus = "failed";
            order.status = "cancelled";
            order.paymentMeta = {
                vnp_ResponseCode: rspCode,
                vnp_TransactionNo: vnp_Params["vnp_TransactionNo"],
                vnp_BankCode: vnp_Params["vnp_BankCode"],
                vnp_CardType: vnp_Params["vnp_CardType"],
                vnp_PayDate: vnp_Params["vnp_PayDate"],
            };
            if (!order.stockReverted) {
                await revertStockForOrder(order); // ✅ hoàn tồn 1 lần
                order.stockReverted = true;
            }
            await order.save();
        }

        return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
    } catch (e) {
        console.error("vnpayIpn error:", e);
        return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
    }
};

// GET /api/payments/debug (tuỳ chọn)
export const debugSignature = async(_req, res) => {
    try {
        const tmnCode = env("VNP_TMNCODE");
        const secretKey = env("VNP_HASH_SECRET");
        const now = moment().format("YYYYMMDDHHmmss");

        const params = cleanAndSort({
            vnp_Version: "2.1.0",
            vnp_Command: "pay",
            vnp_TmnCode: tmnCode,
            vnp_Locale: "vn",
            vnp_CurrCode: "VND",
            vnp_TxnRef: String(Date.now()),
            vnp_OrderInfo: "Test",
            vnp_OrderType: "other",
            vnp_Amount: "1000",
            vnp_ReturnUrl: env("VNP_RETURN_URL"),
            vnp_IpAddr: "127.0.0.1",
            vnp_CreateDate: now,
        });
        const signData = buildQuery(params);
        const signed = hmac512(secretKey, signData);

        res.json({ signData, signed });
    } catch (e) {
        res.status(500).json({ message: "debugSignature error", error: e.message });
    }
};