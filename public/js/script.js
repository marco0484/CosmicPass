 const API = window.location.hostname === "localhost"
  || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://www.cosmicpass.space";


document.addEventListener("DOMContentLoaded", async () => {
  window.scrollTo(0, 0);
  initNavbar(); 
  initBotones();
  initMisBoletos();  
  if (document.querySelector(".cards")) {
    await cargarEventos();
    initBuscador();
  }

  initBuscador(); 
  const items = document.querySelectorAll(".legal-item");

  items.forEach(item => {
    const header = item.querySelector("h3");
    if (!header) return;
    header.addEventListener("click", () => {
      items.forEach(i => {
        if (i !== item) i.classList.remove("active");
      });
      item.classList.toggle("active");
    });
  });

});

function initNavbar() {
  const toggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  const loginBtn = document.querySelector(".login");

  if (loginBtn && localStorage.getItem("auth") === "true") {
    loginBtn.textContent = "Admin";
    loginBtn.href = "admin.html";
  }

  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });

    const links = document.querySelectorAll(".nav-links a");

    links.forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
      });
    });
  }
}

function initBotones() {
  const btnHome = document.getElementById("btnHome");
  if (btnHome) {
    btnHome.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  const btnExplorar = document.getElementById("btnExplorar");
  if (btnExplorar) {
    btnExplorar.addEventListener("click", () => {
      const eventos = document.getElementById("eventos");
      if (eventos) {
        eventos.scrollIntoView({ behavior: "smooth" });
      }
    });
  }
}

function initMisBoletos() {
  const form = document.getElementById("ticket-search-form");
  const container = document.getElementById("tickets-container");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    container.innerHTML = `
      <div class="ticket-item">
        <p>Estamos validando tu información...</p>
      </div>
    `;

    try {
      const res = await fetch(`${API}/mis-boletos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          telefono
        })
      });
      const result = await res.json();

      if (!result.success || !result.tickets?.length) {
        container.innerHTML = `
          <div class="ticket-item">
            <p>No encontramos boletos con esos datos</p>
          </div>
        `;
        return;
      }

      container.innerHTML = "";

      result.tickets.forEach(ticket => {
        container.innerHTML += `
          <div class="ticket-item">
            <h3>${ticket.tipo_ticket || "Ticket"}</h3>

            <p>
              <strong>Nombre:</strong>
              ${ticket.nombre_cliente || ""}
            </p>

            <p>
              <strong>Folio:</strong>
              ${ticket.folio || ""}
            </p>

            <p>
              <strong>Estatus:</strong>
              ${ticket.estatus || ""}
            </p>

            <img
              src="${ticket.qr_code}"
              alt="QR Ticket"
              style="max-width: 220px; margin-top: 15px;"
            />
          </div>
        `;
      });

    } catch (error) {
      container.innerHTML = `
        <div class="ticket-item">
          <p>Ocurrió un error al consultar tus boletos</p>
        </div>
      `;
    }
  });
}

async function cargarEventos() {
  try {
    const res = await fetch(`${API}/events`);
    const eventos = await res.json();

    eventosGlobal = eventos;
    eventosCache = eventos;

    renderEventos(eventos);

  } catch (error) {
    console.error(error);
  }
}

function renderEventos(lista){

  const container =
    document.querySelector(".cards");

  const pastContainer =
    document.querySelector(".past-cards");

  if (!container) return;

  container.innerHTML = "";

  if (pastContainer) {
    pastContainer.innerHTML = "";
  }

const now = new Date();

const activeEvents =
  lista.filter(e => {

    const eventDate =
      new Date(
        e.event_date ||
        e.date ||
        e.fecha
      );

    return eventDate >= now;

  });

const pastEvents =
  lista.filter(e => {

    const eventDate =
      new Date(
        e.event_date ||
        e.date ||
        e.fecha
      );

    return eventDate < now;

  });

  activeEvents.forEach(evento => {

    const card =
      document.createElement("div");

    card.classList.add("card");

    const fecha =
      new Date(evento.event_date);

    const fechaFormateada =
      fecha.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

    card.innerHTML = `

      <div class="card-content">

        <div class="card-text">

          <h3>
            ${evento.name}

            <span class="by">
              by: ${evento.productora_name}
            </span>
          </h3>

          <p>
            ${evento.city}
            - ${fechaFormateada}
          </p>

          <p>
            ${
              Number(evento.price) === 0
                ? "Free Access"
                : `$${evento.price}`
            }
          </p>

          <button class="btn-card">

            ${
              Number(evento.price) === 0
                ? "Obtener Ticket"
                : "Comprar Ticket"
            }

          </button>

        </div>

        <div class="card-img-container">

          <img 
            src="${evento.image}" 
            alt="${evento.name}" 
            class="card-img"
            loading="lazy"
          >

        </div>

      </div>

    `;

    card.addEventListener("click", () => {

      localStorage.setItem(
        `prefetch_productora_${evento.id_productora}`,
        JSON.stringify(evento)
      );

      window.location.href =
        `productora.html?id=${evento.id_productora}`;

    });

    container.appendChild(card);

  });


  if(pastContainer){

    pastEvents.forEach(evento => {

      const card =
        document.createElement("div");

      card.classList.add("card");

      card.classList.add("past-event-card");

      const fecha =
        new Date(evento.event_date);

      const fechaFormateada =
        fecha.toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        });

      card.innerHTML = `

        <div class="card-content">

          <div class="card-text">

            <h3>
              ${evento.name}

              <span class="by">
                by: ${evento.productora_name}
              </span>
            </h3>

            <p>
              ${evento.city}
              - ${fechaFormateada}
            </p>

            <span class="past-label">
              Evento finalizado
            </span>

          </div>

          <div class="card-img-container">

            <img 
              src="${evento.image}" 
              alt="${evento.name}" 
              class="card-img"
              loading="lazy"
            >

          </div>

        </div>

      `;

      pastContainer.appendChild(card);

    });

  }

}

function initBuscador(){
  const input = document.querySelector(".search");
  if (!input) return;
  input.addEventListener("input", (e) => {
    const texto = e.target.value.toLowerCase();

    if (texto === "") {
      renderEventos(eventosGlobal);
      return;
    }

    const filtrados = eventosGlobal.filter(ev =>
      ev.name?.toLowerCase().includes(texto) ||
      ev.city?.toLowerCase().includes(texto) ||
      ev.description?.toLowerCase().includes(texto)
    );

    renderEventos(filtrados);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();

      document.querySelector(".events")?.scrollIntoView({
        behavior: "smooth"
      });
    }
  });
}
const ticketAmount = document.getElementById("ticketAmount");
const ticketQty = document.getElementById("ticketQty");
const feeMethod = document.getElementById("feeMethod");
const totalSold = document.getElementById("totalSold");
const realFee = document.getElementById("realFee");
const realNet = document.getElementById("realNet");
const suggestedPrice = document.getElementById("suggestedPrice");
const bestOption = document.getElementById("bestOption");
const differenceText = document.getElementById("differenceText");

const FEES = {
  mpCardInstant:{
    name:"Mercado Pago tarjeta - al instante",
    percent:0.0349,
    fixed:4.64
  },
  mpCard7:{
    name:"Mercado Pago tarjeta - 7 días",
    percent:0.0319,
    fixed:4.64
  },
  mpCard30:{
    name:"Mercado Pago tarjeta - 30 días",
    percent:0.0295,
    fixed:4.64
  },
  mpCash:{
    name:"Mercado Pago Oxxo / efectivo",
    percent:0.0379,
    fixed:4.64
  },
  stripe:{
    name:"Stripe tarjeta nacional",
    percent:0.036,
    fixed:3
  }
};

function moneyComision(value){
  return Number(value || 0).toLocaleString("es-MX",{
    style:"currency",
    currency:"MXN",
    minimumFractionDigits:2
  });
}

function calcularComisiones(){
  if(!ticketAmount || !ticketQty || !feeMethod) return;

  const precio = Number(ticketAmount.value || 0);
  const cantidad = Number(ticketQty.value || 1);
  const fee = FEES[feeMethod.value];

  if(precio <= 0 || cantidad <= 0){
    totalSold.textContent = "$0.00";
    realFee.textContent = "$0.00";
    realNet.textContent = "$0.00";
    suggestedPrice.textContent = "$0.00";
    bestOption.textContent = "Ingresa un precio para calcular";
    differenceText.textContent = "Usamos tarifas públicas de Mercado Pago y Stripe. Los montos son estimados.";
    return;
  }

  const ventaTotal = precio * cantidad;
  const comisionPorBoleto = (precio * fee.percent) + fee.fixed;
  const comisionTotal = comisionPorBoleto * cantidad;
  const neto = ventaTotal - comisionTotal;
  const precioAbsorbido = (precio + fee.fixed) / (1 - fee.percent);

  totalSold.textContent = moneyComision(ventaTotal);
  realFee.textContent = moneyComision(comisionTotal);
  realNet.textContent = moneyComision(neto);
  suggestedPrice.textContent = `${moneyComision(precioAbsorbido)} c/u`;

  bestOption.textContent = `Con ${fee.name}, recibirías aprox. ${moneyComision(neto)}`;
  differenceText.textContent = `Si quieres absorber la comisión, publica el boleto en aprox. ${moneyComision(precioAbsorbido)}.`;
}

[ticketAmount,ticketQty,feeMethod].forEach(input=>{
  if(!input) return;
  input.addEventListener("input",calcularComisiones);
  input.addEventListener("change",calcularComisiones);
});