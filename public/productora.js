const API = window.location.hostname === "localhost"
  || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://www.cosmicpass.space";

let selectedTicket = null;
let ticketQuantity = 1;
let selectedEventId = null;
const params = new URLSearchParams(window.location.search);
const idProductora = params.get("id");
// reload
if (!idProductora) { }

function scrollToEvents() {
  document.querySelector(".producer-events-section")
    ?.scrollIntoView({ behavior: "smooth" });
}

function formatDate(date) {
  if (!date) return "Fecha por confirmar";

  const safeDate = String(date).replace(" ", "T");
  const parsedDate = new Date(safeDate);

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

const today = new Date();

today.setHours(0,0,0,0);

const activeEvents =
  eventos.filter(e => {

    const eventDate =
      new Date(
        e.event_date ||
        e.date ||
        e.fecha
      );

    eventDate.setHours(0,0,0,0);

    return (
      eventDate >= today &&
      Number(e.ind_activo) !== 3
    );

  });

const pastEvents =
  eventos.filter(e => {

    const eventDate =
      new Date(
        e.event_date ||
        e.date ||
        e.fecha
      );

    eventDate.setHours(0,0,0,0);

    return (
      eventDate < today &&
      Number(e.ind_activo) !== 3
    );

  });

activeEvents.forEach(evento => {

  const card =
    document.createElement("div");

  card.classList.add("event-card");

  card.innerHTML = `

    <img 
      src="${evento.image}" 
      alt="${evento.name}"
      loading="lazy"
    >

    <div class="info">

      <h3>${evento.name}</h3>

      <p>
        📍 ${evento.city || "México"}
      </p>

      <p>
        📅 ${formatDate(
          evento.event_date ||
          evento.date ||
          evento.fecha
        )}
      </p>

      <p class="price">
        $${evento.price}
      </p>

      <button
        onclick="
          openTicketModal(
            '${evento.name}',
            ${evento.id}
          )
        "
      >

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
// load

const pastContainer =
  document.querySelector(".past-cards");

if(pastContainer){

  pastContainer.innerHTML = "";

  pastEvents.forEach(evento => {

    const card =
      document.createElement("div");

    card.classList.add("event-card");

    card.classList.add("past-event-card");

    card.innerHTML = `

      <img 
        src="${evento.image}" 
        alt="${evento.name}"
        loading="lazy"
      >

      <div class="info">

        <h3>${evento.name}</h3>

        <p>
          📍 ${evento.city || "México"}
        </p>

        <p>
          📅 ${formatDate(
            evento.event_date ||
            evento.date ||
            evento.fecha
          )}
        </p>

        <span class="past-label">
          Evento finalizado
        </span>

      </div>

    `;

    pastContainer.appendChild(card);

  });
}
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
  setSocial("whatsapp", data.whatsapp);
  setSocial("fb", data.facebook);
  setSocial("insta", data.instagram);
  setSocial("tiktok", data.tiktok);
  setSocial("x", data.x);
  setSocial("fbevent", data.fbevent);
}

async function loadData() {

  const mockData = {

    productora: {
      name: "Sefarán Events",
      historia:
        "Eventos underground de techno y hard groove en CDMX.",
      instagram: "https://instagram.com/sefaran",
      facebook: "https://facebook.com/sefaran",
      whatsapp: "https://wa.me/525512345678",
      logo:
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200",
    },

    eventos: [

      {
        id: 1,
        name: "Hard Techno Ritual",
        city: "CDMX",
        event_date: "2026-06-20",
        price: 350,
        image:
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200"
      },

      {
        id: 2,
        name: "Industrial Night",
        city: "Monterrey",
        event_date: "2026-07-12",
        price: 0,
        image:
          "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1200"
      },

      {
        id: 3,
        name: "Warehouse Experience",
        city: "Guadalajara",
        event_date: "2025-01-10",
        price: 500,
        image:
          "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=1200"
      }

    ],

    features: [

      {
        level: 1,
        icon: "🔥",
        name: "Techno Underground"
      },

      {
        level: 1,
        icon: "⚡",
        name: "Visuales inmersivos"
      },

      {
        level: 2,
        icon: "🎧",
        name: "DJs internacionales"
      },

      {
        level: 2,
        icon: "🖤",
        name: "Ambiente industrial"
      },

      {
        level: 3,
        icon: "✅",
        name: "Acceso rápido"
      },

      {
        level: 3,
        icon: "🚀",
        name: "Experiencia premium"
      }

    ]

  };

  renderProducer(
    mockData.productora,
    mockData.eventos
  );

  renderEvents(
    mockData.eventos
  );

  renderFeatures(
    mockData.features
  );

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

      <h3>
        ${ticket.tipo_ticket}
      </h3>

      <p>
        ${ticket.desc_ticket || ""}
      </p>

    </div>

    <strong class="ticket-price">

      ${
        Number(ticket.precio) === 0
          ? "Free Access"
          : `$${ticket.precio}`
      }

    </strong>

  `;

  div.addEventListener("click", () => {

    document
      .querySelectorAll(".ticket-option")
      .forEach(el =>
        el.classList.remove("selected")
      );

    div.classList.add("selected");

    selectedTicket = ticket;

    selectedEventId = eventId;

    const globalQty =
      document.getElementById(
        "global-ticket-qty"
      );

    const globalTotal =
      document.getElementById(
        "global-ticket-total"
      );

    const updateGlobalTotal = () => {

      const qty =
        Number(globalQty.value);

      ticketQuantity = qty;

      const total =
        Number(ticket.precio) * qty;

      globalTotal.innerHTML =
        `Total: $${total}`;

    };

    updateGlobalTotal();

    globalQty.onchange =
      updateGlobalTotal;

  });

  container.appendChild(div);
});

  } catch (error) {
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

      const total =
        Number(selectedTicket.precio) * ticketQuantity;

      alert(`
Debes depositar $${total} MXN

y mandar tu comprobante de pago
`);

      return;
    }

    openUserDataModal();

  });

});