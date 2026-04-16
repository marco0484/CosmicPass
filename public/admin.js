if (localStorage.getItem("auth") !== "true") {
  window.location.href = "login.html";
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("auth");
  window.location.href = "login.html";
});

async function cargarContactos() {
  const res = await fetch("http://localhost:3000/contactos");
  const data = await res.json();
  const tabla = document.getElementById("tablaContactos");

  tabla.innerHTML = "";

  if (data.length === 0) {
    tabla.innerHTML = "<tr><td colspan='3'>Sin contactos</td></tr>";
    return;
  }

  data.forEach(c => {
    tabla.innerHTML += `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.email}</td>
        <td>${c.mensaje}</td>
      </tr>
    `;
  });
}

cargarContactos();