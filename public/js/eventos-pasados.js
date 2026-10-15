
const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://www.cosmicpass.space";

const params = new URLSearchParams(window.location.search);
const slug = params.get("productora");

const container = document.getElementById("history-events");
const producerName = document.getElementById("producer-name");
const historyDescription = document.getElementById("history-description");
const backProducer = document.getElementById("back-producer");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatHistoryDate(value) {
  if (!value) return "Fecha por confirmar";

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return "Fecha por confirmar";
  }

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function mediaURL(value) {
  const path = String(value || "").trim();

  if (!path) return "";

  // Solo permitir rutas locales o URLs HTTP/HTTPS.
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  if (/^(javascript|data|vbscript):/i.test(path)) {
    return "";
  }

  return "/" + path.replace(/^\/+/, "");
}

function renderEvent(evento) {
  const card = document.createElement("article");
  card.className = "history-card";

  const imageURL = mediaURL(evento.image);

  const cover = imageURL
    ? `<img class="history-cover"
         src="${escapeHTML(imageURL)}"
         alt="${escapeHTML(evento.name)}"
         loading="lazy">`
    : "";

  const multimedia = Array.isArray(evento.multimedia)
    ? evento.multimedia
    : [];

  const galleryItems = multimedia.map(item => {
    const url = mediaURL(item.url);

    if (!url) return "";

    if (item.tipo === "video") {
      return `
        <video controls preload="metadata"
          src="${escapeHTML(url)}">
          Tu navegador no puede reproducir este video.
        </video>
      `;
    }

    if (item.tipo === "imagen") {
      return `
        <img src="${escapeHTML(url)}"
          alt="${escapeHTML(item.descripcion || evento.name)}"
          loading="lazy">
      `;
    }

    return "";
  }).join("");

  const gallery = galleryItems
    ? `<div class="gallery">${galleryItems}</div>`
    : "";

  card.innerHTML = `
    ${cover}

    <div class="history-info">
      <p class="history-meta">
        ${escapeHTML(evento.city || "México")}
        ·
        ${escapeHTML(formatHistoryDate(
          evento.event_date || evento.date || evento.fecha
        ))}
      </p>

      <h2>${escapeHTML(evento.name || "Evento")}</h2>

      <div class="history-description">
        ${escapeHTML(evento.description || "Evento realizado por la productora.")}
      </div>

      ${gallery}
    </div>
  `;

  const coverImage = card.querySelector(".history-cover");

  if (coverImage) {
    coverImage.addEventListener("error", () => {
      coverImage.remove();
    });
  }

  container.appendChild(card);
}

async function loadPastEvents() {
  if (!slug) {
    container.innerHTML =
      '<p class="status-message">No se indicó una productora válida.</p>';
    return;
  }

  backProducer.href =
    `/productora/${encodeURIComponent(slug)}`;

  try {
    const response = await fetch(
      `${API}/api/productora/${encodeURIComponent(slug)}/eventos-pasados`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "No se pudo cargar el historial.");
    }

    producerName.textContent =
      `Eventos pasados de ${data.productora.nombre}`;

    historyDescription.textContent =
      "Revive los momentos y eventos que forman parte de nuestra historia.";

    document.title =
      `Eventos pasados | ${data.productora.nombre} | Cosmic Pass`;

    container.innerHTML = "";

    if (!Array.isArray(data.eventos) || data.eventos.length === 0) {
      container.innerHTML =
        '<p class="status-message">Esta productora todavía no tiene eventos pasados publicados.</p>';
      return;
    }

    data.eventos.forEach(renderEvent);

  } catch (error) {
    console.error("Error cargando historial:", error);

    container.innerHTML =
      '<p class="status-message">No pudimos cargar el historial. Intenta nuevamente más tarde.</p>';
  }
}

loadPastEvents();
