// =============================================
// 1. CONFIGURATION & STATE
// =============================================
const API_URL = "http://localhost:3000/api/products";
let allProducts = [];
let editingProductId = null;
let uploadedImagesBase64 = []; 

const BLANK_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// =============================================
// UTILITY: SHOW NOTIFICATION IN CONTAINER
// =============================================
function showNotification(text, type = "success") {
    const msgDiv = document.getElementById("message");
    if (!msgDiv) return;

    msgDiv.innerText = text;
    // Apply styling
    msgDiv.style.display = "block";
    msgDiv.style.backgroundColor = type === "success" ? "#1a1a1a" : "#e74c3c";
    msgDiv.style.color = "white";
    msgDiv.style.position = "fixed";
    msgDiv.style.top = "20px";
    msgDiv.style.right = "20px";
    msgDiv.style.padding = "15px 25px";
    msgDiv.style.borderRadius = "8px";
    msgDiv.style.zIndex = "10000";
    msgDiv.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";

    // Auto-hide after 3 seconds
    setTimeout(() => {
        msgDiv.style.display = "none";
    }, 3000);
}

// =============================================
// 2. IMAGE HANDLING
// =============================================
async function handleImageUpload(input) {
    const files = Array.from(input.files);
    if (files.length === 0) return;

    uploadedImagesBase64 = []; 

    const promises = files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImagesBase64.push(e.target.result);
                resolve();
            };
            reader.readAsDataURL(file);
        });
    });

    await Promise.all(promises);
    updatePreview(); 
}

// =============================================
// 3. LIVE PREVIEW LOGIC
// =============================================
function updatePreview() {
    const name = document.getElementById('name').value || "Product Name";
    const price = document.getElementById('price').value || "0";
    const category = document.getElementById('category').value;
    const gender = document.getElementById('gender').value;
    const badge = document.getElementById('badge').value;

    document.getElementById('preview-name').innerText = name;
    document.getElementById('preview-price').innerText = `₦${Number(price).toLocaleString()}`;
    document.getElementById('preview-category-tag').innerText = `${category.toUpperCase()} • ${gender.toUpperCase()}`;

    const badgeEl = document.getElementById('preview-badge');
    if (badge) {
        badgeEl.innerText = badge;
        badgeEl.style.display = 'block';
    } else {
        badgeEl.style.display = 'none';
    }

    const selectedColors = Array.from(document.querySelectorAll('#colorsContainer input:checked')).map(cb => cb.value);
    const dotsContainer = document.getElementById('preview-colors');
    dotsContainer.innerHTML = selectedColors.map(color => 
        `<span class="dot" style="background-color: ${color.toLowerCase()}; border: 1px solid #ddd; width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 5px;"></span>`
    ).join('');

    const previewImg = document.getElementById('preview-img');
    if (uploadedImagesBase64.length > 0) {
        previewImg.src = uploadedImagesBase64[0];
    } else if (editingProductId) {
        const p = allProducts.find(item => item.id === editingProductId);
        previewImg.src = (p && p.images && p.images[0]) ? p.images[0] : BLANK_IMG;
    } else {
        previewImg.src = BLANK_IMG;
    }
}

// =============================================
// 4. CRUD OPERATIONS
// =============================================

async function syncInventory() {
    try {
        const res = await fetch(API_URL);
        allProducts = await res.json();
        renderProducts();
        updateStats();
    } catch (err) {
        showNotification("Failed to sync inventory", "error");
    }
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    let finalImages = uploadedImagesBase64;
    
    if (editingProductId && uploadedImagesBase64.length === 0) {
        const p = allProducts.find(item => item.id === editingProductId);
        finalImages = p ? p.images : [];
    }

    if (finalImages.length === 0) {
        showNotification("Please upload at least one image.", "error");
        return;
    }

    const productData = {
        action: editingProductId ? "edit" : "add",
        id: editingProductId || Date.now().toString(),
        name: document.getElementById('name').value,
        price: document.getElementById('price').value,
        category: document.getElementById('category').value,
        gender: document.getElementById('gender').value,
        badge: document.getElementById('badge').value,
        description: document.getElementById('description').value,
        images: finalImages, 
        colors: Array.from(document.querySelectorAll('#colorsContainer input:checked')).map(cb => cb.value)
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productData)
        });

        if (res.ok) {
            showNotification(editingProductId ? "Product Updated!" : "Product Published!", "success");
            
            // Reset form without reloading page
            editingProductId = null;
            uploadedImagesBase64 = [];
            e.target.reset();
            updatePreview();
            syncInventory();
        } else {
            showNotification("Server error. Check image sizes.", "error");
        }
    } catch (err) {
        showNotification("Connection error to server.", "error");
    }
});

async function deleteProduct(id) {
    if (!confirm("Remove this product?")) return;
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, action: "delete" })
        });
        if (res.ok) {
            showNotification("Product deleted", "success");
            syncInventory();
        }
    } catch (err) {
        showNotification("Delete failed", "error");
    }
}

// =============================================
// 5. UI RENDERING
// =============================================

function renderProducts() {
    const container = document.getElementById('existingProducts');
    container.innerHTML = allProducts.map(p => `
        <div class="product-admin" style="display:flex; align-items:center; gap:20px; background:white; padding:15px; margin-bottom:10px; border-radius:10px; border:1px solid #eee;">
            <img src="${(p.images && p.images[0]) ? p.images[0] : BLANK_IMG}" style="width:60px; height:60px; object-fit:cover; border-radius:5px;">
            <div style="flex:1">
                <strong>${p.name}</strong>
                <p style="margin:5px 0; color:#666;">₦${Number(p.price).toLocaleString()} | ${p.category}</p>
            </div>
            <div>
                <button onclick="editProduct('${p.id}')" style="background:#3498db; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteProduct('${p.id}')" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function editProduct(id) {
    const p = allProducts.find(item => item.id === id);
    if (!p) return;

    editingProductId = p.id;
    document.getElementById('name').value = p.name;
    document.getElementById('price').value = p.price;
    document.getElementById('category').value = p.category;
    document.getElementById('gender').value = p.gender;
    document.getElementById('badge').value = p.badge;
    document.getElementById('description').value = p.description;

    document.querySelectorAll('#colorsContainer input').forEach(cb => {
        cb.checked = p.colors ? p.colors.includes(cb.value) : false;
    });

    updatePreview();
    window.scrollTo({ top: document.querySelector('.admin-form').offsetTop - 50, behavior: 'smooth' });
}

function updateStats() {
    document.getElementById('stat-products').innerText = allProducts.length;
}

function logout() {
    localStorage.removeItem("adminLoggedIn");
    window.location.href = "admin-login.html";
}

// =============================================
// 6. INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    syncInventory();
    
    setTimeout(() => {
        const loader = document.getElementById('loader-wrapper');
        if(loader) loader.style.display = 'none';
    }, 1000);
});