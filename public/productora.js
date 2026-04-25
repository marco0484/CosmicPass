//const API = "http://192.168.100.23:3000"; // 🔥 pruebas locales (Mac + celular misma red)

/*
const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.startsWith("192.168.")
    ? "http://192.168.100.23:3000" // local
    : "https://cosmicpass.space"; // producción
*/

// PRE PRO
const API = window.location.hostname === "localhost"
  || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://cosmic-base-sigma.vercel.app";

let selectedTicket = null;
let selectedEventId = null;

const params = new URLSearchParams(window.location.search);
const idProductora = params.get("id");

if (!idProductora) {
 // console.error("❌ No hay ID de productora");
}

function scrollToEvents() {
  document.querySelector(".producer-events-section")
    ?.scrollIntoView({ behavior: "smooth" });
}

function formatDate(date) {
  if (!date) return "Fecha por confirmar";

  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    return "Fecha por confirmar";
  }

  return parsedDate.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function renderEvents(eventos) {
  const container = document.getElementById("producer-events");
  if (!container) return;

  container.innerHTML = "";

  if (!eventos.length) {
    container.innerHTML = "<p>No hay eventos disponibles</p>";
    return;
  }

  eventos.forEach(evento => {
    const card = document.createElement("div");
    card.classList.add("event-card");

    card.innerHTML = `
      <img 
        src="${evento.image}" 
        alt="${evento.name}"
        loading="lazy"
      >

      <div class="info">
        <h3>${evento.name}</h3>
        <p>📍 ${evento.city || "México"}</p>
        <p>📅 ${formatDate(evento.date)}</p>
        <p class="price">$${evento.price}</p>

        <button onclick="openTicketModal('${evento.name}', ${evento.id})">
  ${
    Number(evento.price) === 0
      ? "Free Access"
      : "Pagar Mi Ticket"
  }
</button>
        </div>
    `;

    container.appendChild(card);
  });
}

function renderFeatures(features) {
  console.log("FEATURES:", features);

  const tag = document.getElementById("producer-tag");

  if (tag) {
    tag.innerHTML = "";

const headers = features.filter(f => Number(f.level) === 1);


    headers.forEach(header => {
      const div = document.createElement("div");
      div.classList.add("feature-header-card");

      div.innerHTML = `
        <span class="icon">${header.icon || ""}</span>
        <span class="text">${header.name}</span>
      `;

      tag.appendChild(div);
    });
  }

  const badgesContainer = document.querySelector(".badges");

  if (badgesContainer) {
    badgesContainer.innerHTML = "";

const badges = features.filter(f => Number(f.level) === 2);

    badges.forEach(f => {
      const span = document.createElement("span");
      span.textContent = `${f.icon || ""} ${f.name}`;
      badgesContainer.appendChild(span);
    });
  }

  const trustContainer = document.querySelector(".trust-grid");

  if (trustContainer) {
    trustContainer.innerHTML = "";

const trust = features.filter(f => Number(f.level) === 3);

    trust.forEach(f => {
      const div = document.createElement("div");
      div.classList.add("trust-item");

      div.innerHTML = `
        <h3>${f.icon || ""} ${f.name}</h3>
      `;

      trustContainer.appendChild(div);
    });
  }
}

function renderProducer(data, eventos) {
  document.getElementById("producer-name").textContent = data.name;

  document.getElementById("historia").textContent =
    data.historia || data.description || "";

  document.title = `${data.name} | Cosmic Pass`;

  const cover = document.getElementById("producer-cover");

  if (cover) {
    cover.src = eventos?.[0]?.image || data.cover || "";

    cover.onerror = () => {
      cover.style.display = "none";
    };
  }

  const logo = document.getElementById("producer-logo");

  if (logo) {
    logo.src = eventos?.[0]?.logo || data.logo || "";

    logo.onerror = () => {
      logo.style.display = "none";
    };
  }

  function setSocial(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    if (value) {
      el.href = value;
    } else {
      el.style.display = "none";
    }
  }

  setSocial("insta", data.instagram);
  setSocial("fb", data.facebook);
  setSocial("tiktok", data.tiktok);
  setSocial("x", data.x);
}

