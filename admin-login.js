 const ADMIN_USER = "admin";
  const ADMIN_PASS = "12345"; // change this

  function login() {
    const u = document.getElementById("username").value;
    const p = document.getElementById("password").value;

    if (u === ADMIN_USER && p === ADMIN_PASS) {
      localStorage.setItem("adminLoggedIn", "true");
      window.location.href = "admin.html";
    } else {
      document.getElementById("error").innerText = "Invalid login details";
    }
  }