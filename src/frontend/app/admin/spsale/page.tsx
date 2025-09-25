"use client";
import React from "react";
import Link from "next/link";
import "../../../styles/product.css"; // sửa lại đúng đường dẫn css của bạn

// Dữ liệu mẫu cho sản phẩm giảm giá
const saleProducts = [
  {
    id: 1,
    name: "Áo Hoodie Basic",
    img: "https://via.placeholder.com/50/cccccc/ffffff?text=P1",
    category: "Áo Hoodie",
    brand: "Unisex Store",
    price: "149.000",
    salePrice: "120.000",
    status: true,
  },
  // ...Thêm các sản phẩm khác tương tự
];

export default function ProductSalePage() {
  return (
    <main className="main-content">
      <section className="section-card product-list-section">
        <div className="product-list-header">
          <h2>Danh sách sản phẩm giảm giá</h2>
          <div className="header-actions">
            <div className="search-box">
              <input
                type="text"
                placeholder="Nhập sản phẩm cần tìm kiếm..."
                className="expanded-search"
              />
              <button>
                <i className="fas fa-search"></i>
              </button>
            </div>
            <select className="status-filter">
              <option value="">Trạng thái</option>
              <option value="active">Đang bán</option>
              <option value="inactive">Ngừng bán</option>
            </select>
            <p className="add-product-btn">
              <Link href="/admin/products/add_product"><i className="fas fa-plus"></i> Thêm sản phẩm</Link>
            </p> 
          </div>
        </div>

        <div className="table-responsive">
          <table className="product-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên sản phẩm</th>
                <th>Ảnh</th>
                <th>Danh mục</th>
                <th>Thương hiệu</th>
                <th>Giá (Đ)</th>
                <th>Giá giảm (Đ)</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {saleProducts.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>{item.name}</td>
                  <td>
                    <img src={item.img} alt="Product Thumbnail" className="product-thumb" />
                  </td>
                  <td>{item.category}</td>
                  <td>{item.brand}</td>
                  <td>{item.price}</td>
                  <td>{item.salePrice}</td>
                  <td>
                    <label className="switch">
                      <input type="checkbox" checked={item.status} readOnly />
                      <span className="slider"></span>
                    </label>
                  </td>
                  <td className="actions">
                    <button className="action-btn delete-btn">
                      <i className="fas fa-trash"></i> Xóa
                    </button>
                    <Link href={`/admin/products/edit_product?id=${item.id}`} className="action-btn edit-btn">
                      <i className="fas fa-edit"></i> Sửa
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination"></div>
      </section>
    </main>
  );
}
