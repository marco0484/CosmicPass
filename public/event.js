const params = new URLSearchParams(window.location.search);
const id = params.get("id");

cargarEvento();

async function cargarEvento() {
  try {

const res = await fetch(`http://192.168.100.23:3000/api/events/${id}`);
    const evento = await res.json();

    // 👇 insertar datos en HTML
    document.getElementById("title").textContent = evento.name;
    document.getElementById("Organizador").textContent = evento.description;
    document.getElementById("city").textContent = evento.city;
    document.getElementById("price").textContent = `$${evento.price}`;
    document.getElementById("desc").textContent = evento.description;
    document.getElementById("img").src = evento.image;

  } catch (error) {
    console.error("Error cargando evento:", error);
  }
}

function irHome() {
  window.location.href = "index.html"; 
}

function irCheckout() {
  window.location.href = `checkout.html?id=${id}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const btnHome = document.getElementById("btnHome");
  if (btnHome) {
    btnHome.addEventListener("click", () => {
      window.location.href = "index.html"; 
    });
  }

  cargarEvento();
});