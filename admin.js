// ===============================
// ADMIN AUTH
// ===============================
function logout() {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "admin-login.html";
}

// ===============================
// DOM ELEMENTS
// ===============================
const form = document.getElementById("productForm");
const existingProductsEl = document.getElementById("existingProducts");
const imageInput = document.getElementById("images");

// Temporary message container
const messageEl = document.createElement("div");
messageEl.id = "message";
messageEl.style.textAlign = "center";
messageEl.style.margin = "15px 0";
form.parentNode.insertBefore(messageEl, form);

// ===============================
// BACKEND CONFIG
// ===============================
const API_URL = "http://localhost:3000/api/products"; 

// ===============================
// STATE
// ===============================
let products = [];
let editingProductId = null;

// ===============================
// UTILS
// ===============================
function showMessage(msg, type = "info") {
  messageEl.textContent = msg;
  messageEl.className = type;
  messageEl.style.display = "block";
  messageEl.style.opacity = "1";
  setTimeout(() => {
    messageEl.style.opacity = "0";
    setTimeout(() => messageEl.style.display = "none", 300);
  }, 3000);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}

// ===============================
// SYNC FROM GOOGLE SHEET
// ===============================
async function syncFromGoogleSheet() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    // Ensure data is mapped correctly from Sheet rows
    products = data.map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      description: p.description || "",
      images: Array.isArray(p.images) ? p.images : (p.images ? p.images.split("|") : []),
      colors: Array.isArray(p.colors) ? p.colors : (p.colors ? p.colors.split(",") : []),
      category: p.category,
      gender: p.gender,
      badge: p.badge || ""
    }));

    renderProducts();
  } catch (err) {
    console.error("SYNC ERROR:", err);
    showMessage("❌ Failed to sync products", "error");
  }
}

// ===============================
// ADD / EDIT PRODUCT
// ===============================
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const price = Number(document.getElementById("price").value);
  const description = document.getElementById("description").value.trim();
  const category = document.getElementById("category").value;
  const gender = document.getElementById("gender").value;
  const badge = document.getElementById("badge").value;
  const colors = [...document.querySelectorAll("#colorsContainer input:checked")].map(cb => cb.value);

  if (!name || isNaN(price) || price <= 0) {
    showMessage("❌ Please enter a valid name and price", "error");
    return;
  }

  let images = [];
  try {
    // If editing and no new images selected, keep old ones. Else, convert new files.
    if (editingProductId && imageInput.files.length === 0) {
      images = products.find(p => p.id === editingProductId).images;
    } else {
      images = await Promise.all([...imageInput.files].map(fileToBase64));
    }
  } catch (err) {
    showMessage("❌ Error reading image file", "error");
    return;
  }

  const productData = {
    id: editingProductId || Date.now().toString(), // Ensure ID is a string for comparison
    name,
    price,
    description,
    images,
    colors,
    category,
    gender,
    badge
  };

  // Set the action for the Google Script logic
  const payload = editingProductId 
    ? { ...productData, action: "edit" } 
    : { ...productData, action: "add" };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json(); // Node server sends JSON {success, message}
    console.log("SERVER RESPONSE:", result);

    if (result.message === "SUCCESS" || result.message === "UPDATED") {
      if (editingProductId) {
        products = products.map(p => p.id === editingProductId ? productData : p);
        showMessage("✏️ Product updated successfully!", "success");
        editingProductId = null;
      } else {
        products.push(productData);
        showMessage("✅ Product added successfully!", "success");
      }

      form.reset();
      imageInput.value = "";
      renderProducts();
    } else {
      showMessage("❌ Error: " + result.message, "error");
    }

  } catch (err) {
    console.error("POST ERROR:", err);
    showMessage("❌ Failed to send product", "error");
  }
});

// ===============================
// DELETE PRODUCT
// ===============================
async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, action: "delete" })
    });

    const result = await res.json();
    console.log("DELETE RESPONSE:", result);

    if (result.message === "DELETED") {
      products = products.filter(p => p.id !== id);
      renderProducts();
      showMessage("🗑️ Product deleted", "success");
    } else {
      showMessage("❌ Could not delete: " + result.message, "error");
    }
  } catch (err) {
    console.error("DELETE ERROR:", err);
    showMessage("❌ Failed to delete product", "error");
  }
}

// ===============================
// EDIT PRODUCT (Fill form)
// ===============================
function editProduct(product) {
  editingProductId = product.id;

  document.getElementById("name").value = product.name;
  document.getElementById("price").value = product.price;
  document.getElementById("description").value = product.description;
  document.getElementById("category").value = product.category;
  document.getElementById("gender").value = product.gender;
  document.getElementById("badge").value = product.badge;

  document.querySelectorAll("#colorsContainer input").forEach(cb => {
    cb.checked = product.colors.includes(cb.value);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
  showMessage("✏️ Editing product. Update fields and submit.", "info");
}

// ===============================
// RENDER PRODUCTS
// ===============================
function renderProducts() {
  existingProductsEl.innerHTML = "";

  if (!products.length) {
    existingProductsEl.innerHTML = "<p style='text-align:center'>No products yet</p>";
    return;
  }

  // Display newest first
  [...products].reverse().forEach(product => {
    const div = document.createElement("div");
    div.className = "product-admin";

    const imagesHTML = product.images.map(img => `
      <img src="${img}" alt="${product.name}" class="product-thumb" onerror="this.src='https://via.placeholder.com/50'">
    `).join("");

    div.innerHTML = `
      <div class="images-container">${imagesHTML}</div>
      <div class="info">
        <strong>${product.name}</strong>
        ${product.badge ? `<span class="badge-admin">${product.badge}</span>` : ""}
        <p>₦${product.price.toLocaleString()}</p>
        <p>${product.category} • ${product.gender}</p>
        <div class="color-tags">${product.colors.map(c => `<span class="color-tag">${c}</span>`).join("")}</div>
      </div>
      <div class="actions">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;

    div.querySelector(".edit-btn").onclick = () => editProduct(product);
    div.querySelector(".delete-btn").onclick = () => deleteProduct(product.id);

    existingProductsEl.appendChild(div);
  });
}

// ===============================
// IMAGE ALERT
// ===============================
imageInput.addEventListener("change", function () {
  if (this.files.length > 0) {
    showMessage(`📂 ${this.files.length} image(s) selected`, "success");
  }
});

// ===============================
// INITIAL LOAD
// ===============================
syncFromGoogleSheet();