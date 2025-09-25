// src/config/vnpay.config.js

export const vnpConfig = {
  vnp_TmnCode: "EARNS4WP", // Terminal ID của bạn
  vnp_HashSecret: "6GFCKVOFLCPZ6OM2USHGMT500UAYC1NK", // Chuỗi bí mật
  vnp_Url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html", // URL sandbox
  returnUrl: process.env.VNP_RETURN_URL,

};
