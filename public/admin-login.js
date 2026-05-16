function login() {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  const errorEl = document.getElementById("error");
  if (errorEl) errorEl.innerText = "";

  const API_BASE = window.HOTSHION_API_BASE || "";

  fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username: u, password: p }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Invalid login details");
      return res.json();
    })
    .then(() => {
      window.location.href = "admin.html";
    })
    .catch(() => {
      if (errorEl) errorEl.innerText = "Invalid login details";
    });
}
