const API = "http://192.168.100.23:3000";
const params = new URLSearchParams(window.location.search);
const idProductora = params.get("id");

if (!idProductora) {
  console.error("❌ No hay ID de productora");
}

function scrollToEvents(){
  document.querySelector('.producer-events-section')
    ?.scrollIntoView({ behavior: 'smooth' });
}

function formatDate(date){
  return new Date(date).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function renderEvents(eventos){
  const container = document.getElementById("producer-events");
  container.innerHTML = "";

  if (!eventos.length) {
    container.innerHTML = "<p>No hay eventos disponibles</p>";
    return;
  }

  eventos.forEach(evento => {

    const card = document.createElement("div");
    card.classList.add("event-card");

    card.innerHTML = `
      <img src="${evento.image || 'img/default.jpg'}" alt="${evento.name}">
      <div class="info">
        <h3>${evento.name}</h3>
        <p>📍 ${evento.city || 'México'}</p>
        <p>📅 ${formatDate(evento.date)}</p>
        <p class="price">$${evento.price}</p>
        <button onclick="irEvento(${evento.id})">
          Comprar
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderFeatures(features){
  const headers = features.filter(f => f.level === 1);
  const tag = document.getElementById("producer-tag");

  if (tag) {
    tag.innerHTML = "";

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

    const badges = features.filter(f => f.level === 2);

    badges.forEach(f => {
      const span = document.createElement("span");
      span.textContent = `${f.icon || ""} ${f.name}`;
      badgesContainer.appendChild(span);
    });
  }

  const trustContainer = document.querySelector(".trust-grid");

  if (trustContainer) {
    trustContainer.innerHTML = "";

    const trust = features.filter(f => f.level === 3);

    trust.forEach(f => {
      const div = document.createElement("div");
      div.classList.add("trust-item");

      div.innerHTML = `
        <h3>${f.icon || ""} ${f.name}</h3>
        <p>Eventos diseñados para impactar.</p>
      `;

      trustContainer.appendChild(div);
    });
  }
}

function renderProducer(data, eventos){

  document.getElementById("producer-name").textContent = data.name;
  document.getElementById("producer-tag").textContent =
    data.tag || "Experiencias únicas";

  document.getElementById("historia").textContent =
    data.historia || data.description || "";

  const cover = document.getElementById("producer-cover");
  if (cover) {
    cover.src = eventos?.[0]?.image || data.cover || "img/default.jpg";

    cover.onerror = () => {
      cover.src = "img/default.jpg";
    };
  }

  const logo = document.getElementById("producer-logo");

  if (logo) {
    logo.src = eventos?.[0]?.logo || "images/playlabel_logo.jpg";

    logo.onerror = () => {
      logo.src = "images/playlabel_logo.jpg";
    };
  }

  function setSocial(id, value){
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

async function loadData(){

  try {

    const [resProd, resEventos] = await Promise.all([
      fetch(`${API}/productoras/${idProductora}`),
      fetch(`${API}/productoras/${idProductora}/eventos`)
    ]);

    const productora = await resProd.json();
    const eventos = await resEventos.json();

    if (!productora) return;

    renderProducer(productora, eventos);
    renderEvents(eventos);

    try {
      const resFeatures = await fetch(`${API}/productoras/${idProductora}/features`);

      if (resFeatures.ok) {
        const features = await resFeatures.json();
        console.log("FEATURES:", features);
        renderFeatures(features);
      } else {
        console.warn("No hay features");
      }

    } catch (e) {
      console.warn("Features no disponible");
    }

  } catch (err) {
    console.error("❌ Error cargando datos:", err);
  }
}

function irEvento(id){
  window.location.href = `evento.html?id=${id}`;
}

function irHome(){
  window.location.href = "index.html";
}

loadData();