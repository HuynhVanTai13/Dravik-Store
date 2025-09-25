function toggleSidebarBlock(el) {
  var block = el.closest('.sidebar-block');
  block.classList.toggle('collapsed');
  // Đổi dấu + -
  var icon = el.querySelector('.toggle-icon');
  if(block.classList.contains('collapsed')) {
    icon.textContent = '+';
  } else {
    icon.textContent = '–';
  }
}
