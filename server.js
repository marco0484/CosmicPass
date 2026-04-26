let cacheEventos = {};
let cacheTime = null;
const express = require("express");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "a93c19001@smtp-brevo.com",
    pass: "0zs3CKam7TRwvd9H"
  }
});
const { createClient } = require("@supabase/supabase-js");
const HOST = "0.0.0.0";
const PORT = process.env.PORT || 3000;
const app = express();

const QRCode = require("qrcode");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const supabase = createClient(
  "https://uqrbykxgsarsfyyvmibr.supabase.co",
  "sb_publishable_8K6sVOFwsLbVOUGUr6a-5A_ldVlLQxu" // ⚠️
);

app.get("/productora-full/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

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

    if (prod.error) throw prod.error;
    if (eventos.error) throw eventos.error;
    if (features.error) throw features.error;

    res.json({
      productora: prod.data?.[0] || null,
      eventos: eventos.data || [],
      features: features.data || []
    });

  } catch (error) {
    //console.error("Error en /productora-full:", error);
    res.status(500).json({
      error: "Error en servidor"
    });
  }
});


app.get("/events", async (req, res) => {
  try {

    const { id_productora } = req.query;
    const key = id_productora || "all"; // 👈 clave única

    const now = Date.now();

    // ⏱️ 5 minutos cache
    if (
      cacheEventos[key] &&
      (now - cacheEventos[key].time < 300000)
    ) {
      //console.log("⚡ cache backend:", key);
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
    const { q } = req.query;

    const { data, error } = await supabase
      .from("cat_events")
      .select("*")
      .ilike("name", `%${q}%`);

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).send("Error");
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

/*
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
*/
  const { data, error } = await supabase.rpc(
  "get_ticket_types_by_event",
  {
    p_event_id: id
  }
);

app.post("/api/create-ticket", async (req, res) => {
  try {
    const {
      evento_id,
      nombre,
      email,
      telefono
    } = req.body;

    if (!evento_id || !nombre || !email || !telefono) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios"
      });
    }

    const folio = `CP-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const ticketToken = `TK-${Date.now()}-${Math.random().toString(36).substring(2, 12)}`;
    const qrContent = ticketToken;
    const qrImage = await QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "H"
    });

   const { data, error } = await supabase.rpc(
  "create_free_ticket",
  {
    p_evento_id: evento_id,
    p_nombre: nombre,
    p_email: email,
    p_telefono: telefono,
    p_folio: folio,
    p_ticket_token: ticketToken,
    p_qr_code: qrImage
  }
);

    if (error) throw error;

    const { data: eventoData, error: eventoError } = await supabase
      .from("cat_events")
      .select(`
        name,
        city,
        date,
        image,
        price
      `)
      .eq("id", evento_id)
      .single();

    if (eventoError) throw eventoError;

    try {
  await transporter.sendMail({
  from: '"Cosmic Pass" <cosmicpass0484@gmail.com>',
  to: email,
  subject: "Tu Ticket Cosmic Pass 🎟️",

  html: `
    <h1>Tu acceso fue generado correctamente</h1>

    <p><strong>Evento:</strong> ${eventoData.name}</p>
    <p><strong>Ciudad:</strong> ${eventoData.city}</p>
    <p><strong>Fecha:</strong> ${eventoData.date}</p>
    <p><strong>Folio:</strong> ${folio}</p>

    <p>Presenta este QR en acceso:</p>

    <img src="cid:ticketqr" width="250" />

    <p>Gracias por usar Cosmic Pass 🚀</p>
  `,

 attachments: [
  {
    filename: "ticket-qr.png",
    content: qrImage.split("base64,")[1],
    encoding: "base64",
    cid: "ticketqr"
  }
]
});
} catch (mailError) {
  console.error("Error enviando correo:", mailError);
}

    res.json({
      success: true,
      message: "Ticket generado correctamente",
      ticket: {
        ...data[0],
        evento_nombre: eventoData.name,
        lugar: eventoData.city,
        fecha_evento: eventoData.date,
        imagen_evento: eventoData.image,
        precio_evento: eventoData.price
      }
    });

  } catch (error) {
    console.error("ERROR CREATE TICKET:", error);

    res.status(500).json({
      success: false,
      message: error.message,
      detalle: error
    });
  }
});

/*
app.post("/mis-boletos", async (req, res) => {
  try {
    const { email, telefono } = req.body;

    if (!email || !telefono) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos para validar"
      });
    }

    const { data, error } = await supabase
      .from("tickets")
      .select(`
        id,
        nombre_cliente,
        correo,
        telefono,
        tipo_ticket,
        estatus,
        folio,
        ticket_token,
        qr_code,
        created_at
      `)
      .eq("correo", email)
      .like("telefono", `%${telefono}`);

    if (error) {
      console.error("Error Supabase:", error);

      return res.status(500).json({
        success: false,
        message: "Error consultando tus boletos"
      });
    }

    if (!data || data.length === 0) {
      return res.json({
        success: false,
        message: "No encontramos boletos con esos datos"
      });
    }

    return res.json({
      success: true,
      message: "Boletos encontrados",
      tickets: data
    });

  } catch (error) {
    console.error("Error /mis-boletos:", error);

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});
*/
app.post("/mis-boletos", async (req, res) => {
  try {
    const { email, telefono } = req.body;

    if (!email || !telefono) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos para validar"
      });
    }

    const { data, error } = await supabase.rpc(
      "get_user_tickets",
      {
        p_email: email,
        p_phone: telefono
      }
    );

    if (error) {
      console.error("Error Supabase:", error);

      return res.status(500).json({
        success: false,
        message: "Error consultando tus boletos"
      });
    }

    if (!data || data.length === 0) {
      return res.json({
        success: false,
        message: "No encontramos boletos con esos datos"
      });
    }

    return res.json({
      success: true,
      message: "Boletos encontrados",
      tickets: data
    });

  } catch (error) {
    console.error("Error /mis-boletos:", error);

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

module.exports = app;