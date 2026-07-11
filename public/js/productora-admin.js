const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://www.cosmicpass.space";

if (localStorage.getItem("auth") !== "true") {
  window.location.href = "login.html";
}

let user = null;

try {
  user = JSON.parse(localStorage.getItem("cosmic_user"));
} catch (error) {
  user = null;
}

if (!user) {
  cerrarSesion();
}

const isOwner = String(user?.rol || "").toLowerCase() === "owner";
const idProductora = Number(user?.id_productora) || null;

if (isOwner) {
  window.location.href = "admin.html";
}

if (!idProductora) {
  alert("Este usuario no tiene una productora asignada.");
  cerrarSesion();
}

let incomeChart = null;
let eventosGlobal = [];

document.addEventListener("DOMContentLoaded", () => {
  configurarUsuario();
  configurarBotones();
  crearGrafica([]);
  cargarDashboard();
  cargarEventos();
});

function cerrarSesion() {
  localStorage.removeItem("auth");
  localStorage.removeItem("cosmic_user");
  window.location.href = "login.html";
}

function configurarUsuario() {
  const nombre = user.nombre || user.usuario || `Productora #${idProductora}`;
  const inicial = nombre.charAt(0).toUpperCase();

  setText("productoraName", nombre);
  setText("welcomeTitle", `Hola, ${nombre}`);
  setText("accountName", nombre);
  setText("accountId", `Productora #${idProductora}`);
  setText("userAvatar", inicial);
  setText("accountInitial", inicial);

  document.title = `${nombre} | Cosmic Pass`;
}

function configurarBotones() {
  document.getElementById("logoutBtn")?.addEventListener("click", cerrarSesion);

  document.getElementById("createEventBtn")?.addEventListener("click", () => {
    mostrarPendiente("Creación de eventos");
  });

  document.getElementById("viewAllEvents")?.addEventListener("click", () => {
    mostrarPendiente("Administración de eventos");
  });

  document.getElementById("chartPeriod")?.addEventListener("change", () => {
    cargarDashboard();
  });

  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;

      const nombres = {
        scanner: "Validación QR",
        cortesia: "Generación de cortesías",
        tickets: "Administración de tickets",
        evento: "Creación de eventos"
      };

      mostrarPendiente(nombres[action] || "Esta sección");
    });
  });

  document.querySelectorAll("[data-section]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      mostrarPendiente(link.textContent.trim());
    });
  });
}

async function cargarDashboard() {
  try {
    const periodo =
      Number(document.getElementById("chartPeriod")?.value) || 30;

    const endpoint =
      `${API}/admin/dashboard?id_productora=${idProductora}&dias=${periodo}`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Error cargando dashboard");
    }

    const metricas = data.metricas || {};

    setText(
      "ventasTotal",
      formatoMoneda(metricas.ingresos || 0)
    );

    setText(
      "ticketsVendidos",
      formatoNumero(metricas.tickets || 0)
    );

    setText(
      "eventosActivos",
      formatoNumero(metricas.eventos || 0)
    );

    setText(
      "cortesiasTotal",
      formatoNumero(metricas.cortesias || 0)
    );

    const ingresosPorDia =
      Array.isArray(data.ingresos_por_dia)
        ? data.ingresos_por_dia
        : [];

    actualizarGrafica(ingresosPorDia);

  } catch (error) {
    console.error("ERROR DASHBOARD:", error);

    setText("ventasTotal", "$0.00");
    setText("ticketsVendidos", "0");
    setText("eventosActivos", "0");
    setText("cortesiasTotal", "0");

    actualizarGrafica([]);
  }
}

