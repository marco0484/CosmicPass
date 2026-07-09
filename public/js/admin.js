const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://www.cosmicpass.space";

if (localStorage.getItem("auth") !== "true") {
  window.location.href = "login.html";
}

const user = JSON.parse(localStorage.getItem("cosmic_user"));

if (!user) {
  localStorage.removeItem("auth");
  window.location.href = "login.html";
}

const isAdmin = user.rol === "admin";
const idProductora = user.id_productora;

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("cosmic_user");
    window.location.href = "login.html";
  });
}

const adminName = document.getElementById("adminName");

if (adminName) {
  adminName.textContent = isAdmin
    ? "Administrador general"
    : `Productora #${idProductora}`;
}

async function cargarDashboard() {
  try {
    const endpoint = isAdmin
      ? `${API}/admin/dashboard`
      : `${API}/admin/dashboard?id_productora=${idProductora}`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error cargando dashboard");
    }

    console.log("Dashboard:", data);

  } catch (error) {
    console.error("ERROR DASHBOARD:", error);
  }
}

cargarDashboard();