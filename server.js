let cacheEventos = {};
const cacheProductora = new Map();
const CACHE_PRODUCTORA_TTL = 30_000; // 30 segundos
const express = require("express");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASSWORD
  }
});

const { createClient } = require("@supabase/supabase-js");
const HOST             = "0.0.0.0";
const PORT             = process.env.PORT || 3000;
const app              = express();
const QRCode           = require("qrcode");
const crypto           = require("crypto");
const PDFDocument      = require("pdfkit");
const SESSION_SECRET   = process.env.SESSION_SECRET;

if (!SESSION_SECRET) { throw new Error("Falta la variable SESSION_SECRET");}

function crearSessionToken(usuario) {

  const payload = {
    id: Number(usuario.id),
    rol: String(usuario.rol || ""),
    id_productora: usuario.id_productora
      ? Number(usuario.id_productora)
      : null,
    exp: Date.now() + (8 * 60 * 60 * 1000)
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET)
                          .update(encodedPayload)
                          .digest("base64url");
                           return `${encodedPayload}.${signature}`;
}

function verificarSessionToken(token) {
  try {

    if (!token) {
      return null;
    }

    const partes = token.split(".");

    if (partes.length !== 2) {
      return null;
    }

    const [encodedPayload, signature] = partes;

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    const firmaReal = Buffer.from(signature);
    const firmaEsperada = Buffer.from(expectedSignature);

    if (
      firmaReal.length !== firmaEsperada.length ||
      !crypto.timingSafeEqual(firmaReal, firmaEsperada)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer
        .from(encodedPayload, "base64url")
        .toString("utf8")
    );

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;

  } catch (error) {
    console.error("Error verificando sesión:", error);
    return null;
  }
}

function crearMPState(productoraId, userId) {

  const payload = {
    productoraId: Number(productoraId),
    userId: Number(userId),
    exp: Date.now() + (10 * 60 * 1000),
    nonce: crypto.randomBytes(16).toString("hex")
  };

  const encodedPayload =
    Buffer
      .from(JSON.stringify(payload))
      .toString("base64url");

  const signature =
    crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encodedPayload)
      .digest("base64url");

  return `${encodedPayload}.${signature}`;
}


function verificarMPState(state) {

  try {

    if (!state) {
      return null;
    }

    const partes = state.split(".");

    if (partes.length !== 2) {
      return null;
    }

    const [encodedPayload, signature] = partes;

    const expectedSignature =
      crypto
        .createHmac("sha256", SESSION_SECRET)
        .update(encodedPayload)
        .digest("base64url");

    const firmaReal =
      Buffer.from(signature);

    const firmaEsperada =
      Buffer.from(expectedSignature);

    if (
      firmaReal.length !== firmaEsperada.length ||
      !crypto.timingSafeEqual(
        firmaReal,
        firmaEsperada
      )
    ) {
      return null;
    }

    const payload =
      JSON.parse(
        Buffer
          .from(encodedPayload, "base64url")
          .toString("utf8")
      );

    if (
      !payload.exp ||
      Date.now() > payload.exp
    ) {
      return null;
    }

   if (!Number(payload.productoraId)) {
                                        return null;
                                      }

    return payload;

  } catch (error) {

    console.error(
      "ERROR VERIFICANDO MP STATE:",
      error
    );

    return null;
  }
}

async function requerirSesion(req, res, next) {

  try {

    const cookieHeader =
      req.headers.cookie || "";

    const cookies =
      Object.fromEntries(
        cookieHeader
          .split(";")
          .map(cookie => cookie.trim())
          .filter(Boolean)
          .map(cookie => {

            const index =
              cookie.indexOf("=");

            if (index === -1) {
              return [cookie, ""];
            }

            return [
              cookie.substring(0, index),
              cookie.substring(index + 1)
            ];

          })
      );


    const token =
      cookies.cp_session;


    const sesion =
      verificarSessionToken(token);


    /* ===================================== */
    /* SIN SESIÓN */
    /* ===================================== */

    if (!sesion) {

      return res.redirect(
        "/login.html?redirect=/generador/"
      );

    }


    const userId =
      Number(sesion.id);


    if (!userId) {

      return res.redirect(
        "/login.html?redirect=/generador/"
      );

    }


    /* ===================================== */
    /* VALIDAR USUARIO EN BD */
    /* ===================================== */

    const {
      data: usuario,
      error
    } =
      await supabase
        .from("cosmic_usuarios")
        .select(`
          id,
          rol,
          activo,
          id_productora
        `)
        .eq("id", userId)
        .maybeSingle();


    if (
      error ||
      !usuario ||
      !usuario.activo
    ) {

      res.setHeader(
        "Set-Cookie",
        "cp_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
      );

      return res.redirect(
        "/login.html?redirect=/generador/"
      );

    }


    req.usuario = {
      id: Number(usuario.id),

      rol:
        String(usuario.rol || ""),

      id_productora:
        usuario.id_productora
          ? Number(usuario.id_productora)
          : null
    };


    next();


  } catch (error) {

    console.error(
      "ERROR PROTEGIENDO GENERADOR:",
      error
    );


    return res.redirect(
      "/login.html?redirect=/generador/"
    );

  }

}

function requerirSesionPagina(req, res, next) {

  const cookieHeader =
    req.headers.cookie || "";

  const cookies =
    Object.fromEntries(
      cookieHeader
        .split(";")
        .map(cookie => cookie.trim())
        .filter(Boolean)
        .map(cookie => {

          const index =
            cookie.indexOf("=");

          if (index === -1) {
            return [cookie, ""];
          }

          return [
            cookie.substring(0, index),
            cookie.substring(index + 1)
          ];

        })
    );

  const token =
    cookies.cp_session;

  const sesion =
    verificarSessionToken(token);


  if (!sesion) {

    return res.redirect(
      "/login.html?redirect=/generador/"
    );

  }

  req.usuario = sesion;

  next();
}

app.use(cors());
/* ========================================= */
/* GENERADOR PROTEGIDO */
/* ========================================= */

app.use(
  "/generador",
  requerirSesionPagina,
  express.static(
    path.join(
      __dirname,
      "public",
      "generador"
    )
  )
);

app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {

  if (req.originalUrl === "/webhook-stripe") {
    next();
  } else {
    express.json()(req, res, next);
  }

});

const {
  MercadoPagoConfig,
  Preference,
  Payment
} = require("mercadopago");


const Stripe = require('stripe');

const stripe = Stripe(
  process.env.STRIPE_TOKEN
);

const endpointSecret =
  process.env.STRIPE_WEBHOOK_SECRET;


app.post(
  "/webhook-stripe",
  express.raw({ type: "*/*" }),
 async (req, res) => {

    const sig =
      req.headers["stripe-signature"];

    try {

      const event =
        stripe.webhooks.constructEvent(
          req.body,
          sig,
          endpointSecret
        );

      if (
        event.type ===
        "checkout.session.completed"
      ) {

        const session =
          event.data.object;

          const { data: existe } =
  await supabase
    .from("tickets")
    .select("id")
    .eq(
      "payment_id",
      session.payment_intent
    )
    .maybeSingle();

if (existe) {
  return res.json({
    received: true
  });
}

const ticketToken = crypto.randomUUID();

const { error } =
  await supabase
    .from("tickets")
    .insert([{
      evento_id:Number(session.metadata.evento_id),
      nombre_cliente:session.customer_details?.name ||"Cliente Stripe",
      correo:session.customer_details?.email ||null,
      telefono:session.customer_details?.phone ||null,
      cantidad:Number(session.metadata.cantidad),
      monto: session.amount_total / 100,
      metodo_pago: "STRIPE",
      payment_id: session.payment_intent,
      payment_status: "paid",
      fecha_pago: new Date(),
      ticket_type_id: Number(session.metadata.ticket_id),
      ticket_token:ticketToken
    }]);

if (error) {

  console.error(
    "ERROR INSERTANDO TICKET STRIPE:"
  );

  console.error(error);

} else {


 const rpcResult =
  await supabase.rpc(
    "descontar_stock",
    {
      p_ticket_id: Number(
        session.metadata.ticket_id
      ),
      p_cantidad: Number(
        session.metadata.cantidad
      )
    }
  );

const {
  data: nuevoStock,
  error: stockError
} = rpcResult;

if (stockError) {
  console.error("ERROR DESCONTANDO STOCK:");
  console.error(stockError);
}


/* ================================
   OBTENER TIPO DE TICKET
================================ */

const {
  data: ticketInfo,
  error: ticketError
} = await supabase
  .from("ticket_types")
  .select(`
    id,
    id_evento,
    tipo_ticket
  `)
  .eq(
    "id",
    Number(session.metadata.ticket_id)
  )
  .single();

if (ticketError || !ticketInfo) {

  console.error(
    "ERROR OBTENIENDO TIPO DE TICKET:"
  );

  console.error(ticketError);

  return res.sendStatus(200);

}


/* ================================
   OBTENER EVENTO
================================ */

const {
  data: evento,
  error: eventoError
} = await supabase
  .from("cat_events")
  .select(`
    name,
    city,
    date
  `)
  .eq(
    "id",
    Number(session.metadata.evento_id)
  )
  .single();

if (eventoError || !evento) {

  console.error(
    "ERROR OBTENIENDO EVENTO:"
  );

  console.error(eventoError);

  return res.sendStatus(200);

}


/* ================================
   GENERAR QR
================================ */

const qrImage =
  await QRCode.toDataURL(
    ticketToken,
    {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "H"
    }
  );


/* ================================
   GENERAR PDF
================================ */

const pdfBuffer =
  await generarBoletoPDF({
    evento,
    nombre: session.customer_details?.name || "Cliente Stripe",
    tipoTicket: ticketInfo.tipo_ticket,
    ticketToken,
    qrImage
  });

  /* ================================
   ENVIAR BOLETO POR CORREO
================================ */

const correoCliente = session.customer_details?.email || null;
const nombreCliente = session.customer_details?.name || "Cliente Stripe";
if (correoCliente) {

  try {

    await transporter.sendMail({

      from: '"Cosmic Pass" <cosmicpass0484@gmail.com>',

      to: correoCliente,

      subject: `¡Tus boletos están listos! 🎟️`,

      html: `
<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="
  margin:0;
  padding:0;
  background:#f4f5f8;
  font-family:Arial,Helvetica,sans-serif;
  color:#222;
">

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="background:#f4f5f8;"
>

<tr>

<td
  align="center"
  style="padding:30px 15px;"
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    max-width:520px;
    background:#ffffff;
  "
>

<tr>

<td
  align="center"
  style="padding:28px 20px 15px;"
>

<div style="
  font-size:22px;
  font-weight:bold;
  letter-spacing:1px;
  color:#111111;
">
  COSMIC PASS
</div>

</td>

</tr>

<tr>

<td
  style="
    padding:10px 32px 30px;
  "
>

<h1 style="
  margin:0 0 20px;
  font-size:20px;
  line-height:1.4;
  color:#111111;
">

¡Tus boletos están listos ${nombreCliente}!

</h1>

<p style="
  margin:0 0 18px;
  font-size:14px;
  line-height:1.6;
  color:#444444;
">

Ya está lista tu entrada para
<strong>${evento.name}</strong>.

</p>

<p style="
  margin:0 0 18px;
  font-size:14px;
  line-height:1.6;
  color:#444444;
">

Adjunto encontrarás tu boleto en formato PDF.
Puedes descargarlo y mostrarlo desde tu teléfono
el día del evento.

</p>

<p style="
  margin:0 0 20px;
  font-size:13px;
  line-height:1.6;
  color:#e11d48;
  font-weight:bold;
">

⚠️ Recuerda que el boleto es único e intransferible.
No compartas el código QR en redes sociales ni con terceros.

</p>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    background:#f7f7f7;
    margin-bottom:20px;
  "
>

<tr>
<td style="
  padding:8px 12px;
  font-size:13px;
  color:#333333;
">
<strong>Evento:</strong>
${evento.name}
</td>
</tr>

<tr>
<td style="
  padding:8px 12px;
  font-size:13px;
  color:#333333;
">
<strong>Fecha:</strong>
${evento.date || "Por confirmar"}
</td>
</tr>

<tr>
<td style="
  padding:8px 12px;
  font-size:13px;
  color:#333333;
">
<strong>Lugar:</strong>
${evento.city || "Por confirmar"}
</td>
</tr>

<tr>
<td style="
  padding:8px 12px;
  font-size:13px;
  color:#333333;
">
<strong>Acceso:</strong>
${ticketInfo.tipo_ticket}
</td>
</tr>

</table>

<p style="
  margin:0;
  font-size:13px;
  line-height:1.6;
  color:#444444;
">

¡Esperamos verte en el evento y que disfrutes
de una experiencia increíble! 🚀

</p>

</td>

</tr>

<tr>

<td style="padding:0 32px;">

<div style="
  border-top:1px solid #eeeeee;
"></div>

</td>

</tr>

<tr>

<td
  align="center"
  style="
    padding:22px 32px 28px;
  "
>

<p style="
  margin:0 0 8px;
  font-size:11px;
  line-height:1.5;
  color:#999999;
">

Si tienes algún problema con tu boleto,
contáctanos por WhatsApp.

</p>

<p style="
  margin:0;
  font-size:11px;
  color:#999999;
">

WhatsApp:
<strong>55 6434 9230</strong>

</p>

</td>

</tr>

</table>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="max-width:520px;"
>

<tr>

<td
  align="center"
  style="padding:20px 10px;"
>

<div style="
  font-size:12px;
  font-weight:bold;
  letter-spacing:1px;
  color:#555555;
">
  COSMIC PASS
</div>

<p style="
  margin:6px 0 0;
  font-size:10px;
  color:#999999;
">

© 2026 Cosmic Pass

</p>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>
</html>
`,

      attachments: [
        {
          filename:     `Boleto-${evento.name}.pdf`,
          content:      pdfBuffer,
          contentType: "application/pdf"
        }

      ]

    });

  } catch (mailError) {

    console.error(
      "ERROR ENVIANDO CORREO STRIPE:",
      mailError
    );

  }

}

}

      }

      return res.json({
        received: true
      });

    } catch (err) {

      console.error(err);

      return res
        .status(400)
        .send(err.message);

    }

  }
);

