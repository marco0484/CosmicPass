const API = window.location.hostname === "localhost"
  || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://www.cosmicpass.space";

let selectedTicket = null;
let ticketQuantity = 1;
let generatingTicket = false;
let selectedEventId = null;
let pendingPaymentMethod = null;
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

const activeEvents = eventos.filter(e => {

  const eventDate = new Date(
    e.event_date ||
    e.date ||
    e.fecha
  );

  eventDate.setHours(0,0,0,0);

  return eventDate >= today;

});

const pastEvents = eventos.filter(e => {

  const eventDate = new Date(
    e.event_date ||
    e.date ||
    e.fecha
  );

  eventDate.setHours(0,0,0,0);

  return eventDate < today;

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

  document.getElementById("producer-name").textContent =
    data.name;

  document.getElementById("historia").textContent =
    data.historia ||
    data.description ||
    "";

  document.title =
    `${data.name} | Cosmic Pass`;

  const cover =
    document.getElementById("producer-cover");

  if (cover) {

    cover.src =
      eventos?.[0]?.image ||
      data.cover ||
      "";

    cover.onerror = () => {
      cover.style.display = "none";
    };

  }

  const logo =
    document.getElementById("producer-logo");

  if (logo) {

    logo.src =
      eventos?.[0]?.logo ||
      data.logo ||
      "";

    logo.onerror = () => {
      logo.style.display = "none";
    };

  }

  function setSocial(id, value) {

    const el =
      document.getElementById(id);

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

/* =========================
   MOCK DATA LOCAL TESTING
   =========================

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
      }

    ],

    features: [

      {
        level: 1,
        icon: "🔥",
        name: "Techno Underground"
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

========================= */


/* =========================
   REAL DATABASE LOADER
   ========================= */

async function loadData() {

  try {

    const res =
      await fetch(
        `${API}/productora-full/${idProductora}`
      );

    if (!res.ok) {

      throw new Error(
        "Error cargando productora"
      );

    }

    const data =
      await res.json();

    renderProducer(
      data.productora,
      data.eventos || []
    );

    renderEvents(
      data.eventos || []
    );

    renderFeatures(
      data.features || []
    );

  } catch (err) {

  }

}

loadData();

function irEvento(id) {
  window.location.href = `evento.html?id=${id}`;
}

function irHome() {
  window.location.href = "index.html";
}


async function openTicketModal(eventName, eventId) {
  const modal = document.getElementById("ticket-modal");
  const title = document.getElementById("modal-event-name");
  const container = document.getElementById("ticket-options");

  if (!modal || !title || !container) {
    return;
  }
  document.querySelector(
  ".ticket-kicker"
).style.display = "";

document.querySelector(
  ".modal-step"
).style.display = "";

document.querySelector(
  ".ticket-sub"
).innerText =
  "Selecciona el método de pago que prefieras.";

document.querySelector(
  ".checkout-summary"
).style.display =
  "";

document.querySelector(
  ".btn-buy-final"
).innerText =
  "Continuar compra";

title.textContent =
  "Elige cómo pagar tu acceso";

  container.innerHTML = "<p>Cargando boletos...</p>";

  modal.classList.add("active");

  pendingPaymentMethod = null;
selectedTicket = null;
ticketQuantity = 1;

const globalQty = document.getElementById("global-ticket-qty");
const globalTotal = document.getElementById("global-ticket-total");

if (globalQty) {
  globalQty.disabled = false;
  globalQty.value = "1";
}

if (globalTotal) {
  globalTotal.innerHTML = "Total: $0";
}

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

  const agotado =
  ticket.stock_disponible !== null &&
  Number(ticket.stock_disponible) <= 0;

if (agotado) {
  div.classList.add("sold-out");
}

  div.innerHTML = `
  <div>
  <h3>
    ${ticket.tipo_ticket}
  </h3>
  <p>
    ${ticket.desc_ticket || ""}
  </p>
${
  ticket.stock_disponible !== null
    ? Number(ticket.stock_disponible) <= 0
      ? `
        <span class="ticket-mini-info ticket-sold-out">
          AGOTADO
        </span>
      `
      : `
        <span class="ticket-mini-info">
          ${ticket.stock_disponible} disponibles
        </span>
      `
    : ""
}
  ${
    ticket.fecha_fin
      ? `
        <span class="ticket-mini-info">
          Hasta ${formatDate(ticket.fecha_fin)}
        </span>
      `
      : ""
  }
</div>

  <div class="ticket-price">
  ${
    Number(ticket.precio) === 0
      ? "Free Access"
      : `$${ticket.precio}`
  }
</div>

`;
div.addEventListener("click", () => {

    if (agotado) { alert("Este acceso está agotado.");
    return;
  }

  document
    .querySelectorAll(".ticket-option")
    .forEach(el => el.classList.remove("selected"));

  div.classList.add("selected");

  selectedTicket = ticket;
  selectedEventId = eventId;

  const globalQty =
    document.getElementById("global-ticket-qty");

  const globalTotal =
    document.getElementById("global-ticket-total");

const updateGlobalTotal = () => {

  if (Number(ticket.precio) === 0) {

    globalQty.value = "1";
    globalQty.disabled = true;
    ticketQuantity = 1;

    document.querySelector(".checkout-summary").style.display = "none";

    globalTotal.innerHTML = "Total: Cortesía";
    return;

  }

  document.querySelector(".checkout-summary").style.display = "";

  globalQty.disabled = false;

  ticketQuantity = Number(globalQty.value);

  globalTotal.innerHTML =
    `Total: $${Number(ticket.precio) * ticketQuantity}`;

};

  updateGlobalTotal();

  globalQty.onchange = updateGlobalTotal;

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

async function generatepago() {

  if (generatingTicket) {return;}

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
  alert("Todos los campos son obligatorios.");
  return;
}

const nombreLimpio =
  nombre.replace(/\s+/g, " ").trim();

if (nombreLimpio.length < 3) {
  alert("Ingresa un nombre válido.");
  return;
}

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(email)) {

  const input =
    document.getElementById("user-email");

  input.focus();
  input.classList.add("input-error");

  alert("Ingresa un correo electrónico válido.");

  return;
}

const dominiosBloqueados = [
  "mailinator.com",
  "yopmail.com",
  "guerrillamail.com",
  "temp-mail.org",
  "10minutemail.com"
];

const dominio =
  email.split("@")[1]?.toLowerCase();

if (dominiosBloqueados.includes(dominio)) {
  alert("No se permiten correos temporales.");
  return;
}


const phoneRegex =
  /^[0-9]{10}$/;

if (!phoneRegex.test(telefono)) {
  alert("El teléfono debe contener exactamente 10 dígitos.");
  return;
}

if (
  /^(\d)\1{9}$/.test(telefono) ||
  telefono === "1234567890"
) {
  alert("Ingresa un número telefónico válido.");
  return;
}

const generateButton =
  document.querySelector(
    "#user-data-modal .btn-buy-final"
  );

generatingTicket = true;

if (generateButton) {
  generateButton.disabled = true;
  generateButton.innerText =
    pendingPaymentMethod === "free_access"
      ? "Generando tu ticket..."
      : "Procesando...";
}

if (pendingPaymentMethod === "free_access") {

  try {

    const res = await fetch(
      `${API}/crear-ticket-gratis`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          cantidad: 1,
          nombre,
          correo: email,
          telefono
        })
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {

      alert(
        data.error ||
        data.message ||
        "No se pudo generar el acceso"
      );

      generatingTicket = false;

      if (generateButton) {
        generateButton.disabled = false;
        generateButton.innerText =
          "Generar acceso gratuito";
      }

      return;
    }

    closeUserDataModal();
    closeTicketModal();

    alert(
      "Tu acceso fue generado correctamente y enviado al correo registrado 🚀"
    );

    document.getElementById("user-name").value = "";
    document.getElementById("user-email").value = "";
    document.getElementById("user-phone").value = "";

  } catch (err) {

    generatingTicket = false;

    if (generateButton) {
      generateButton.disabled = false;
      generateButton.innerText =
        "Generar acceso gratuito";
    }

    alert("Error generando el acceso gratuito.");

  }

  return;
}

  if (
  pendingPaymentMethod ===
  "mercado_pago"
) {

  try {

    const res = await fetch(
      `${API}/crear-pago-ticket`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          cantidad: ticketQuantity,
          nombre,
          correo: email,
          telefono
        })
      }
    );


const data = await res.json();

    if (data.init_point) {

      window.location.href =
        data.init_point;

    }

  } catch (err) {

  }

  return;
}
}