async function loadData() {
  try {
    const cacheKey = `productora_${idProductora}`;

    const prefetch = localStorage.getItem(
      `prefetch_productora_${idProductora}`
    );

    if (prefetch) {
     // console.log("⚡ prefetch encontrado");
    }

    const cacheLocal = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(`${cacheKey}_time`);
    const now = Date.now();

    // cache válida por 5 min
    if (
      cacheLocal &&
      cacheTime &&
      (now - cacheTime < 300000)
    ) {
      const data = JSON.parse(cacheLocal);

      renderProducer(data.productora, data.eventos);
      renderEvents(data.eventos);
      renderFeatures(data.features);

      //console.log("⚡ productora desde cache");
      return;
    }

    // endpoint único (1 request)
    const res = await fetch(`${API}/productora-full/${idProductora}`);

    if (!res.ok) {
      throw new Error("Error cargando productora");
    }

    const data = await res.json();

    if (!data.productora) return;

    renderProducer(data.productora, data.eventos);
    renderEvents(data.eventos);
    renderFeatures(data.features);

    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(`${cacheKey}_time`, now);

   // console.log("🌐 productora desde API");

  } catch (err) {
    //console.warn("⚠️ fallback:", err);

    const cacheKey = `productora_${idProductora}`;
    const cacheLocal = localStorage.getItem(cacheKey);

    if (cacheLocal) {
      const data = JSON.parse(cacheLocal);

      renderProducer(data.productora, data.eventos);
      renderEvents(data.eventos);
      renderFeatures(data.features);

      return;
    }

   // console.error("❌ Error cargando datos:", err);
  }
}

function irEvento(id) {
  window.location.href = `evento.html?id=${id}`;
}

function irHome() {
  window.location.href = "index.html";
}

loadData();

async function openTicketModal(eventName, eventId) {
  const modal = document.getElementById("ticket-modal");
  const title = document.getElementById("modal-event-name");
  const container = document.getElementById("ticket-options");

  if (!modal || !title || !container) {
    //console.error("❌ No existe el modal en HTML");
    return;
  }

  title.textContent = eventName;
  container.innerHTML = "<p>Cargando boletos...</p>";

  modal.classList.add("active");

  try {
    const res = await fetch(`${API}/eventos/${eventId}/tickets`);

    if (!res.ok) {
      throw new Error("Error cargando tickets");
    }

    const tickets = await res.json();

    if (!tickets.length) {
      container.innerHTML = `
        <p>No hay boletos disponibles</p>
      `;
      return;
    }

    container.innerHTML = "";

    tickets.forEach(ticket => {
  const div = document.createElement("div");
  div.classList.add("ticket-option");

  div.innerHTML = `
    <div>
      <h3>${ticket.tipo_ticket}</h3>
      <p>${ticket.desc_ticket || ""}</p>
    </div>

    <strong>
      ${
        Number(ticket.precio) === 0
          ? "Free Access"
          : `$${ticket.precio}`
      }
    </strong>
  `;

  div.addEventListener("click", () => {
    document.querySelectorAll(".ticket-option")
      .forEach(el => el.classList.remove("selected"));

    div.classList.add("selected");

    selectedTicket = ticket;
    selectedEventId = eventId;
  });

  container.appendChild(div);
});

  } catch (error) {
    //console.error(error);

    container.innerHTML = `
      <p>Error cargando boletos</p>
    `;
  }
}

function closeTicketModal() {
  const modal = document.getElementById("ticket-modal");

  if (modal) {
    modal.classList.remove("active");
  }
}

function openUserDataModal() {
  const modal = document.getElementById("user-data-modal");

  if (modal) {
    modal.classList.add("active");
  }
}

function closeUserDataModal() {
  const modal = document.getElementById("user-data-modal");

  if (modal) {
    modal.classList.remove("active");
  }
}

async function generateFreeTicket() {
  const nombre = document
    .getElementById("user-name")
    .value
    .trim();

  const email = document
    .getElementById("user-email")
    .value
    .trim();

  const telefono = document
    .getElementById("user-phone")
    .value
    .trim();

  if (!nombre || !email || !telefono) {
    alert("Todos los campos son obligatorios");
    return;
  }

  try {
    const res = await fetch(`${API}/api/create-ticket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        evento_id: selectedEventId,
        nombre,
        email,
        telefono
      })
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || "Error");
    }

    alert("Tu Free Access fue generado correctamente 🎟️");
    alert("Tu ticket será enviado a tu correo electrónico 📩");

    document.getElementById("user-name").value = "";
    document.getElementById("user-email").value = "";
    document.getElementById("user-phone").value = "";

    closeUserDataModal();
    closeTicketModal();

  } catch (error) {
    console.error(error);
    alert("No pudimos generar tu acceso");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnFinal = document.querySelector(".btn-buy-final");

  if (!btnFinal) return;

  btnFinal.addEventListener("click", () => {
    if (!selectedTicket) {
      alert("Selecciona un tipo de boleto primero");
      return;
    }

    if (Number(selectedTicket.precio) > 0) {
      alert("Aquí irá Mercado Pago después");
      return;
    }

    openUserDataModal();
  });
});