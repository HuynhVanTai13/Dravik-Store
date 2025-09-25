"use client";
import React from "react";
import "../../../public/css/introduce.css";
import Link from "next/link";


export default function Introduce() {
    return (
        <>
        <nav className="breadcrumb">
        <Link href="/">Trang chủ</Link> /{' '}
        <span className="current">
          <Link href="/user/introduce" style={{ color: '#2c2929ff' }}>Giới thiệu</Link>
        </span>
      </nav>
            <main className="container">
                
                <h2>Giới thiệu</h2>
                <p>
                    Dravik được thành lập từ năm 1960, khởi nguồn từ một xưởng may gia đình nhỏ
                    với khát vọng mang đến những sản phẩm thời trang chất lượng cho người Việt.
                    Trải qua hơn nửa thế kỷ hình thành và phát triển, Dravik đã không ngừng đổi
                    mới, mở rộng quy mô sản xuất và đa dạng hóa sản phẩm, từng bước khẳng định
                    vị thế là một trong những thương hiệu thời trang hàng đầu tại Việt Nam.
                </p>
                <p>
                    Với nền tảng kinh nghiệm vững chắc cùng đội ngũ lãnh đạo tâm huyết, sáng
                    tạo, Dravik luôn tiên phong áp dụng công nghệ hiện đại và xu hướng thời
                    trang mới nhất để mang đến cho khách hàng những sản phẩm không chỉ đẹp về
                    kiểu dáng mà còn bền bỉ về chất lượng. Đội ngũ thiết kế và kỹ thuật viên
                    lành nghề là yếu tố quan trọng giúp Dravik tạo nên những bộ sưu tập thời
                    trang đa dạng, phù hợp với nhiều phong cách và nhu cầu khác nhau.
                </p>
                <p>
                    Kể từ ngày 20/01/2004, Dravik chính thức hoạt động theo mô hình Công ty Cổ
                    phần, đánh dấu bước ngoặt quan trọng trong quá trình phát triển chuyên
                    nghiệp và bền vững. Theo Giấy chứng nhận đăng ký kinh doanh số 012348765 do
                    Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh cấp, Dravik đã nhiều lần điều chỉnh để
                    mở rộng quy mô, lần gần nhất là vào ngày 09/05/2018, phù hợp với chiến lược
                    phát triển dài hạn và hội nhập quốc tế.
                </p>
                <p>Hiện nay, Dravik tập trung vào bốn lĩnh vực chính:</p>
                <ul>
                    <li>
                        Thiết kế, sản xuất và kinh doanh các sản phẩm thời trang nam, nữ cùng phụ
                        kiện.
                    </li>
                    <li>Kinh doanh xuất nhập khẩu nguyên vật liệu, máy móc ngành may mặc.</li>
                    <li>
                        Phát triển hệ thống cửa hàng bán lẻ, chuỗi showroom và thương mại điện tử.
                    </li>
                    <li>
                        Mở rộng các hoạt động kinh doanh hợp pháp khác nhằm gia tăng giá trị
                        thương hiệu.
                    </li>
                </ul>
                <p>
                    Không chỉ chú trọng vào chất lượng sản phẩm, Dravik còn đặc biệt quan tâm
                    đến trải nghiệm khách hàng thông qua dịch vụ chăm sóc tận tâm, hệ thống cửa
                    hàng hiện đại, đội ngũ nhân viên chuyên nghiệp và chính sách hậu mãi chu
                    đáo. Những nỗ lực này đã góp phần tạo dựng niềm tin vững chắc từ người tiêu
                    dùng trên toàn quốc.
                </p>
                <p>
                    Với phương châm{" "}
                    <strong>“Chất lượng – Uy tín – Đổi mới – Phát triển bền vững”</strong>,
                    Dravik cam kết tiếp tục phát huy những giá trị truyền thống, không ngừng đổi
                    mới sáng tạo, mở rộng mạng lưới phân phối và nâng cao năng lực cạnh tranh,
                    góp phần đưa thương hiệu thời trang Việt Nam vươn xa hơn trên thị trường
                    quốc tế. Nhờ đó, Dravik nhiều năm liền được vinh danh là{" "}
                    <em>“Thương hiệu Việt Nam được yêu thích”</em>, trở thành lựa chọn tin cậy
                    và đồng hành cùng phong cách sống hiện đại của hàng triệu khách hàng.
                </p>
            </main>

        </>
    );
}
