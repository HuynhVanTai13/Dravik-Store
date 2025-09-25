"use client";
import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer>
      <div className="row-footer">
        
        <div className="col-4-footer">
          <Link href="/user" >          
        <img src="/images/logo-footer.png" alt="Logo Footer" />
        </Link>
          <div className="icon-3-footer">
            <span><i className="fa-solid fa-location-dot"></i></span>
            <p>Địa chỉ: 158/25, Phạm Văn Chiêu, Phường 8, Gò Vấp, TP Hồ Chí Minh</p>
          </div>
          <div className="icon-3-footer">
            <span><i className="fa-solid fa-phone"></i></span>
            <p>Số điện thoại: 1234567890</p>
          </div>
          <div className="icon-3-footer">
            <span><i className="fa-solid fa-envelope"></i></span>
            <p>Email: Dravikstore@gmail.com</p>
          </div>
        </div>

        {/* Ẩn trên mobile */}
        <div className="col-4-footer mobile-hide">
          <h4>Hỗ trợ khách hàng</h4>
          <p className="mgb-20">Chính sách đổi hàng</p>
          <p className="mgb-20">Chính sách bảo hành</p>
          <p className="mgb-20">Bảo mật thông tin</p>
          <p className="mgb-20">Hỗ trợ giao hàng</p>
        </div>

        {/* Ẩn trên mobile */}
        <div className="col-4-footer htkh mobile-hide">
          <h4>Tổng đài hỗ trợ</h4>
          <p className="mgb-20">Gọi mua hàng: 123456790 (8h-20h)</p>
          <p className="mgb-20">Gọi bảo hành: 1234567890 (8h-20h)</p>
          <p className="mgb-20">Gọi khiếu nại: 1234567890 (8h-20h)</p>
        </div>

        <div className="col-4-footer">
          <h4>Gửi mail ngay để nhận ưu đãi !</h4>
          <div className="subscribe-box">
            <input type="email" placeholder="Thả email nhận khuyến mãi..." />
            <button><i className="fas fa-paper-plane"></i></button>
          </div>
          <h4>Phương thức thanh toán</h4>
          <div className="payment-methods">
            <img src="/images/vnpay.jpg" alt="VNPAY" />
            <img src="/images/cod.jpg" alt="COD" />
            <img src="/images/momo.jpg" alt="MoMo" />
            <img src="/images/visa.jpg" alt="Vietcombank" />
          </div>
        </div>
      </div>
      <div className="footer-bottom">© Bản quyền thuộc về DRAVIK STORE</div>
    </footer>
  );
};

export default Footer;
