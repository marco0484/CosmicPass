const params = new URLSearchParams(window.location.search);
const id = params.get("id");

function pagar() {
  alert("Pago simulado exitoso 🚀");
  window.location.href = `ticket.html?id=${id}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const btnHome = document.getElementById("btnHome");
  if (btnHome) {
    btnHome.addEventListener("click", () => {
      window.location.href = "index.html"; // vuelve al inicio
    });
  }

});