const rowsPerPage = 5;
let currentPage = 1;

function paginateTable() {
    const rows = document.querySelectorAll('#ordersBody tr');
    const totalPages = Math.ceil(rows.length / rowsPerPage);

    rows.forEach((row, index) => {
        row.style.display = (index >= (currentPage - 1) * rowsPerPage && index < currentPage * rowsPerPage) ?
            '' : 'none';
    });

    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    if (currentPage > 1) {
        const prev = document.createElement('a');
        prev.href = '#';
        prev.innerHTML = '&laquo;';
        prev.addEventListener('click', e => {
            e.preventDefault();
            currentPage--;
            paginateTable();
        });
        pagination.appendChild(prev);
    }

    for (let i = 1; i <= totalPages; i++) {
        const page = document.createElement('a');
        page.href = '#';
        page.textContent = i;
        if (i === currentPage) page.classList.add('active');
        page.addEventListener('click', e => {
            e.preventDefault();
            currentPage = i;
            paginateTable();
        });
        pagination.appendChild(page);
    }

    if (currentPage < totalPages) {
        const next = document.createElement('a');
        next.href = '#';
        next.innerHTML = '&raquo;';
        next.addEventListener('click', e => {
            e.preventDefault();
            currentPage++;
            paginateTable();
        });
        pagination.appendChild(next);
    }
}

document.addEventListener('DOMContentLoaded', paginateTable);