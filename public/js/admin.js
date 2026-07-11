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

const isOwner = user.rol === "owner";
const idProductora = Number(user.id_productora) || null;

if (!isOwner && !idProductora) {
  alert("Este usuario no tiene una productora asignada.");
  localStorage.removeItem("auth");
  localStorage.removeItem("cosmic_user");
  window.location.href = "login.html";
}

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
  adminName.textContent = isOwner
    ? "Owner Cosmic Pass"
    : user.nombre || `Productora #${idProductora}`;
}

async function cargarDashboard() {
  try {

    const endpoint = isOwner
      ? `${API}/admin/dashboard`
      : `${API}/admin/dashboard?id_productora=${idProductora}`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error cargando dashboard");
    }

    const m = data.metricas;

    document.getElementById("ventasTotal").textContent =
      `$${Number(m.ingresos).toLocaleString("es-MX", {
        minimumFractionDigits: 2
      })}`;

    document.getElementById("ticketsVendidos").textContent =
      m.tickets;

    document.getElementById("eventosActivos").textContent =
      m.eventos;

    document.getElementById("productorasTotal").textContent =
      m.productoras;

  } catch (error) {
    console.error("ERROR DASHBOARD:", error);
  }
}

cargarDashboard();