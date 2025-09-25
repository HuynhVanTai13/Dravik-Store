function changeQty(button, amount) {
    const input = button.parentElement.querySelector('.qty-input');
    let current = parseInt(input.value);
    if (isNaN(current)) current = 1;
    let newQty = current + amount;
    if (newQty < 1) newQty = 1;
    input.value = newQty;
}