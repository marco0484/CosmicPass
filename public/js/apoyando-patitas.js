
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("productora");

  const galeria = document.getElementById("patitas-gallery");
  const botonRegreso = document.getElementById("back-producer");

// Regresar a la página de la productora.
if (botonRegreso) {
  botonRegreso.href = slug
    ? `/productora/${encodeURIComponent(slug)}`
    : "/index.html";
}

const fotos = [
  "donacion.webp",
  "donacion1.webp",
  "donacion2.webp",
  "donacion3.webp"
];

  if (!galeria) return;

  if (fotos.length === 0) {
    galeria.innerHTML = `
      <p class="patitas-status">
        Próximamente compartiremos fotografías de nuestra iniciativa.
      </p>
    `;
    return;
  }

  galeria.innerHTML = "";

  fotos.forEach((archivo, index) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "patitas-photo";

    const imagen = document.createElement("img");
    imagen.src = `/images/campa%C3%B1as/${encodeURIComponent(archivo)}`;
    imagen.alt = `Fotografía ${index + 1} de Apoyando Patitas`;
    imagen.loading = "lazy";
    imagen.decoding = "async";

    const pie = document.createElement("div");
    pie.className = "patitas-photo-caption";
    pie.textContent = "Apoyando Patitas · Aliens Attack";

    imagen.addEventListener("error", () => {
      tarjeta.remove();

      if (galeria.querySelectorAll(".patitas-photo").length === 0) {
        galeria.innerHTML = `
          <p class="patitas-status">
            No se pudieron cargar las fotografías.
            Verifica los nombres y la ruta de las imágenes.
          </p>
        `;
      }
    });

    tarjeta.append(imagen, pie);
    galeria.appendChild(tarjeta);
  });
});
