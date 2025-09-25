const slidesContainer = document.querySelector('.slides');
const slides = document.querySelectorAll('.slide');
const prevBtn = document.querySelector('.prev');
const nextBtn = document.querySelector('.next');

let current = 1;
let width = slides[0].clientWidth;

// Clone first and last slide
const firstClone = slides[0].cloneNode(true);
const lastClone = slides[slides.length - 1].cloneNode(true);

slidesContainer.appendChild(firstClone);
slidesContainer.insertBefore(lastClone, slidesContainer.firstChild);

const allSlides = document.querySelectorAll('.slide');
slidesContainer.style.transform = `translateX(-${width * current}px)`;

const goToSlide = (index) => {
    slidesContainer.style.transition = 'transform 0.5s ease';
    slidesContainer.style.transform = `translateX(-${width * index}px)`;
};

const handleLoop = () => {
    if (current === 0) {
        slidesContainer.style.transition = 'none';
        current = slides.length;
        slidesContainer.style.transform = `translateX(-${width * current}px)`;
    } else if (current === slides.length + 1) {
        slidesContainer.style.transition = 'none';
        current = 1;
        slidesContainer.style.transform = `translateX(-${width * current}px)`;
    }
};

nextBtn.addEventListener('click', () => {
    if (current <= slides.length) {
        current++;
        goToSlide(current);
    }
});

prevBtn.addEventListener('click', () => {
    if (current >= 1) {
        current--;
        goToSlide(current);
    }
});

slidesContainer.addEventListener('transitionend', handleLoop);

// Auto slide
let autoSlide = setInterval(() => {
    current++;
    goToSlide(current);
}, 5000);

// Pause when tab is inactive
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(autoSlide);
    } else {
        autoSlide = setInterval(() => {
            current++;
            goToSlide(current);
        }, 5000);
    }
});

// Responsive resizing
window.addEventListener('resize', () => {
    width = document.querySelector('.slide').clientWidth;
    slidesContainer.style.transition = 'none';
    slidesContainer.style.transform = `translateX(-${width * current}px)`;
});