async function cargarEventos() {
  const tabla = document.getElementById("tablaEventos");

  if (!tabla) return;

  try {
    const res = await fetch(
      `${API}/events?id_productora=${idProductora}`
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error cargando eventos");
    }

    eventosGlobal = Array.isArray(data) ? data : [];

    const eventosOrdenados = [...eventosGlobal]
      .sort((a, b) => {
        const fechaA = new Date(
          a.event_date || a.date || a.fecha || 0
        );

        const fechaB = new Date(
          b.event_date || b.date || b.fecha || 0
        );

        return fechaB - fechaA;
      })
      .slice(0, 6);

    renderEventos(eventosOrdenados);

  } catch (error) {
    console.error("ERROR EVENTOS:", error);

    tabla.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">
          No se pudieron cargar los eventos.
        </td>
      </tr>
    `;
  }
}

function renderEventos(eventos) {
  const tabla = document.getElementById("tablaEventos");

  if (!tabla) return;

  if (!eventos.length) {
    tabla.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">
          Todavía no tienes eventos registrados.
        </td>
      </tr>
    `;

    return;
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  tabla.innerHTML = eventos.map(evento => {
    const fechaValor =
      evento.event_date ||
      evento.date ||
      evento.fecha;

    const fecha = fechaValor
      ? new Date(String(fechaValor).replace(" ", "T"))
      : null;

    const activa =
      fecha &&
      !Number.isNaN(fecha.getTime()) &&
      fecha >= hoy;

    const precio = Number(evento.price || 0);

    return `
      <tr>
        <td>
          <span class="event-name">
            ${escapeHtml(evento.name || "Evento")}
          </span>
        </td>

        <td>
          ${escapeHtml(evento.city || "Por confirmar")}
        </td>

        <td>
          ${formatoFecha(fechaValor)}
        </td>

        <td>
          ${precio === 0 ? "Cortesía" : formatoMoneda(precio)}
        </td>

        <td>
          <span class="event-status ${activa ? "active" : "finished"}">
            ${activa ? "Activo" : "Finalizado"}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

function crearGrafica(datos) {
  const canvas = document.getElementById("incomeChart");

  if (!canvas || typeof Chart === "undefined") return;

  incomeChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Ingresos",
          data: [],
          borderColor: "#7c4dff",
          backgroundColor: "rgba(124,77,255,.14)",
          borderWidth: 2,
          tension: .38,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index"
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "#161620",
          borderColor: "rgba(255,255,255,.1)",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label(context) {
              return ` ${formatoMoneda(context.parsed.y || 0)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: "#858593",
            maxTicksLimit: 8,
            font: {
              size: 10
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(255,255,255,.055)"
          },
          ticks: {
            color: "#858593",
            font: {
              size: 10
            },
            callback(value) {
              return formatoMonedaCompacta(value);
            }
          }
        }
      }
    }
  });

  actualizarGrafica(datos);
}

function actualizarGrafica(datos) {
  const empty = document.getElementById("chartEmpty");

  if (!incomeChart) {
    crearGrafica(datos);
    return;
  }

  const registros = Array.isArray(datos)
    ? datos.filter(item => item)
    : [];

  const labels = registros.map(item =>
    formatoFechaCorta(
      item.fecha ||
      item.date ||
      item.dia
    )
  );

  const valores = registros.map(item =>
    Number(
      item.ingresos ??
      item.total ??
      item.monto ??
      0
    )
  );

  const tieneDatos = valores.some(valor => valor > 0);

  incomeChart.data.labels = labels;
  incomeChart.data.datasets[0].data = valores;
  incomeChart.update();

  if (empty) {
    empty.classList.toggle("active", !tieneDatos);
  }
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function formatoMoneda(value) {
  return Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2
  });
}

function formatoMonedaCompacta(value) {
  const numero = Number(value || 0);

  if (numero >= 1000000) {
    return `$${(numero / 1000000).toFixed(1)}M`;
  }

  if (numero >= 1000) {
    return `$${(numero / 1000).toFixed(0)}K`;
  }

  return `$${numero}`;
}

function formatoNumero(value) {
  return Number(value || 0).toLocaleString("es-MX");
}

function formatoFecha(value) {
  if (!value) return "Por confirmar";

  const fecha = new Date(
    String(value).replace(" ", "T")
  );

  if (Number.isNaN(fecha.getTime())) {
    return "Por confirmar";
  }

  return fecha.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatoFechaCorta(value) {
  if (!value) return "";

  const fecha = new Date(
    String(value).replace(" ", "T")
  );

  if (Number.isNaN(fecha.getTime())) {
    return String(value);
  }

  return fecha.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short"
  });
}

function mostrarPendiente(nombre) {
  alert(`${nombre} estará disponible en el siguiente módulo.`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}