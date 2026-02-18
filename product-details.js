window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// =============================================
// CONFIGURATION
// =============================================
const API_URL = "http://localhost:3000/api/products";
let currentProduct = null;

// =============================================
// UI & NAVIGATION LOGIC
// =============================================
function toggleSidebar() {
    document.getElementById("mobileSidebar").classList.add("active");
}

function closeSidebar() {
    document.getElementById("mobileSidebar").classList.remove("active");
}

function changeQty(amount) {
    const qtyInput = document.getElementById('qty');
    let val = parseInt(qtyInput.value) + amount;
    if (val < 1) val = 1;
    qtyInput.value = val;
}

// =============================================
// DATA FETCHING
// =============================================
async function loadProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = 'shop.html';
        return;
    }

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Server not responding");
        
        const data = await res.json();
        
        // FIXED: Look inside data.products instead of just 'data'
        const productsList = data.products || [];
        currentProduct = productsList.find(p => String(p.id) === String(productId));

        if (!currentProduct) {
            alert("Product not found in our collection.");
            window.location.href = 'shop.html';
            return;
        }

        renderDetails();

    } catch (err) {
        console.error("Error loading product:", err);
        const loaderText = document.getElementById('loader-text');
        if (loaderText) loaderText.innerText = "Connection error. Retrying...";
        setTimeout(loadProductDetails, 5000);
    }
}

function renderDetails() {
    document.title = `${currentProduct.name} | HotshionHub`;
    document.getElementById('product-title').innerText = currentProduct.name;
    document.getElementById('product-price').innerText = `₦${Number(currentProduct.price).toLocaleString()}`;
    document.getElementById('product-desc').innerText = currentProduct.description || "A masterfully crafted piece from our latest collection.";

    // Images & Thumbnails
    const images = Array.isArray(currentProduct.images) ? currentProduct.images : currentProduct.images.split('|');
    const mainImg = document.getElementById('main-product-img');
    mainImg.src = images[0];

    const thumbContainer = document.getElementById('thumbnail-container');
    thumbContainer.innerHTML = '';
    images.forEach((img, index) => {
        const thumb = document.createElement('img');
        thumb.src = img;
        thumb.alt = `Thumbnail ${index + 1}`;
        thumb.onclick = () => mainImg.src = img;
        thumbContainer.appendChild(thumb);
    });

    // Colors
    const colorSelect = document.getElementById('modalColor');
    const colors = currentProduct.colors 
        ? (Array.isArray(currentProduct.colors) ? currentProduct.colors : currentProduct.colors.split(',')) 
        : ["Standard"];
    
    colorSelect.innerHTML = colors.map(c => `<option value="${c.trim()}">${c.trim()}</option>`).join('');

    // Hide Loader
    const loader = document.getElementById('loader-wrapper');
    if (loader) loader.style.display = 'none';
}

// =============================================
// CHECKOUT MODAL LOGIC
// =============================================
function openCheckout() {
    const qty = document.getElementById('qty').value;
    const totalPrice = currentProduct.price * qty;
    
    document.getElementById('summaryPrice').innerText = `₦${totalPrice.toLocaleString()}`;
    document.getElementById('checkoutModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// =============================================
// PAYMENT SUBMISSION
// =============================================
const checkoutForm = document.getElementById('detailsCheckoutForm');
if (checkoutForm) {
    checkoutForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const finalPayBtn = document.getElementById('finalPayBtn');
        const selectedColor = document.getElementById('modalColor').value;
        const selectedQty = document.getElementById('qty').value;

        finalPayBtn.innerText = "Securing Connection...";
        finalPayBtn.disabled = true;

        const orderData = {
            name: document.getElementById('custName').value,
            email: document.getElementById('custEmail').value,
            phone: document.getElementById('custPhone').value,
            address: document.getElementById('custAddress').value,
            productName: `${currentProduct.name} (${selectedColor}) x${selectedQty}`,
            amount: currentProduct.price * selectedQty
        };

        try {
            const response = await fetch('http://localhost:3000/api/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const data = await response.json();
            if (data.authorization_url) {
                window.location.href = data.authorization_url;
            } else {
                throw new Error("Gateway Error");
            }

        } catch (err) {
            alert("Payment connection failed. Ensure the backend server is active.");
            finalPayBtn.innerText = "Proceed to Payment";
            finalPayBtn.disabled = false;
        }
    };
}

// Close modal if user clicks outside of the content box
window.onclick = function(event) {
    const modal = document.getElementById('checkoutModal');
    if (event.target == modal) {
        closeCheckout();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProductDetails();
    const payBtn = document.getElementById('payNowBtn');
    if (payBtn) payBtn.addEventListener('click', openCheckout);
});