app.get("/productora/:slug", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "productora.html")
  );
});

const supabase = createClient("https://uqrbykxgsarsfyyvmibr.supabase.co",process.env.SUPABASE_SECRET_KEY);


async function generarBoletoPDF({
  evento,
  nombre,
  tipoTicket,
  fechaFin,
  ticketToken,
  qrImage
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        compress: true
      });

      const chunks = [];

      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // =========================================
      // PALETA COSMIC PASS
      // =========================================
      const navy = "#071126";
      const navyLight = "#101F3D";
      const cyan = "#42E8FF";
      const white = "#F7FAFF";
      const muted = "#A7B7D2";
      const line = "#263958";

      const pageW = 595.28;
      const pageH = 841.89;

      // =========================================
      // FONDO ESPACIAL
      // =========================================
      doc.rect(0, 0, pageW, pageH).fill(navy);

      // Líneas decorativas superiores
      doc.save();
      doc.opacity(0.8);
      doc.rect(0, 0, pageW, 7).fill(cyan);
      doc.restore();

      doc.circle(520, 95, 85).fill(navyLight);
      doc.circle(520, 95, 63).lineWidth(1).stroke("#1D456A");
      doc.circle(520, 95, 43).lineWidth(1).stroke("#1D456A");

      doc.circle(65, 740, 90).fill(navyLight);
      doc.circle(65, 740, 65).lineWidth(1).stroke("#1D456A");

      // Estrellas decorativas
      [
        [48, 80, 2],
        [120, 110, 1.5],
        [475, 160, 2],
        [530, 240, 1.5],
        [62, 410, 1.5],
        [520, 510, 2],
        [465, 700, 1.5],
        [130, 770, 2],
        [480, 785, 1.5]
      ].forEach(([x, y, r]) => {
        doc.circle(x, y, r).fill(cyan);
      });

      // =========================================
      // TARJETA PRINCIPAL
      // =========================================
      doc.roundedRect(35, 35, pageW - 70, pageH - 70, 22)
        .fill(navyLight);

      doc.roundedRect(35, 35, pageW - 70, pageH - 70, 22)
        .lineWidth(1.2)
        .stroke("#294668");

      // Acento cian en la cabecera
      doc.roundedRect(55, 55, pageW - 110, 5, 2.5)
        .fill(cyan);

      // =========================================
      // MARCA
      // =========================================
      doc.font("Helvetica-Bold")
        .fontSize(23)
        .fillColor(white)
        .text("COSMIC", 0, 82, {
          width: pageW,
          align: "center",
          lineBreak: false
        });

      doc.font("Helvetica")
        .fontSize(10)
        .fillColor(cyan)
        .text("P A S S", 0, 109, {
          width: pageW,
          align: "center",
          characterSpacing: 2
        });

      doc.font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(muted)
        .text("TU ACCESO ESTA LISTO", 0, 135, {
          width: pageW,
          align: "center",
          characterSpacing: 1
        });

      // Separador
      doc.moveTo(75, 164)
        .lineTo(pageW - 75, 164)
        .lineWidth(1)
        .stroke(line);

      // =========================================
      // ETIQUETA DEL BOLETO
      // =========================================
      doc.roundedRect(185, 183, 225, 27, 13)
        .fill("#173B57");

      doc.font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(cyan)
        .text("BOLETO DIGITAL", 185, 192, {
          width: 225,
          align: "center",
          lineBreak: false
        });

      // =========================================
      // EVENTO
      // =========================================
      doc.font("Helvetica-Bold")
        .fontSize(24)
        .fillColor(white)
        .text(evento.name || "Evento", 75, 230, {
          width: pageW - 150,
          align: "center",
          height: 70,
          ellipsis: true
        });

      doc.font("Helvetica")
        .fontSize(10)
        .fillColor(muted)
        .text("PREPÁRATE PARA VIVIR LA EXPERIENCIA", 75, 294, {
          width: pageW - 150,
          align: "center",
          characterSpacing: 0.5
        });

      // =========================================
      // COMPRADOR
      // =========================================
      doc.roundedRect(75, 330, pageW - 150, 76, 12)
        .fill("#0B1830");

      doc.roundedRect(75, 330, 4, 76, 2)
        .fill(cyan);

      doc.font("Helvetica")
        .fontSize(9)
        .fillColor(muted)
        .text("BOLETO A NOMBRE DE", 95, 345, {
          width: pageW - 190,
          lineBreak: false
        });

      doc.font("Helvetica-Bold")
        .fontSize(17)
        .fillColor(white)
        .text(nombre || "Cliente", 95, 365, {
          width: pageW - 190,
          height: 28,
          ellipsis: true
        });

      // =========================================
      // TIPO DE ACCESO
      // =========================================
      doc.font("Helvetica")
        .fontSize(9)
        .fillColor(muted)
        .text("TIPO DE ACCESO", 0, 425, {
          width: pageW,
          align: "center"
        });

      doc.font("Helvetica-Bold")
        .fontSize(15)
        .fillColor(cyan)
        .text(tipoTicket || "Acceso general", 75, 443, {
          width: pageW - 150,
          align: "center",
          height: 25,
          ellipsis: true
        });


// =========================================
// FECHA LÍMITE PARA CORTESÍAS
// =========================================
if (
  String(tipoTicket || "").trim().toLowerCase() === "cortesia" &&
  fechaFin
) {
  const fechaTexto = String(fechaFin).trim();

  // Las fechas sin zona horaria se interpretan
  // como hora local de Ciudad de México.
  const fechaSinZona =
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/
      .test(fechaTexto);

  const fechaLimite = fechaSinZona
    ? new Date(
        Number(fechaTexto.slice(0, 4)),
        Number(fechaTexto.slice(5, 7)) - 1,
        Number(fechaTexto.slice(8, 10)),
        Number(fechaTexto.slice(11, 13)),
        Number(fechaTexto.slice(14, 16)),
        Number(fechaTexto.slice(17, 19))
      )
    : new Date(fechaTexto);

  console.log("DEBUG fechaFin original:", fechaTexto);
  console.log("DEBUG fechaLimite:", fechaLimite.toString());

  if (!Number.isNaN(fechaLimite.getTime())) {
    doc.font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#FFB454")
      .text(
        `CORTESÍA VÁLIDA HASTA: ${fechaLimite.toLocaleString("es-MX", {
          timeZone: "America/Mexico_City",
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        })}`,
        45,
        469,
        {
          width: pageW - 90,
          align: "center",
          lineBreak: false
        }
      );
  }
}

      // =========================================
      // QR: MARCO Y ÁREA BLANCA PARA ESCANEO
      // =========================================
      const qrBase64 = String(qrImage || "").split("base64,").pop();

      if (!qrBase64) {
        throw new Error("No se recibió una imagen QR válida.");
      }

      const qrBuffer = Buffer.from(qrBase64, "base64");

      const qrSize = 190;
      const qrX = (pageW - qrSize) / 2;
      const qrY = 500;

      // Marco exterior
      doc.roundedRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 14)
        .fill("#FFFFFF");

      // Imagen QR conservada con sus proporciones originales
      doc.image(qrBuffer, qrX, qrY, {
        fit: [qrSize, qrSize],
        align: "center",
        valign: "center"
      });

      // Instrucción
      doc.font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(white)
        .text("PRESENTA TU QR EN EL ACCESO", 65, 704, {
          width: pageW - 130,
          align: "center"
        });

      doc.font("Helvetica")
        .fontSize(9)
        .fillColor(muted)
        .text("Mantén el código visible y listo para escanear.", 65, 721, {
          width: pageW - 130,
          align: "center"
        });

      // =========================================
      // INFORMACIÓN DEL EVENTO
      // =========================================
      const infoY = 755;
      const infoW = (pageW - 150) / 2;

      doc.moveTo(75, 746)
        .lineTo(pageW - 75, 746)
        .lineWidth(1)
        .stroke(line);

      doc.font("Helvetica")
        .fontSize(8)
        .fillColor(muted)
        .text("FECHA", 80, infoY, {
          width: infoW - 10,
          lineBreak: false
        });

      doc.font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(white)
        .text(String(evento.date || "Por confirmar"), 80, infoY + 15, {
          width: infoW - 10,
          height: 25,
          ellipsis: true
        });

      doc.font("Helvetica")
        .fontSize(8)
        .fillColor(muted)
        .text("LUGAR", 315, infoY, {
          width: infoW - 10,
          lineBreak: false
        });

      doc.font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(white)
        .text(String(evento.city || "Por confirmar"), 315, infoY + 15, {
          width: infoW - 10,
          height: 25,
          ellipsis: true
        });

      // =========================================
      // FOLIO Y AVISO
      // =========================================
      doc.font("Helvetica")
        .fontSize(7)
        .fillColor(muted)
        .text(`Folio: ${ticketToken}`, 65, 798, {
          width: pageW - 130,
          align: "center",
          height: 12,
          ellipsis: true
        });

      doc.font("Helvetica")
        .fontSize(7)
        .fillColor(muted)
        .text(
          "Boleto único para un solo ingreso. No compartas tu código QR.",
          65,
          812,
          {
            width: pageW - 130,
            align: "center",
            height: 12,
            ellipsis: true
          }
        );

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}


app.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body;

    if (!user || !password) {
      return res.status(400).json({
        success: false,
        error: "Usuario y contraseña requeridos"
      });
    }

const { data: usuarios, error } = await supabase.rpc(
  "validar_login_cosmic",
  {
    p_usuario: user,
    p_password: password
  }
);

const data =
  usuarios && usuarios.length > 0
    ? usuarios[0]
    : null;

