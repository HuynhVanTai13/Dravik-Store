"use client";
import React from "react";
import "../../../styles/product.css"; // Đảm bảo đúng đường dẫn tới file CSS của bạn
import Link from "next/link";

export default function InventoryPage() {
  // Dữ liệu mẫu
  const products = [
    {
      id: 1,
      name: "Áo Hoodie Basic",
      img: "https://via.placeholder.com/50/cccccc/ffffff?text=P1",
      category: "Áo Hoodie",
      brand: "Unisex Store",
      price: "149.000",
      sold: 30,
      stock: 12,
      status: true,
    },
    {
      id: 2,
      name: "Quần Jean Slim Fit",
      img: "https://via.placeholder.com/50/cccccc/ffffff?text=P2",
      category: "Quần Jean",
      brand: "Levi's",
      price: "499.000",
      sold: 22,
      stock: 5,
      status: false,
    },
    // ... Thêm các sản phẩm khác tại đây
  ];

  return (
    <main className="main-content">
      <section className="section-card product-list-section">
        <div className="product-list-header">
          <h2>Danh sách sản phẩm tồn kho</h2>
          <div className="header-actions">
            <div className="search-box">
              <input type="text" placeholder="Nhập sản phẩm cần tìm kiếm..." className="expanded-search" />
              <button><i className="fas fa-search"></i></button>
            </div>
            <select className="status-filter">
              <option value="">Trạng thái</option>
              <option value="active">Đang bán</option>
              <option value="inactive">Ngừng bán</option>
            </select>
                        
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
                <th>Đã bán</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>{item.name}</td>
                  <td>
                    <img src={item.img} alt="Product Thumbnail" className="product-thumb" />
                  </td>
                  <td>{item.category}</td>
                  <td>{item.brand}</td>
                  <td>{item.price}</td>
                  <td>{item.sold}</td>
                  <td>{item.stock}</td>
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
                    <button className="action-btn edit-btn">
                      <a href={`/admin/products/edit/${item.id}`}>
                        <Link href="/admin/products/edit_product"><i className="fas fa-edit"></i> Sửa</Link>
                      </a>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">{/* Pagination sẽ thêm ở đây nếu cần */}</div>
      </section>
    </main>
  );
}
