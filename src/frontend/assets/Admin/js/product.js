// --- Product List Pagination Logic ---
const rowsPerPage = 15; // Số lượng hàng trên mỗi trang
const productTableBody = document.querySelector('.product-table tbody');
let allRows = Array.from(productTableBody.querySelectorAll('tr')); // Lấy tất cả các hàng hiện có trong DOM
let totalRows = allRows.length;
let totalPages = Math.ceil(totalRows / rowsPerPage);
const paginationContainer = document.querySelector('.pagination');

let currentPage = 1; // Trang hiện tại

/**
 * Cập nhật số STT cho các hàng đang hiển thị.
 * @param {number} startIndex - Chỉ số bắt đầu của hàng đầu tiên trên trang hiện tại (tính từ 0).
 */
function updateRowNumbers(startIndex) {
    // Lấy tất cả các hàng hiện tại trong DOM để cập nhật STT
    const currentAllRowsInDOM = Array.from(productTableBody.querySelectorAll('tr'));
    currentAllRowsInDOM.forEach((row, index) => {
        const sttCell = row.querySelector('td:first-child');
        if (sttCell) {
            sttCell.textContent = startIndex + index + 1;
        }
    });
}

function displayPage(page) {
    // Cập nhật lại allRows từ DOM để phản ánh các thay đổi (ví dụ: xóa hàng)
    allRows = Array.from(productTableBody.querySelectorAll('tr'));
    totalRows = allRows.length;
    totalPages = Math.ceil(totalRows / rowsPerPage);

    // Đảm bảo trang hợp lệ
    if (page < 1) page = 1;
    if (page > totalPages && totalPages > 0) page = totalPages;
    else if (totalPages === 0) page = 0; // Khi không có dữ liệu

    currentPage = page; // Cập nhật trang hiện tại

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;

    allRows.forEach((row, index) => {
        if (index >= startIndex && index < endIndex) {
            row.style.display = ''; // Hiển thị hàng
        } else {
            row.style.display = 'none'; // Ẩn hàng
        }
    });

    // Cập nhật lại số STT cho các hàng sau khi ẩn/hiện
    const visibleRows = allRows.filter(row => row.style.display !== 'none');
    visibleRows.forEach((row, index) => {
        const sttCell = row.querySelector('td:first-child');
        if (sttCell) {
            sttCell.textContent = startIndex + index + 1;
        }
    });

    renderPaginationButtons(); // Tạo lại và cập nhật các nút phân trang
}

function renderPaginationButtons() {
    paginationContainer.innerHTML = ''; // Xóa các nút cũ

    if (totalPages === 0) { // Không có dữ liệu, không hiện phân trang
        return;
    }

    // Nút "Trước"
    const prevButton = document.createElement('a');
    prevButton.href = '#';
    prevButton.classList.add('page-link', 'prev');
    if (currentPage === 1) {
        prevButton.classList.add('disabled');
    }
    prevButton.dataset.page = 'prev';
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    paginationContainer.appendChild(prevButton);

    // Logic hiển thị số trang
    const maxPagesToShow = 5; // Số lượng nút số trang tối đa hiển thị (ví dụ: 1 ... 4 5 6 ... 10)
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const middleOffset = Math.floor(maxPagesToShow / 2);
        if (currentPage <= middleOffset + 1) {
            startPage = 1;
            endPage = maxPagesToShow - 1;
        } else if (currentPage + middleOffset >= totalPages) {
            startPage = totalPages - (maxPagesToShow - 2);
            endPage = totalPages;
        } else {
            startPage = currentPage - middleOffset + 1;
            endPage = currentPage + middleOffset - 1;
        }
        // Ensure endPage doesn't exceed totalPages
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - (maxPagesToShow - 2)); // Adjust start if end overflows
        }
        // Ensure startPage doesn't go below 1
        if (startPage < 1) {
            startPage = 1;
            endPage = Math.min(totalPages, startPage + (maxPagesToShow - 2)); // Adjust end if start underflows
        }
    }

    // Hiển thị nút trang đầu tiên (nếu cần)
    if (startPage > 1) {
        const firstPageLink = document.createElement('a');
        firstPageLink.href = '#';
        firstPageLink.classList.add('page-link');
        firstPageLink.dataset.page = 1;
        firstPageLink.textContent = '1';
        paginationContainer.appendChild(firstPageLink);
        if (startPage > 2) { // Chỉ hiển thị "..." nếu có khoảng cách
            const dots = document.createElement('span');
            dots.classList.add('page-dots');
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }
    }

    // Hiển thị các nút số trang chính
    for (let i = startPage; i <= endPage; i++) {
        const pageLink = document.createElement('a');
        pageLink.href = '#';
        pageLink.classList.add('page-link');
        if (i === currentPage) {
            pageLink.classList.add('active');
        }
        pageLink.dataset.page = i;
        pageLink.textContent = i;
        paginationContainer.appendChild(pageLink);
    }

    // Hiển thị nút trang cuối cùng (nếu cần)
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) { // Chỉ hiển thị "..." nếu có khoảng cách
            const dots = document.createElement('span');
            dots.classList.add('page-dots');
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }
        const lastPageLink = document.createElement('a');
        lastPageLink.href = '#';
        lastPageLink.classList.add('page-link');
        lastPageLink.dataset.page = totalPages;
        lastPageLink.textContent = totalPages;
        paginationContainer.appendChild(lastPageLink);
    }

    // Nút "Sau"
    const nextButton = document.createElement('a');
    nextButton.href = '#';
    nextButton.classList.add('page-link', 'next');
    if (currentPage === totalPages || totalPages === 0) {
        nextButton.classList.add('disabled');
    }
    nextButton.dataset.page = 'next';
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    paginationContainer.appendChild(nextButton);
}

// Gắn sự kiện cho các nút phân trang (dùng event delegation)
paginationContainer.addEventListener('click', (e) => {
    e.preventDefault();
    const target = e.target.closest('.page-link');

    if (!target || target.classList.contains('disabled')) {
        return;
    }

    const pageType = target.dataset.page;
    if (pageType === 'prev') {
        displayPage(currentPage - 1);
    } else if (pageType === 'next') {
        displayPage(currentPage + 1);
    } else if (!isNaN(pageType)) {
        displayPage(parseInt(pageType));
    }
});

// Khởi tạo trang đầu tiên khi tải trang
displayPage(1);