if (error || !data) {
  return res.status(401).json({
    success: false,
    error: "Credenciales incorrectas"
  });
}

    let nombreProductora = "Cosmic Pass";

    if (data.id_productora) {
      const {
        data: productora,
        error: productoraError
      } = await supabase
        .from("cat_productoras")
        .select("name")
        .eq("id", data.id_productora)
        .maybeSingle();

      if (productoraError) {
        console.error(
          "ERROR CONSULTANDO PRODUCTORA:",
          productoraError
        );
      }

      if (productora?.name) {
        nombreProductora = productora.name;
      }
    }

const usuarioSesion = {
  id: data.id,
  nombre: data.nombre || data.usuario,
  usuario: data.usuario,
  rol: data.rol || "admin",
  id_productora: data.id_productora,
  productora_nombre: nombreProductora
};

const sessionToken = crearSessionToken(usuarioSesion);

res.setHeader(
  "Set-Cookie",
  `cp_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
);

return res.json({
  success: true,
  user: usuarioSesion
});

  } catch (err) {
    console.error("ERROR LOGIN:", err);

    return res.status(500).json({
      success: false,
      error: "Error en servidor"
    });
  }
});

app.get(
  "/api/me",
  requerirSesion,
  async (req, res) => {

    return res.json({
      success: true,
      user: req.usuario
    });

  }
);

app.post("/logout", (req, res) => {

  res.setHeader(
    "Set-Cookie",
    "cp_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
  );

  return res.json({
    success: true
  });

});


app.post("/scanner/token", requerirSesion, async (req, res) => {
  try {
    const userId = Number(req.usuario.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, error: "Sesión de usuario inválida" });
    }

    const { data: user, error: userError } = await supabase
      .from("cosmic_usuarios")
      .select("id, nombre, usuario, rol, activo, id_productora")
      .eq("id", userId)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
    if (!user.activo) {
      return res.status(403).json({ success: false, error: "Usuario inactivo" });
    }

    const idProductora = Number(user.id_productora);
    if (!Number.isInteger(idProductora) || idProductora <= 0) {
      return res.status(403).json({ success: false, error: "Sin productora asignada" });
    }

    let eventoId = Number(req.body?.evento_id);

    // Si el frontend no envía evento, buscar el evento activo de la productora.
    if (!Number.isInteger(eventoId) || eventoId <= 0) {
      const { data: eventos, error: eventosError } = await supabase
        .from("cat_events")
        .select("id, id_productora, ind_activo")
        .eq("id_productora", idProductora)
        .eq("ind_activo", 1);

      if (eventosError) throw eventosError;

      if (!eventos || eventos.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Tu productora no tiene eventos activos para validar"
        });
      }

      if (eventos.length > 1) {
        return res.status(400).json({
          success: false,
          error: "Tu productora tiene varios eventos activos; debes seleccionar uno"
        });
      }

      eventoId = Number(eventos[0].id);
    }

    const { data: evento, error: eventoError } = await supabase
      .from("cat_events")
      .select("id, id_productora, ind_activo")
      .eq("id", eventoId)
      .maybeSingle();

    if (eventoError) throw eventoError;

    if (!evento || Number(evento.id_productora) !== idProductora) {
      return res.status(403).json({
        success: false,
        error: "El evento no existe o no pertenece a tu productora"
      });
    }

    if (Number(evento.ind_activo) !== 1) {
      return res.status(400).json({
        success: false,
        error: "El evento seleccionado no está activo"
      });
    }

    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000);

    const { error: insertError } = await supabase
      .from("scanner_sessions")
      .insert({
        token,
        user_id: user.id,
        id_productora: idProductora,
        id_evento: eventoId,
        expires_at,
        used: false
      });

    if (insertError) {
      console.error("ERROR INSERTANDO scanner_sessions:", insertError);
      return res.status(500).json({
        success: false,
        error: "No fue posible crear el token"
      });
    }

    return res.json({
      success: true,
      token,
      expires_at,
      id_evento: eventoId,
      id_productora: idProductora
    });
  } catch (err) {
    console.error("ERROR /scanner/token:", err);
    return res.status(500).json({
      success: false,
      error: "Error interno"
    });
  }
});

/* =========================================================
   GENERADOR - CREAR TOKEN
========================================================= */

app.post(
  "/generator/token",
  requerirSesion,
  async (req, res) => {

    try {

      const userId =
        Number(req.usuario.id);

      if (!userId) {

        return res.status(401).json({
          success: false,
          error: "Sesión inválida"
        });

      }


      const {
        data: user,
        error: userError
      } = await supabase
        .from("cosmic_usuarios")
        .select(`
          id,
          nombre,
          usuario,
          rol,
          activo,
          id_productora
        `)
        .eq("id", userId)
        .maybeSingle();


      if (
        userError ||
        !user ||
        !user.activo
      ) {

        return res.status(403).json({
          success: false,
          error: "Usuario no autorizado"
        });

      }


      if (!user.id_productora) {

        return res.status(403).json({
          success: false,
          error: "Sin productora asignada"
        });

      }


      const token =
        crypto.randomUUID();


      const expires_at =
        new Date(
          Date.now() +
          (8 * 60 * 60 * 1000)
        );


      const {
        error: insertError
      } = await supabase
        .from("scanner_sessions")
        .insert({

          token,

          user_id:
            user.id,

          id_productora:
            user.id_productora,

          id_evento:
            null,

          expires_at,

          used:
            false,

          id_origen:
            2

        });


      if (insertError) {

        console.error(
          "ERROR TOKEN GENERADOR:",
          insertError
        );

        return res.status(500).json({
          success: false,
          error:
            "No fue posible crear el token"
        });

      }


      return res.json({
        success: true,
        token,
        expires_at
      });


    } catch (error) {

      console.error(
        "ERROR /generator/token:",
        error
      );

      return res.status(500).json({
        success: false,
        error: "Error interno"
      });

    }

  }
);


app.post("/admin/rps", requerirSesion, async (req, res) => {
  try {
    const usuarioSesion = req.usuario;

    const rol = String(usuarioSesion.rol || "").toLowerCase();
    const idProductora = Number(usuarioSesion.id_productora);

    // =========================
    // PERMISOS
    // =========================

    if (rol !== "owner" && rol !== "admin") {
      return res.status(403).json({
        ok: false,
        error: "No tienes permisos para crear RP."
      });
    }

    if (!Number.isInteger(idProductora) || idProductora <= 0) {
      return res.status(400).json({
        ok: false,
        error: "No se encontró la productora."
      });
    }

    // =========================
    // DATOS DEL FORMULARIO
    // =========================

    const {
      nombre,
      telefono,
      instagram
    } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({
        ok: false,
        error: "El nombre del RP es obligatorio."
      });
    }

    const nombreLimpio = String(nombre).trim();

    // =========================
    // GENERAR USUARIO
    // =========================

    const baseUsuario = nombreLimpio
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "");

    if (!baseUsuario) {
      return res.status(400).json({
        ok: false,
        error: "No fue posible generar el usuario."
      });
    }

    let usuarioNormalizado = baseUsuario;
    let contador = 1;

    // =========================
    // EVITAR DUPLICADOS
    // =========================

    while (true) {DASH

      const { data: existente, error: errorExistente } =
        await supabase
          .from("cosmic_usuarios")
          .select("id")
          .eq("usuario", usuarioNormalizado)
          .maybeSingle();

      if (errorExistente) {
        console.error(
          "Error verificando usuario RP:",
          errorExistente
        );

        return res.status(500).json({
          ok: false,
          error: "No fue posible validar el usuario."
        });
      }

      if (!existente) {
        break;
      }

      contador++;

      usuarioNormalizado =
        `${baseUsuario}${contador}`;
    }

    // =========================
    // GENERAR PASSWORD
    // =========================

    const passwordTemporal =
      `CP-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    // =========================
    // HASH
    // =========================

    const {
      data: passwordHash,
      error: hashError
    } = await supabase.rpc(
      "generar_password_hash",
      {
        p_password: passwordTemporal
      }
    );

    if (hashError) {
      console.error(
        "Error generando password hash:",
        hashError
      );

      return res.status(500).json({
        ok: false,
        error: "No fue posible generar la contraseña."
      });
    }

    // =========================
    // CREAR USUARIO
    // =========================

    const {
      data: nuevoUsuario,
      error: usuarioError
    } = await supabase
      .from("cosmic_usuarios")
      .insert({
        usuario: usuarioNormalizado,
        nombre: nombreLimpio,
        rol: "rp",
        activo: true,
        id_productora: idProductora,
        password_hash: passwordHash
      })
      .select(`
        id,
        usuario,
        nombre,
        rol,
        activo,
        id_productora
      `)
      .single();

    if (usuarioError) {
      console.error(
        "Error creando usuario RP:",
        usuarioError
      );

      return res.status(500).json({
        ok: false,
        error: "No fue posible crear el usuario del RP."
      });
    }

    // =========================
    // CREAR CAT_RPS
    // =========================

    const {
      data: nuevoRP,
      error: rpError
    } = await supabase
      .from("cat_rps")
      .insert({
        id_rp_user: nuevoUsuario.id,
            nombre: nombreLimpio,
          telefono: telefono ? String(telefono).trim() : null,
         instagram: instagram ? String(instagram).trim(): null,
     id_productora: idProductora,
            activo: true,
        created_by: usuarioSesion.id
      })
      .select(`
        id_rp_user,
        nombre,
        telefono,
        instagram,
        id_productora,
        activo
      `)
      .single();

    // SI FALLA CAT_RPS //

    if (rpError) {

      console.error(
        "Error creando cat_rps:",
        rpError
      );

      // Eliminamos el usuario creado
      // para no dejar un RP incompleto.

      await supabase
        .from("cosmic_usuarios")
        .delete()
        .eq("id", nuevoUsuario.id);

      return res.status(500).json({
        ok: false,
        error: "No fue posible crear el perfil del RP."
      });
    }

    // RESPUESTA

    return res.status(201).json({

      ok: true,

      message: "RP creado correctamente.",

      rp: {
        id: nuevoRP.id,
        id_rp_user: nuevoUsuario.id,
        nombre: nuevoRP.nombre,
        telefono: nuevoRP.telefono,
        instagram: nuevoRP.instagram,
        usuario: nuevoUsuario.usuario,
        rol: nuevoUsuario.rol,
        activo: nuevoUsuario.activo,
        id_productora: nuevoUsuario.id_productora
      },

      credenciales: {
        usuario: nuevoUsuario.usuario,
        password_temporal: passwordTemporal
      }

    });

  } catch (error) {

    console.error(
      "ERROR POST /admin/rps:",
      error
    );

    return res.status(500).json({
      ok: false,
      error: "Error interno del servidor."
    });
  }
});


app.get("/admin/rps", requerirSesion, async (req, res) => {
  try {
    const rol = String(req.usuario.rol || "").toLowerCase();
    const idProductoraSesion = Number(req.usuario.id_productora) || null;

    const esOwner =
      rol === "owner" ||
      (rol === "admin" && !idProductoraSesion);

      const esAdminProductora =
  rol === "admin" && idProductoraSesion;

if (!esOwner && !esAdminProductora) {
  return res.status(403).json({
    success: false,
    error: "No tienes permisos para administrar RPs"
  });
}
    let idProductora;

    if (esOwner) {
      idProductora = Number(req.query.id_productora);

      if (!Number.isInteger(idProductora) || idProductora <= 0) {
        return res.status(400).json({
          success: false,
          error: "Productora inválida"
        });
      }
    } else {
      if (!idProductoraSesion) {
        return res.status(403).json({
          success: false,
          error: "Usuario sin productora"
        });
      }

      idProductora = idProductoraSesion;
    }

    const { data, error } = await supabase
      .from("cosmic_usuarios")
      .select(`
        id,
        nombre,
        usuario,
        rol,
        activo,
        id_productora
      `)
      .eq("id_productora", idProductora)
      .eq("rol", "rp")
      .order("id", { ascending: true });

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      id_productora: idProductora,
      rps: data || []
    });

  } catch (error) {
    console.error("ERROR /admin/rps:", error);

    return res.status(500).json({
      success: false,
      error: "Error cargando RPs"
    });
  }
});


