const sidebar = document.getElementById("mobileSidebar");
const menuBtn = document.querySelector(".menu-btn");

function toggleSidebar() {
    sidebar.classList.add("active");
    menuBtn.style.display = "none";
}

function closeSidebar() {
    sidebar.classList.remove("active");
    menuBtn.style.display = "block";
}

// =========================
// NEWSLETTER
// =========================
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    const newsletterInput = newsletterForm.querySelector('input');
    const newsletterMessage = document.createElement('p');
    newsletterForm.appendChild(newsletterMessage);

    newsletterForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = newsletterInput.value.trim();
        try {
            await fetch("http://localhost:3000/api/subscribe", {
                method: "POST",
                body: JSON.stringify({ action: "subscribe", email }),
                headers: { "Content-Type": "application/json" }
            });
            newsletterMessage.textContent = "Thanks for subscribing!";
            newsletterMessage.style.color = 'green';
            newsletterInput.value = '';
        } catch (err) {
            newsletterMessage.textContent = "Subscription failed.";
            newsletterMessage.style.color = 'red';
        }
    });
}

// =========================
// FETCH & RENDER
// =========================
const API_URL = "http://localhost:3000/api/products";
const featuredContainer = document.getElementById('featuredProducts');
let products = [];

// Separate Modals (Matching your Shop Page)
const productModal = document.getElementById('productModal');
const checkoutModal = document.getElementById('checkoutModal');
const closeProduct = document.querySelector('.close');
const closeCheckout = document.querySelector('.close-checkout');

async function fetchProducts() {
    try {
        const res = await fetch(API_URL);
        products = await res.json();
        renderFeaturedProducts();
    } catch (err) {
        if (featuredContainer) featuredContainer.innerHTML = "<p>Failed to load products</p>";
    }
}

function renderFeaturedProducts() {
    if (!featuredContainer) return;
    featuredContainer.innerHTML = '';
    const featured = [...products].sort(() => 0.5 - Math.random()).slice(0, 4);

    featured.forEach(product => {
        const badgeHTML = product.badge ? `<span class="badge">${product.badge}</span>` : '';
        featuredContainer.innerHTML += `
            <div class="product">
                ${badgeHTML}
                <img src="${product.images[0]}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>₦${Number(product.price).toLocaleString()}</p>
                <button onclick="openModalById('${product.id}')">View Product</button>
            </div>`;
    });
}

// =========================
// STEP 1: OPEN PRODUCT MODAL
// =========================
function openModalById(productId) {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;

    productModal.style.display = 'flex';

    document.getElementById('mainImage').src = product.images[0];
    document.getElementById('modalName').textContent = product.name;
    document.getElementById('modalPrice').textContent = `₦${Number(product.price).toLocaleString()}`;
    document.getElementById('modalDesc').textContent = product.description;

    const modalColor = document.getElementById('modalColor');
    modalColor.innerHTML = '';
    product.colors?.forEach(color => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = color;
        modalColor.appendChild(opt);
    });

    const thumbContainer = document.getElementById('thumbnails');
    thumbContainer.innerHTML = '';
    product.images.forEach(img => {
        const thumb = document.createElement('img');
        thumb.src = img;
        thumb.onclick = () => document.getElementById('mainImage').src = img;
        thumbContainer.appendChild(thumb);
    });
}

// =========================
// STEP 2: SWITCH TO CHECKOUT MODAL
// =========================
// This matches your "modalOrderBtn" which says "Proceed to Payment"
document.getElementById('modalOrderBtn').onclick = () => {
    const name = document.getElementById('modalName').textContent;
    const qty = document.getElementById('modalQty').value;
    const color = document.getElementById('modalColor').value;

    // Set summary text in the checkout modal
    document.getElementById('summaryText').innerHTML = `Ordering: <strong>${name}</strong> (${color}) x${qty}`;

    // Switch Modals
    productModal.style.display = 'none';
    checkoutModal.classList.add('active'); 
};

// =========================
// STEP 3: FINAL PAYMENT
// =========================
document.getElementById('checkoutForm').onsubmit = async (e) => {
    e.preventDefault();

    const payBtn = document.getElementById('payNowBtn');
    payBtn.innerText = "Processing...";
    payBtn.disabled = true;

    const productName = document.getElementById('modalName').textContent;
    const product = products.find(p => p.name === productName);
    const qty = Number(document.getElementById('modalQty').value);

    try {
        const res = await fetch("http://localhost:3000/api/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: document.getElementById('custEmail').value,
                amount: product.price * qty,
                productName: `${product.name} (${document.getElementById('modalColor').value}) x${qty}`,
                name: document.getElementById('custName').value,
                phone: document.getElementById('custPhone').value,
                address: document.getElementById('custAddress').value
            })
        });
        const data = await res.json();
        if (data.authorization_url) window.location.href = data.authorization_url;
    } catch (err) {
        alert("Payment Error. Please try again.");
        payBtn.innerText = "Pay Now";
        payBtn.disabled = false;
    }
};

// Close Handlers
closeProduct.onclick = () => productModal.style.display = 'none';
closeCheckout.onclick = () => checkoutModal.classList.remove('active');

window.onclick = (e) => {
    if (e.target === productModal) productModal.style.display = 'none';
    if (e.target === checkoutModal) checkoutModal.classList.remove('active');
};

fetchProducts();