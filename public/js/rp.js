document.addEventListener("DOMContentLoaded", () => {
  console.log("🔥 rp.js cargado");

  const API =
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://www.cosmicpass.space";

  const user = JSON.parse(
    localStorage.getItem("cosmic_user") || "null"
  );

  if (!user) {
    console.warn("No hay usuario en sesión");
    return;
  }

  const idProductora = Number(user.id_productora);

  // =========================
  // ELEMENTOS
  // =========================

  const nuevoRPBtn = document.getElementById("nuevoRPBtn");
  const nuevoRPEmptyBtn = document.getElementById("nuevoRPEmptyBtn");

  const rpModal = document.getElementById("rpModal");
  const rpForm = document.getElementById("rpForm");
  const rpMessage = document.getElementById("rpMessage");

  const rpNombre = document.getElementById("rpNombre");
  const rpTelefono = document.getElementById("rpTelefono");
  const rpInstagram = document.getElementById("rpInstagram");
  const rpEvento = document.getElementById("rpEvento");

  const buscarRP = document.getElementById("buscarRP");
  const eventoFiltro = document.getElementById("eventoFiltro");

  const rpGrid = document.getElementById("rpGrid");

  const totalRPs = document.getElementById("totalRPs");
  const boletosAsignados = document.getElementById("boletosAsignados");
  const accesosUtilizados = document.getElementById("accesosUtilizados");

  // =========================
  // MODAL
  // =========================

  function abrirModal() {
    if (!rpModal) return;

    rpModal.classList.add("active");
    rpModal.style.display = "flex";

    rpMessage.textContent = "";

    if (rpForm) {
      rpForm.reset();
    }
  }

  function cerrarModal() {
    if (!rpModal) return;

    rpModal.classList.remove("active");
    rpModal.style.display = "none";
  }

  nuevoRPBtn?.addEventListener("click", abrirModal);
  nuevoRPEmptyBtn?.addEventListener("click", abrirModal);

  // Cerrar haciendo click fuera
  rpModal?.addEventListener("click", (e) => {
    if (e.target === rpModal) {
      cerrarModal();
    }
  });

  // =========================
  // CARGAR RP
  // =========================

  async function cargarRPs() {
    try {
      rpGrid.innerHTML = `
        <div class="loading">
          Cargando RP...
        </div>
      `;

      const response = await fetch(
        `${API}/admin/rps`,
        {
          credentials: "include"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No fue posible cargar los RP."
        );
      }

      console.log("RP recibidos:", data);

      renderizarRPs(data.rps || data);

    } catch (error) {
      console.error("Error cargando RP:", error);

      rpGrid.innerHTML = `
        <div class="empty-state">
          <h3>No fue posible cargar los RP</h3>
          <p>${escapeHTML(error.message)}</p>
        </div>
      `;
    }
  }

async function cargarEventos() {
  try {
    const response = await fetch(
      `${API}/events?id_productora=${idProductora}`,
      {
        credentials: "include"
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "No fue posible cargar los eventos."
      );
    }

    console.log("Eventos de la productora:", data);
    console.table(data.events || data);

    const eventos = data.events || data;

    if (!rpEvento) return;

    rpEvento.innerHTML = `
      <option value="">Selecciona un evento</option>
    `;

    eventos.forEach((evento) => {
      const option = document.createElement("option");

      option.value = evento.id;
option.textContent =
  evento.name ||
  `Evento #${evento.id}`;

      rpEvento.appendChild(option);
    });

    if (eventoFiltro) {
      eventoFiltro.innerHTML = `
        <option value="">Todos los eventos</option>
      `;

      eventos.forEach((evento) => {
        const option = document.createElement("option");

        option.value = evento.id;
option.textContent =
  evento.name ||
  `Evento #${evento.id}`;

        eventoFiltro.appendChild(option);
      });
    }

  } catch (error) {
    console.error("Error cargando eventos:", error);

    if (rpEvento) {
      rpEvento.innerHTML = `
        <option value="">No fue posible cargar eventos</option>
      `;
    }
  }
}


  // =========================
  // RESUMEN
  // =========================

  async function cargarResumen() {
    try {
      const response = await fetch(
        `${API}/admin/rps/resumen`,
        {
          credentials: "include"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No fue posible cargar el resumen."
        );
      }

      console.log("Resumen RP:", data);

      if (totalRPs) {
        totalRPs.textContent =
          data.totalRPs ??
          data.total_rps ??
          0;
      }

      if (boletosAsignados) {
        boletosAsignados.textContent =
          data.boletosAsignados ??
          data.boletos_asignados ??
          0;
      }

      if (accesosUtilizados) {
        accesosUtilizados.textContent =
          data.accesosUtilizados ??
          data.accesos_utilizados ??
          0;
      }

    } catch (error) {
      console.error("Error cargando resumen RP:", error);
    }
  }

  // =========================
  // RENDER RP
  // =========================

  function renderizarRPs(rps) {
    if (!rpGrid) return;

    if (!Array.isArray(rps) || rps.length === 0) {
      rpGrid.innerHTML = `
        <div class="empty-state">
          <h3>No hay RP registrados</h3>
          <p>Agrega el primer RP para comenzar.</p>
        </div>
      `;
      return;
    }

    const textoBusqueda =
      buscarRP?.value
        ?.trim()
        .toLowerCase() || "";

    const eventoSeleccionado =
      eventoFiltro?.value || "";

    const filtrados = rps.filter((rp) => {
      const coincideBusqueda =
        !textoBusqueda ||
        String(rp.nombre || "")
          .toLowerCase()
          .includes(textoBusqueda) ||
        String(rp.usuario || "")
          .toLowerCase()
          .includes(textoBusqueda);

      const coincideEvento =
        !eventoSeleccionado ||
        String(rp.id_evento || "") ===
          String(eventoSeleccionado);

      return coincideBusqueda && coincideEvento;
    });

    if (filtrados.length === 0) {
      rpGrid.innerHTML = `
        <div class="empty-state">
          <h3>No se encontraron RP</h3>
          <p>Prueba con otro criterio de búsqueda.</p>
        </div>
      `;
      return;
    }

    rpGrid.innerHTML = filtrados
      .map((rp) => {
        const estado = rp.activo !== false;

        return `
          <div class="rp-card">

            <div class="rp-card-header">
              <div>
                <h3>${escapeHTML(rp.nombre || "Sin nombre")}</h3>
                <p>@${escapeHTML(rp.usuario || "")}</p>
              </div>

              <span class="rp-status ${estado ? "activo" : "inactivo"}">
                ${estado ? "Activo" : "Inactivo"}
              </span>
            </div>

            <div class="rp-card-body">

              <div class="rp-info">
                <span>Boletos asignados</span>
                <strong>
                  ${rp.boletos_asignados ?? 0}
                </strong>
              </div>

              <div class="rp-info">
                <span>Boletos utilizados</span>
                <strong>
                  ${rp.boletos_utilizados ?? 0}
                </strong>
              </div>

              <div class="rp-info">
                <span>Disponibles</span>
                <strong>
                  ${rp.boletos_disponibles ?? 0}
                </strong>
              </div>

            </div>

          </div>
        `;
      })
      .join("");
  }

  // =========================
  // CREAR RP
  // =========================

  rpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!rpMessage) return;

    rpMessage.textContent = "";
    rpMessage.className = "modal-message";

    const nombre = rpNombre?.value.trim();
    const telefono = rpTelefono?.value.trim();
    const instagram = rpInstagram?.value.trim();
    const idEvento = rpEvento?.value;

    // =========================
    // VALIDACIONES
    // =========================

    if (!nombre) {
      rpMessage.textContent = "Escribe el nombre del RP.";
      rpMessage.classList.add("error");
      return;
    }

    if (!idEvento) {
      rpMessage.textContent = "Selecciona un evento.";
      rpMessage.classList.add("error");
      return;
    }

    // =========================
    // BOTÓN
    // =========================

    const submitBtn =
      rpForm.querySelector(".modal-submit");

    const textoOriginal =
      submitBtn?.textContent || "Guardar RP";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Creando RP...";
    }

    try {

      // =========================
      // CREAR RP
      // =========================

      const response = await fetch(
        `${API}/admin/rps`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          credentials: "include",

          body: JSON.stringify({
            nombre,
            telefono,
            instagram
          })
        }
      );

      const data = await response.json();

      console.log("Respuesta crear RP:", data);

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
          "No fue posible crear el RP."
        );
      }

      // =========================
      // ÉXITO
      // =========================

      const usuario =
        data.credenciales?.usuario ||
        data.rp?.usuario ||
        "";

      const password =
        data.credenciales?.password_temporal ||
        "";

      rpMessage.className =
        "modal-message success";

      rpMessage.innerHTML = `
        <strong>✓ RP creado correctamente</strong>

        <br><br>

        <strong>Usuario:</strong>
        ${escapeHTML(usuario)}

        <br>

        <strong>Contraseña temporal:</strong>
        ${escapeHTML(password)}

        <br><br>

        <small>
          Guarda estas credenciales. La contraseña se genera
          únicamente al crear el RP.
        </small>
      `;

      // =========================
      // ACTUALIZAR LISTADO
      // =========================

      await cargarRPs();
      await cargarResumen();

      // Dejamos unos segundos para que
      // el usuario pueda ver las credenciales.

      setTimeout(() => {
        cerrarModal();
      }, 5000);

    } catch (error) {

      console.error(
        "Error creando RP:",
        error
      );

      rpMessage.className =
        "modal-message error";

      rpMessage.textContent =
        error.message ||
        "No fue posible crear el RP.";

    } finally {

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = textoOriginal;
      }

    }
  });



  // =========================
  // BUSCADOR
  // =========================

  buscarRP?.addEventListener("input", () => { cargarRPs();});
  eventoFiltro?.addEventListener("change", () => { cargarRPs(); });


  // UTILIDAD //

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  //   INICIO //

cargarEventos();
cargarRPs();
cargarResumen();
});