app.get("/admin/menus", requerirSesion, async (req, res) => {
  try {
    const rol = String(req.usuario?.rol || "").trim().toLowerCase();

    if (!rol) {
      return res.status(401).json({
        success: false,
        error: "Rol de usuario no encontrado."
      });
    }

    const { data, error } = await supabase
      .from("cat_roles_menus")
      .select(`
        menu_id,
        activo,
        cat_menus (
          id,
          nombre,
          ruta,
          icono,
          orden,
          activo,
          tipo
        )
      `)
      .eq("rol", rol)
      .eq("activo", true);

    if (error) {
      console.error("Error cargando menús:", error);

      return res.status(500).json({
        success: false,
        error: "No fue posible cargar los menús."
      });
    }

    const menus = (data || [])
      .filter(item =>
        item.cat_menus &&
        item.cat_menus.activo === true
      )
      .map(item => item.cat_menus)
      .sort((a, b) => a.orden - b.orden);

    return res.json({
      success: true,
      rol,
      menus
    });

  } catch (error) {
    console.error("ERROR /admin/menus:", error);

    return res.status(500).json({
      success: false,
      error: "Error interno cargando menús."
    });
  }
});

app.get("/admin/rps/resumen", requerirSesion, async (req, res) => {
  try {

    const rol = String(req.usuario.rol || "").toLowerCase();
    const idProductoraSesion = Number(req.usuario.id_productora) || null;
    const esOwner =
      rol === "owner" ||
      (rol === "admin" && !idProductoraSesion);

    const esAdminProductora = rol === "admin" && Boolean(idProductoraSesion);

    if (!esOwner && !esAdminProductora) {
      return res.status(403).json({
        success: false,
        error: "No tienes permisos para administrar RPs"
      });
    }

    let idProductora;

    if (esOwner) {

      idProductora = Number(req.query.id_productora);

      if (
        !Number.isInteger(idProductora) ||
        idProductora <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Productora inválida"
        });
      }

    } else {

      idProductora =
        idProductoraSesion;
    }

    /*  ASIGNACIONES  */

    const {
      data: asignaciones,
      error: asignacionesError
    } = await supabase
      .from("rp_asignaciones")
      .select(`
        id,
        rp_user_id,
        id_evento,
        ticket_type_id,
        cantidad_asignada,
        activo
      `)
      .eq("id_productora", idProductora);

    if (asignacionesError) {
      throw asignacionesError;
    }

    /*  RPS  */

    const {
      data: rps,
      error: rpsError
    } = await supabase
      .from("cosmic_usuarios")
      .select(`
        id,
        nombre,
        usuario,
        activo
      `)
      .eq("id_productora", idProductora)
      .eq("rol", "rp");

    if (rpsError) {
      throw rpsError;
    }

    /* TICKETS VENDIDOS POR RP  */

    const rpIds = (rps || []).map(rp => rp.id);
    let tickets = [];
    if (rpIds.length > 0) {

      const {
        data: ticketsData,
        error: ticketsError
      } = await supabase
        .from("tickets")
        .select(`
          rp_user_id,
          evento_id,
          ticket_type_id,
          cantidad
        `)
        .in("rp_user_id", rpIds);

      if (ticketsError) {
        throw ticketsError;
      }

      tickets = ticketsData || [];
    }

    /* ARMAR RESUMEN  */

    const resumen =
      (rps || []).map(rp => {

        const asignacionesRp =
          (asignaciones || []).filter(
            a => Number(a.rp_user_id) === Number(rp.id)
          );

        const asignados =
          asignacionesRp.reduce(
            (total, a) =>
              total + Number(a.cantidad_asignada || 0),
            0
          );

        const vendidos =
          tickets
            .filter(
              t =>
                Number(t.rp_user_id) === Number(rp.id)
            )
            .reduce(
              (total, t) =>
                total + Number(t.cantidad || 1),
              0
            );

        const disponibles =
          Math.max(asignados - vendidos, 0);

        return {
          id: rp.id,
          nombre: rp.nombre,
          usuario: rp.usuario,
          activo: rp.activo,
          asignados,
          vendidos,
          disponibles
        };
      });

    return res.json({
      success: true,
      id_productora: idProductora,
      rps: resumen
    });

  } catch (error) {

    console.error(
      "ERROR /admin/rps/resumen:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Error cargando resumen de RPs"
    });
  }
});


// ============================================================
// OBTENER TIPOS DE BOLETO PARA ASIGNAR A UN RP
// ============================================================
app.get("/admin/rps/tipos-ticket", requerirSesion, async (req, res) => {
  try {
    const rol = String(req.usuario.rol || "").toLowerCase();
    const idProductoraSesion = Number(req.usuario.id_productora) || null;
    const idEvento = Number(req.query.id_evento);

    // Owner / admin global
    const esOwner =
      rol === "owner" ||
      (rol === "admin" && !idProductoraSesion);

    // Admin de una productora
    const esAdminProductora =
      rol === "admin" && Boolean(idProductoraSesion);

    if (!esOwner && !esAdminProductora) {
      return res.status(403).json({
        success: false,
        error: "No tienes permisos para consultar los tipos de boleto."
      });
    }

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
      return res.status(400).json({
        success: false,
        error: "Evento inválido."
      });
    }

    // Buscar evento
    const { data: evento, error: eventoError } = await supabase
      .from("cat_events")
      .select("id, name, id_productora, ind_activo")
      .eq("id", idEvento)
      .maybeSingle();

    if (eventoError) throw eventoError;

    if (!evento || Number(evento.ind_activo) !== 1) {
      return res.status(404).json({
        success: false,
        error: "Evento no encontrado o inactivo."
      });
    }

    const idProductoraEvento = Number(evento.id_productora);

    // Un admin de productora solo puede consultar sus propios eventos
    if (
      esAdminProductora &&
      idProductoraEvento !== idProductoraSesion
    ) {
      return res.status(403).json({
        success: false,
        error: "El evento no pertenece a tu productora."
      });
    }

    // Obtener tipos de boleto
    const { data: tickets, error: ticketsError } = await supabase
      .from("ticket_types")
      .select(`
        id,
        id_evento,
        id_productora,
        tipo_ticket,
        precio,
        stock_disponible,
        ind_activo
      `)
      .eq("id_evento", idEvento)
      .eq("id_productora", idProductoraEvento)
      .eq("ind_activo", 1)
      .order("precio", { ascending: true });

    if (ticketsError) throw ticketsError;

    return res.json({
      success: true,
      id_productora: idProductoraEvento,
      evento,
      tickets: tickets || []
    });

  } catch (error) {
    console.error("ERROR /admin/rps/tipos-ticket:", error);

    return res.status(500).json({
      success: false,
      error: "Error cargando tipos de boleto."
    });
  }
});


app.post("/admin/rps/asignar", requerirSesion, async (req, res) => {
  try {
    const {
      rp_user_id,
      id_evento,
      ticket_type_id,
      cantidad
    } = req.body;

    const rol = String(req.usuario.rol || "").toLowerCase();
    const idProductora = Number(req.usuario.id_productora) || null;

    // VALIDAR PERMISOS
      const rolesPermitidos = ["admin", "owner", "usuario"];
      
    // VALIDAR DATOS
    const rpId = Number(rp_user_id);
    const eventoId = Number(id_evento);
    const ticketTypeId = Number(ticket_type_id);
    const cantidadAsignar = Number(cantidad);

    if (
      !Number.isInteger(rpId) ||
      !Number.isInteger(eventoId) ||
      !Number.isInteger(ticketTypeId) ||
      !Number.isInteger(cantidadAsignar) ||
      cantidadAsignar <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos"
      });
    }

    // VALIDAR RP DE LA PRODUCTORA
    const {
      data: rp,
      error: rpError
    } = await supabase
      .from("cosmic_usuarios")
      .select("id, rol, activo, id_productora")
      .eq("id", rpId)
      .eq("id_productora", idProductora)
      .eq("rol", "rp")
      .maybeSingle();

    if (rpError) throw rpError;

    if (!rp || !rp.activo) {
      return res.status(404).json({
        success: false,
        error: "RP no válido"
      });
    }

    // VALIDAR TIPO DE ACCESO DEL EVENTO
    const {
      data: ticketType,
      error: ticketError
    } = await supabase
      .from("ticket_types")
      .select("id, id_evento, id_productora, tipo_ticket")
      .eq("id", ticketTypeId)
      .eq("id_evento", eventoId)
      .eq("id_productora", idProductora)
      .eq("ind_activo", 1)
      .maybeSingle();

    if (ticketError) throw ticketError;

    if (!ticketType) {
      return res.status(404).json({
        success: false,
        error: "Tipo de acceso no válido"
      });
    }

    // BUSCAR ASIGNACIÓN EXISTENTE
    const {
      data: asignacion,
      error: asignacionError
    } = await supabase
      .from("rp_asignaciones")
      .select("id, cantidad_asignada")
      .eq("rp_user_id", rpId)
      .eq("id_evento", eventoId)
      .eq("ticket_type_id", ticketTypeId)
      .eq("id_productora", idProductora)
      .maybeSingle();

    if (asignacionError) throw asignacionError;

    let resultado;

    if (asignacion) {
      // SUMAR A LA ASIGNACIÓN EXISTENTE
      const nuevaCantidad =
        Number(asignacion.cantidad_asignada) + cantidadAsignar;

      const {
        data,
        error
      } = await supabase
        .from("rp_asignaciones")
        .update({
          cantidad_asignada: nuevaCantidad,
          activo: true
        })
        .eq("id", asignacion.id)
        .select()
        .single();

      if (error) throw error;

      resultado = data;
    } 
    else {    // CREAR NUEVA ASIGNACIÓN
      const {
        data,
        error
      } = await supabase
        .from("rp_asignaciones")
        .insert({
          id_productora: idProductora,
          id_evento: eventoId,
          ticket_type_id: ticketTypeId,
          rp_user_id: rpId,
          cantidad_asignada: cantidadAsignar,
          activo: true,
          created_by: req.usuario.id
        })
        .select()
        .single();

      if (error) throw error;

      resultado = data;
    }

    return res.json({
      success: true,
      asignacion: resultado
    });

  } catch (error) {
    console.error("ERROR /admin/rps/asignar:", error);

    return res.status(500).json({
      success: false,
      error: "No se pudo realizar la asignación"
    });
  }
});

app.get("/admin/dashboard", requerirSesion, async (req, res) => {
  try {

const rol = String(req.usuario.rol || "").toLowerCase();
const idProductoraSesion = Number(req.usuario.id_productora) || null;

const esOwner = rol === "owner" || (rol === "admin" && !idProductoraSesion);

if (!esOwner && !idProductoraSesion) {
  return res.status(403).json({
    success: false,
    error: "Usuario sin productora asignada"
  });
}

const idProductora =
  esOwner
    ? null
    : idProductoraSesion;

    const { data, error } = await supabase.rpc("get_dashboard",
      {
        p_id_productora: idProductora
      }
    );

    if (error) {
      throw error;
    }

    const metricas = data || {
      eventos: 0,
      tickets: 0,
      ingresos: 0,
      productoras: idProductora ? 1 : 0
    };

    return res.json({
      success: true,
      scope: idProductora
        ? "productora"
        : "admin",
      id_productora: idProductora,
      metricas: {
                eventos: Number(metricas.eventos         || 0),
                emitidos: Number(metricas.emitidos       || 0),
                asignados: Number(metricas.asignados     || 0),
                tickets: Number(metricas.tickets         || 0),
                disponibles: Number(metricas.disponibles || 0),
                cortesias: Number(metricas.cortesias     || 0),
                ingresos: Number(metricas.ingresos       || 0),
                productoras: Number(metricas.productoras || 0)
              }
    });

  } catch (error) {
    console.error(
      "ERROR /admin/dashboard:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Error cargando dashboard"
    });
  }
});

