// =============================================
// 1. CONFIGURATION & STATE
// =============================================
const API_URL = "http://localhost:3000/api/products";
let allProducts = [];
let editingProductId = null;
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
        const res = await fetch(API_URL);
        const data = await res.json();
        
        allProducts = data.products || [];
        const allOrders = data.orders || []; 

        if (document.getElementById('existingProducts')) renderProducts();
        if (document.getElementById('admin-orders-list')) renderOrders(allOrders);

        updateStats(allOrders);   
    } catch (err) {
        console.error("Sync Error:", err);
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
    document.getElementById('name').value = p.name;
    document.getElementById('price').value = p.price;
    document.getElementById('category').value = p.category;
    document.getElementById('description').value = p.description;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================
// 6. INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    await syncInventory();
    
    const loader = document.getElementById('loader-wrapper');
    if (loader) setTimeout(() => { loader.style.display = 'none'; }, 500);
});