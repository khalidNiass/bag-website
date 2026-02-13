// =======================
// CONFIGURATION
// =======================
const API_URL = "http://localhost:3000/api/products"; 

let products = [];
let currentProduct = null; // Strictly for tracking the item to be paid for

// =======================
// STATE VARIABLES
// =======================
let selectedCategory = 'all';
let selectedGenders = [];
let selectedBadges = [];
let searchQuery = '';

// =======================
// SIDEBAR ELEMENTS
// =======================
const sidebar = document.getElementById("mobileSidebar");
const menuBtn = document.querySelector(".menu-btn");

function toggleSidebar() {
  sidebar.classList.add("active");
  if (menuBtn) menuBtn.style.display = "none";
}

function closeSidebar() {
  sidebar.classList.remove("active");
  if (menuBtn) menuBtn.style.display = "block";
}

if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
if (sidebar) {
  const closeBtnSidebar = sidebar.querySelector('.close-btn');
  if (closeBtnSidebar) closeBtnSidebar.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSidebar));
}

// =======================
// MODAL ELEMENTS
// =======================
const container = document.querySelector('.products');
const modal = document.getElementById('productModal');
const closeBtn = document.querySelector('.close');

const checkoutModal = document.getElementById('checkoutModal');
const checkoutForm = document.getElementById('checkoutForm');
const closeCheckout = document.querySelector('.close-checkout');

const mainImage = document.getElementById('mainImage');
const thumbnails = document.getElementById('thumbnails');
const modalName = document.getElementById('modalName');
const modalPrice = document.getElementById('modalPrice');
const modalDesc = document.getElementById('modalDesc');
const modalColor = document.getElementById('modalColor');
const modalQty = document.getElementById('modalQty');
const modalOrderBtn = document.getElementById('modalOrderBtn');

// =======================
// FETCH PRODUCTS FROM BACKEND
// =======================
async function fetchProductsFromSheet() {
  try {
    container.innerHTML = "<p class='loading'>Loading collection...</p>";
    const res = await fetch(API_URL);
    const data = await res.json();

    products = data.map(p => ({
      id: String(p.id),
      name: p.name || "Unnamed Product",
      price: Number(p.price) || 0,
      description: p.description || "No description available.",
      images: p.images ? (Array.isArray(p.images) ? p.images : p.images.split("|")) : [],
      colors: p.colors ? (Array.isArray(p.colors) ? p.colors : p.colors.split(",")) : [],
      category: p.category || "General",
      gender: p.gender || "Unisex",
      badge: p.badge || ""
    }));

    renderProducts();
  } catch (err) {
    console.error("FETCH ERROR:", err);
    container.innerHTML = "<p>⚠️ Unable to load products. Please refresh.</p>";
  }
}

// =======================
// RENDER PRODUCTS
// =======================
function renderProducts() {
  container.innerHTML = '';
  const filtered = products.filter(product => {
    const matchesSearch = !searchQuery || product.name.toLowerCase().includes(searchQuery);
    const matchesCat = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesGender = selectedGenders.length === 0 || selectedGenders.includes(product.gender);
    const matchesBadge = selectedBadges.length === 0 || selectedBadges.includes(product.badge);
    return matchesSearch && matchesCat && matchesGender && matchesBadge;
  });

  if (!filtered.length) {
    container.innerHTML = '<p class="no-results">No products match your criteria.</p>';
    return;
  }

  [...filtered].reverse().forEach(product => {
    const displayImg = product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300?text=No+Image';
    const productCard = document.createElement('div');
    productCard.className = 'product';
    productCard.innerHTML = `
        ${product.badge ? `<span class="badge">${product.badge}</span>` : ''}
        <img src="${displayImg}" alt="${product.name}" loading="lazy">
        <h3>${product.name}</h3>
        <p>₦${product.price.toLocaleString()}</p>
        <button class="view-btn">View Product</button>
    `;
    productCard.querySelector('.view-btn').onclick = () => openModal(product.id);
    container.appendChild(productCard);
  });
}

