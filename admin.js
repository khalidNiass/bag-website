// =============================================
// 1. CONFIGURATION & STATE
// =============================================
const API_BASE =
    (location.hostname === "127.0.0.1" || location.hostname === "localhost") &&
    location.port === "5500"
        ? "http://localhost:3000"
        : "";
const API_URL = `${API_BASE}/api/products`;
let allProducts = [];
let editingProductId = null;
let editingProduct = null;
let uploadedImages = [];
const BLANK_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// =============================================
// 2. UTILITY & NOTIFICATIONS
// =============================================
function showNotification(text, type = "success") {
    const msgDiv = document.getElementById("message");
    if (!msgDiv) return;
    msgDiv.innerText = text;
    msgDiv.style.display = "block";
    msgDiv.style.backgroundColor = type === "success" ? "#121212" : "#e74c3c";
    msgDiv.style.color = "#c5a059";
    setTimeout(() => { msgDiv.style.display = "none"; }, 3000);
}

async function isLoggedIn() {
    try {
        const res = await fetch("/api/me", { credentials: "include" });
        const data = await res.json();
        return !!data.admin;
    } catch {
        return false;
    }
}

function logout() {
    fetch("/api/logout", { method: "POST", credentials: "include" })
        .finally(() => {
            window.location.href = "admin-login.html";
        });
}

async function requireAuth() {
    const isLoginPage = document.body.classList.contains("admin-login");
    if (isLoginPage) return;
    const ok = await isLoggedIn();
    if (!ok) window.location.href = "admin-login.html";
}

function getSelectedColors() {
    const colorBoxes = document.querySelectorAll('#colorsContainer input[type="checkbox"]');
    return Array.from(colorBoxes).filter(c => c.checked).map(c => c.value);
}

function updatePreview() {
    const nameEl = document.getElementById("preview-name");
    const priceEl = document.getElementById("preview-price");
    const categoryTag = document.getElementById("preview-category-tag");
    const badgeEl = document.getElementById("preview-badge");
    const imgEl = document.getElementById("preview-img");
    const colorsWrap = document.getElementById("preview-colors");

    if (!nameEl || !priceEl || !categoryTag || !badgeEl || !imgEl || !colorsWrap) return;

    const name = document.getElementById("name")?.value || "Product Name";
    const price = Number(document.getElementById("price")?.value || 0);
    const category = document.getElementById("category")?.value || "CATEGORY";
    const gender = document.getElementById("gender")?.value || "GENDER";
    const badge = document.getElementById("badge")?.value || "";
    const colors = getSelectedColors();

    nameEl.innerText = name;
    priceEl.innerText = `₦${price.toLocaleString()}`;
    categoryTag.innerText = `${category.toUpperCase()} • ${gender.toUpperCase()}`;

    if (badge) {
        badgeEl.style.display = "inline-block";
        badgeEl.innerText = badge;
    } else {
        badgeEl.style.display = "none";
    }

    const imgSrc =
        uploadedImages[0] ||
        (editingProduct?.images && editingProduct.images[0]) ||
        BLANK_IMG;
    imgEl.src = imgSrc;

    colorsWrap.innerHTML = colors.map(c => {
        return `<span class="dot" title="${c}" style="background:${c.toLowerCase()};"></span>`;
    }).join("");
}

function handleImageUpload(input) {
    const files = Array.from(input.files || []);
    if (files.length === 0) {
        uploadedImages = [];
        updatePreview();
        return;
    }

    uploadedImages = [];
    const readers = files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    });

    Promise.all(readers).then(results => {
        uploadedImages = results.filter(Boolean);
        updatePreview();
    });
}

// =============================================
// 3. RENDERING FUNCTIONS
// =============================================