app.get("/scanner/validate", async (req, res) => {

  try {

    const token = req.query.token;

    if (!token) {
      return res.status(400).json({
        success:false,
        error:"Token requerido"
      });
    }

   const { data, error } =
  await supabase
    .from("scanner_sessions")
    .select("*")
    .eq("token", token)
    .is("id_origen", null)
    .maybeSingle();

    if (error || !data) {
      return res.status(401).json({
        success:false,
        error:"Token inválido"
      });
    }

    if (data.used) {
      return res.status(401).json({
        success:false,
        error:"Token ya utilizado"
      });
    }

    if (new Date(data.expires_at) < new Date()) {

      return res.status(401).json({
        success:false,
        error:"Token expirado"
      });

    }

    const {
      data:user,
      error:userError
    } = await supabase
      .from("cosmic_usuarios")
      .select(`
        id,
        nombre,
        usuario,
        rol,
        activo,
        id_productora
      `)
      .eq("id", data.user_id)
      .maybeSingle();

    if (userError || !user || !user.activo) {

      return res.status(401).json({
        success:false
      });

    }

    await supabase
      .from("scanner_sessions")
      .update({
        used:true
      })
      .eq("token", token);

      let nombreProductora = "Cosmic Pass";

if (user.id_productora) {

  const { data: productora } = await supabase
    .from("cat_productoras")
    .select("name")
    .eq("id", user.id_productora)
    .maybeSingle();

  if (productora?.name) {
    nombreProductora = productora.name;
  }

}

 return res.json({
  success: true,
  user: {
    id: user.id,
    nombre: user.nombre,
    usuario: user.usuario,
    rol: user.rol,
    id_productora: user.id_productora,
    productora_nombre: nombreProductora,
    id_evento: data.id_evento
  }
});

  } catch(err){

    console.error(err);

    res.status(500).json({
      success:false
    });

  }

});

/* =========================================================
   GENERADOR - VALIDAR TOKEN
========================================================= */

app.get( "/generator/validate",async (req, res) => {
    try {

      const token = String(req.query.token || "").trim();


      if (!token) {

        return res.status(401).json({
          success: false,
          error: "Token requerido"
        });

      }


      const {
        data: session,
        error
      } = await supabase
        .from("scanner_sessions")
        .select("*")
        .eq("token", token)
        .eq("id_origen", 2)
        .maybeSingle();


      if (
        error ||
        !session
      ) {

        return res.status(401).json({
          success: false,
          error: "Token inválido"
        });

      }


      if (
        new Date(session.expires_at) <
        new Date()
      ) {

        return res.status(401).json({
          success: false,
          error: "Token expirado"
        });

      }


      const {
        data: user,
        error: userError
      } = await supabase
        .from("cosmic_usuarios")
        .select(`
          id,
          nombre,
          usuario,
          rol,
          activo,
          id_productora
        `)
        .eq(
          "id",
          session.user_id
        )
        .maybeSingle();


      if (
        userError ||
        !user ||
        !user.activo
      ) {

        return res.status(403).json({
          success: false,
          error: "Usuario no autorizado"
        });

      }


      return res.json({

        success: true,

        user: {
          id: user.id,
          nombre: user.nombre,
          usuario: user.usuario,
          rol: user.rol,
          id_productora:
            user.id_productora
        }

      });


    } catch (error) {
      console.error("ERROR /generator/validate:",error);
      return res.status(500).json({
        success: false,
        error: "Error validando acceso"
      });

    }

  }
);

app.post("/admin/activar-cortesias",requerirSesion,
  async (req, res) => {

    try {

      const {
        id_productora,
        cantidad
      } = req.body;

      const rol =
        String(req.usuario.rol || "")
          .toLowerCase();

      const idProductoraSesion =
        Number(req.usuario.id_productora) || null;

      const esOwner =
        rol === "owner" ||
        (rol === "admin" && !idProductoraSesion);

/* DETERMINAR CANTIDAD */

let idProductora = Number(
  req.usuario.id_productora
);

if (
  !Number.isInteger(idProductora) ||
  idProductora <= 0
) {
  return res.status(403).json({
    success: false,
    error: "Usuario sin productora asignada"
  });
}

      const cantidadAgregar =
        Number(cantidad);

      if (
        !Number.isInteger(cantidadAgregar) ||
        cantidadAgregar <= 0
      ) {

        return res.status(400).json({
          success: false,
          error: "Cantidad inválida"
        });

      }

      /* BUSCAR EVENTO DE LA PRODUCTORA */
        const {
          data: evento,
          error: eventoError
        } = await supabase
          .from("cat_events")
          .select(`
            id,
            name,
            id_productora,
            ind_activo
          `)
          .eq("id_productora", idProductora)
          .eq("ind_activo", 1)
          .maybeSingle();

      /*BUSCAR TICKET GRATUITO */

      const {
        data: ticket,
        error: ticketError
      } = await supabase
        .from("ticket_types")
        .select(`
          id,
          id_evento,
          id_productora,
          precio,
          stock_disponible
        `)
        .eq("id_evento", evento.id)
        .eq("id_productora", idProductora)
        .eq("precio", 0)
        .eq("ind_activo", 1)
        .maybeSingle();

      if (ticketError) {
        throw ticketError;
      }

      if (!ticket) {

        return res.status(404).json({
          success: false,
          error:
            "Este evento no tiene un acceso gratuito configurado"
        });

      }

      /*
      ==========================================
      SUMAR CORTESÍAS
      ==========================================
      */

      const nuevoStock =
        Number(ticket.stock_disponible || 0) +
        cantidadAgregar;

      const {
        error: updateError
      } = await supabase
        .from("ticket_types")
        .update({
          stock_disponible: nuevoStock
        })
        .eq("id", ticket.id);

      if (updateError) {
        throw updateError;
      }

      /*
      ==========================================
      RESPUESTA
      ==========================================
      */

      return res.json({

        success: true,

        message:
          `${cantidadAgregar} cortesías activadas correctamente`,

        evento: {
          id: evento.id,
          nombre: evento.name
        },

        productora: idProductora,

        stock_nuevo: nuevoStock

      });

    } catch (error) {

      console.error(
        "ERROR ACTIVANDO CORTESÍAS:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "No se pudieron activar las cortesías"
      });

    }

  }
);

app.get("/stripe/connect/:productoraId", async (req, res) => {
    try {

      const productoraSolicitada = Number(req.params.productoraId);

      if (
        !Number.isInteger(productoraSolicitada) ||
        productoraSolicitada <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Productora inválida"
        });
      }

const productoraId = productoraSolicitada;

      const {
        data: productora,
        error: productoraError
      } = await supabase
        .from("cat_productoras")
        .select(`
          id,
          stripe_account_id
        `)
        .eq("id", productoraId)
        .maybeSingle();

      if (productoraError) {
        throw productoraError;
      }

      if (!productora) {
        return res.status(404).json({
          success: false,
          error: "Productora no encontrada"
        });
      }

      let stripeAccountId =
        productora.stripe_account_id;

      /*
        Evitamos crear una cuenta Stripe nueva
        cada vez que presionen conectar.
      */
      if (!stripeAccountId) {

        const account =
          await stripe.accounts.create({
            type: "standard"
          });

        stripeAccountId =
          account.id;

        const { error: updateError } =
          await supabase
            .from("cat_productoras")
            .update({
              stripe_account_id:
                stripeAccountId,
              stripe_onboarding_complete:
                false
            })
            .eq("id", productoraId);

        if (updateError) {
          throw updateError;
        }

      }

      const accountLink =
        await stripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `https://www.cosmicpass.space/productora.html?id=${productoraId}`,
          return_url: `https://www.cosmicpass.space/productora.html?id=${productoraId}`,
          type: "account_onboarding"
        });

return res.redirect(accountLink.url);

    } catch (error) {

      console.error(
        "ERROR STRIPE CONNECT:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "No fue posible conectar Stripe"
      });

    }

  }
);


app.get("/api/productora/:slug", async (req, res) => {
  const inicio = performance.now();
  const tiempos = {};
  let marca = inicio;

  try {
    const slugOriginal = String(req.params.slug || "").trim();

    if (!slugOriginal) {
      return res.status(400).json({
        error: "Slug requerido"
      });
    }

    const slug = slugOriginal
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // 1. Caché de respuesta completa
    const cache = cacheProductora.get(slug);
    const ahora = Date.now();

    if (cache && ahora - cache.time < CACHE_PRODUCTORA_TTL) {
      res.set("X-Productora-Cache", "HIT");
      return res.json(cache.data);
    }

    res.set("X-Productora-Cache", "MISS");

    // 2. Buscar por slug
    const { data: porSlug, error: errorSlug } = await supabase
      .from("cat_productoras")
      .select("id, name, desc_slug")
      .ilike("desc_slug", slug)
      .maybeSingle();

    tiempos.busquedaSlug = Math.round(performance.now() - marca);
    marca = performance.now();

    if (errorSlug) throw errorSlug;

    let productora = porSlug;

    // 3. Respaldo: buscar por nombre exacto sin descargar
    // toda la tabla de productoras.
    if (!productora) {
      const nombre = slugOriginal.replace(/-/g, " ");

      const { data, error } = await supabase
        .from("cat_productoras")
        .select("id, name, desc_slug")
        .ilike("name", nombre)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      productora = data;
    }

    tiempos.busquedaProductora = Math.round(performance.now() - marca);
    marca = performance.now();

    if (!productora) {
      return res.status(404).json({
        error: "Productora no encontrada"
      });
    }

    const id = Number(productora.id);

    // 4. Consultas paralelas: conservamos las tres RPC actuales.
    const [prod, eventos, features] = await Promise.all([
      supabase.rpc("get_productora_by_id", {
        p_id: id
      }),
      supabase.rpc("get_events_by_productora", {
        p_id: id
      }),
      supabase.rpc("get_productora_features", {
        p_id: id
      })
    ]);

    tiempos.consultasRPC = Math.round(performance.now() - marca);

    if (prod.error) throw prod.error;
    if (eventos.error) throw eventos.error;
    if (features.error) throw features.error;

    const respuesta = {
      productora: prod.data?.[0] || null,
      eventos: eventos.data || [],
      features: features.data || []
    };

    if (!respuesta.productora) {
      return res.status(404).json({
        error: "Datos de productora no encontrados"
      });
    }

    // 5. Guardar respuesta durante 30 segundos.
    cacheProductora.set(slug, {
      data: respuesta,
      time: Date.now()
    });

    // Evitar que la caché crezca indefinidamente.
    if (cacheProductora.size > 200) {
      const primeraClave = cacheProductora.keys().next().value;
      cacheProductora.delete(primeraClave);
    }

    tiempos.total = Math.round(performance.now() - inicio);

    console.info("[Cosmic Pass] API productora", {
      slug,
      ...tiempos
    });

    return res.json(respuesta);

  } catch (error) {
    console.error("ERROR /api/productora/:slug:", error);

    return res.status(500).json({
      error: "Error en servidor"
    });
  }
});




app.get("/api/productora/:slug/mercancia", async (req, res) => {
  try {
    const { slug } = req.params;

    // Buscar la productora por su slug
    const { data: productora, error: errorProductora } = await supabase
      .from("cat_productoras")
      .select("id")
      .eq("desc_slug", slug)
      .maybeSingle();

    if (errorProductora) {
      console.error("Error buscando productora:", errorProductora);
      return res.status(500).json({
        success: false,
        error: "Error al consultar la productora"
      });
    }

    if (!productora) {
      return res.status(404).json({
        success: false,
        error: "Productora no encontrada"
      });
    }

    // Consultar mercancía activa de esa productora
    const { data: mercancia, error } = await supabase
      .from("cat_mercancia")
      .select("id, nombre, descripcion, precio, imagen, categoria")
      .eq("id_productora", productora.id)
      .eq("activo", true)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error consultando mercancía:", error);
      return res.status(500).json({
        success: false,
        error: "Error al consultar la mercancía"
      });
    }

    return res.json({
      success: true,
      mercancia: mercancia || []
    });

  } catch (error) {
    console.error("Error en endpoint de mercancía:", error);
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
});



