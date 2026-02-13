const sidebar = document.getElementById("mobileSidebar");
const menuBtn = document.querySelector(".menu-btn");

function toggleSidebar() {
  sidebar.classList.add("active");
  menuBtn.style.display = "none"; // hide hamburger
}

function closeSidebar() {
  sidebar.classList.remove("active");
  menuBtn.style.display = "block"; // show hamburger
}

// =========================
// NEWSLETTER SUBSCRIPTION
// =========================
const newsletterForm = document.getElementById('newsletterForm');
const newsletterInput = newsletterForm?.querySelector('input');
const newsletterMessage = document.createElement('p'); // message element
newsletterMessage.style.color = 'green';
newsletterMessage.style.marginTop = '10px';
newsletterForm?.appendChild(newsletterMessage);

newsletterForm?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = newsletterInput.value.trim();

  if (!email) {
    newsletterMessage.textContent = "Please enter a valid email.";
    newsletterMessage.style.color = 'red';
    return;
  }

  // Show immediate success message
  newsletterMessage.textContent = `Thanks for subscribing with ${email}!`;
  newsletterMessage.style.color = 'green';

  // Optionally: send to Google Sheet
  try {
    await fetch("YOUR_GOOGLE_SHEET_WEB_APP_URL_FOR_SUBSCRIBERS", { // replace with your subscribers sheet URL
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Subscription error:", err);
    newsletterMessage.textContent = "Subscribed locally, but failed to save online.";
    newsletterMessage.style.color = 'orange';
  }

  // Reset the form
  newsletterInput.value = '';
});


// =========================
// FETCH PRODUCTS FROM GOOGLE SHEET
// =========================
const API_URL = "http://localhost:3000/api/products"; // replace with your sheet web app URL
const featuredContainer = document.getElementById('featuredProducts');
let products = [];

// Modal elements
const modal = document.getElementById('productModal');
const closeBtn = document.querySelector('.close');
const mainImage = document.getElementById('mainImage');
const thumbnails = document.getElementById('thumbnails');
const modalName = document.getElementById('modalName');
const modalPrice = document.getElementById('modalPrice');
const modalDesc = document.getElementById('modalDesc');
const modalColor = document.getElementById('modalColor');
const modalQty = document.getElementById('modalQty');
const modalOrderBtn = document.getElementById('modalOrderBtn');

// =========================
// FETCH PRODUCTS FUNCTION
// =========================
async function fetchProducts() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    products = data.map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      description: p.description || "",
      images: Array.isArray(p.images) ? p.images : [],
      colors: Array.isArray(p.colors) ? p.colors : [],
      category: p.category,
      gender: p.gender,
      badge: p.badge || ""
    }));

    renderFeaturedProducts();
  } catch (err) {
    console.error("FETCH ERROR:", err);
    featuredContainer.innerHTML = "<p>Failed to load products</p>";
  }
}

// =========================
// RENDER FEATURED PRODUCTS
// =========================
function renderFeaturedProducts() {
  featuredContainer.innerHTML = '';

  // Shuffle products and pick first 4
  const shuffled = [...products].sort(() => 0.5 - Math.random());
  const featured = shuffled.slice(0, 4);

  featured.forEach(product => {
    const badgeHTML = product.badge ? `<span class="badge">${product.badge}</span>` : '';
    featuredContainer.innerHTML += `
      <div class="product">
        ${badgeHTML}
        <img src="${product.images[0]}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>₦${product.price.toLocaleString()}</p>
        <button onclick="openModalById('${product.id}')">View Product</button>
      </div>
    `;
  });
}

// =========================
// OPEN MODAL BY PRODUCT ID
// =========================
function openModalById(productId) {
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return alert('Product not found!');

  modal.style.display = 'flex';

  mainImage.src = product.images[0];
  modalName.textContent = product.name;
  modalPrice.textContent = `₦${product.price.toLocaleString()}`;
  modalDesc.textContent = product.description;

  // Colors
  modalColor.innerHTML = '';
  product.colors?.forEach(color => {
    const option = document.createElement('option');
    option.value = color;
    option.textContent = color;
    modalColor.appendChild(option);
  });

  // Thumbnails
  thumbnails.innerHTML = '';
  product.images.forEach(img => {
    const thumb = document.createElement('img');
    thumb.src = img;
    thumb.onclick = () => mainImage.src = img;
    thumbnails.appendChild(thumb);
  });

  // Order button
  modalOrderBtn.onclick = () => {
    const total = product.price * Number(modalQty.value);
    const message = `
Product: ${product.name}
Color: ${modalColor.value}
Quantity: ${modalQty.value}
Price: ₦${total.toLocaleString()}
`;
    window.open(`https://wa.me/2347062161794?text=${encodeURIComponent(message)}`, '_blank');
  };
}

// =========================
// CLOSE MODAL
// =========================
closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

// =========================
// INITIAL LOAD
// =========================
fetchProducts();
