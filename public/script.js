window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// =========================
// SIDEBAR ELEMENTS
// =========================
const sidebar = document.getElementById("mobileSidebar");
const menuBtn = document.querySelector(".menu-btn");

function toggleSidebar() {
    if (sidebar) sidebar.classList.add("active");
    // We keep the menu button visible but styled in CSS usually, 
    // but following your logic:
    if (menuBtn) menuBtn.style.opacity = "0"; 
}

function closeSidebar() {
    if (sidebar) sidebar.classList.remove("active");
    if (menuBtn) menuBtn.style.opacity = "1";
}

// =========================
// FETCH & RENDER FEATURED
// =========================
const API_BASE =
    (location.hostname === "127.0.0.1" || location.hostname === "localhost") &&
    location.port === "5500"
        ? "http://localhost:3000"
        : "https://bag-website-six.vercel.app";
const API_URL = `${API_BASE}/api/products`;
const featuredContainer = document.getElementById('featuredProducts');
let products = [];
const FALLBACK_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function fetchProducts() {
    const loaderText = document.getElementById("loader-text");
    
    try {
        if (loaderText) loaderText.innerText = "Accessing Vault...";

        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Server not responding");

        const data = await res.json();
        console.log("DATABASE CHECK:", data); // Check your console (F12) for this!

        // IMPORTANT: Let's be flexible with the data structure
        if (data.products) {
            products = data.products;
        } else if (Array.isArray(data)) {
            products = data;
        } else {
            products = [];
        }
        
        renderFeaturedProducts();
        await waitForImages();

        // Hide Loader
        const loader = document.getElementById('loader-wrapper');
        if (loader) loader.style.display = 'none';
        if (typeof window.hideMyLoader === "function") window.hideMyLoader();

    } catch (err) {
        console.error("FETCH ERROR:", err);
        if (loaderText) loaderText.innerText = "Connection Lost. Retrying...";
        setTimeout(fetchProducts, 5000);
    }
} 
// =========================
function renderFeaturedProducts() {
    if (!featuredContainer) return;
    featuredContainer.innerHTML = '';
    
    // Pick 4 featured products
    const featured = [...products].sort(() => 0.5 - Math.random()).slice(0, 4);

    featured.forEach(product => {
        // MOVE THIS LINE HERE (Inside the loop)
        const formattedPrice = product.price ? Number(product.price).toLocaleString() : "0";

        const badgeHTML = product.badge ? `<span class="badge">${product.badge}</span>` : '';
        
        let images = product.images;
        if (typeof images === 'string') {
            images = images.split('|');
        }
        const displayImg = (images && images.length > 0) ? images[0] : FALLBACK_IMG;
        
        featuredContainer.innerHTML += `
            <div class="product">
                ${badgeHTML}
                <div class="product-img-container">
                    <img src="${displayImg}" alt="${product.name}">
                </div>
                <h3>${product.name}</h3>
                <p>₦${formattedPrice}</p>
                <button class="view-btn" onclick="goToDetails('${product.id}')">View Piece</button>
            </div>`;
    });
}
// NEW: Redirect function
function goToDetails(productId) {
    window.location.href = `product-details.html?id=${productId}`;
}

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
// NEWSLETTER
// =========================
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = this.querySelector('input').value.trim();
        const btn = this.querySelector('button');
        
        btn.innerText = "...";
        try {
            await fetch(`${API_BASE}/api/subscribe`, {
                method: "POST",
                body: JSON.stringify({ email }),
                headers: { "Content-Type": "application/json" }
            });
            alert("Welcome to the Hub.");
            this.reset();
        } catch (err) {
            alert("Connection error.");
        } finally {
            btn.innerText = "Join";
        }
    });
}

// Start sequence only when featured section exists
if (featuredContainer) {
    fetchProducts();
}
