// =========================
// 1. GLOBAL STATE & CONFIG
// =========================
const API_BASE =
    (location.hostname === "127.0.0.1" || location.hostname === "localhost") &&
    location.port === "5500"
        ? "http://localhost:3000"
        : "";
const API_URL = `${API_BASE}/api/products`; 
let products = [];
let container; // Declared once here
let selectedCategory = 'all';
let selectedGenders = [];
let selectedBadges = [];
let searchQuery = '';
const FALLBACK_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function applyFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    const gender = params.get("gender");
    const badge = params.get("badge");

    if (category) selectedCategory = category;
    if (gender) selectedGenders = [gender.toLowerCase()];
    if (badge) selectedBadges = [badge.toUpperCase()];

    // Sync UI
    document.querySelectorAll('.filter-btn').forEach(b => {
        if (b.dataset.category) {
            b.classList.toggle('active', b.dataset.category === selectedCategory);
        }
    });

    const genderCheckboxes = document.querySelectorAll('.dropdown-content input[value="men"], .dropdown-content input[value="women"]');
    genderCheckboxes.forEach(cb => {
        cb.checked = selectedGenders.includes(cb.value.toLowerCase());
    });

    const statusCheckboxes = document.querySelectorAll('.dropdown-content input[value="NEW"], .dropdown-content input[value="HOT"]');
    statusCheckboxes.forEach(cb => {
        cb.checked = selectedBadges.includes(cb.value.toUpperCase());
    });
}

// =========================
// 2. UI NAVIGATION (Scroll & Sidebar)
// =========================
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

function toggleSidebar() {
    const sidebar = document.getElementById("mobileSidebar");
    const menuBtn = document.querySelector(".menu-btn");
    if (sidebar) sidebar.classList.add("active");
    if (menuBtn) menuBtn.style.display = "none";
}

function closeSidebar() {
    const sidebar = document.getElementById("mobileSidebar");
    const menuBtn = document.querySelector(".menu-btn");
    if (sidebar) sidebar.classList.remove("active");
    if (menuBtn) menuBtn.style.display = "block";
}

// =========================
// 3. DATA FETCHING
// =========================
async function fetchProductsFromSheet() {
    container = document.getElementById('shopGrid'); // Assigned once here
    
    try {
        const loaderText = document.getElementById("loader-text");
        if (loaderText) loaderText.innerText = "Connecting to shop...";

        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Server not responding");

        const data = await res.json();
        const rawProducts = data.products || data;

        if (!Array.isArray(rawProducts)) throw new Error("Data format is incorrect");

        products = rawProducts.map(p => ({
            id: String(p.id),
            name: p.name || "Unnamed Product",
            price: Number(p.price) || 0,
            description: p.description || "",
            images: p.images ? (Array.isArray(p.images) ? p.images : p.images.split("|")) : [],
            category: p.category || "General",
            gender: p.gender || "Unisex",
            badge: p.badge || ""
        }));

        renderProducts();

        if (loaderText) loaderText.innerText = "Downloading images...";
        await waitForImages();

        const loader = document.getElementById('loader-wrapper');
        if (loader) loader.style.display = 'none';
        if (typeof window.hideMyLoader === "function") window.hideMyLoader();

    } catch (err) {
        console.error("FETCH ERROR:", err);
        const loaderText = document.getElementById("loader-text");
        if (loaderText) loaderText.innerText = "Connection Lost. Reconnecting...";
        setTimeout(fetchProductsFromSheet, 5000);
    }
}

function waitForImages() {
    if (!container) return Promise.resolve();
    const imgs = container.querySelectorAll('img');
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
// 4. RENDERING & FILTERING
// =========================
function renderProducts() {
    if (!container) return;
    container.innerHTML = '';

    const filtered = products.filter(product => {
        const matchesSearch = !searchQuery || product.name.toLowerCase().includes(searchQuery);
        const matchesCat = selectedCategory === 'all' || product.category.toLowerCase() === selectedCategory.toLowerCase();
        const matchesGender = selectedGenders.length === 0 || selectedGenders.includes(product.gender.toLowerCase());
        const matchesBadge = selectedBadges.length === 0 || selectedBadges.includes(product.badge.toUpperCase());
        return matchesSearch && matchesCat && matchesGender && matchesBadge;
    });

    if (!filtered.length) {
        container.innerHTML = `
            <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <p>No products found matching your search.</p>
                <button onclick="location.reload()" style="background: black; color: white; padding: 10px 20px; border: none; cursor: pointer;">Reset Filters</button>
            </div>`;
        return;
    }

    [...filtered].reverse().forEach(product => {
        const displayImg = product.images.length > 0 ? product.images[0] : FALLBACK_IMG;
        const productCard = document.createElement('div');
        productCard.className = 'product';
        productCard.innerHTML = `
            ${product.badge ? `<span class="badge">${product.badge}</span>` : ''}
            <img src="${displayImg}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p>₦${product.price.toLocaleString()}</p>
            <button class="view-btn" onclick="goToDetails('${product.id}')">View Details</button>
        `;
        container.appendChild(productCard);
    });
}

function goToDetails(productId) {
    window.location.href = `product-details.html?id=${productId}`;
}

// =========================
// 5. EVENT LISTENERS
// =========================
document.addEventListener('DOMContentLoaded', () => {
    applyFiltersFromUrl();

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.category) {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedCategory = btn.dataset.category;
                renderProducts();
            });
        }
    });

    // Search
    const searchInput = document.getElementById("shopSearch");
    if (searchInput) {
        searchInput.addEventListener("input", e => {
            searchQuery = e.target.value.toLowerCase();
            renderProducts();
        });
    }

    // Gender Checkboxes
    const genderCheckboxes = document.querySelectorAll('.dropdown-content input[value="men"], .dropdown-content input[value="women"]');
    genderCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            selectedGenders = Array.from(genderCheckboxes).filter(i => i.checked).map(i => i.value);
            renderProducts();
        });
    });

    // Status Checkboxes
    const statusCheckboxes = document.querySelectorAll('.dropdown-content input[value="NEW"], .dropdown-content input[value="HOT"]');
    statusCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            selectedBadges = Array.from(statusCheckboxes).filter(i => i.checked).map(i => i.value);
            renderProducts();
        });
    });

    // Start fetching
    fetchProductsFromSheet();
});
