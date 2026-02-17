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


// =======================
// CONFIGURATION
// =======================
const API_URL = "http://localhost:3000/api/products"; 
let products = [];

// =======================
// STATE VARIABLES
// =======================
let selectedCategory = 'all';
let selectedGenders = [];
let selectedBadges = [];
let searchQuery = '';

// =======================
// SIDEBAR & UI
// =======================
const container = document.getElementById('shopGrid'); // Fixed ID name

function toggleSidebar() {
  document.getElementById("mobileSidebar").classList.add("active");
  const menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) menuBtn.style.display = "none";
}

function closeSidebar() {
  document.getElementById("mobileSidebar").classList.remove("active");
  const menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) menuBtn.style.display = "block";
}

// =======================
// FETCH PRODUCTS
// =======================
async function fetchProductsFromSheet() {
  try {
    const loaderText = document.getElementById("loader-text");
    if (loaderText) loaderText.innerText = "Connecting to shop...";

    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Server not responding");

    const data = await res.json();

    products = data.map(p => ({
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

    if (typeof window.hideMyLoader === "function") {
      window.hideMyLoader();
    }

  } catch (err) {
    console.error("FETCH ERROR:", err);
    if (typeof window.showLoaderError === "function") {
      window.showLoaderError("Connection Lost. Reconnecting...");
    }
    setTimeout(fetchProductsFromSheet, 5000);
  }
}

function waitForImages() {
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

// =======================
// RENDER PRODUCTS
// =======================
function renderProducts() {
  if (!container) return;
  container.innerHTML = '';

  const filtered = products.filter(product => {
    const matchesSearch = !searchQuery || product.name.toLowerCase().includes(searchQuery);
    const matchesCat = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesGender = selectedGenders.length === 0 || selectedGenders.includes(product.gender);
    const matchesBadge = selectedBadges.length === 0 || selectedBadges.includes(product.badge);
    return matchesSearch && matchesCat && matchesGender && matchesBadge;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="no-results">
        <p>No products found matching your search.</p>
        <button onclick="location.reload()">Reset Filters</button>
      </div>`;
    return;
  }

  [...filtered].reverse().forEach(product => {
    const displayImg = product.images.length > 0 ? product.images[0] : 'placeholder.jpg';
    
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

// =======================
// REDIRECT LOGIC (The New Part)
// =======================
function goToDetails(productId) {
  // This passes the ID to the next page via the URL
  window.location.href = `product-details.html?id=${productId}`;
}

// =======================
// FILTER LISTENERS
// =======================
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

const searchInput = document.getElementById("shopSearch");
if (searchInput) {
  searchInput.addEventListener("input", e => {
    searchQuery = e.target.value.toLowerCase();
    renderProducts();
  });
}

// =======================
// GENDER & STATUS FILTER LOGIC
// =======================

// 1. Listen for Gender Checkboxes
const genderCheckboxes = document.querySelectorAll('.dropdown-content input[value="men"], .dropdown-content input[value="women"]');
genderCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        // Collect all checked gender values
        selectedGenders = Array.from(genderCheckboxes)
            .filter(i => i.checked)
            .map(i => i.value);
        
        renderProducts(); // Refresh the grid
    });
});

// 2. Listen for Status (Badge) Checkboxes
const statusCheckboxes = document.querySelectorAll('.dropdown-content input[value="NEW"], .dropdown-content input[value="HOT"]');
statusCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        // Collect all checked status values
        selectedBadges = Array.from(statusCheckboxes)
            .filter(i => i.checked)
            .map(i => i.value);
        
        renderProducts(); // Refresh the grid
    });
});

// Initialize
fetchProductsFromSheet();