function renderProducts() {
    const container = document.getElementById('existingProducts');
    if (!container) return;
    
    container.innerHTML = allProducts.map(p => `
        <div class="product-admin" style="display:flex; align-items:center; gap:20px; background:white; padding:15px; margin-bottom:10px; border:1px solid #eee; border-radius:8px;">
            <img src="${(p.images && p.images[0]) ? p.images[0] : BLANK_IMG}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
            <div style="flex:1">
                <strong style="display:block;">${p.name}</strong>
                <p style="color:#c5a059; margin:0; font-weight:bold;">₦${Number(p.price).toLocaleString()}</p>
            </div>
            <div>
                <button onclick="editProduct('${p.id}')" class="action-btn" style="background:#121212; color:#c5a059; border:1px solid #c5a059; padding:8px 12px; cursor:pointer;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteProduct('${p.id}')" class="action-btn" style="background:#f4f4f4; border:1px solid #ddd; padding:8px 12px; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function renderOrders(orders) {
    const container = document.getElementById('admin-orders-list');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `<tr><td colspan="8" style="text-align:center;">No orders found.</td></tr>`;
        return;
    }

    container.innerHTML = orders.map(order => `
        <tr>
            <td>${order.date || 'N/A'}</td>
            <td>#${order.ref ? order.ref.substring(0,8) : 'N/A'}</td>
            <td>${order.name}</td>
            <td>${order.product}</td>
            <td>₦${Number(order.amount).toLocaleString()}</td>
            <td>${order.address}</td>
            <td><span class="status-pill ${order.status?.toLowerCase() || 'pending'}">${order.status || 'Pending'}</span></td>
            <td>
                <button class="action-btn btn-ship" onclick="updateOrderStatus('${order.ref}', 'shipped')" title="Mark as Shipped"><i class="fas fa-truck"></i></button>
                <button class="action-btn btn-delete" onclick="deleteOrder('${order.ref}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// =============================================
// 4. CORE DATA SYNC
// =============================================
async function syncInventory() {
    try {
        console.log("Admin: Fetching from", API_URL); // Debugging log
        const res = await fetch(API_URL);
        const data = await res.json();
        console.log("Admin: Data Received", data); // Check your F12 console for this!

        // Handle both object {products:[]} and direct array [] formats
        const rawProducts = data.products || (Array.isArray(data) ? data : []);
        const rawOrders = data.orders || [];

        // 1. Process Products
        allProducts = rawProducts.map(p => ({
            ...p,
            id: String(p.id),
            images: typeof p.images === 'string' ? p.images.split('|') : (Array.isArray(p.images) ? p.images : [])
        }));

        // 2. Render UI Components
        const productContainer = document.getElementById('existingProducts');
        const orderContainer = document.getElementById('admin-orders-list');

        if (productContainer) {
            renderProducts();
        } else {
            console.warn("Missing HTML element: #existingProducts");
        }

        if (orderContainer) {
            renderOrders(rawOrders);
        } else {
            console.warn("Missing HTML element: #admin-orders-list");
        }

        updateStats(rawOrders);   
    } catch (err) {
        console.error("Admin Sync Error:", err);
        showNotification("Failed to sync data. Is the server running?", "error");
    }
}

function updateStats(orders = []) {
    const revEl = document.getElementById('stat-revenue');
    const ordEl = document.getElementById('stat-orders');
    const prodEl = document.getElementById('stat-products');

    if (prodEl) prodEl.innerText = allProducts.length;
    if (ordEl) ordEl.innerText = orders.length;
    if (revEl) {
        const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
        revEl.innerText = `₦${totalRevenue.toLocaleString()}`;
    }
}

// =============================================
// 5. PRODUCT & ORDER ACTIONS
// =============================================

async function updateOrderStatus(ref, newStatus) {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "update_order_status", ref, status: newStatus })
        });
        if (res.ok) { 
            showNotification(`Order marked as ${newStatus}`, "success"); 
            syncInventory(); 
        }
    } catch (err) { showNotification("Update failed", "error"); }
}

async function deleteOrder(ref) {
    if (!confirm("Are you sure you want to permanently delete this order?")) return;
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_order", ref: ref })
        });
        if (res.ok) {
            showNotification("Order deleted successfully", "success");
            syncInventory();
        }
    } catch (err) { showNotification("Delete failed", "error"); }
}

async function deleteProduct(id) {
    if (!confirm("Permanently delete this product from inventory?")) return;
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id: id })
        });
        if (res.ok) {
            showNotification("Product removed", "success");
            syncInventory();
        }
    } catch (err) { showNotification("Failed to delete product", "error"); }
}

function editProduct(id) {
    const p = allProducts.find(item => item.id === id);
    if (!p) return;
    
    if (!document.getElementById('productForm')) {
        window.location.href = `admin.html?edit=${id}`;
        return;
    }

    editingProductId = p.id;
    editingProduct = p;
    document.getElementById('name').value = p.name;
    document.getElementById('price').value = p.price;
    document.getElementById('category').value = p.category;
    const genderEl = document.getElementById('gender');
    if (genderEl && p.gender) genderEl.value = p.gender;
    const badgeEl = document.getElementById('badge');
    if (badgeEl) badgeEl.value = p.badge || "";
    document.getElementById('description').value = p.description;
    const colors = p.colors
        ? (Array.isArray(p.colors) ? p.colors : String(p.colors).split(","))
        : [];
    const colorBoxes = document.querySelectorAll('#colorsContainer input[type="checkbox"]');
    colorBoxes.forEach(cb => {
        cb.checked = colors.map(c => c.trim()).includes(cb.value);
    });
    uploadedImages = [];
    updatePreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================
// 6. INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();

    const form = document.getElementById("productForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            try {
                const payload = {
                    action: editingProductId ? "edit" : "add",
                    id: editingProductId || undefined,
                    name: document.getElementById("name")?.value?.trim(),
                    price: Number(document.getElementById("price")?.value || 0),
                    category: document.getElementById("category")?.value,
                    gender: document.getElementById("gender")?.value,
                    badge: document.getElementById("badge")?.value || "",
                    colors: getSelectedColors().join(","),
                    images:
                        (uploadedImages.length
                            ? uploadedImages
                            : (editingProduct?.images || [])
                        ).join("|"),
                    description: document.getElementById("description")?.value?.trim(),
                };

                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) throw new Error("Save failed");
                showNotification(editingProductId ? "Product updated" : "Product added", "success");
                editingProductId = null;
                editingProduct = null;
                uploadedImages = [];
                form.reset();
                updatePreview();
                syncInventory();
            } catch (err) {
                showNotification("Save failed. Check server.", "error");
            }
        });
    }

    await syncInventory();
    
    const loader = document.getElementById('loader-wrapper');
    if (loader) setTimeout(() => { loader.style.display = 'none'; }, 500);
});
