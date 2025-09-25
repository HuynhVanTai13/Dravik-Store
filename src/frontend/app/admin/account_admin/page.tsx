"use client";
import React from "react";
import "../../../styles/account.css";
// Nếu dùng ảnh placeholder, bạn nên đặt ở public/assets/images/product-placeholder.png
import Link from "next/link";

export default function AccountAdminPage() {
    return (
        <main className="main-content">
            <section className="section-card product-list-section">
                <div className="product-list-header">
                    <h2>Danh sách tài khoản admin</h2>
                    <div className="header-actions">
                        <div className="search-box-admin">
                            <input
                                type="text"
                                placeholder="Nhập tên admin cần tìm kiếm..."
                                className="expanded-search"
                            />
                            <button>
                                <i className="fas fa-search" />
                            </button>
                        </div>
                        <select className="status-admin">
                            <option value="">Trạng thái</option>
                            <option value="active">Đang hoạt động</option>
                            <option value="inactive">Ngừng hoạt động</option>
                        </select>
                        <button className="add-product-btn">
                            <Link href="/admin/account_admin/add_account_admin"><i className="fas fa-plus"></i> Thêm sản phẩm</Link>
                        </button>
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="product-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Tên tài khoản</th>
                                <th>Email</th>
                                <th>Ngày sinh</th>
                                <th>Số điện thoại</th>
                                <th>Ngày tạo</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td>Lê Văn Khơi</td>
                                <td>khoi@mail.com</td>
                                <td>23/12/2004</td>
                                <td>082807703</td>
                                <td>12/3/2025</td>
                                <td>
                                    <label className="switch">
                                        <input type="checkbox" />
                                        <span className="slider" />
                                    </label>
                                </td>
                                <td className="actions">
                                    <button className="action-btn delete-btn">
                                        {" "}
                                        <a href="">
                                            <i className="fas fa-trash" /> Xóa
                                        </a>{" "}
                                    </button>
                                    <button className="action-btn edit-btn">
                                        <Link href="/admin/account_admin/edit_account_admin"><i className="fas fa-edit" /> Sửa</Link>
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>1</td>
                                <td>Lê Văn Khơi</td>
                                <td>khoi@mail.com</td>
                                <td>23/12/2004</td>
                                <td>082807703</td>
                                <td>12/3/2025</td>
                                <td>
                                    <label className="switch">
                                        <input type="checkbox" />
                                        <span className="slider" />
                                    </label>
                                </td>
                                <td className="actions">
                                    <button className="action-btn delete-btn">
                                        {" "}
                                        <a href="">
                                            <i className="fas fa-trash" /> Xóa
                                        </a>{" "}
                                    </button>
                                    <button className="action-btn edit-btn">
                                        <a href="edit-account.html">
                                            <i className="fas fa-edit" /> Sửa
                                        </a>
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>1</td>
                                <td>Lê Văn Khơi</td>
                                <td>khoi@mail.com</td>
                                <td>23/12/2004</td>
                                <td>082807703</td>
                                <td>12/3/2025</td>
                                <td>
                                    <label className="switch">
                                        <input type="checkbox" />
                                        <span className="slider" />
                                    </label>
                                </td>
                                <td className="actions">
                                    <button className="action-btn delete-btn">
                                        {" "}
                                        <a href="">
                                            <i className="fas fa-trash" /> Xóa
                                        </a>{" "}
                                    </button>
                                    <button className="action-btn edit-btn">
                                        <a href="edit-account.html">
                                            <i className="fas fa-edit" /> Sửa
                                        </a>
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>1</td>
                                <td>Lê Văn Khơi</td>
                                <td>khoi@mail.com</td>
                                <td>23/12/2004</td>
                                <td>082807703</td>
                                <td>12/3/2025</td>
                                <td>
                                    <label className="switch">
                                        <input type="checkbox" />
                                        <span className="slider" />
                                    </label>
                                </td>
                                <td className="actions">
                                    <button className="action-btn delete-btn">
                                        {" "}
                                        <a href="">
                                            <i className="fas fa-trash" /> Xóa
                                        </a>{" "}
                                    </button>
                                    <button className="action-btn edit-btn">
                                        <a href="edit-account.html">
                                            <i className="fas fa-edit" /> Sửa
                                        </a>
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>1</td>
                                <td>Lê Văn Khơi</td>
                                <td>khoi@mail.com</td>
                                <td>23/12/2004</td>
                                <td>082807703</td>
                                <td>12/3/2025</td>
                                <td>
                                    <label className="switch">
                                        <input type="checkbox" />
                                        <span className="slider" />
                                    </label>
                                </td>
                                <td className="actions">
                                    <button className="action-btn delete-btn">
                                        {" "}
                                        <a href="">
                                            <i className="fas fa-trash" /> Xóa
                                        </a>{" "}
                                    </button>
                                    <button className="action-btn edit-btn">
                                        <a href="edit-account.html">
                                            <i className="fas fa-edit" /> Sửa
                                        </a>
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>1</td>
                                <td>Lê Văn Khơi</td>
                                <td>khoi@mail.com</td>
                                <td>23/12/2004</td>
                                <td>082807703</td>
                                <td>12/3/2025</td>
                                <td>
                                    <label className="switch">
                                        <input type="checkbox" />
                                        <span className="slider" />
                                    </label>
                                </td>
                                <td className="actions">
                                    <button className="action-btn delete-btn">
                                        {" "}
                                        <a href="">
                                            <i className="fas fa-trash" /> Xóa
                                        </a>{" "}
                                    </button>
                                    <button className="action-btn edit-btn">
                                        <a href="edit-account.html">
                                            <i className="fas fa-edit" /> Sửa
                                        </a>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="pagination"></div>
            </section>
        </main>

    );
}
