    // Lấy các phần tử trong DOM
    const openBtn = document.getElementById("openVoucherBtn"); // Nút mở popup
    const overlay = document.getElementById("voucherPopupOverlay"); // Overlay của popup chọn mã
    const closeBtn = document.getElementById("closeVoucherBtn"); // Nút đóng popup
    const selectedCodesContainer = document.getElementById("selectedCodesContainer"); // Khu vực hiển thị mã đã chọn
    const applyBtn = document.getElementById("applyBtn"); // Nút "Áp dụng mã giảm giá"

    // Hai biến để lưu trữ mã đã chọn
    let selected = { product: null, shipping: null }; // Mã đã áp dụng chính thức
    let tempSelected = { product: null, shipping: null }; // Mã được chọn tạm thời trong popup

    // Khi click vào nút "Chọn mã giảm giá"
    openBtn.onclick = () => {
        overlay.classList.add("active"); // Hiển thị popup
        tempSelected = {...selected }; // Lưu lại trạng thái hiện tại để người dùng chỉnh sửa
        updateVoucherState("product"); // Cập nhật lại giao diện các mã thuộc nhóm "product"
        updateVoucherState("shipping"); // (nếu có nhóm "shipping")
    };

    // Nút đóng popup
    closeBtn.onclick = () => overlay.classList.remove("active");

    // Đóng popup nếu người dùng click ra ngoài vùng nội dung
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.classList.remove("active");
    };

    // Hàm cập nhật hiển thị mã đã chọn (sau khi nhấn áp dụng)
    function updateSelectedDisplay() {
        selectedCodesContainer.innerHTML = ''; // Xóa tất cả các mã đang hiển thị

        // Lặp qua từng loại mã (product, shipping...)
        Object.entries(selected).forEach(([type, code]) => {
            if (code) {
                // Tạo "badge" hiển thị mã
                const badge = document.createElement('span');
                badge.className = 'selected-code';

                // Tạo icon (hình tag)
                const icon = document.createElement('i');
                icon.className = 'fa-solid fa-tags';
                icon.style.marginRight = '5px';

                // Gắn mã vào
                const codeText = document.createTextNode(code);

                // Tạo nút xóa mã đã chọn
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '✕';
                removeBtn.onclick = () => {
                    selected[type] = null; // Gỡ bỏ mã khỏi danh sách đã chọn
                    updateSelectedDisplay(); // Cập nhật lại hiển thị
                };

                // Gắn tất cả lại với nhau
                badge.appendChild(icon);
                badge.appendChild(codeText);
                badge.appendChild(removeBtn);
                selectedCodesContainer.appendChild(badge);
            }
        });
    }

    // Cập nhật trạng thái các mã giảm giá trong popup (đã chọn hay không)
    function updateVoucherState(type) {
        const items = document.querySelectorAll(`.voucher-item[data-type="${type}"]`);
        items.forEach(item => {
            const code = item.dataset.code;
            const radio = item.querySelector('input[type="radio"]');

            // Nếu mã này đang được chọn tạm thời
            if (tempSelected[type] === code) {
                radio.checked = true;
                item.classList.remove("disabled"); // Hiển thị nổi bật
            } else {
                radio.checked = false;
                // Nếu đã chọn mã khác → các mã còn lại mờ đi
                if (tempSelected[type]) {
                    item.classList.add("disabled");
                } else {
                    item.classList.remove("disabled"); // Nếu chưa chọn gì → không làm mờ
                }
            }
        });
    }

    // Bắt sự kiện click trên từng voucher
    document.querySelectorAll(".voucher-item").forEach(item => {
        item.addEventListener("click", () => {
            const type = item.dataset.type;
            const code = item.dataset.code;

            // Toggle chọn/bỏ chọn mã
            if (tempSelected[type] === code) {
                tempSelected[type] = null;
            } else {
                tempSelected[type] = code;
            }

            updateVoucherState(type); // Cập nhật lại trạng thái giao diện
        });
    });

    // Khi click nút "Áp dụng mã"
    applyBtn.onclick = () => {
        selected = {...tempSelected }; // Lưu các mã đã chọn chính thức
        updateSelectedDisplay(); // Cập nhật lại giao diện bên ngoài
        overlay.classList.remove("active"); // Đóng popup
    };

    // Hiển thị popup điều kiện của từng mã
    function toggleConditionPopup(show, code = "") {
        const popup = document.getElementById("conditionPopupOverlay");

        if (show) {
            // Tìm item voucher theo mã code
            const item = document.querySelector(`.voucher-item[data-code="${code}"]`);
            const listHTML = item.querySelector(".voucher-conditions").innerHTML;

            // Cập nhật nội dung popup điều kiện
            document.getElementById("popupCode").textContent = code;
            document.getElementById("popupCodeText").textContent = code;
            const list = document.getElementById("popupConditions");
            list.innerHTML = listHTML;
        }

        // Hiển thị hoặc ẩn popup điều kiện
        popup.style.display = show ? "flex" : "none";
    }


    // ==========================thay doi so luong======================

    function changeQty(button, amount) {
        const input = button.parentElement.querySelector('.qty-input');
        let current = parseInt(input.value);
        if (isNaN(current)) current = 1;
        let newQty = current + amount;
        if (newQty < 1) newQty = 1;
        input.value = newQty;
    }