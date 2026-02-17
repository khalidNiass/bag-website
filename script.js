// =========================
// SIDEBAR ELEMENTS
// =========================
const sidebar = document.getElementById("mobileSidebar");
const menuBtn = document.querySelector(".menu-btn");

function toggleSidebar() {
    if (sidebar) sidebar.classList.add("active");
    if (menuBtn) menuBtn.style.display = "none";
}

function closeSidebar() {
    if (sidebar) sidebar.classList.remove("active");
    if (menuBtn) menuBtn.style.display = "block";
}

if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
if (sidebar) {
    const closeBtnSidebar = sidebar.querySelector('.close-btn');
    if (closeBtnSidebar) closeBtnSidebar.addEventListener('click', closeSidebar);
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
// FETCH & RENDER (Internet-Strict Logic)
// =========================
const API_URL = "http://localhost:3000/api/products";
const featuredContainer = document.getElementById('featuredProducts');
let products = [];

// Separate Modals
const productModal = document.getElementById('productModal');
const checkoutModal = document.getElementById('checkoutModal');
const closeProduct = document.querySelector('.close');
const closeCheckout = document.querySelector('.close-checkout');

async function fetchProducts() {
    const loaderText = document.getElementById("loader-text");

    try {
        if (loaderText) loaderText.innerText = "Fetching latest collection...";

        const res = await fetch(API_URL);
        
        // If internet is down, this fails and triggers the catch block
        if (!res.ok) throw new Error("Server not responding");

        products = await res.json();
        
        renderFeaturedProducts();

        // WAIT for product images to actually download from the internet
        if (loaderText) loaderText.innerText = "Loading visuals...";
        await waitForImages();

        // SUCCESS: Tell loading.js to hide the loader
        if (typeof window.hideMyLoader === "function") {
            window.hideMyLoader();
        }

    } catch (err) {
        console.error("FETCH ERROR:", err);
        
        // FAIL: Show error, do NOT hide loader
        if (typeof window.showLoaderError === "function") {
            window.showLoaderError("No Internet Connection. Reconnecting...");
        }

        if (featuredContainer) {
            featuredContainer.innerHTML = "<p>⚠️ Unable to load products. Retrying...</p>";
        }

        // Retry automatically every 5 seconds
        setTimeout(fetchProducts, 5000);
    }
}

function renderFeaturedProducts() {
    if (!featuredContainer) return;
    featuredContainer.innerHTML = '';
    
    // Pick 4 random products
    const featured = [...products].sort(() => 0.5 - Math.random()).slice(0, 4);

    featured.forEach(product => {
        const badgeHTML = product.badge ? `<span class="badge">${product.badge}</span>` : '';
        const displayImg = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300';
        
        featuredContainer.innerHTML += `
            <div class="product">
                ${badgeHTML}
                <img src="${displayImg}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>₦${Number(product.price).toLocaleString()}</p>
                <button onclick="openModalById('${product.id}')">View Product</button>
            </div>`;
    });
}

// Helper: Ensures images are fully loaded before showing the page
function waitForImages() {
    const imgs = document.querySelectorAll('.product img');
    const promises = Array.from(imgs).map(img => {
        return new Promise((resolve) => {
            if (img.complete) resolve();
            img.onload = resolve;
            img.onerror = resolve; 
        });
    });
    return Promise.all(promises);
}

// =========================
// MODAL FUNCTIONS
// =========================
function openModalById(productId) {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;

    productModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

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

// SWITCH TO CHECKOUT
const modalOrderBtn = document.getElementById('modalOrderBtn');
if (modalOrderBtn) {
    modalOrderBtn.onclick = () => {
        const name = document.getElementById('modalName').textContent;
        const qty = document.getElementById('modalQty').value;
        const color = document.getElementById('modalColor').value;

        document.getElementById('summaryText').innerHTML = `Ordering: <strong>${name}</strong> (${color}) x${qty}`;

        productModal.style.display = 'none';
        checkoutModal.classList.add('active'); 
    };
}

// FINAL PAYMENT
const checkoutForm = document.getElementById('checkoutForm');
if (checkoutForm) {
    checkoutForm.onsubmit = async (e) => {
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
}

// Close Handlers
if (closeProduct) closeProduct.onclick = () => {
    productModal.style.display = 'none';
    document.body.style.overflow = 'auto';
};

if (closeCheckout) closeCheckout.onclick = () => {
    checkoutModal.classList.remove('active');
    document.body.style.overflow = 'auto';
};

window.onclick = (e) => {
    if (e.target === productModal) {
        productModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    if (e.target === checkoutModal) {
        checkoutModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
};

// Start the sequence
fetchProducts();