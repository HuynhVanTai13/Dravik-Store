emailjs.init("K-fCH65STb7PsPqDa"); // Your Public Key from EmailJS

document.getElementById("contact-form").addEventListener("submit", function(e) {
    e.preventDefault();
    emailjs.sendForm("service_3fhzebf", "template_htzhir3", this)
        .then(function() {
            alert(" Gửi liên hệ thành công!");
            document.getElementById("contact-form").reset();
        }, function(error) {
            console.error(" Lỗi gửi:", error);
            alert(" Gửi liên hệ thất bại. Lỗi: " + JSON.stringify(error));
        });
});