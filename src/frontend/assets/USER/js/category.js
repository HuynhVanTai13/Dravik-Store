document.addEventListener('DOMContentLoaded', function() {
    const mainCarouselArea = document.querySelector('.main-carousel-area');
    const carouselContent = mainCarouselArea.querySelector('.carousel-content');
    const prevButton = document.querySelector('.category-swiper-prev');
    const nextButton = document.querySelector('.category-swiper-next');

    let originalItems = Array.from(carouselContent.querySelectorAll('.col-9'));
    let items = []; // This array will hold the cloned and original items

    let itemWidth = 0;
    let slidesPerView = 9; // Default for large screens (number of items visible at once)
    let spaceBetween = 20; // Default spacing
    let currentSlideIndex = 0; // Represents the index of the first item visible in the current view
    let isTransitioning = false; // Flag to prevent multiple clicks during transition

    // Function to update carousel configuration and clone items
    function updateCarouselConfig() {
        const screenWidth = window.innerWidth;

        // Determine slidesPerView and spaceBetween based on screen width
        if (screenWidth < 480) {
            slidesPerView = 3;
            spaceBetween = 5;
        } else if (screenWidth < 768) {
            slidesPerView = 4;
            spaceBetween = 8;
        } else if (screenWidth < 992) {
            slidesPerView = 5;
            spaceBetween = 10;
        } else if (screenWidth < 1240) {
            slidesPerView = 7;
            spaceBetween = 15;
        } else {
            slidesPerView = 9;
            spaceBetween = 20;
        }

        // --- Cloning for infinite loop ---
        // Clear existing items
        carouselContent.innerHTML = '';
        items = [];

        // Number of items to clone from the end and prepend (for backward loop)
        // We need at least slidesPerView items cloned at the beginning for a smooth backward loop
        const prependClonesCount = originalItems.length; // Clone enough for a full cycle (more robust)
        for (let i = 0; i < prependClonesCount; i++) {
            const cloneIndex = (originalItems.length - prependClonesCount + i) % originalItems.length;
            const clone = originalItems[cloneIndex].cloneNode(true);
            carouselContent.appendChild(clone);
            items.push(clone);
        }

        // Add original items
        originalItems.forEach(item => {
            const clone = item.cloneNode(true);
            carouselContent.appendChild(clone);
            items.push(clone);
        });

        // Number of items to clone from the start and append (for forward loop)
        // We need at least slidesPerView items cloned at the end for a smooth forward loop
        const appendClonesCount = originalItems.length; // Clone enough for a full cycle
        for (let i = 0; i < appendClonesCount; i++) {
            const clone = originalItems[i].cloneNode(true);
            carouselContent.appendChild(clone);
            items.push(clone);
        }

        // Initialize currentSlideIndex to the start of the actual original items
        currentSlideIndex = prependClonesCount;

        // Calculate itemWidth based on the visible area
        const visibleWidth = mainCarouselArea.clientWidth;
        itemWidth = (visibleWidth - (spaceBetween * (slidesPerView - 1))) / slidesPerView;

        // Apply calculated width and margin to all items
        items.forEach(item => {
            item.style.width = `${itemWidth}px`;
            item.style.marginRight = `${spaceBetween}px`;
        });

        // Immediately set the position without transition after re-cloning/resizing
        carouselContent.style.transition = 'none';
        carouselContent.style.transform = `translateX(-${currentSlideIndex * (itemWidth + spaceBetween)}px)`;

        // Re-enable transition after a brief moment to allow the jump to render
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                carouselContent.style.transition = 'transform 0.5s ease-in-out';
            });
        });
    }

    // Function to update carousel position
    function updateCarouselPosition() {
        if (isTransitioning) return; // Prevent new transitions during an ongoing one
        isTransitioning = true;

        const offset = currentSlideIndex * (itemWidth + spaceBetween);
        carouselContent.style.transform = `translateX(-${offset}px)`;

        // Add a one-time event listener for transition end to handle loop jumps
        carouselContent.addEventListener('transitionend', handleTransitionEnd, {
            once: true
        });
    }

    // Handles the seamless looping jump when transition ends
    function handleTransitionEnd() {
        isTransitioning = false; // Reset the flag

        const totalOriginals = originalItems.length;
        const prependClonesCount = totalOriginals; // Using totalOriginals for more robust looping
        const appendClonesCount = totalOriginals;

        // If we have transitioned to the appended clones (moved forward past originals)
        if (currentSlideIndex >= prependClonesCount + totalOriginals) {
            // Jump back to the corresponding original item set
            currentSlideIndex = prependClonesCount + (currentSlideIndex - (prependClonesCount + totalOriginals));
            carouselContent.style.transition = 'none'; // Temporarily disable transition
            carouselContent.style.transform = `translateX(-${currentSlideIndex * (itemWidth + spaceBetween)}px)`;

            // Re-enable transition after browser has a chance to render the jump
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    carouselContent.style.transition = 'transform 0.5s ease-in-out';
                });
            });
        }
        // If we have transitioned to the prepended clones (moved backward before originals)
        else if (currentSlideIndex < prependClonesCount) {
            // Jump forward to the corresponding original item set (or just before the last original)
            currentSlideIndex = prependClonesCount + (totalOriginals - (prependClonesCount - currentSlideIndex));
            carouselContent.style.transition = 'none'; // Temporarily disable transition
            carouselContent.style.transform = `translateX(-${currentSlideIndex * (itemWidth + spaceBetween)}px)`;

            // Re-enable transition
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    carouselContent.style.transition = 'transform 0.5s ease-in-out';
                });
            });
        }
    }

    // Event listeners for navigation buttons
    nextButton.addEventListener('click', function() {
        if (isTransitioning) return; // Prevent action if already transitioning
        currentSlideIndex++; // *** CHỈ THAY ĐỔI DÒNG NÀY ***
        updateCarouselPosition();
    });

    prevButton.addEventListener('click', function() {
        if (isTransitioning) return; // Prevent action if already transitioning
        currentSlideIndex--; // *** CHỈ THAY ĐỔI DÒNG NÀY ***
        updateCarouselPosition();
    });

    // Handle window resize: Reconfigure the carousel
    window.addEventListener('resize', () => {
        isTransitioning = false; // Reset flag on resize
        updateCarouselConfig();
    });

    // Initial setup when the page loads
    updateCarouselConfig();
});



