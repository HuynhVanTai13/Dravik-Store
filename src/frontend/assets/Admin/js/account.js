// const btnOpen = document.getElementById("btnOpenPopup");
// const btnClose = document.getElementById("btnClosePopup");
// const popupOverlay = document.getElementById("popupOverlay");

// btnOpen.addEventListener("click", () => {
//     popupOverlay.style.display = "flex";
// });

// btnClose.addEventListener("click", () => {
//     popupOverlay.style.display = "none";
// });

// // Đóng popup khi click ra ngoài vùng popup
// popupOverlay.addEventListener("click", (e) => {
//     if (e.target === popupOverlay) {
//         popupOverlay.style.display = "none";
//     }
// });


// // ====================popup add voucher=======================
// document.addEventListener('DOMContentLoaded', () => {
//     const btnOpen = document.getElementById("btnOpenPopup");
//     const btnClose = document.getElementById("btnClosePopup");
//     const popupOverlay = document.getElementById("popupOverlay");

//     // Event Listeners cho Popup
//     btnOpen.addEventListener("click", () => {
//         popupOverlay.style.display = "flex"; // Hiện popup
//         setTimeout(() => {
//             popupOverlay.classList.add("show"); // Thêm class để kích hoạt transition
//         }, 10); // Một chút delay để trình duyệt kịp cập nhật display
//     });

//     btnClose.addEventListener("click", () => {
//         popupOverlay.classList.remove("show"); // Gỡ class để kích hoạt transition ngược lại
//         setTimeout(() => {
//             popupOverlay.style.display = "none"; // Ẩn popup sau khi transition kết thúc
//         }, 300); // Phải khớp với thời gian transition trong CSS
//     });

//     // Đóng popup khi click ra ngoài vùng popup
//     popupOverlay.addEventListener("click", (e) => {
//         if (e.target === popupOverlay) {
//             popupOverlay.classList.remove("show");
//             setTimeout(() => {
//                 popupOverlay.style.display = "none";
//             }, 300);
//         }
//     });

// });

// // ====================popup edit voucher=======================
// document.addEventListener('DOMContentLoaded', () => {
//     const btneditOpen = document.getElementById("btneditOpenPopup");
//     const btnClose = document.getElementById("btn-edit-ClosePopup");
//     const popupeditOverlay = document.getElementById("popupeditOverlay");

//     // Event Listeners cho Popup
//     btneditOpen.addEventListener("click", () => {
//         popupeditOverlay.style.display = "flex"; // Hiện popup
//         setTimeout(() => {
//             popupeditOverlay.classList.add("show"); // Thêm class để kích hoạt transition
//         }, 10); // Một chút delay để trình duyệt kịp cập nhật display
//     });

//     btnClose.addEventListener("click", () => {
//         popupeditOverlay.classList.remove("show"); // Gỡ class để kích hoạt transition ngược lại
//         setTimeout(() => {
//             popupeditOverlay.style.display = "none"; // Ẩn popup sau khi transition kết thúc
//         }, 300); // Phải khớp với thời gian transition trong CSS
//     });

//     // Đóng popup khi click ra ngoài vùng popup
//     popupOverlay.addEventListener("click", (e) => {
//         if (e.target === popupOverlay) {
//             popupOverlay.classList.remove("show");
//             setTimeout(() => {
//                 popupOverlay.style.display = "none";
//             }, 300);
//         }
//     });

// });

//======================
// Mở popup với form tương ứng
document.querySelectorAll('.btnOpenPopup').forEach(button => {
    button.addEventListener('click', () => {
        const formId = button.dataset.form;
        const formTemplate = document.getElementById(formId);

        if (formTemplate) {
            const clone = formTemplate.cloneNode(true);
            document.getElementById('popupBody').innerHTML = '';
            document.getElementById('popupBody').appendChild(clone);
            document.getElementById('popupOverlay').style.display = 'flex';
        }
    });
});

// Đóng popup
document.getElementById('btnClosePopup').addEventListener('click', () => {
    document.getElementById('popupOverlay').style.display = 'none';
    document.getElementById('popupBody').innerHTML = '';
});