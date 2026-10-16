
const API = window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://www.cosmicpass.space";

const params = new URLSearchParams(window.location.search);
const slug = params.get("productora");

const titulo = document.getElementById("producer-title");
const estado = document.getElementById("workshops-status");
const grid = document.getElementById("workshops-grid");
const volver = document.getElementById("back-to-producer");

function mostrarEstado(mensaje) {
  estado.textContent = mensaje;
  estado.hidden = false;
}

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caracter]);
}

function formatearPrecio(precio) {
  if (precio === null || precio === undefined || precio === "") {
    return "Precio por confirmar";
  }

  const numero = Number(precio);

  if (!Number.isFinite(numero)) {
    return "Precio por confirmar";
  }

  return numero.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN"
  });
}

function formatearFecha(fecha) {
  if (!fecha) return "";

  const valor = String(fecha).slice(0, 10);
  const partes = valor.split("-");

  if (partes.length !== 3) return escaparHTML(fecha);

  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

function renderizarTalleres(talleres) {
  grid.replaceChildren();

  if (!Array.isArray(talleres) || talleres.length === 0) {
    mostrarEstado("Esta productora todavía no tiene talleres disponibles.");
    return;
  }

  estado.hidden = true;

  talleres.forEach(taller => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "cp-product-card";

    const imagen = taller.imagen
      ? `<img src="${escaparHTML(taller.imagen)}" alt="${escaparHTML(taller.nombre)}" loading="lazy">`
      : `<div class="cp-product-placeholder">🎓</div>`;

    const fechas = [
      taller.fecha_inicio ? `Inicio: ${formatearFecha(taller.fecha_inicio)}` : "",
      taller.fecha_fin ? `Fin: ${formatearFecha(taller.fecha_fin)}` : ""
    ].filter(Boolean);

    const ubicacion = taller.ubicacion
      ? `<p class="cp-workshop-detail">📍 ${escaparHTML(taller.ubicacion)}</p>`
      : "";

    const fechasHTML = fechas.length
      ? `<p class="cp-workshop-detail">📅 ${fechas.map(escaparHTML).join(" · ")}</p>`
      : "";

    const cupo = taller.cupo_maximo !== null &&
      taller.cupo_maximo !== undefined &&
      taller.cupo_maximo !== ""
      ? `<p class="cp-workshop-detail">👥 Cupo: ${escaparHTML(taller.cupo_maximo)} personas</p>`
      : "";

    tarjeta.innerHTML = `
      <div class="cp-product-image">${imagen}</div>
      <div class="cp-product-info">
        <h2>${escaparHTML(taller.nombre || "Taller")}</h2>
        <p>${escaparHTML(taller.descripcion || "Taller de la productora.")}</p>
        ${fechasHTML}
        ${ubicacion}
        ${cupo}
        <strong class="cp-product-price">${formatearPrecio(taller.precio)}</strong>
      </div>
    `;

    grid.appendChild(tarjeta);
  });
}

async function cargarTalleres() {
  if (!slug) {
    mostrarEstado("No se indicó qué productora quieres consultar.");
    return;
  }

  volver.href = `/productora/${encodeURIComponent(slug)}`;

  try {
    const respuesta = await fetch(
      `${API}/api/productora/${encodeURIComponent(slug)}/talleres`
    );

    const data = await respuesta.json();

    if (!respuesta.ok || data.success === false) {
      throw new Error(data.error || "No fue posible cargar los talleres.");
    }

    if (titulo) {
      titulo.textContent = `Talleres de ${data.productora?.name || slug}`;
    }

    renderizarTalleres(data.talleres || []);
  } catch (error) {
    console.error("Error cargando talleres:", error);
    mostrarEstado("No se pudieron cargar los talleres. Intenta nuevamente.");
  }
}

cargarTalleres();
