
const API = window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://www.cosmicpass.space";

const params = new URLSearchParams(window.location.search);
const slug = params.get("productora");

const titulo = document.getElementById("producer-title");
const estado = document.getElementById("merchandise-status");
const grid = document.getElementById("merchandise-grid");
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
  const numero = Number(precio);

  if (!Number.isFinite(numero)) {
    return "Precio por confirmar";
  }

  return numero.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN"
  });
}

function renderizarMercancia(productos) {
  grid.replaceChildren();

  if (!Array.isArray(productos) || productos.length === 0) {
    mostrarEstado("Esta productora todavía no tiene mercancía disponible.");
    return;
  }

  estado.hidden = true;

  productos.forEach(producto => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "cp-product-card";

    const imagen = producto.imagen
      ? `<img src="${escaparHTML(producto.imagen)}" alt="${escaparHTML(producto.nombre)}" loading="lazy">`
      : `<div class="cp-product-placeholder">👽</div>`;

    tarjeta.innerHTML = `
      <div class="cp-product-image">${imagen}</div>
      <div class="cp-product-info">
        ${producto.categoria
          ? `<span class="cp-product-category">${escaparHTML(producto.categoria)}</span>`
          : ""}
        <h2>${escaparHTML(producto.nombre || "Producto")}</h2>
        <p>${escaparHTML(producto.descripcion || "Producto oficial de la productora.")}</p>
        <strong class="cp-product-price">${formatearPrecio(producto.precio)}</strong>
      </div>
    `;

    grid.appendChild(tarjeta);
  });
}

async function cargarMercancia() {
  if (!slug) {
    mostrarEstado("No se indicó qué productora quieres consultar.");
    return;
  }

  volver.href = `/productora/${encodeURIComponent(slug)}`;

  try {
    const respuesta = await fetch(
      `${API}/api/productora/${encodeURIComponent(slug)}/mercancia`
    );

    const data = await respuesta.json();

    if (!respuesta.ok || data.success === false) {
      throw new Error(data.error || "No fue posible cargar la mercancía.");
    }

    const productos = data.mercancia || [];

    if (titulo) {
      titulo.textContent = `Mercancía de ${data.productora?.name || slug}`;
    }

    renderizarMercancia(productos);
  } catch (error) {
    console.error("Error cargando mercancía:", error);
    mostrarEstado("No se pudo cargar la mercancía. Intenta nuevamente.");
  }
}

cargarMercancia();
