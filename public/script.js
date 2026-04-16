let eventosGlobal = [];

document.addEventListener("DOMContentLoaded", async () => {
  window.scrollTo(0, 0);
  initNavbar();
  initBotones();
  initFormulario();
  await cargarEventos(); 
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

function initFormulario() {
  const form = document.querySelector(".contact-form");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = form.querySelector("button");

    const data = {
      nombre: form[0].value,
      email: form[1].value,
      mensaje: form[2].value
    };

    btn.innerText = "Enviando...";
    btn.disabled = true;

    try {
      const res = await fetch("http://192.168.100.23:3000/contacto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (result.ok) {
        btn.innerText = "Mensaje enviado ✅";
        form.reset();
      } else {
        btn.innerText = "Error ❌";
      }

    } catch (err) {
      console.error(err);
      btn.innerText = "Error de conexión ❌";
    }

    setTimeout(() => {
      btn.innerText = "Enviar mensaje";
      btn.disabled = false;
    }, 2000);
  });
}

async function cargarEventos() {

  try {

    const res = await fetch("http://192.168.100.23:3000/events");
    const eventos = await res.json();
    eventosGlobal = eventos;
    renderEventos(eventos);
  } catch (error) {
    console.error("Error cargando eventos:", error);
  }
}


function renderEventos(lista){

  const container = document.querySelector(".cards");
  if (!container) return;

  container.innerHTML = "";

  lista.forEach(evento => {

    const card = document.createElement("div");
    card.classList.add("card");

    const fecha = new Date(evento.date);
    const fechaFormateada = fecha.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

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

        <div class="card-img-container">
          <img src="${evento.image}" alt="${evento.name}" class="card-img">
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