app.get("/api/productora/:slug/talleres", async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: productora, error: errorProductora } = await supabase
      .from("cat_productoras")
      .select("id")
      .eq("desc_slug", slug)
      .maybeSingle();

    if (errorProductora) {
      console.error("Error buscando productora:", errorProductora);
      return res.status(500).json({
        success: false,
        error: "Error al consultar la productora"
      });
    }

    if (!productora) {
      return res.status(404).json({
        success: false,
        error: "Productora no encontrada"
      });
    }

    const { data: talleres, error } = await supabase
      .from("cat_talleres")
      .select(
        "id, nombre, descripcion, imagen, fecha_inicio, fecha_fin, ubicacion, precio, cupo_maximo"
      )
      .eq("id_productora", productora.id)
      .eq("activo", true)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error consultando talleres:", error);
      return res.status(500).json({
        success: false,
        error: "Error al consultar los talleres"
      });
    }

    return res.json({
      success: true,
      talleres: talleres || []
    });

  } catch (error) {
    console.error("Error en endpoint de talleres:", error);
    return res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
});


/* HISTORIAL PÚBLICO DE EVENTOS */

app.get("/api/productora/:slug/eventos-pasados", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: "Slug de productora requerido"
      });
    }

    // 1. Buscar la productora
    const {
      data: productora,
      error: errorProductora
    } = await supabase
      .from("cat_productoras")
      .select("id, name, desc_slug")
      .ilike("desc_slug", slug)
      .maybeSingle();

    if (errorProductora) throw errorProductora;

    if (!productora) {
      return res.status(404).json({
        success: false,
        error: "Productora no encontrada"
      });
    }

    // 2. Consultar los eventos registrados en Cosmic Pass
    const {
      data: eventosData,
      error: errorEventos
    } = await supabase.rpc("get_events_by_productora", {
      p_id: productora.id
    });

    if (errorEventos) throw errorEventos;

    // 3. Filtrar los eventos que ya ocurrieron
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const eventosPasados = (eventosData || []).filter(evento => {
      const fecha = evento.event_date || evento.date || evento.fecha;

      if (!fecha) return false;

      const fechaEvento = new Date(String(fecha).replace(" ", "T"));

      if (Number.isNaN(fechaEvento.getTime())) return false;

      fechaEvento.setHours(0, 0, 0, 0);

      return fechaEvento < hoy;
    });

    // 4. Consultar las imágenes y videos de los eventos registrados
    let eventosConMultimedia = [];

    if (eventosPasados.length > 0) {
      const idsEventos = eventosPasados.map(evento => evento.id);

      const {
        data: multimedia,
        error: errorMultimedia
      } = await supabase
        .from("cat_images")
        .select("id, id_productora, id_evento, tipo, url, descripcion, orden")
        .eq("id_productora", productora.id)
        .in("id_evento", idsEventos)
        .eq("activo", true)
        .order("orden", { ascending: true });

      if (errorMultimedia) throw errorMultimedia;

      eventosConMultimedia = eventosPasados.map(evento => ({
        ...evento,
        multimedia: (multimedia || []).filter(
          archivo => Number(archivo.id_evento) === Number(evento.id)
        )
      }));
    }

    // 5. Consultar la galería histórica manual de ESTA productora
    const {
      data: galeriaManual,
      error: errorGaleria
    } = await supabase
      .from("cat_galeria_historica")
      .select(`
        id,
        id_productora,
        nombre_evento,
        descripcion,
        ciudad,
        fecha_evento,
        imagen_url,
        orden
      `)
      .eq("id_productora", productora.id)
      .eq("activo", true)
      .order("orden", { ascending: true })
      .order("fecha_evento", { ascending: false });

    if (errorGaleria) throw errorGaleria;

    // 6. Adaptar las fotos manuales al formato que ya consume el frontend
    const eventosManuales = (galeriaManual || []).map(foto => ({
      id: `galeria-${foto.id}`,
      name: foto.nombre_evento,
      city: foto.ciudad || "",
      event_date: foto.fecha_evento || null,
      description: foto.descripcion || "",
      image: foto.imagen_url,
      multimedia: [{
        id: foto.id,
        id_productora: foto.id_productora,
        id_evento: null,
        tipo: "imagen",
        url: foto.imagen_url,
        descripcion: foto.descripcion || foto.nombre_evento,
        orden: foto.orden
      }],
      origen: "galeria_manual"
    }));

    // 7. Combinar los eventos reales y las fotos manuales
    // Solo afecta el historial de esta productora.
    const eventosFinales = [
      ...eventosConMultimedia,
      ...eventosManuales
    ];

    return res.json({
      success: true,
      productora: {
        id: productora.id,
        nombre: productora.name,
        slug: productora.desc_slug
      },
      eventos: eventosFinales
    });

  } catch (error) {
    console.error("ERROR HISTORIAL DE EVENTOS:", error);

    return res.status(500).json({
      success: false,
      error: "No fue posible cargar el historial de eventos"
    });
  }
});


// RPs PÚBLICOS DE UNA PRODUCTORA
app.get("/api/productora/:slug/rps", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: "Slug requerido"
      });
    }

    // 1. Buscar la productora por su slug
    const { data: productora, error: errorProductora } =
      await supabase
        .from("cat_productoras")
        .select("id, name, desc_slug")
        .ilike("desc_slug", slug)
        .maybeSingle();

    if (errorProductora) throw errorProductora;

    if (!productora) {
      return res.status(404).json({
        success: false,
        error: "Productora no encontrada"
      });
    }

    // 2. Consultar perfiles públicos de sus RPs activos
    const { data: perfiles, error: errorPerfiles } =
      await supabase
        .from("cat_rps")
        .select("id_rp_user, nombre, telefono, instagram")
        .eq("id_productora", productora.id)
        .eq("activo", true);

    if (errorPerfiles) throw errorPerfiles;

    const perfilesRP = perfiles || [];
    const idsRP = perfilesRP.map(rp => rp.id_rp_user);

    // Si no hay RPs, devolver lista vacía
    if (idsRP.length === 0) {
      return res.json({
        success: true,
        productora: productora.name,
        rps: []
      });
    }

    // 3. Verificar que las cuentas de los RPs sigan activas
    const { data: usuarios, error: errorUsuarios } =
      await supabase
        .from("cosmic_usuarios")
        .select("id")
        .in("id", idsRP)
        .eq("rol", "rp")
        .eq("activo", true);

    if (errorUsuarios) throw errorUsuarios;

    const idsActivos = new Set(
      (usuarios || []).map(usuario => Number(usuario.id))
    );

    const rpsPublicos = perfilesRP
      .filter(rp => idsActivos.has(Number(rp.id_rp_user)))
      .map(rp => ({
        nombre: rp.nombre,
        telefono: rp.telefono,
        instagram: rp.instagram
      }));

    return res.json({
      success: true,
      productora: productora.name,
      rps: rpsPublicos
    });

  } catch (error) {
    console.error("ERROR RPs PÚBLICOS:", error);

    return res.status(500).json({
      success: false,
      error: "No fue posible cargar los RPs"
    });
  }
});

app.post("/crear-pago-stripe", async (req, res) => {

  try {

    const {
      ticket_id,
      cantidad = 1
    } = req.body;

    const { data: ticket, error } =
  await supabase
    .from("ticket_types")
    .select(`
            id,
            id_evento,
            id_productora,
            tipo_ticket,
            precio,
            stock_disponible
          `)
    .eq("id", ticket_id)
    .single();

    if (error || !ticket) {

      return res.status(404).json({
        error: "Ticket no encontrado"
      });

    }
if (
  ticket.stock_disponible !== null &&
  ticket.stock_disponible < Number(cantidad)
) {

  return res.status(400).json({
    error: "Stock insuficiente"
  });

}

const { data: productora, error: productoraError } =
  await supabase
    .from("cat_productoras")
    .select("stripe_account_id")
    .eq("id", ticket.id_productora)
    .single();

if (productoraError || !productora?.stripe_account_id) {

  return res.status(400).json({
    error: "La productora no tiene Stripe conectado"
  });

}

    const session =
  await stripe.checkout.sessions.create({

    metadata: {
      ticket_id: String(ticket.id),
      evento_id: String(ticket.id_evento),
      cantidad: String(cantidad)
    },

    payment_method_types: ["card"],
    phone_number_collection: {
      enabled: true
    },

  line_items: [
  {
    price_data: {
      currency: "mxn",
      product_data: {
        name: ticket.tipo_ticket
      },
      unit_amount:
        Math.round(
          Number(ticket.precio) * 100
        )
    },
    quantity:
      Number(cantidad)
  }
],
    mode: "payment",
    success_url:
      "https://www.cosmicpass.space/successful.html",

    cancel_url:
      "https://www.cosmicpass.space/error.html",
      payment_intent_data: {
  application_fee_amount: 0,
  transfer_data: {
    destination:
      productora.stripe_account_id
  }
},

  });

    res.json({
      checkout_url: session.url
    });

  } catch (err) {

    console.error(
      "STRIPE ERROR:",
      err
    );

    res.status(500).json({
      error: err.message
    });

  }

});
app.get("/mp/connect/:productoraId",async (req, res) => {
    try {
      const productoraSolicitada = Number(req.params.productoraId);
      if (
        !Number.isInteger(productoraSolicitada) ||
        productoraSolicitada <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Productora inválida"
        });
      }

     const productoraId = productoraSolicitada;

      const {
        data: productora,
        error: productoraError
      } = await supabase
        .from("cat_productoras")
        .select("id")
        .eq("id", productoraId)
        .maybeSingle();

      if (productoraError) {
        throw productoraError;
      }

      if (!productora) {
        return res.status(404).json({
          success: false,
          error: "Productora no encontrada"
        });
      }

   const state = crearMPState(
                              productoraId,
                                  0
                            );

      const authorizationUrl =
        "https://auth.mercadopago.com/authorization" +
        "?response_type=code" +
        `&client_id=${encodeURIComponent(process.env.MP_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(process.env.MP_REDIRECT_URI)}` +
        `&state=${encodeURIComponent(state)}`;

      return res.redirect(
        authorizationUrl
      );

    } catch (error) {

      console.error(
        "ERROR MP CONNECT:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "No fue posible iniciar la conexión."
      });

    }

  }
);


