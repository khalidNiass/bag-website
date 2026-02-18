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
const API_URL = "http://localhost:3000/api/products";
const featuredContainer = document.getElementById('featuredProducts');
let products = [];

async function fetchProducts() {
    const loaderText = document.getElementById("loader-text");

    try {
        if (loaderText) loaderText.innerText = "Accessing Vault...";

        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Server not responding");

        const data = await res.json();
products = data.products || []; // Extract only the products array
        
        renderFeaturedProducts();

        await waitForImages();

        // Hide Loader
        if (typeof window.hideMyLoader === "function") {
            window.hideMyLoader();
        }

    } catch (err) {
        console.error("FETCH ERROR:", err);
        if (typeof window.showLoaderError === "function") {
            window.showLoaderError("Connection Lost. Retrying...");
        }
        setTimeout(fetchProducts, 5000);
    }
}

function renderFeaturedProducts() {
    if (!featuredContainer) return;
    featuredContainer.innerHTML = '';
    
    // Pick 4 featured products
    const featured = [...products].sort(() => 0.5 - Math.random()).slice(0, 4);

    featured.forEach(product => {
        const badgeHTML = product.badge ? `<span class="badge">${product.badge}</span>` : '';
        
        // Fix: Handle images whether they are strings or arrays
        let images = product.images;
        if (typeof images === 'string') {
            images = images.split('|');
        }
        const displayImg = (images && images.length > 0) ? images[0] : 'placeholder.jpg';
        
        featuredContainer.innerHTML += `
            <div class="product">
                ${badgeHTML}
                <div class="product-img-container">
                    <img src="${displayImg}" alt="${product.name}">
                </div>
                <h3>${product.name}</h3>
                <p>₦${Number(product.price).toLocaleString()}</p>
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
            await fetch("http://localhost:3000/api/subscribe", {
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

// Start sequence
fetchProducts();