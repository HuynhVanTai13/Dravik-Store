// src/backend/utils/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

/* ===== SMTP config ===== */
const asBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["1", "true", "yes", "on"].includes(v.toLowerCase());
  return false;
};

const SMTP_HOST   = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
const SMTP_PORT   = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = asBool(process.env.SMTP_SECURE) || SMTP_PORT === 465;
const SMTP_USER   = (process.env.SMTP_USER || "").trim();
const SMTP_PASS   = (process.env.SMTP_PASS || "").trim();

const MAIL_FROM  = process.env.MAIL_FROM || (SMTP_USER ? `DRAVIK STORE <${SMTP_USER}>` : "DRAVIK STORE <no-reply@dravik.store>");
const SHOP_BCC   = (process.env.SHOP_NOTIFY_EMAIL || "").trim();
const MAIL_DEBUG = asBool(process.env.MAIL_DEBUG);

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

transporter.verify((err) => {
  if (err) console.error("[MAILER] verify error:", err?.message);
  else console.log("[MAILER] SMTP ready:", SMTP_HOST, SMTP_USER);
});

export async function sendMail({ to, subject, html, text, cc, bcc, attachments } = {}) {
  if (!SMTP_USER || !SMTP_PASS) throw new Error("SMTP chưa cấu hình đầy đủ (.env)");
  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to,
    cc,
    bcc: bcc || SHOP_BCC || undefined,
    subject,
    html,
    text,
    attachments,
  });
  if (MAIL_DEBUG) console.log("[MAILER] sent:", info?.messageId, "→", to);
  return info;
}

