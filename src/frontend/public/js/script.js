document.addEventListener('DOMContentLoaded', function() {
    // Chart 1: Revenue 12 Months Chart (Bar Chart)
    const revenue12MonthsCtx = document.getElementById('revenue12MonthsChart');
    if (revenue12MonthsCtx) { // Check if element exists before creating chart
        new Chart(revenue12MonthsCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
                datasets: [{
                    label: 'Doanh thu (VNĐ)',
                    data: [20000000, 28000000, 18000000, 35000000, 25000000, 30000000, 42000000, 38000000, 45000000, 50000000, 55000000, 60000000],
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Doanh thu (VNĐ)'
                        },
                        ticks: {
                            callback: function(value, index, values) {
                                if (value >= 1000000) {
                                    return (value / 1000000) + ' triệu';
                                }
                                return value;
                            }
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Tháng'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        });
    }


    // Chart 2: Weekly Revenue Chart (Line Chart)
    const weeklyRevenueCtx = document.getElementById('weeklyRevenueChart');
    if (weeklyRevenueCtx) {
        new Chart(weeklyRevenueCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
                datasets: [{
                    label: 'Doanh thu tuần (VNĐ)',
                    data: [10000000, 12000000, 8000000, 15000000, 11000000, 13000000, 16000000],
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value, index, values) {
                                if (value >= 1000000) {
                                    return (value / 1000000) + ' triệu';
                                }
                                return value;
                            }
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        });
    }

    // Chart 3: Yearly Revenue Chart (Bar Chart)
    const yearlyRevenueCtx = document.getElementById('yearlyRevenueChart');
    if (yearlyRevenueCtx) {
        new Chart(yearlyRevenueCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['2020', '2021', '2022', '2023', '2024'],
                datasets: [{
                    label: 'Doanh thu năm (VNĐ)',
                    data: [80000000, 120000000, 150000000, 200000000, 250000000],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value, index, values) {
                                if (value >= 1000000) {
                                    return (value / 1000000) + ' triệu';
                                }
                                return value;
                            }
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        });
    }

    // Sidebar Menu Toggle (for sub-menus)
    const menuToggles = document.querySelectorAll('.menu-toggle');

    menuToggles.forEach(toggle => {
        const parentLi = toggle.parentElement; // Get the parent <li>
        const subMenu = parentLi.querySelector('.sub-menu');

        // --- Bắt đầu phần SỬA LỖI MỚI ---
        // Khi tải trang, nếu mục menu đã có class 'open', hãy mở nó ra
        if (parentLi.classList.contains('open') && subMenu) {
            subMenu.style.maxHeight = subMenu.scrollHeight + 'px';
        }
        // --- Kết thúc phần SỬA LỖI MỚI ---


        toggle.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default link behavior

            parentLi.classList.toggle('open'); // Toggle 'open' class

            if (subMenu) {
                // Adjust max-height for smooth transition
                if (parentLi.classList.contains('open')) {
                    // Cập nhật scrollHeight mỗi lần mở để đảm bảo đúng chiều cao
                    subMenu.style.maxHeight = subMenu.scrollHeight + 'px';
                } else {
                    subMenu.style.maxHeight = '0';
                }
            }
        });
    });

    // Optional: Close dropdowns when clicking outside
    document.addEventListener('click', function(event) {
        const userProfile = document.querySelector('.user-profile');
        const userDropdown = document.querySelector('.user-dropdown');
        // Check if the clicked element is NOT the user profile or within the dropdown
        if (userProfile && !userProfile.contains(event.target) && userDropdown && userDropdown.style.display === 'block') {
            userDropdown.style.display = 'none';
        }
    });

    // Basic dropdown toggle for user profile
    const userProfileToggle = document.querySelector('.user-profile');
    if (userProfileToggle) {
        userProfileToggle.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent click from bubbling up to document and closing immediately
            const userDropdown = this.querySelector('.user-dropdown');
            if (userDropdown) {
                userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
    }
});
//----------------------------add-product
document.addEventListener('DOMContentLoaded', function() {
    // Sidebar menu toggle functionality
    document.querySelectorAll('.menu-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default link behavior
            const parentLi = this.closest('li');
            const subMenu = parentLi.querySelector('.sub-menu');

            // Close all other open sub-menus at the same level
            document.querySelectorAll('.main-menu .menu-item-has-children.open').forEach(otherLi => {
                if (otherLi !== parentLi) {
                    otherLi.classList.remove('open');
                    otherLi.querySelector('.sub-menu').style.maxHeight = '0';
                }
            });

            // Toggle current sub-menu
            parentLi.classList.toggle('open');
            if (subMenu) {
                if (parentLi.classList.contains('open')) {
                    subMenu.style.maxHeight = subMenu.scrollHeight + 'px';
                } else {
                    subMenu.style.maxHeight = '0';
                }
            }
        });
    });
    // Initialize the "Sản phẩm" sub-menu to be open on load, as per the image
    const sanPhamMenu = document.querySelector('.menu-item-has-children.open');
    if (sanPhamMenu) {
        const subMenu = sanPhamMenu.querySelector('.sub-menu');
        if (subMenu) {
            subMenu.style.maxHeight = subMenu.scrollHeight + 'px';
        }
    }


    // User profile dropdown toggle
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
        userProfile.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent document click from immediately closing
            this.classList.toggle('active');
        });

        // Close dropdown if clicked outside
        document.addEventListener('click', function(event) {
            if (!userProfile.contains(event.target) && userProfile.classList.contains('active')) {
                userProfile.classList.remove('active');
            }
        });
    }

    // --- Product Edit Page Specific JS ---

    // Function to set up listeners for a new variant item (called on initial load and when adding new variant)
    function setupVariantListeners(variantItem) {
        // Handle file input change to display selected file name and preview
        const fileInput = variantItem.querySelector('.hidden-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', function() {
                const fileNameSpan = this.closest('.file-input-container').querySelector('.file-name');
                const imagePreviewWrapper = this.closest('.variant-image-upload').querySelector('.image-preview-wrapper');
                const imagePreview = imagePreviewWrapper.querySelector('.image-preview');

                if (this.files && this.files[0]) {
                    fileNameSpan.textContent = this.files[0].name;

                    const reader = new FileReader();
                    reader.onload = function(e) {
                        imagePreview.src = e.target.result;
                        imagePreviewWrapper.style.display = 'block'; // Show preview
                    };
                    reader.readAsDataURL(this.files[0]);
                } else {
                    fileNameSpan.textContent = 'Chưa có tệp nào được chọn';
                    imagePreview.src = ''; // Clear preview
                    imagePreviewWrapper.style.display = 'none'; // Hide preview
                }
            });
        }

        // Handle delete image button (visual only)
        const deleteImageBtn = variantItem.querySelector('.delete-image-btn');
        if (deleteImageBtn) {
            deleteImageBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const variantImageUpload = this.closest('.variant-image-upload');
                const fileInput = variantImageUpload.querySelector('.hidden-file-input');
                const fileNameSpan = variantImageUpload.querySelector('.file-name');
                const imagePreviewWrapper = variantImageUpload.querySelector('.image-preview-wrapper');
                const imagePreview = imagePreviewWrapper.querySelector('.image-preview');

                // Clear file input
                fileInput.value = ''; // Reset the input value to clear selected file
                fileNameSpan.textContent = 'Chưa có tệp nào được chọn';
                imagePreview.src = '';
                imagePreviewWrapper.style.display = 'none'; // Hide preview

                alert('Đã xóa ảnh (chức năng này chỉ là trực quan)');
            });
        }

        // Add Size button functionality
        const addSizeBtn = variantItem.querySelector('.add-size-btn');
        if (addSizeBtn) {
            addSizeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const variantSizesContainer = this.closest('.variant-sizes');
                const newSizeRowTemplate = variantSizesContainer.querySelector('.new-size-template');
                if (newSizeRowTemplate) {
                    const clonedRow = newSizeRowTemplate.cloneNode(true);
                    clonedRow.style.display = 'flex'; // Make it visible
                    clonedRow.classList.remove('new-size-template'); // Remove template class

                    // Clear input values in the cloned row
                    clonedRow.querySelector('select').value = '';
                    clonedRow.querySelector('input[type="number"]').value = '';

                    // Add event listener for the new remove size button
                    clonedRow.querySelector('.remove-size-btn').addEventListener('click', function() {
                        clonedRow.remove();
                    });

                    variantSizesContainer.insertBefore(clonedRow, this); // Insert before the add size button
                }
            });
        }

        // Initial event listeners for all existing remove size buttons within this variant
        variantItem.querySelectorAll('.size-input-row .remove-size-btn').forEach(button => {
            // Remove previous listeners to prevent duplicates if setupVariantListeners is called multiple times
            button.removeEventListener('click', handleRemoveSizeButtonClick);
            button.addEventListener('click', handleRemoveSizeButtonClick);
        });

        // Function to handle remove size button click (defined outside to be reusable)
        function handleRemoveSizeButtonClick(e) {
            e.preventDefault();
            this.closest('.size-input-row').remove();
        }


        // Remove variant button
        const removeVariantBtn = variantItem.querySelector('.remove-variant-btn');
        if (removeVariantBtn) {
            removeVariantBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('Bạn có chắc chắn muốn xóa biến thể này không?')) {
                    variantItem.remove();
                    // Optionally re-number variant items after removal
                    document.querySelectorAll('.product-variants .variant-item').forEach((item, index) => {
                        item.querySelector('.variant-item-header h4').textContent = `Sản phẩm ${index + 1}`;
                    });
                }
            });
        }
    }

    // Setup listeners for all initial variant items on page load
    document.querySelectorAll('.product-variants .variant-item').forEach(variantItem => {
        setupVariantListeners(variantItem);
    });

    // Add Color/Variant button functionality
    document.querySelector('.add-color-btn').addEventListener('click', function(e) {
        e.preventDefault();
        const productVariantsContainer = document.querySelector('.product-variants');
        const variantTemplate = document.querySelector('.variant-item-template'); // Get the hidden template

        if (variantTemplate) {
            const clonedVariant = variantTemplate.cloneNode(true); // Deep clone
            clonedVariant.classList.remove('variant-item-template'); // Remove template class
            clonedVariant.classList.add('variant-item'); // Add actual variant class
            clonedVariant.style.display = 'block'; // Make it visible

            // Update heading for new variant (e.g., "Sản phẩm 2")
            const variantItemsCount = productVariantsContainer.querySelectorAll('.variant-item').length + 1;
            clonedVariant.querySelector('.variant-item-header h4').textContent = `Sản phẩm ${variantItemsCount}`;

            // Reset image preview for the new variant (important for cloned template)
            const newFileInput = clonedVariant.querySelector('.hidden-file-input');
            const newFileNameSpan = clonedVariant.querySelector('.file-name');
            const newImagePreviewWrapper = clonedVariant.querySelector('.image-preview-wrapper');
            const newImagePreview = clonedVariant.querySelector('.image-preview');

            if (newFileInput) newFileInput.value = ''; // Clear file input value
            if (newFileNameSpan) newFileNameSpan.textContent = 'Chưa có tệp nào được chọn';
            // Set default placeholder image, but initially hide the wrapper if no image is selected
            if (newImagePreview) newImagePreview.src = 'assets/images/product-placeholder.png';
            if (newImagePreviewWrapper) newImagePreviewWrapper.style.display = 'none';


            // Setup listeners for the newly cloned variant item
            setupVariantListeners(clonedVariant);

            productVariantsContainer.appendChild(clonedVariant);
            alert('Đã thêm biến thể mới (chức năng này chỉ là trực quan)');
        }
    });

    // Save product button (visual only)
    document.querySelector('.save-product-btn').addEventListener('click', function(e) {
        e.preventDefault();
        alert('Đã lưu sản phẩm (chức năng này chỉ là trực quan)');
        // In a real application, you would collect form data and send it to the server.
    });
});
document.addEventListener('DOMContentLoaded', function() {
    // Sidebar menu toggle functionality
    document.querySelectorAll('.menu-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default link behavior
            const parentLi = this.closest('li');
            const subMenu = parentLi.querySelector('.sub-menu');

            // Close all other open sub-menus at the same level
            document.querySelectorAll('.main-menu .menu-item-has-children.open').forEach(otherLi => {
                if (otherLi !== parentLi) {
                    otherLi.classList.remove('open');
                    otherLi.querySelector('.sub-menu').style.maxHeight = '0';
                }
            });

            // Toggle current sub-menu
            parentLi.classList.toggle('open');
            if (subMenu) {
                if (parentLi.classList.contains('open')) {
                    subMenu.style.maxHeight = subMenu.scrollHeight + 'px';
                } else {
                    subMenu.style.maxHeight = '0';
                }
            }
        });
    });
});

// menu mobile
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('mySlidingSidebar');
    const body = document.body;
    const hamburgerButton = document.getElementById('hamburgerButton');

    // Function to close sidebar
    function closeSidebar() {
        sidebar.classList.remove('open');
        body.classList.remove('sidebar-open');
    }

    // Toggle sidebar on hamburger button click
    if (hamburgerButton) {
        hamburgerButton.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            body.classList.toggle('sidebar-open');
        });
    }

    // Close sidebar when clicking outside (on the overlay)
    document.addEventListener('click', (event) => {
        // Check if sidebar is open AND click is outside sidebar AND not on the hamburger button
        if (body.classList.contains('sidebar-open') &&
            !sidebar.contains(event.target) &&
            !hamburgerButton.contains(event.target)) {
            closeSidebar();
        }
    });

    // Close sidebar if window is resized to desktop size while sidebar is open
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && body.classList.contains('sidebar-open')) {
            closeSidebar();
        }
    });
});