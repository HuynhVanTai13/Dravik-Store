// Toggle menu mobile
const mobileMenuBtn = document.querySelector('.menu-icon');
const mobileMenu = document.getElementById('mobileMenu');
const menuOverlay = document.getElementById('menuOverlay');
const closeBtn = document.getElementById('closeMobileMenu');

mobileMenuBtn && mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.add('open');
    menuOverlay.classList.add('open');
});
closeBtn && closeBtn.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    menuOverlay.classList.remove('open');
});
menuOverlay && menuOverlay.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    menuOverlay.classList.remove('open');
});