/* ===== Template ===== */
const BRAND = { name: "DRAVIK STORE", color: "#163d77", light: "#f3f6fb", dark: "#0e2a57" };
const VND = (n) => (Number(n) || 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " đ";
const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

const FRONTEND_URL = (process.env.FRONTEND_URL
  || process.env.NEXT_PUBLIC_SITE_URL
  || process.env.NEXT_PUBLIC_BASE_URL
  || "http://localhost:3000"
).replace(/\/+$/, "");

/** Chuẩn hoá CTA:
 * - Thêm domain nếu là link tương đối
 * - Chuyển mọi '/user/order/' -> '/user/account/order/'
 */
function normalizeCta(cta) {
  let href = String(cta || "").trim();
  if (!href) return "";
  href = href.replace(/\/user\/order\//, "/user/account/order/"); // vá route cũ
  if (!/^https?:\/\//i.test(href)) {
    href = `${FRONTEND_URL}${href.startsWith("/") ? "" : "/"}${href}`;
  }
  return href;
}

export function renderOrderEmail({ order, user, statusLabel = "ĐÃ XÁC NHẬN", ctaUrl }) {
  const items = order?.items || [];
  const address = order?.address || {};
  const paymentLabel = order?.payment?.method_name || order?.paymentType || "Không xác định";
  const voucher = order?.voucher || null;

  const subtotal = items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0);
  const discount = voucher
    ? (voucher.type === "percent"
        ? Math.floor(subtotal * (Number(voucher.discount || 0) / 100))
        : Number(voucher.discount || 0))
    : 0;

  const shipping = Number(order?.shippingFee ?? order?.shipping_fee ?? order?.shipping ?? 0);
  const total = order?.total ?? Math.max(0, subtotal - discount + shipping);

  const orderId   = order?._id || order?.id || "";
  const orderCode = order?.orderCode || orderId;
  const createdStr = new Date(order?.createdAt || Date.now()).toLocaleString("vi-VN");

  // VNPay -> coi như đã trả đủ (giống trang payment-result)
  const isVNPay = String(paymentLabel).toLowerCase().includes("vnpay");
  const paidOK  = isVNPay && (order?.paymentStatus === "paid" || order?.status === "success" || order?.isPaid === true);
  const paid = paidOK ? total : 0;
  const due  = Math.max(0, total - paid);

  const rows = items.map((it) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">
        <div style="font-weight:600;color:#222">${esc(it.name)}</div>
        ${it.colorName ? `<div style="color:#666;font-size:13px;">Màu: ${esc(it.colorName)}</div>` : ""}
        ${it.sizeName ? `<div style="color:#666;font-size:13px;">Size: ${esc(it.sizeName)}</div>` : ""}
      </td>
      <td align="center" style="padding:10px 12px;border-bottom:1px solid #eee;color:#222;">${it.quantity}</td>
      <td align="right" style="padding:10px 12px;border-bottom:1px solid #eee;color:#222;">${VND(it.price)}</td>
      <td align="right" style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:600;color:#222;">${VND((it.price||0)*(it.quantity||0))}</td>
    </tr>
  `).join("");

  const voucherLine = voucher ? `
    <tr>
      <td colspan="3" align="right" style="padding:6px 12px;color:#555;">Mã giảm giá (${esc(voucher.code || "")})</td>
      <td align="right" style="padding:6px 12px;color:#d64545;">- ${VND(discount)}</td>
    </tr>` : "";

  const payBlock = paidOK
    ? `
      <tr><td colspan="3" align="right" style="padding:8px 12px;color:${BRAND.dark};font-weight:700">Đã thanh toán (VNPay)</td><td align="right" style="padding:8px 12px;color:${BRAND.dark};font-weight:800">${VND(paid)}</td></tr>
      <tr><td colspan="3" align="right" style="padding:10px 12px;color:${BRAND.dark};font-weight:800">CÒN PHẢI THU</td><td align="right" style="padding:10px 12px;color:${BRAND.dark};font-weight:800">${VND(due)}</td></tr>
    `
    : `
      <tr><td colspan="3" align="right" style="padding:10px 12px;color:${BRAND.dark};font-weight:800">TỔNG THANH TOÁN</td><td align="right" style="padding:10px 12px;color:${BRAND.dark};font-weight:800">${VND(total)}</td></tr>
    `;

  // CTA cuối: ưu tiên ctaUrl (đã normalize). Nếu trống => tự build đúng route
  let finalCta = ctaUrl && normalizeCta(ctaUrl);
  if (!finalCta) finalCta = `${FRONTEND_URL}/user/account/order/${encodeURIComponent(orderId)}`;

  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;background:${BRAND.light};font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.light};padding:24px 12px">
    <tr><td align="center">
      <table width="640" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.06)">
        <tr><td style="background:${BRAND.color};color:#fff;padding:18px 24px">
          <div style="font-size:20px;font-weight:800;letter-spacing:.3px">${BRAND.name}</div>
          <div style="opacity:.9;margin-top:2px">Thông báo: ĐƠN HÀNG ${esc(statusLabel)}</div>
        </td></tr>
        <tr><td style="padding:20px 24px">
          <div style="font-size:16px;color:#222;margin-bottom:6px">Chào ${esc(user?.name || user?.fullName || user?.email || "bạn")},</div>
          <div style="color:#444;line-height:1.55">Cảm ơn bạn đã mua sắm tại <b>${BRAND.name}</b>! Đơn hàng của bạn đã được <b>${esc(statusLabel)}</b>.</div>

          <div style="margin-top:16px;padding:12px;border:1px dashed ${BRAND.color};border-radius:12px;background:#fbfdff">
            <div style="font-weight:700;color:${BRAND.dark};font-size:15px">Mã đơn: ${esc(orderCode)}</div>
            <div style="color:#555;font-size:13px;margin-top:4px">Thời gian đặt: ${esc(createdStr)}</div>
            <div style="color:#555;font-size:13px;margin-top:2px">Phương thức thanh toán: <b>${esc(paymentLabel)}</b></div>
          </div>

          <h3 style="margin:18px 0 8px;color:#222">Sản phẩm</h3>
          <table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #eee;border-radius:12px;overflow:hidden">
            <thead>
              <tr style="background:#fafbfe">
                <th align="left"  style="padding:10px 12px;color:#555">Sản phẩm</th>
                <th align="center"style="padding:10px 12px;color:#555">SL</th>
                <th align="right" style="padding:10px 12px;color:#555">Đơn giá</th>
                <th align="right" style="padding:10px 12px;color:#555">Thành tiền</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="4" style="padding:16px;color:#666">Không có sản phẩm</td></tr>`}</tbody>
            <tfoot>
              <tr><td colspan="3" align="right" style="padding:8px 12px;color:#555">Tạm tính</td><td align="right" style="padding:8px 12px;color:#222;font-weight:600">${VND(subtotal)}</td></tr>
              ${voucherLine}
              <tr><td colspan="3" align="right" style="padding:6px 12px;color:#555">Phí vận chuyển</td><td align="right" style="padding:6px 12px;color:#222">${VND(shipping)}</td></tr>
              ${payBlock}
            </tfoot>
          </table>

          <h3 style="margin:18px 0 8px;color:#222">Địa chỉ nhận hàng</h3>
          <div style="padding:12px;border:1px solid #eee;border-radius:12px;color:#333;line-height:1.6">
            <div><b>${esc(address.receiver || "")}</b> • ${esc(address.phone || "")}</div>
            <div>${esc(address.address || "")}</div>
            ${order?.note ? `<div style="margin-top:6px;color:#555">Ghi chú: ${esc(order.note)}</div>` : ""}
          </div>

          <div style="margin:22px 0 6px">
            ${finalCta ? `<a href="${esc(finalCta)}" style="display:inline-block;background:${BRAND.color};color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Xem đơn hàng</a>` : ""}
          </div>

          <div style="margin-top:20px;color:#444;line-height:1.6">Nếu bạn cần hỗ trợ, hãy phản hồi email này hoặc liên hệ Fanpage/Zalo của <b>${BRAND.name}</b>.</div>
          <div style="margin-top:16px;color:${BRAND.dark};font-weight:800">${BRAND.name}</div>
        </td></tr>
        <tr><td style="background:#f7f9fc;color:#5b6b86;padding:18px 24px;font-size:12.5px">
          <div style="font-weight:800;color:${BRAND.dark};margin-bottom:4px">${BRAND.name}</div>
          <div>Chất lượng – Tận tâm – Nhanh chóng.</div>
          <div>Website: <a href="#" style="color:${BRAND.color};text-decoration:none">dravik.store</a> • Hotline: 09xx xxx xxx</div>
          <div style="margin-top:6px;color:#8aa0bf">Bạn nhận được email này vì đã mua sắm tại ${BRAND.name}.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