app.get(
  "/mp/oauth/callback",
  async (req, res) => {

    try {

      const { code, state } = req.query;

      if (!code || !state) {
        return res
          .status(400)
          .send("Solicitud inválida.");
      }

      const stateData =
        verificarMPState(state);

      if (!stateData) {
        return res
          .status(400)
          .send(
            "Solicitud inválida o expirada."
          );
      }

      const productoraId = Number(stateData.productoraId);
      const userId       = Number(stateData.userId);
      const esConexionCliente = !userId;
      /*
        Revalidamos al usuario desde BD.
        No confiamos solamente en lo que
        existía cuando comenzó el OAuth.
      */
 if (!esConexionCliente) {

  const {
    data: usuario,
    error: usuarioError
  } = await supabase
    .from("cosmic_usuarios")
    .select(`
      id,
      rol,
      activo,
      id_productora
    `)
    .eq("id", userId)
    .maybeSingle();

  if (
    usuarioError ||
    !usuario ||
    !usuario.activo
  ) {
    return res
      .status(403)
      .send("Usuario no autorizado.");
  }

  const rol =
    String(usuario.rol || "")
      .toLowerCase();

  const idProductoraUsuario =
    Number(usuario.id_productora) || null;

  const esOwner =
    rol === "owner" ||
    (
      rol === "admin" &&
      !idProductoraUsuario
    );

  if (
    !esOwner &&
    idProductoraUsuario !== productoraId
  ) {
    return res
      .status(403)
      .send(
        "No tienes permisos sobre esta productora."
      );
  }
      }

      const response =
        await fetch(
          "https://api.mercadopago.com/oauth/token",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              client_id:
                process.env.MP_CLIENT_ID,

              client_secret:
                process.env.MP_CLIENT_SECRET,

              grant_type:
                "authorization_code",

              code,

              redirect_uri:
                process.env.MP_REDIRECT_URI
            })
          }
        );

      const tokenData =
        await response.json();

      if (!response.ok) {

        console.error(
          "ERROR TOKEN MP:",
          tokenData
        );

        return res
          .status(400)
          .send(
            "Mercado Pago rechazó la autorización."
          );
      }

      const { error } =
        await supabase
          .from("cat_productoras")
          .update({

            mp_access_token:
              tokenData.access_token,

            mp_refresh_token:
              tokenData.refresh_token,

            mp_user_id:
              String(tokenData.user_id),

            mp_connected:
              true,

            mp_token_expires_at:
              new Date(
                Date.now() +
                tokenData.expires_in * 1000
              )

          })
          .eq("id", productoraId);

      if (error) {
        throw error;
      }

      return res.redirect(
        `/productora.html?id=${productoraId}&mp=connected`
      );

    } catch (error) {

      console.error(
        "ERROR MP CALLBACK:",
        error
      );

      return res
        .status(500)
        .send(
          "Error conectando Mercado Pago."
        );

    }

  }
);

app.get("/events", async (req, res) => {
  try {

    const { id_productora } = req.query;
    const key = id_productora || "all";
    const now = Date.now();
    if (
      cacheEventos[key] &&
      (now - cacheEventos[key].time < 300000)
    ) {
      return res.json(cacheEventos[key].data);
    }

    const { data, error } = await supabase.rpc("get_events", {
      p_id_productora: id_productora ? parseInt(id_productora) : null
    });

    if (error) throw error;

    cacheEventos[key] = {
      data,
      time: now
    };

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: "Error en servidor" });
  }
});

app.get("/events/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const { data, error } = await supabase.rpc("get_productora_by_id", {
      p_id: id
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    res.json(data[0]);

  } catch (error) {
    res.status(500).json({ error: "Error en servidor" });
  }
});

app.get("/productoras/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const { data, error } = await supabase.rpc("get_productora_by_id", {
      p_id: id
    });

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Productora no encontrada" });
    }

    res.json(data[0]);

  } catch (error) {
    res.status(500).json({ error: "Error en servidor" });
  }
});


app.get("/productoras/:id/eventos", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const { data, error } = await supabase.rpc("get_events_by_productora", {
      p_id: id
    });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: "Error en servidor" });
  }
});


app.get("/productoras/:id/detalle/:eventoId", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const eventoId = parseInt(req.params.eventoId);

    const { data, error } = await supabase.rpc("get_detalle_productora", {
      p_id: id,
      p_evento: eventoId
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Detalle no encontrado" });
    }

    res.json(data[0]);

  } catch (error) {
    res.status(500).json({ error: "Error en servidor" });
  }
});


app.post("/contacto", async (req, res) => {
  try {
    const { nombre, email, mensaje } = req.body;

    if (!nombre || !email || !mensaje) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const { data, error } = await supabase.rpc("insert_contacto", {
      p_nombre: nombre,
      p_email: email,
      p_mensaje: mensaje
    });

    if (error) throw error;

    res.json({ ok: true, data });

  } catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
});



app.get("/eventos/buscar", async (req, res) => {
  try {
    const q = typeof req.query.q === "string"
      ? req.query.q.trim()
      : "";

    if (!q) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from("cat_events")
      .select("id, name, city, date, price, image, id_productora")
      .ilike("name", `%${q}%`)
      .limit(30);

    if (error) {
      console.error("[Cosmic Pass] Error buscando eventos:", error);
      return res.status(500).json({ error: "Error al buscar eventos" });
    }

    return res.json(data || []);
  } catch (error) {
    console.error("[Cosmic Pass] Error inesperado:", error);
    return res.status(500).json({ error: "Error al buscar eventos" });
  }
});


app.get("/productoras/:id/features", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const { data, error } = await supabase.rpc("get_productora_features", {
      p_id: id
    });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: "Error en servidor" });
  }
});

app.get("/eventos/:id/tickets", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { data, error } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("id_evento", id)
      .eq("ind_activo", 1)
      .order("precio", { ascending: true });

    if (error) throw error;

    res.json(data);

  } catch (error) {

    res.status(500).json({
      error: "Error en servidor"
    });
  }
});


