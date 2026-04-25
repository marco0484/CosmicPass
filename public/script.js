
//const API = "http://192.168.100.23:3000"; // pruebas locales

/*  CON VERCEL
const API = window.location.hostname === "localhost"
  || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://cosmicpass.space";
*/

// PRE PRO
const API = window.location.hostname === "localhost"
  || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://cosmic-base-sigma.vercel.app";


document.addEventListener("DOMContentLoaded", async () => {
  window.scrollTo(0, 0);
  initNavbar();
  initBotones();
  initMisBoletos();
  //await cargarEventos();
  
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

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const telefono = document.getElementById("telefono").value.trim();

    if (!email || !telefono) {
      container.innerHTML = `
        <div class="ticket-item">
          <p>Completa tu correo y los últimos 4 dígitos de tu teléfono.</p>
        </div>
      `;
      return;
    }

    if (telefono.length !== 4) {
      container.innerHTML = `
        <div class="ticket-item">
          <p>Ingresa únicamente los últimos 4 dígitos de tu teléfono.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="ticket-item">
        <p>Estamos validando tu información...</p>
        <p>Si encontramos tus boletos, recibirás un acceso seguro en tu correo.</p>
      </div>
    `;

    /*
    Aquí después conectamos el backend real:

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
    */
  });
}
// FIN QR

async function cargarEventos() {
  try {
    const cacheLocal = localStorage.getItem("eventos");
    if (cacheLocal) {
      const eventos = JSON.parse(cacheLocal);
      eventosGlobal = eventos;
      eventosCache = eventos;
      renderEventos(eventos);
     // console.log("⚡ eventos desde cache local");
      return;
    }
// LOCAL ABAJO SUPABASE
    //const res = await fetch("http://192.168.100.23:3000/events");
    const res = await fetch(`${API}/events`);
    const eventos = await res.json();
    eventosGlobal = eventos;
    eventosCache = eventos;
    localStorage.setItem("eventos", JSON.stringify(eventos));
    renderEventos(eventos);

  } catch (error) {
   //console.error("Error cargando eventos:", error);
  }
}


function renderEventos(lista){

  const container = document.querySelector(".cards");
  if (!container) return;

  container.innerHTML = "";

  lista.forEach(evento => {

    const card = document.createElement("div");
    card.classList.add("card");

    const fecha = new Date(evento.event_date);
    const fechaFormateada = fecha.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
/*
    card.innerHTML = `
      <div class="card-content">
        <div class="card-text">
          <h3>
            ${evento.name}
            <span class="by">by: ${evento.productora_name}</span>
          </h3>
          <p>${evento.city} - ${fechaFormateada}</p>
          <p>$${evento.price}</p>
          <button class="btn-card">Comprar Boleto</button>
        </div>
        */
    card.innerHTML = `
  <div class="card-content">
    <div class="card-text">
      <h3>
        ${evento.name}
        <span class="by">by: ${evento.productora_name}</span>
      </h3>

      <p>${evento.city} - ${fechaFormateada}</p>

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
    card.addEventListener('touchstart', () => {
      card.classList.add('touch');
    });

    card.addEventListener('touchend', () => {
      setTimeout(() => {
        card.classList.remove('touch');
      }, 300);
    });

    card.addEventListener("click", () => {
  card.classList.add("active-click");

  localStorage.setItem(
    `prefetch_productora_${evento.id_productora}`,
    JSON.stringify(evento)
  );

  setTimeout(() => {
    window.location.href = `productora.html?id=${evento.id_productora}`;
  }, 180);
});

    const btn = card.querySelector(".btn-card");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.location.href = `productora.html?id=${evento.id_productora}`;
    });

    container.appendChild(card);
  });
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
