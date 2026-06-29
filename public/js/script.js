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
const mpFee = document.getElementById("mpFee");
const mpNet = document.getElementById("mpNet");
const stripeFee = document.getElementById("stripeFee");
const stripeNet = document.getElementById("stripeNet");
const bestOption = document.getElementById("bestOption");
const differenceText = document.getElementById("differenceText");
const calcTabs = document.querySelectorAll(".calc-tab");
const amountLabel = document.getElementById("amountLabel");
const mpFeeLabel = document.getElementById("mpFeeLabel");
const mpNetLabel = document.getElementById("mpNetLabel");
const stripeFeeLabel = document.getElementById("stripeFeeLabel");
const stripeNetLabel = document.getElementById("stripeNetLabel");
const mpHelp = document.getElementById("mpHelp");
const stripeHelp = document.getElementById("stripeHelp");

let calcMode = "sell";

const FEES = {
  mercadoPago:{percent:0.0349,fixed:4},
  stripe:{percent:0.036,fixed:3}
};

function moneyComision(value){
  return Number(value || 0).toLocaleString("es-MX",{
    style:"currency",
    currency:"MXN",
    minimumFractionDigits:2
  });
}

function precioParaRecibir(neto, fee){
  return (neto + fee.fixed) / (1 - fee.percent);
}

function calcularComisiones(){
  if(!ticketAmount || !ticketQty || !mpFee || !mpNet || !stripeFee || !stripeNet || !bestOption || !differenceText) return;

  const valor = Number(ticketAmount.value || 0);
  const cantidad = Number(ticketQty.value || 1);

  if(valor <= 0){
    mpFee.textContent = "$0.00";
    mpNet.textContent = "$0.00";
    stripeFee.textContent = "$0.00";
    stripeNet.textContent = "$0.00";
    bestOption.textContent = "Ingresa un monto";
    differenceText.textContent = "El simulador calculará automáticamente el monto neto o el precio sugerido.";
    return;
  }

  if(calcMode === "sell"){
    const total = valor * cantidad;
    const mpComision = ((valor * FEES.mercadoPago.percent) + FEES.mercadoPago.fixed) * cantidad;
    const stripeComision = ((valor * FEES.stripe.percent) + FEES.stripe.fixed) * cantidad;
    const mpFinal = total - mpComision;
    const stripeFinal = total - stripeComision;
    const diferencia = Math.abs(mpFinal - stripeFinal);

    mpFee.textContent = moneyComision(mpComision);
    mpNet.textContent = moneyComision(mpFinal);
    stripeFee.textContent = moneyComision(stripeComision);
    stripeNet.textContent = moneyComision(stripeFinal);

    if(mpFinal > stripeFinal){
      bestOption.textContent = "Mercado Pago deja un mayor monto neto";
      differenceText.textContent = `Diferencia aproximada: ${moneyComision(diferencia)} para ${cantidad} boleto(s).`;
    }else if(stripeFinal > mpFinal){
      bestOption.textContent = "Stripe deja un mayor monto neto";
      differenceText.textContent = `Diferencia aproximada: ${moneyComision(diferencia)} para ${cantidad} boleto(s).`;
    }else{
      bestOption.textContent = "Ambas opciones quedan prácticamente iguales";
      differenceText.textContent = "No existe una diferencia significativa.";
    }

    return;
  }

  const netoDeseadoTotal = valor;
  const netoPorBoleto = netoDeseadoTotal / cantidad;

  const precioMP = precioParaRecibir(netoPorBoleto, FEES.mercadoPago);
  const precioStripe = precioParaRecibir(netoPorBoleto, FEES.stripe);

  const comisionMP = ((precioMP * FEES.mercadoPago.percent) + FEES.mercadoPago.fixed) * cantidad;
  const comisionStripe = ((precioStripe * FEES.stripe.percent) + FEES.stripe.fixed) * cantidad;

  const totalMP = precioMP * cantidad;
  const totalStripe = precioStripe * cantidad;
  const diferencia = Math.abs(totalMP - totalStripe);

  mpFee.textContent = moneyComision(comisionMP);
  mpNet.textContent = moneyComision(totalMP);
  stripeFee.textContent = moneyComision(comisionStripe);
  stripeNet.textContent = moneyComision(totalStripe);

  if(totalMP < totalStripe){
    bestOption.textContent = "Mercado Pago requiere menor precio de venta";
    differenceText.textContent = `Para recibir ${moneyComision(netoDeseadoTotal)}, venderías aproximadamente en ${moneyComision(precioMP)} por boleto.`;
  }else if(totalStripe < totalMP){
    bestOption.textContent = "Stripe requiere menor precio de venta";
    differenceText.textContent = `Para recibir ${moneyComision(netoDeseadoTotal)}, venderías aproximadamente en ${moneyComision(precioStripe)} por boleto.`;
  }else{
    bestOption.textContent = "Ambas opciones requieren un precio similar";
    differenceText.textContent = `Para recibir ${moneyComision(netoDeseadoTotal)}, ambos precios quedan casi iguales.`;
  }
}

function actualizarModo(){
  if(!amountLabel) return;

  if(calcMode === "sell"){
    amountLabel.textContent = "Precio del boleto";
    ticketAmount.placeholder = "Ej. 1000";

    mpFeeLabel.textContent = "Comisión estimada";
    mpNetLabel.textContent = "Monto neto estimado";
    stripeFeeLabel.textContent = "Comisión estimada";
    stripeNetLabel.textContent = "Monto neto estimado";

    mpHelp.textContent = "Si vendes en ese precio, esto recibirías aproximadamente.";
    stripeHelp.textContent = "Si vendes en ese precio, esto recibirías aproximadamente.";
  }else{
    amountLabel.textContent = "Monto neto que quieres recibir";
    ticketAmount.placeholder = "Ej. 100000";

    mpFeeLabel.textContent = "Comisión estimada";
    mpNetLabel.textContent = "Precio total sugerido";
    stripeFeeLabel.textContent = "Comisión estimada";
    stripeNetLabel.textContent = "Precio total sugerido";

    mpHelp.textContent = "Precio aproximado que deberías cobrar para alcanzar el neto deseado.";
    stripeHelp.textContent = "Precio aproximado que deberías cobrar para alcanzar el neto deseado.";
  }

  calcularComisiones();
}

if(ticketAmount && ticketQty){
  ticketAmount.addEventListener("input", calcularComisiones);
  ticketQty.addEventListener("input", calcularComisiones);
  ticketAmount.addEventListener("change", calcularComisiones);
  ticketQty.addEventListener("change", calcularComisiones);

  [ticketAmount,ticketQty].forEach(input=>{
    if(!input) return;

    input.addEventListener("keydown",e=>{
      if(e.key==="Enter"){
        e.preventDefault();
        calcularComisiones();
      }
    });
  });
}

calcTabs.forEach(tab=>{
  tab.addEventListener("click",()=>{
    calcTabs.forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    calcMode = tab.dataset.mode;
    actualizarModo();
  });
});