//--------------------sản phẩm mới-----------------
const tabNew = document.getElementById("tab-new");
const tabHot = document.getElementById("tab-hot");
const boxNew = document.getElementById("box-new");
const boxHot = document.getElementById("box-hot");


tabNew.addEventListener("click", () => {
    tabNew.classList.add("active");
    tabHot.classList.remove("active");
    boxNew.classList.remove("hidden");
    boxHot.classList.add("hidden");
});

tabHot.addEventListener("click", () => {
    tabHot.classList.add("active");
    tabNew.classList.remove("active");
    boxHot.classList.remove("hidden");
    boxNew.classList.add("hidden");
});
//-----------sp-áo thun----------------
const tabAoThun = document.getElementById("tab-aothun");
const tabAoPolo = document.getElementById("tab-aopolo");
const boxAoThun = document.getElementById("box-aothun");
const boxAoPolo = document.getElementById("box-aopolo");

tabAoThun.addEventListener("click", () => {
    tabAoThun.classList.add("active");
    tabAoPolo.classList.remove("active");
    boxAoThun.classList.remove("hidden");
    boxAoPolo.classList.add("hidden");
});

tabAoPolo.addEventListener("click", () => {
    tabAoPolo.classList.add("active");
    tabAoThun.classList.remove("active");
    boxAoPolo.classList.remove("hidden");
    boxAoThun.classList.add("hidden");
});
//-----------------sp-quần----------
const tabQuanShort = document.getElementById("tab-quanshort");
const tabQuanJean = document.getElementById("tab-quanjean");
const boxQuanShort = document.getElementById("box-quanshort");
const boxQuanJean = document.getElementById("box-quanjean");

tabQuanShort.addEventListener("click", () => {
    tabQuanShort.classList.add("active");
    tabQuanJean.classList.remove("active");
    boxQuanShort.classList.remove("hidden");
    boxQuanJean.classList.add("hidden");
});

tabQuanJean.addEventListener("click", () => {
    tabQuanJean.classList.add("active");
    tabQuanShort.classList.remove("active");
    boxQuanJean.classList.remove("hidden");
    boxQuanShort.classList.add("hidden");
});
//================tim sanr phaam================
const heartButtons = document.querySelectorAll(".heart-btn");

heartButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        btn.classList.toggle("active");
    });
});