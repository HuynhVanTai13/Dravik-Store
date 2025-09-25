document.querySelectorAll('.fav-icon-btn .bxs-heart').forEach(function(heart){
  heart.parentElement.onclick = function() {
    this.classList.toggle('active');
  }
});