document.addEventListener("DOMContentLoaded", () => {

  const phoneInput =
  document.getElementById("user-phone");

if (phoneInput) {

  phoneInput.addEventListener("input", () => {

    phoneInput.value =
      phoneInput.value
        .replace(/\D/g, "")
        .slice(0, 10);

  });

}

const emailInput =
  document.getElementById("user-email");

if (emailInput) {

  emailInput.addEventListener("input", () => {

    emailInput.classList.remove("input-error");

  });

}

  const btnFinal = document.querySelector(".btn-buy-final");

  if (!btnFinal) return;

btnFinal.addEventListener("click", async () => {

  if (!selectedTicket) {
    alert("Selecciona un tipo de boleto primero");
    return;
  }

const metodo = (selectedTicket.tipo_ticket || "") .toLowerCase();

if (Number(selectedTicket.precio) === 0 || metodo === "free access") {

  pendingPaymentMethod = "free_access";
  ticketQuantity = 1;

  const globalQty =
    document.getElementById("global-ticket-qty");

  const globalTotal =
    document.getElementById("global-ticket-total");

  if(globalQty){
    globalQty.value = "1";
    globalQty.disabled = true;
  }

  if(globalTotal){
    globalTotal.innerHTML = "Total: Cortesía";
  }

  openUserDataModal();

  const userModalTitle =
    document.querySelector("#user-data-modal h2");

  const userModalSub =
    document.querySelector("#user-data-modal .ticket-sub");

  const userModalBtn =
    document.querySelector("#user-data-modal .btn-buy-final");

  if(userModalTitle)
    userModalTitle.innerText = "Completa tus datos";

  if(userModalSub)
    userModalSub.innerText =
      "Necesitamos estos datos para generar tu acceso gratuito.";

  if(userModalBtn)
    userModalBtn.innerText =
      "Generar acceso gratuito";

  return;
}

if (metodo === "mercado pago") {
  pendingPaymentMethod =
    "mercado_pago";
  openUserDataModal();
  return;
}

if (metodo === "stripe") {
  try {
    const res = await fetch(
      `${API}/crear-pago-stripe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          cantidad: ticketQuantity
        })
      }
    );

    const data = await res.json();

   if (data.checkout_url) {
  window.location.href =
    data.checkout_url;
}
  } catch (err) {

    alert("Error Stripe");

  }

  return;
}

if (metodo === "transferencia") {

  document.getElementById(
    "modal-event-name"
  ).innerText =
    "Datos para transferencia";

  document.querySelector(
    ".ticket-kicker"
  ).style.display =
    "none";

  document.querySelector(
    ".modal-step"
  ).style.display =
    "none";

  document.querySelector(
    ".ticket-sub"
  ).innerText =
    "Realiza la transferencia y envía tu comprobante para validar tu acceso.";

  document.getElementById(
    "ticket-options"
  ).innerHTML =
    selectedTicket.detalle_pago || "";

  document.querySelector(
    ".checkout-summary"
  ).style.display =
    "none";

  document.querySelector(
    ".btn-buy-final"
  ).innerText =
    "Ya realicé mi transferencia";

  return;
}

});
});
