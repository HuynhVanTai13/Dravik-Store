document.addEventListener("DOMContentLoaded", function () {
  // Nút chuyển đến trang Đăng ký
  const registerBtn = document.getElementById("registerBtn");
  if (registerBtn) {
    registerBtn.addEventListener("click", function () {
      // Hiệu ứng trượt có thể thay thế bằng chuyển trang
      window.location.href = "register.html";
    });
  }

  // Nút chuyển đến trang Đăng nhập
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", function () {
      window.location.href = "login.html";
    });
  }

  // Bạn có thể thêm hiệu ứng mượt hơn nếu để chung login/register trong 1 file HTML
  // Ví dụ: thêm/tắt class 'slide' vào container để chạy hiệu ứng CSS
});
