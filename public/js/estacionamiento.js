
document.addEventListener("DOMContentLoaded", () => {
  const API = "";

  const $ = (id) => document.getElementById(id);

  const eventoSelect = $("eventoSelect");
  const tabla = $("tablaVehiculos");
  const entradaModal = $("entradaModal");
  const salidaModal = $("salidaModal");
  const entradaForm = $("entradaForm");

  let registros = [];
  let registroSalida = null;
  let capacidad = 0;

  const mostrarMensaje = (id, mensaje, error = false) => {
    const elemento = $(id);
    if (!elemento) return;

    elemento.textContent = mensaje;
    elemento.style.color = error ? "#dc2626" : "#16a34a";
  };

  async function api(url, opciones = {}) {
    const respuesta = await fetch(API + url, {
      credentials: "same-origin",
      ...opciones,
      headers: {
        "Content-Type": "application/json",
        ...(opciones.headers || {})
      }
    });

    const texto = await respuesta.text();
    let resultado;

    try {
      resultado = texto ? JSON.parse(texto) : {};
    } catch {
      throw new Error(
        "El servidor no devolvió JSON. Revisa la sesión y las rutas del servidor."
      );
    }

    if (!respuesta.ok) {
      throw new Error(
        resultado.error || `Error HTTP ${respuesta.status}`
      );
    }

    return resultado;
  }

  function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[caracter]);
  }

  function fecha(valor) {
    if (!valor) return "—";

    const fecha = new Date(valor);

    return Number.isNaN(fecha.getTime())
      ? "—"
      : fecha.toLocaleString("es-MX", {
          dateStyle: "short",
          timeStyle: "short"
        });
  }

  function idEventoActual() {
    return Number(eventoSelect.value) || null;
  }

  function abrirModal(modal) {
    modal.style.display = "flex";
    modal.classList.add("active");
  }

  function cerrarModal(modal) {
    modal.style.display = "none";
    modal.classList.remove("active");
  }

  async function cargarEventos() {
    eventoSelect.innerHTML =
      '<option value="">Cargando eventos...</option>';

    try {
      const respuesta = await api("/admin/parking/eventos");
      const eventos = Array.isArray(respuesta)
        ? respuesta
        : respuesta.eventos || [];

      eventoSelect.innerHTML =
        '<option value="">Selecciona un evento</option>';

      eventos.forEach(evento => {
        const id = evento.id_evento ?? evento.id;
        if (!id) return;

        const nombre =
          evento.nombre ||
          evento.name ||
          evento.event_name ||
          evento.title ||
          evento.desc_slug ||
          `Evento ${id}`;

        const opcion = document.createElement("option");
        opcion.value = id;
        opcion.textContent = nombre;
        eventoSelect.appendChild(opcion);
      });

      if (!eventos.length) {
        tabla.innerHTML = `
          <tr><td colspan="6" class="loading-cell">
            No hay eventos disponibles para esta productora.
          </td></tr>`;
      }
    } catch (error) {
      eventoSelect.innerHTML =
        '<option value="">No fue posible cargar eventos</option>';
      notificar(error.message, true);
    }
  }

  async function cargarEstacionamiento() {
    const idEvento = idEventoActual();

    if (!idEvento) {
      capacidad = 0;
      registros = [];
      actualizarEstadisticas();
      renderizarTabla();

      $("capacidadTotal").textContent = "0";
      tabla.innerHTML = `
        <tr><td colspan="6" class="loading-cell">
          Selecciona un evento para comenzar.
        </td></tr>`;
      return;
    }

    tabla.innerHTML = `
      <tr><td colspan="6" class="loading-cell">
        Cargando vehículos...
      </td></tr>`;

    try {
      const [config, resultadoRegistros] = await Promise.all([
        api(`/admin/parking/config?id_evento=${idEvento}`),
        api(`/admin/parking/registros?id_evento=${idEvento}`)
      ]);

      capacidad = Number(config.capacidad_total) || 0;

      registros = Array.isArray(resultadoRegistros)
        ? resultadoRegistros
        : resultadoRegistros.registros || [];

      actualizarEstadisticas();
      renderizarTabla();
    } catch (error) {
      tabla.innerHTML = `
        <tr><td colspan="6" class="loading-cell">
          ${escapar(error.message)}
        </td></tr>`;
      notificar(error.message, true);
    }
  }

  function actualizarEstadisticas() {
    const dentro = registros.filter(
      r => String(r.estado || "").toLowerCase() === "dentro"
    ).length;

    const disponibles = Math.max(0, capacidad - dentro);
    const porcentaje = capacidad > 0
      ? Math.min(100, Math.round((dentro / capacidad) * 100))
      : 0;

    $("capacidadTotal").textContent = capacidad;
    $("totalEntradas").textContent = registros.length;
    $("vehiculosDentro").textContent = dentro;
    $("espaciosDisponibles").textContent = disponibles;

    $("porcentajeOcupacion").textContent = `${porcentaje}%`;
    $("ocupadosLabel").textContent = dentro;
    $("disponiblesLabel").textContent = disponibles;
    $("progressBar").style.width = `${porcentaje}%`;
  }

  function renderizarTabla() {
    const busqueda = $("buscarPlaca").value.trim().toUpperCase();
    const filtro = $("estadoFiltro").value;

    const filtrados = registros.filter(registro => {
      const estado = String(registro.estado || "").toLowerCase();
      const coincidePlaca = String(registro.placa || "")
        .toUpperCase()
        .includes(busqueda);

      const coincideEstado =
        !filtro ||
        (filtro === "dentro" && estado === "dentro") ||
        (filtro === "salio" && estado === "salio");

      return coincidePlaca && coincideEstado;
    });

    $("registrosCount").textContent =
      `${filtrados.length} registro${filtrados.length === 1 ? "" : "s"}`;

    if (!filtrados.length) {
      tabla.innerHTML = `
        <tr><td colspan="6" class="loading-cell">
          No hay vehículos que coincidan con la búsqueda.
        </td></tr>`;
      return;
    }

    tabla.innerHTML = filtrados.map(registro => {
      const dentro =
        String(registro.estado || "").toLowerCase() === "dentro";

      return `
        <tr>
          <td><strong>${escapar(registro.placa)}</strong></td>
          <td>
            ${escapar(registro.vehiculo || "—")}
            <small>${escapar(registro.color || "")}</small>
          </td>
          <td>${escapar(fecha(registro.fecha_entrada))}</td>
          <td>${escapar(fecha(registro.fecha_salida))}</td>
          <td>
            <span class="status-badge ${dentro ? "dentro" : "salio"}">
              ${dentro ? "Dentro" : "Salió"}
            </span>
          </td>
          <td>
            ${dentro ? `
              <button
                type="button"
                class="secondary-button salida-vehiculo"
                data-id="${Number(registro.id)}">
                Registrar salida
              </button>
            ` : "—"}
          </td>
        </tr>`;
    }).join("");
  }

  function notificar(mensaje, error = false) {
    if (typeof window.showToast === "function") {
      window.showToast(mensaje, error ? "error" : "success");
    } else {
      console[error ? "error" : "log"](mensaje);
    }
  }

  $("registrarEntradaBtn").addEventListener("click", () => {
    if (!idEventoActual()) {
      notificar("Primero selecciona un evento.", true);
      return;
    }

    entradaForm.reset();
    mostrarMensaje("entradaMessage", "");
    abrirModal(entradaModal);
    $("placaInput").focus();
  });

  $("cerrarEntradaModal").addEventListener("click", () =>
    cerrarModal(entradaModal)
  );

  $("cerrarSalidaModal").addEventListener("click", () =>
    cerrarModal(salidaModal)
  );

  entradaModal.addEventListener("click", evento => {
    if (evento.target === entradaModal) cerrarModal(entradaModal);
  });

  salidaModal.addEventListener("click", evento => {
    if (evento.target === salidaModal) cerrarModal(salidaModal);
  });

  entradaForm.addEventListener("submit", async evento => {
    evento.preventDefault();

    const idEvento = idEventoActual();
    if (!idEvento) {
      mostrarMensaje("entradaMessage", "Selecciona un evento.", true);
      return;
    }

    const boton = entradaForm.querySelector('[type="submit"]');
    boton.disabled = true;

    try {
      const datos = {
        id_evento: idEvento,
        placa: $("placaInput").value.trim().toUpperCase(),
        vehiculo: $("vehiculoInput").value.trim(),
        color: $("colorInput").value.trim(),
        espacio: $("espacioInput").value.trim()
      };

      await api("/admin/parking/entrada", {
        method: "POST",
        body: JSON.stringify(datos)
      });

      mostrarMensaje("entradaMessage", "Entrada registrada.");

      await cargarEstacionamiento();

      setTimeout(() => cerrarModal(entradaModal), 700);
    } catch (error) {
      mostrarMensaje("entradaMessage", error.message, true);
    } finally {
      boton.disabled = false;
    }
  });

  tabla.addEventListener("click", evento => {
    const boton = evento.target.closest(".salida-vehiculo");
    if (!boton) return;

    registroSalida = registros.find(
      registro => Number(registro.id) === Number(boton.dataset.id)
    );

    if (!registroSalida) return;

    $("salidaPlaca").textContent = registroSalida.placa || "—";
    $("salidaEntrada").textContent = fecha(registroSalida.fecha_entrada);
    $("salidaEspacio").textContent = registroSalida.espacio || "—";
    mostrarMensaje("salidaMessage", "");

    abrirModal(salidaModal);
  });

  $("confirmarSalidaBtn").addEventListener("click", async () => {
    if (!registroSalida) return;

    const boton = $("confirmarSalidaBtn");
    boton.disabled = true;

    try {
      await api("/admin/parking/salida", {
        method: "POST",
        body: JSON.stringify({
          id: registroSalida.id,
          id_evento: idEventoActual()
        })
      });

      mostrarMensaje("salidaMessage", "Salida registrada.");
      await cargarEstacionamiento();

      registroSalida = null;
      setTimeout(() => cerrarModal(salidaModal), 700);
    } catch (error) {
      mostrarMensaje("salidaMessage", error.message, true);
    } finally {
      boton.disabled = false;
    }
  });

  eventoSelect.addEventListener("change", cargarEstacionamiento);
  $("actualizarBtn").addEventListener("click", cargarEstacionamiento);

  $("buscarPlaca").addEventListener("input", renderizarTabla);
  $("estadoFiltro").addEventListener("change", renderizarTabla);

  $("historialBtn").addEventListener("click", () => {
    $("estadoFiltro").value = "";
    $("buscarPlaca").value = "";
    cargarEstacionamiento();
  });

  cargarEventos();
});