// =======================
// MODAL FUNCTIONS
// =======================
function openModal(id) {
  const product = products.find(p => String(p.id) === String(id));
  if (!product) return;
  currentProduct = product; 

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (modalQty) modalQty.value = 1;

  const firstImg = product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300?text=No+Image';
  mainImage.src = firstImg;
  modalName.textContent = product.name;
  modalPrice.textContent = `₦${product.price.toLocaleString()}`;
  modalDesc.textContent = product.description;

  modalColor.innerHTML = '';
  if (product.colors.length > 0) {
    product.colors.forEach(color => {
      const option = document.createElement('option');
      option.value = color.trim();
      option.textContent = color.trim();
      modalColor.appendChild(option);
    });
  } else {
    const option = document.createElement('option');
    option.value = "Default";
    option.textContent = "Default";
    modalColor.appendChild(option);
  }

  thumbnails.innerHTML = '';
  product.images.forEach(img => {
    const thumb = document.createElement('img');
    thumb.src = img;
    thumb.className = 'thumb-img';
    thumb.onclick = () => {
      mainImage.src = img;
      document.querySelectorAll('.thumb-img').forEach(t => t.style.border = 'none');
      thumb.style.border = '2px solid #f39c12';
    };
    thumbnails.appendChild(thumb);
  });

  // FIX: Capture Color and Qty before moving to checkout
  modalOrderBtn.onclick = () => {
    currentProduct.selectedQty = modalQty ? Number(modalQty.value) : 1;
    currentProduct.selectedColor = modalColor ? modalColor.value : "Default";
    
    const totalPrice = currentProduct.price * currentProduct.selectedQty;
    const summary = document.getElementById('summaryText');
    
    if (summary) {
      summary.innerText = `Total: ₦${totalPrice.toLocaleString()} (${currentProduct.selectedQty}x ${currentProduct.selectedColor})`;
    }
    
    modal.style.display = 'none'; 
    checkoutModal.style.display = 'flex';
  };
}

// =======================
// CHECKOUT FORM LOGIC
// =======================
if (checkoutForm) {
  checkoutForm.onsubmit = async (e) => {
    e.preventDefault();
    const payBtn = document.getElementById('payNowBtn');
    
    payBtn.innerText = "Connecting...";
    payBtn.disabled = true;

    const orderData = {
      name: document.getElementById('custName').value,
      email: document.getElementById('custEmail').value,
      phone: document.getElementById('custPhone').value,
      address: document.getElementById('custAddress').value,
      // Fix: Now sends color information to backend
      productName: `${currentProduct.name} (Color: ${currentProduct.selectedColor})`,
      amount: currentProduct.price * currentProduct.selectedQty
    };

    try {
      const res = await fetch('http://localhost:3000/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const data = await res.json();
      if (data.authorization_url) {
        window.location.assign(data.authorization_url);
      } else {
        throw new Error("Paystack error");
      }
    } catch (err) {
      alert("Payment failed. Make sure your server is running.");
      payBtn.disabled = false;
      payBtn.innerText = "Pay Now";
    }
  };
}

// =======================
// CLOSE MODAL & FILTERS
// =======================
if (closeBtn) {
  closeBtn.onclick = () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  };
}

if (closeCheckout) {
  closeCheckout.onclick = () => {
    checkoutModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  };
}

window.onclick = e => { 
  if (e.target === modal || e.target === checkoutModal) {
    modal.style.display = 'none';
    checkoutModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
};

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

const genderBtn = document.getElementById('genderBtn');
const genderMenu = document.querySelector('.gender-menu');
if (genderBtn && genderMenu) {
  genderBtn.addEventListener('click', e => {
    e.stopPropagation();
    genderMenu.classList.toggle('show');
  });
  const genderCheckboxes = genderMenu.querySelectorAll('input[type="checkbox"]');
  genderCheckboxes.forEach(box => {
    box.addEventListener('change', () => {
      selectedGenders = [...genderCheckboxes].filter(b => b.checked).map(b => b.value);
      genderBtn.textContent = selectedGenders.length === 0 ? 'Gender ▾' : selectedGenders.join(', ');
      renderProducts();
    });
  });
}

const badgeBtn = document.getElementById('badgeBtn');
const badgeMenu = document.querySelector('.badge-menu');
if (badgeBtn && badgeMenu) {
  badgeBtn.addEventListener('click', e => {
    e.stopPropagation();
    badgeMenu.classList.toggle('show');
  });
  const badgeCheckboxes = badgeMenu.querySelectorAll('input[type="checkbox"]');
  badgeCheckboxes.forEach(box => {
    box.addEventListener('change', () => {
      selectedBadges = [...badgeCheckboxes].filter(b => b.checked).map(b => b.value);
      badgeBtn.textContent = selectedBadges.length === 0 ? 'Badge ▾' : selectedBadges.join(', ');
      renderProducts();
    });
  });
}

const searchInput = document.getElementById("shopSearch");
if (searchInput) {
  searchInput.addEventListener("input", e => {
    searchQuery = e.target.value.toLowerCase();
    renderProducts();
  });
}

document.addEventListener('click', () => {
  if (genderMenu) genderMenu.classList.remove('show');
  if (badgeMenu) badgeMenu.classList.remove('show');
});

fetchProductsFromSheet();