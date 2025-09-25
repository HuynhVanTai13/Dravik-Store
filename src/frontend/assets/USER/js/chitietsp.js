//IMG NHỎ CỦA SP
const mainImage = document.getElementById('mainImage');
const thumbnails = document.querySelectorAll('.thumbnail');

thumbnails.forEach(thumb => {
    thumb.addEventListener('click', () => {
        // Đổi ảnh lớn
        mainImage.src = thumb.src;
        // Bỏ class 'selected' khỏi các ảnh nhỏ
        thumbnails.forEach(t => t.classList.remove('selected'));
        // Thêm class 'selected' cho ảnh được chọn
        thumb.classList.add('selected');
    });
});





// CHỌN MÀU SẮC SP
const colorBoxes = document.querySelectorAll('.color');
const colorInfo = document.getElementById('color-info');

colorBoxes.forEach(box => {
    box.addEventListener('click', () => {
        if (box.classList.contains('selected')) {
            box.classList.remove('selected');
            colorInfo.textContent = '';
        } else {
            colorBoxes.forEach(c => c.classList.remove('selected'));
            box.classList.add('selected');
            colorInfo.textContent = box.dataset.color;
        }
    });
});





// CHỌN SIZE SP
const sizeButtons = document.querySelectorAll('.sizes button');
const sizeInfo = document.getElementById('size-info');

sizeButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Nếu đang được chọn, thì bỏ chọn
        if (button.classList.contains('selected')) {
            button.classList.remove('selected');
            sizeInfo.textContent = '';
        } else {
            // Bỏ chọn tất cả nút khác
            sizeButtons.forEach(b => b.classList.remove('selected'));
            // Chọn nút hiện tại
            button.classList.add('selected');
            // Hiển thị thông tin kích thước
            sizeInfo.textContent = button.textContent + ' ' + button.dataset.info;
        }
    });
});





// TĂNG GIẢM SỐ LƯỢNG SP TRANG CHI TIẾT
function changeQty(amount) {
    const input = document.getElementById('qty');
    let current = parseInt(input.value);
    if (isNaN(current)) current = 1;
    let newQty = current + amount;
    if (newQty < 1) newQty = 1;
    input.value = newQty;
}





// MÔ TẢ BÊN DƯỚI SP
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Xoá active cũ
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        // Thêm active mới
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        const panel = document.getElementById(target);
        if (panel) {
            panel.classList.add('active');
        }
    });
});





//   SAO ĐÁNH GIÁ NHẬN XÉT
const stars = document.querySelectorAll('#star-rating .star');
let selectedRating = 0;

stars.forEach((star, index) => {
    star.addEventListener('click', () => {
        const clickedRating = index + 1;
        // Nếu click lại cùng rating thì reset
        if (clickedRating === selectedRating) {
            selectedRating = 0;
        } else {
            selectedRating = clickedRating;
        }
        // Cập nhật class active
        stars.forEach((s, i) => {
            s.classList.toggle('active', i < selectedRating);
        });
    });
});