app.post("/crear-ticket-gratis", async (req, res) => {
  try {
    const { ticket_id, cantidad = 1, nombre, correo, telefono } = req.body;
    const correoNormalizado =
  String(correo || "")
    .trim()
    .toLowerCase();

const telefonoNormalizado =
  String(telefono || "")
    .replace(/\D/g, "");

  if (
  !ticket_id ||
  !nombre ||
  !correoNormalizado ||
  !telefonoNormalizado
) {
      return res.status(400).json({
        success:false,
        error:"Faltan datos obligatorios"
      });
    }

    const { data: ticket, error } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("id", ticket_id)
      .eq("ind_activo", 1)
      .single();

    if (error || !ticket) {
      return res.status(404).json({
        success:false,
        error:"Ticket no encontrado"
      });
    }

    if (Number(ticket.precio) !== 0) {
      return res.status(400).json({
        success:false,
        error:"Este ticket no es gratuito"
      });
    }

  const { data: evento, error: eventoError } = await supabase
  .from("cat_events")
  .select(`
    name,
    city,
    date,
    image
  `)
  .eq("id", ticket.id_evento)
  .single();

if (eventoError || !evento) {
  return res.status(404).json({
    success:false,
    error:"Evento no encontrado"
  });
}

    if (ticket.stock_disponible !== null && ticket.stock_disponible < Number(cantidad)) {
      return res.status(400).json({
        success:false,
        error:"Stock insuficiente"
      });
    }

    const ticketToken = crypto.randomUUID();

    const qrImage = await QRCode.toDataURL(ticketToken, {
                                                          width:300,
                                                          margin:2,
                                                          errorCorrectionLevel:"H"
                                                        });


    const pdfBuffer = await generarBoletoPDF({
      evento,
      nombre,
      tipoTicket: ticket.tipo_ticket,
      fechaFin: ticket.fecha_fin,
      ticketToken,
      qrImage
    });

const { error: insertError } = await supabase
  .from("tickets")
  .insert([{
    evento_id:        ticket.id_evento,
    nombre_cliente:   nombre,
    correo:           correoNormalizado,
    telefono:         telefonoNormalizado,
    cantidad:         1,
    monto:            0,
    tipo_ticket:      null,
    metodo_pago:      null,
    payment_id:       null,
    payment_status:  "free",
    fecha_pago:       null,
    ticket_type_id:   ticket.id,
    ticket_token:     ticketToken
  }]);

if (insertError) {
  return res.status(500).json({
    success: false,
    error: insertError.message
  });
}

    await supabase.rpc("descontar_stock", {
      p_ticket_id:ticket.id,
      p_cantidad:1
    });

    try {
await transporter.sendMail({

  from: '"Cosmic Pass" <cosmicpass0484@gmail.com>',

  to: correo,

  subject: `¡Tus boletos están listos! 🎟️`,

  html: `
<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="
  margin:0;
  padding:0;
  background:#f4f5f8;
  font-family:Arial,Helvetica,sans-serif;
  color:#222;
">

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="background:#f4f5f8;"
>

<tr>

<td
  align="center"
  style="padding:30px 15px;"
>

<!-- TARJETA -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    max-width:520px;
    background:#ffffff;
  "
>

<!-- LOGO / MARCA -->

<tr>

<td
  align="center"
  style="padding:28px 20px 15px;"
>

<div style="
  font-size:22px;
  font-weight:bold;
  letter-spacing:1px;
  color:#111111;
">
  COSMIC PASS
</div>

</td>

</tr>


<!-- CONTENIDO -->

<tr>

<td
  style="
    padding:10px 32px 30px;
  "
>

<h1 style="
  margin:0 0 20px;
  font-size:20px;
  line-height:1.4;
  color:#111111;
">

¡Tus boletos están listos ${nombre}!

</h1>


<p style="
  margin:0 0 18px;
  font-size:14px;
  line-height:1.6;
  color:#444444;
">

Ya está lista tu entrada para
<strong>${evento.name}</strong>.

</p>


<p style="
  margin:0 0 18px;
  font-size:14px;
  line-height:1.6;
  color:#444444;
">

Adjunto encontrarás tu boleto en formato PDF.
Puedes descargarlo y mostrarlo desde tu teléfono
el día del evento.

</p>


<p style="
  margin:0 0 20px;
  font-size:13px;
  line-height:1.6;
  color:#e11d48;
  font-weight:bold;
">

⚠️ Recuerda que el boleto es único e intransferible.
No compartas el código QR en redes sociales ni con terceros.

</p>


<!-- INFORMACIÓN -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    background:#f7f7f7;
    padding:15px;
    margin-bottom:20px;
  "
>

<tr>

<td style="
  padding:8px 12px;
  font-size:13px;
  color:#333333;
">

<strong>Evento:</strong>
${evento.name}

</td>

</tr>


<tr>

<td style="
  padding:8px 12px;
  font-size:13px;
  color:#333333;
">

<strong>Fecha:</strong>
${evento.date || "Por confirmar"}

</td>

</tr>


<tr>

<td style="
  padding:8px 12px;
  font-size:13px;
  color:#333333;
">

<strong>Lugar:</strong>
${evento.city || "Por confirmar"}

</td>

</tr>


<tr>

<td style="
  padding:8px 12px;
  font-size:13px;
  color:#333333;
">

<strong>Acceso:</strong>
${ticket.tipo_ticket}

</td>

</tr>

</table>


<p style="
  margin:0;
  font-size:13px;
  line-height:1.6;
  color:#444444;
">

¡Esperamos verte en el evento y que disfrutes
de una experiencia increíble! 🚀

</p>

</td>

</tr>


<!-- SEPARADOR -->

<tr>

<td style="padding:0 32px;">

<div style="
  border-top:1px solid #eeeeee;
"></div>

</td>

</tr>


<!-- CONTACTO -->

<tr>

<td
  align="center"
  style="
    padding:22px 32px 28px;
  "
>

<p style="
  margin:0 0 8px;
  font-size:11px;
  line-height:1.5;
  color:#999999;
">

Si tienes algún problema con tu boleto,
contáctanos por WhatsApp.

</p>


<p style="
  margin:0;
  font-size:11px;
  color:#999999;
">

WhatsApp:
<strong>5580761435</strong>

</p>

</td>

</tr>

</table>


<!-- FOOTER -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="max-width:520px;"
>

<tr>

<td
  align="center"
  style="padding:20px 10px;"
>

<div style="
  font-size:12px;
  font-weight:bold;
  letter-spacing:1px;
  color:#555555;
">
 </div>


<p style="
  margin:6px 0 0;
  font-size:10px;
  color:#999999;
">

© 2026 Cosmic Pass

</p>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>
</html>
`,

  attachments: [

    {
      filename: `Boleto-${evento.name}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf"
    }

  ]

});
    } 
    catch (mailError) {
      console.error("ERROR ENVIANDO CORREO FREE ACCESS:", mailError);
    }

    res.json({
      success:true,
      message:"Acceso gratuito generado correctamente"
    });

  } catch (err) {
    res.status(500).json({
      success:false,
      error:err.message
    });
  }
});

app.post("/crear-pago-ticket", async (req, res) => {
  try {

const {
  ticket_id,
  cantidad = 1,
  nombre,
  correo,
  telefono
} = req.body;

    if (!ticket_id) {
      return res.status(400).json({
        error: "ticket_id es requerido"
      });
    }

const { data: ticket, error } = await supabase
  .from("ticket_types")
  .select(`
        id,
        id_productora,
        tipo_ticket,
        precio,
        stock_disponible,
        fecha_inicio,
        fecha_fin,
        ind_activo
  `)
  .eq("id", ticket_id)
  .eq("ind_activo", 1)
  .single();

  const { data: productora, error: errorProductora } =
await supabase
    .from("cat_productoras")
    .select("mp_access_token")
    .eq("id", ticket.id_productora)
    .single();

if (errorProductora || !productora?.mp_access_token) {
    return res.status(400).json({
        error: "La productora no tiene Mercado Pago conectado."
    });
}

    if (error || !ticket) {
      return res.status(404).json({
        error: "Ticket no encontrado"
      });
    }

    const ahora = new Date();

    if (
      ticket.fecha_inicio &&
      new Date(ticket.fecha_inicio) > ahora
    ) {
      return res.status(400).json({
        error: "Este ticket aún no está disponible"
      });
    }

    if (
      ticket.fecha_fin &&
      new Date(ticket.fecha_fin) < ahora
    ) {
      return res.status(400).json({
        error: "Este ticket ya expiró"
      });
    }

    if (
      ticket.stock_disponible !== null &&
      ticket.stock_disponible <= 0
    ) {
      return res.status(400).json({
        error: "Boletos agotados"
      });
    }

const mpClientProductora = new MercadoPagoConfig({ accessToken: productora.mp_access_token });
const preference = new Preference(mpClientProductora);    const result = await preference.create({

      body: {
       items: [
  {
    title: ticket.tipo_ticket,
    quantity: Number(cantidad),
    unit_price: Number(ticket.precio),
    currency_id: "MXN"
  }
],
metadata: {
  nombre,
  correo,
  telefono
},
notification_url:
  "https://www.cosmicpass.space/webhook-mp",
back_urls: {
  success: "https://www.cosmicpass.space/successful.html",
  failure: "https://www.cosmicpass.space/error.html",
  pending: "https://www.cosmicpass.space"
},
auto_return: "approved",
external_reference: JSON.stringify({
    ticket_id: ticket.id,
    productora_id: ticket.id_productora
})
      }

    });

    res.json({
      success: true,
      init_point: result.init_point
    });

  } catch (err) {

    console.error("MP ERROR:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post("/webhook-mp", async (req, res) => {
  try {

    if ((req.body.type || req.body.topic) !== "payment") {
      return res.sendStatus(200);
    }

    const paymentId =
      req.body.data?.id ||
      req.body.resource;

    if (!paymentId) {
      return res.sendStatus(200);
    }

    if (!req.body.user_id) {
      return res.sendStatus(200);
    }

    const {
      data: productora,
      error: productoraError
    } = await supabase
      .from("cat_productoras")
      .select(`
        id,
        name,
        mp_user_id,
        mp_access_token
      `)
      .eq("mp_user_id", String(req.body.user_id))
      .single();

    if (productoraError || !productora) {
      console.error("PRODUCTORA NO ENCONTRADA");
      return res.sendStatus(200);
    }

    const mpClientProductora =
      new MercadoPagoConfig({
        accessToken: productora.mp_access_token
      });

    const payment = new Payment(mpClientProductora);
    const pago    = await payment.get({ id: paymentId});

    if (pago.status !== "approved") {
      return res.sendStatus(200);
    }

    const { data: existe } =
      await supabase
        .from("tickets")
        .select("id")
        .eq("payment_id", String(pago.id))
        .maybeSingle();

    if (existe) {
      return res.sendStatus(200);
    }

    const reference = JSON.parse(pago.external_reference);
    const ticketId = Number(reference.ticket_id);

    const cantidad =
      Number(
        pago.additional_info?.items?.[0]?.quantity || 1
      );

    // Obtener información del ticket
    const {
      data: ticketInfo,
      error: ticketError
    } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticketInfo) {
      console.error("ERROR TICKET:");
      console.error(ticketError);
      return res.sendStatus(200);
    }

    /* tt */

    const {
  data: evento,
  error: eventoError
} = await supabase
  .from("cat_events")
  .select(`
    name,
    city,
    date
  `)
  .eq("id", ticketInfo.id_evento)
  .single();

if (eventoError || !evento) {
  console.error("ERROR OBTENIENDO EVENTO:");
  console.error(eventoError);
  return res.sendStatus(200);
}


/* TT */

    const ticketToken = crypto.randomUUID();

    const { error: insertError } =
      await supabase
        .from("tickets")
        .insert([{
          evento_id: ticketInfo.id_evento,
          nombre_cliente: pago.metadata?.nombre || "Cliente Mercado Pago",
          correo: pago.metadata?.correo || pago.payer?.email || null,
          telefono: pago.metadata?.telefono || null, cantidad,
          monto: pago.transaction_amount,
          metodo_pago: "MERCADO_PAGO",
          payment_id: String(pago.id),
          payment_status: pago.status,
          fecha_pago: new Date(),
          ticket_type_id: ticketInfo.id,
          ticket_token: ticketToken
                }]);

    if (insertError) {
      console.error("ERROR INSERTANDO TICKET:");
      console.error(insertError);
      return res.sendStatus(200);
    }

    await supabase.rpc(
      "descontar_stock",
      {
        p_ticket_id: ticketInfo.id,
        p_cantidad: cantidad
      }
    );

    return res.sendStatus(200);

  } catch (err) {

    console.error("ERROR WEBHOOK MP:");
    console.error(err);
    return res.sendStatus(200);

  }
});


/* =========================================
   ESTACIONAMIENTO COSMIC PASS
========================================= */

// Eventos disponibles para la productora de la sesión.
app.get("/admin/parking/eventos", requerirSesion, async (req, res) => {
  try {
    const idProductora = Number(req.usuario.id_productora);

    if (!idProductora) {
      return res.status(403).json({
        error: "El usuario no tiene una productora asignada."
      });
    }

    const { data, error } = await supabase.rpc("get_events", {
      p_id_productora: idProductora
    });

    if (error) throw error;

    return res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error cargando eventos de estacionamiento:", error);
    return res.status(500).json({
      error: "No fue posible cargar los eventos."
    });
  }
});


// Configuración de capacidad del evento.
app.get("/admin/parking/config", requerirSesion, async (req, res) => {
  try {
    const idProductora = Number(req.usuario.id_productora);
    const idEvento = Number(req.query.id_evento);

    if (!idProductora || !idEvento) {
      return res.status(400).json({
        error: "Productora o evento inválido."
      });
    }

    const { data, error } = await supabase
      .from("parking_config")
      .select("id, id_productora, id_evento, capacidad_total, activo")
      .eq("id_productora", idProductora)
      .eq("id_evento", idEvento)
      .eq("activo", true)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error: "Este evento no tiene una configuración activa de estacionamiento."
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("Error consultando configuración de estacionamiento:", error);
    return res.status(500).json({
      error: "No fue posible consultar la capacidad."
    });
  }
});


// Listado de vehículos e historial del evento.
app.get("/admin/parking/registros", requerirSesion, async (req, res) => {
  try {
    const idProductora = Number(req.usuario.id_productora);
    const idEvento = Number(req.query.id_evento);

    if (!idProductora || !idEvento) {
      return res.status(400).json({
        error: "Productora o evento inválido."
      });
    }

    const { data: config, error: errorConfig } = await supabase
      .from("parking_config")
      .select("id")
      .eq("id_productora", idProductora)
      .eq("id_evento", idEvento)
      .eq("activo", true)
      .maybeSingle();

    if (errorConfig) throw errorConfig;

    if (!config) {
      return res.status(404).json({
        error: "El evento no tiene estacionamiento activo."
      });
    }

    const { data, error } = await supabase
      .from("parking_registros")
      .select("*")
      .eq("id_productora", idProductora)
      .eq("id_evento", idEvento)
      .order("fecha_entrada", { ascending: false });

    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    console.error("Error cargando registros de estacionamiento:", error);
    return res.status(500).json({
      error: "No fue posible cargar los vehículos."
    });
  }
});


// Registrar entrada.
app.post("/admin/parking/entrada", requerirSesion, async (req, res) => {
  try {
    const idProductora = Number(req.usuario.id_productora);
    const idEvento = Number(req.body.id_evento);
    const placa = String(req.body.placa || "").trim().toUpperCase();
    const vehiculo = String(req.body.vehiculo || "").trim();
    const color = String(req.body.color || "").trim();
    const espacio = String(req.body.espacio || "").trim();

    if (!idProductora || !idEvento || !placa) {
      return res.status(400).json({
        error: "Evento y placa son obligatorios."
      });
    }

    const { data: config, error: errorConfig } = await supabase
      .from("parking_config")
      .select("capacidad_total")
      .eq("id_productora", idProductora)
      .eq("id_evento", idEvento)
      .eq("activo", true)
      .maybeSingle();

    if (errorConfig) throw errorConfig;

    if (!config) {
      return res.status(404).json({
        error: "El estacionamiento no está activo para este evento."
      });
    }

    // Evitar registrar dos veces una placa que sigue dentro.
    const { data: duplicado, error: errorDuplicado } = await supabase
      .from("parking_registros")
      .select("id")
      .eq("id_productora", idProductora)
      .eq("id_evento", idEvento)
      .ilike("placa", placa)
      .eq("estado", "dentro")
      .limit(1);

    if (errorDuplicado) throw errorDuplicado;

    if (duplicado && duplicado.length) {
      return res.status(409).json({
        error: "Esta placa ya tiene una entrada activa."
      });
    }

    // Contar vehículos que siguen dentro.
    const { data: dentro, error: errorDentro } = await supabase
      .from("parking_registros")
      .select("id")
      .eq("id_productora", idProductora)
      .eq("id_evento", idEvento)
      .eq("estado", "dentro");

    if (errorDentro) throw errorDentro;

    if ((dentro || []).length >= Number(config.capacidad_total)) {
      return res.status(409).json({
        error: "El estacionamiento está lleno."
      });
    }

    const { data, error } = await supabase
      .from("parking_registros")
      .insert({
        id_productora: idProductora,
        id_evento: idEvento,
        placa,
        vehiculo: vehiculo || null,
        color: color || null,
        espacio: espacio || null,
        fecha_entrada: new Date().toISOString(),
        fecha_salida: null,
        estado: "dentro",
        registrado_por: req.usuario.id
      })
      .select("*")
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      registro: data
    });
  } catch (error) {
    console.error("Error registrando entrada:", error);
    return res.status(500).json({
      error: "No fue posible registrar la entrada."
    });
  }
});


// Registrar salida.
app.post("/admin/parking/salida", requerirSesion, async (req, res) => {
  try {
    const idProductora = Number(req.usuario.id_productora);
    const idEvento = Number(req.body.id_evento);
    const idRegistro = Number(req.body.id);

    if (!idProductora || !idEvento || !idRegistro) {
      return res.status(400).json({
        error: "Los datos de salida son inválidos."
      });
    }

    const { data: config, error: errorConfig } = await supabase
      .from("parking_config")
      .select("id")
      .eq("id_productora", idProductora)
      .eq("id_evento", idEvento)
      .eq("activo", true)
      .maybeSingle();

    if (errorConfig) throw errorConfig;

    if (!config) {
      return res.status(404).json({
        error: "El estacionamiento no está activo."
      });
    }

    const { data, error } = await supabase
      .from("parking_registros")
      .update({
        fecha_salida: new Date().toISOString(),
        estado: "salio"
      })
      .eq("id", idRegistro)
      .eq("id_productora", idProductora)
      .eq("id_evento", idEvento)
      .eq("estado", "dentro")
      .select("*")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error: "El vehículo no existe o ya registró su salida."
      });
    }

    return res.json({
      success: true,
      registro: data
    });
  } catch (error) {
    console.error("Error registrando salida:", error);
    return res.status(500).json({
      error: "No fue posible registrar la salida."
    });
  }
});


module.exports = app;