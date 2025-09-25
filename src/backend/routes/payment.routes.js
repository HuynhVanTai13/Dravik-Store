import express from "express";
import { listPayments, createPaymentUrl, vnpayReturn, vnpayIpn } from "../controllers/payment.controller.js";
const router = express.Router();

router.get("/", listPayments);
router.post("/create-payment", createPaymentUrl);
router.get("/vnpay-return", vnpayReturn);
router.get("/vnpay-ipn", vnpayIpn);

export default router;
