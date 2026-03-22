window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (!header) return;
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

function sendOrder() {
    const name = document.getElementById("name")?.value?.trim();
    const phone = document.getElementById("phone")?.value?.trim();
    const message = document.getElementById("message")?.value?.trim();

    if (!name || !phone) {
        alert("Please enter your name and phone number.");
        return;
    }

    const text = [
        "Hello HotshionHub,",
        `Name: ${name}`,
        `Phone: ${phone}`,
        message ? `Message: ${message}` : ""
    ].filter(Boolean).join("\n");

    const whatsappNumber = "2347062161794";
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
}
