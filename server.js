let cacheEventos = {};
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
const HOST = "0.0.0.0";
const PORT = process.env.PORT || 3000;
const app = express();
const QRCode = require("qrcode");
const crypto = require("crypto");


app.use(cors());
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

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_TOKEN
});

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

  console.log(
    "PAGO YA REGISTRADO"
  );

  return res.json({
    received: true
  });

}

        console.log(
  "PAGO OK",
  session.metadata
);

const ticketToken =
  crypto.randomUUID();

const folio =
  `CP-${Date.now()}`;

const { error } =
  await supabase
    .from("tickets")
    .insert([{

      evento_id:
        Number(
          session.metadata.evento_id
        ),

      nombre_cliente:
        session.customer_details?.name ||
        "Cliente Stripe",

     correo:
  session.customer_details?.email ||
  null,

telefono:
  session.customer_details?.phone ||
  null,

      cantidad:
        Number(
          session.metadata.cantidad
        ),

      monto:
        session.amount_total / 100,

      metodo_pago:
        "STRIPE",

      payment_id:
        session.payment_intent,

      payment_status:
        "paid",

      fecha_pago:
        new Date(),

      estatus:
        "pendiente",

      ticket_type_id:
        Number(
          session.metadata.ticket_id
        ),

      ticket_token:
        ticketToken,

      folio:
        folio

    }]);

if (error) {
  console.error(
    "ERROR INSERT TICKET:",
    error
  );
} else {
  console.log(
    "TICKET GUARDADO"
  );

  console.log(
  "DESCONTAR STOCK",
  {
    ticket_id: Number(
      session.metadata.ticket_id
    ),
    cantidad: Number(
      session.metadata.cantidad
    ),
    metadata: session.metadata
  }
);

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

console.log(
  "RPC RESULT:",
  JSON.stringify(
    rpcResult,
    null,
    2
  )
);

const {
  data: nuevoStock,
  error: stockError
} = rpcResult;

if (stockError) {

  console.error(
    "ERROR STOCK:",
    stockError
  );

} else {

  console.log(
    "STOCK ACTUALIZADO:",
    nuevoStock
  );

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

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const supabase = createClient(
  "https://uqrbykxgsarsfyyvmibr.supabase.co",
   process.env.SUPABASE_SECRET_KEY
);

app.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body;

    if (!user || !password) {
      return res.status(400).json({
        success: false,
        error: "Usuario y contraseña requeridos"
      });
    }

    const { data, error } = await supabase
      .from("cosmic_usuarios")
      .select("id,nombre,usuario,rol,activo,id_productora")
      .eq("usuario", user)
      .eq("password", password)
      .eq("activo", true)
      .maybeSingle();

    if (error || !data) {
      return res.status(401).json({
        success: false,
        error: "Credenciales incorrectas"
      });
    }

    res.json({
      success: true,
      user: {
        id:       data.id,
        nombre:   data.nombre || data.usuario,
        usuario:  data.usuario,
        rol:      data.rol || "admin",
         id_productora: data.id_productora
      }
    });

  } catch (err) {
    console.error("ERROR LOGIN:", err);

    res.status(500).json({
      success: false,
      error: "Error en servidor"
    });
  }
});


app.get("/admin/dashboard", async (req, res) => {
  try {
    const idProductora = req.query.id_productora
      ? Number(req.query.id_productora)
      : null;

    if (
      req.query.id_productora &&
      (!Number.isInteger(idProductora) || idProductora <= 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "id_productora inválido"
      });
    }

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
                eventos: Number(metricas.eventos || 0),
                emitidos: Number(metricas.emitidos || 0),
                asignados: Number(metricas.asignados || 0),
                tickets: Number(metricas.tickets || 0),
                disponibles: Number(metricas.disponibles || 0),
                cortesias: Number(metricas.cortesias || 0),
                ingresos: Number(metricas.ingresos || 0),
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

/*
app.get("/admin/dashboard", async (req, res) => {
  try {
    const idProductora = req.query.id_productora
      ? Number(req.query.id_productora)
      : null;

  let eventosQuery = supabase
  .from("cat_events")
  .select("id", { count: "exact", head: true });

let ticketsQuery = supabase
  .from("tickets")
  .select("cantidad,evento_id");

let ventasQuery = supabase
  .from("tickets")
  .select("monto,payment_status,evento_id");

let cortesiasQuery = supabase
  .from("tickets")
  .select("cantidad,evento_id")
  .or("metodo_pago.eq.FREE_ACCESS,payment_status.eq.free");

  let stockQuery = supabase
  .from("ticket_types")
  .select("stock_disponible,id_evento")
  .eq("precio", 0)
  .eq("ind_activo", 1);

let productorasQuery = supabase
  .from("cat_productoras")
  .select("id", { count: "exact", head: true });
    if (idProductora) {
      eventosQuery = eventosQuery.eq("id_productora", idProductora);

      const { data: eventosProductora, error: eventosError } =
        await supabase
          .from("cat_events")
          .select("id")
          .eq("id_productora", idProductora);

      if (eventosError) throw eventosError;

      const eventosIds = eventosProductora.map(e => e.id);

      if (eventosIds.length === 0) {
        return res.json({
          success: true,
          scope: "productora",
          id_productora: idProductora,
          metricas: {
  eventos: 0,
  tickets: 0,
  disponibles: 0,
  ingresos: 0,
  cortesias: 0,
  productoras: 1
}
        });
      }

ticketsQuery = ticketsQuery.in("evento_id", eventosIds);
ventasQuery = ventasQuery.in("evento_id", eventosIds);
cortesiasQuery = cortesiasQuery.in("evento_id", eventosIds);
stockQuery = stockQuery.in("id_evento", eventosIds);
productorasQuery = productorasQuery.eq("id", idProductora);
    }

const [
  eventosResult,
  ticketsResult,
  ventasResult,
  cortesiasResult,
  stockResult,
  productorasResult
] = await Promise.all([
  eventosQuery,
  ticketsQuery,
  ventasQuery,
  cortesiasQuery,
  stockQuery,
  productorasQuery
]);

if (eventosResult.error) throw eventosResult.error;
if (ticketsResult.error) throw ticketsResult.error;
if (ventasResult.error) throw ventasResult.error;
if (cortesiasResult.error) throw cortesiasResult.error;
if (productorasResult.error) throw productorasResult.error;
if (stockResult.error) throw stockResult.error;

    const ingresos = (ventasResult.data || [])
      .filter(t =>
        t.payment_status === "paid" ||
        t.payment_status === "approved" ||
        t.payment_status === "free"
      )
      .reduce((total, t) => total + Number(t.monto || 0), 0);

  const ticketsEntregados =
    (ticketsResult.data || []).reduce(
      (total, ticket) =>
        total + Number(ticket.cantidad || 1),
      0
    );

  const cortesiasGeneradas =
    (cortesiasResult.data || []).reduce(
      (total, ticket) =>
        total + Number(ticket.cantidad || 1),
      0
    );

    const accesosDisponibles =
  (stockResult.data || []).reduce(
    (total, ticket) =>
      total + Number(ticket.stock_disponible || 0),
    0
  );
    
    res.json({
      success: true,
      scope: idProductora ? "productora" : "admin",
      id_productora: idProductora,
      metricas: {
  eventos: eventosResult.count || 0,
  tickets: ticketsEntregados,
  disponibles: accesosDisponibles,
  ingresos,
  cortesias: cortesiasGeneradas,
  productoras: productorasResult.count || 0
}
    });

  } catch (error) {
    console.error("ERROR /admin/dashboard:", error);

    res.status(500).json({
      success: false,
      error: "Error cargando dashboard"
    });
  }
});
*/

app.post("/admin/activar-cortesias", async (req, res) => {
  try {
    const {
      id_productora,
      evento_id,
      cantidad
    } = req.body;

    const idProductora = Number(id_productora);
    const eventoId = Number(evento_id);
    const cantidadAgregar = Number(cantidad);

    if (
      !idProductora ||
      !eventoId ||
      !Number.isInteger(cantidadAgregar) ||
      cantidadAgregar <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos"
      });
    }

    const { data: ticket, error: ticketError } =
      await supabase
        .from("ticket_types")
        .select(`
          id,
          id_evento,
          id_productora,
          precio,
          stock_disponible
        `)
        .eq("id_evento", eventoId)
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
        error: "Este evento no tiene un acceso gratuito configurado"
      });
    }

    const nuevoStock =
      Number(ticket.stock_disponible || 0) +
      cantidadAgregar;

    const { error: updateError } =
      await supabase
        .from("ticket_types")
        .update({
          stock_disponible: nuevoStock
        })
        .eq("id", ticket.id);

    if (updateError) {
      throw updateError;
    }

    return res.json({
      success: true,
      message: `${cantidadAgregar} cortesías activadas correctamente`
    });

  } catch (error) {
    console.error("ERROR ACTIVANDO CORTESÍAS:", error);

    return res.status(500).json({
      success: false,
      error: "No se pudieron activar las cortesías"
    });
  }
});

app.post("/stripe/connect/:productoraId", async (req, res) => {
  try {
    const { productoraId } = req.params;

    const account = await stripe.accounts.create({
      type: "standard"
    });

    const { error } = await supabase
      .from("cat_productoras")
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_complete: false
      })
      .eq("id", productoraId);

    if (error) {
      throw error;
    }

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `https://www.cosmicpass.space/productora.html?id=${productoraId}`,
      return_url: `https://www.cosmicpass.space/productora.html?id=${productoraId}`,
      type: "account_onboarding"
    });

    res.json({
      success: true,
      url: accountLink.url,
      stripe_account_id: account.id
    });

  } catch (error) {
    console.error("ERROR STRIPE CONNECT:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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


app.get("/events", async (req, res) => {
  try {

    const { id_productora } = req.query;
    const key = id_productora || "all"; // 👈 clave única

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
    const folio = `CP-${Date.now()}`;
    const qrImage = await QRCode.toDataURL(ticketToken, {
      width:300,
      margin:2,
      errorCorrectionLevel:"H"
    });

    const { error: insertError } = await supabase
      .from("tickets")
      .insert([{
        evento_id:ticket.id_evento,
        nombre_cliente:nombre,
        correo,
        telefono,
        cantidad:1,
        monto:0,
        metodo_pago:"FREE_ACCESS",
        payment_id:null,
        payment_status:"free",
        fecha_pago:new Date(),
        estatus:"pendiente",
        ticket_type_id:ticket.id,
        ticket_token:ticketToken,
        folio
      }]);

    if (insertError) {
      return res.status(500).json({
        success:false,
        error:insertError.message
      });
    }

    await supabase.rpc("descontar_stock", {
      p_ticket_id:ticket.id,
      p_cantidad:1
    });

    try {
      await transporter.sendMail({
        from:'"Cosmic Pass" <cosmicpass0484@gmail.com>',
        to:correo,
        subject:"Tu acceso Cosmic Pass 🎟️",
       html:`
  <div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:24px;">
    <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;">
      
      <img src="${evento.image}" style="width:100%;display:block;" />

      <div style="padding:24px;">
        <h1 style="margin:0 0 10px;">🎉 Tu acceso está listo</h1>

        <h2 style="margin:0 0 16px;color:#111;">
          ${evento.name}
        </h2>

        <p><strong>📍 Lugar:</strong> ${evento.city || "Por confirmar"}</p>
        <p><strong>📅 Fecha:</strong> ${evento.date || "Por confirmar"}</p>

        <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;" />

        <p><strong>👤 Nombre:</strong> ${nombre}</p>
        <p><strong>🎟️ Tipo de acceso:</strong> ${ticket.tipo_ticket}</p>
        <p><strong>🔖 Folio:</strong> ${folio}</p>

        <div style="text-align:center;margin:28px 0;">
          <p><strong>Presenta este QR en el acceso:</strong></p>
          <img src="cid:ticketqr" width="260" />
        </div>

        <p style="font-size:14px;color:#555;">
          Este QR es único y válido para un solo ingreso. No lo compartas con terceros.
        </p>

        <p style="margin-top:24px;">
          Gracias por usar <strong>Cosmic Pass</strong> 🚀
        </p>
      </div>

    </div>
  </div>
`,
        attachments:[
          {
            filename:"ticket-qr.png",
            content:qrImage.split("base64,")[1],
            encoding:"base64",
            cid:"ticketqr"
          }
        ]
      });
    } catch (mailError) {
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

console.log(
  "DATOS CLIENTE MP:",
  {
    nombre,
    correo,
    telefono
  }
);


    if (!ticket_id) {
      return res.status(400).json({
        error: "ticket_id es requerido"
      });
    }

    const { data: ticket, error } = await supabase
      .from("ticket_types")
      .select(`
        id,
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

    const preference = new Preference(mpClient);

    const result = await preference.create({

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
  success: "https://www.cosmicpass.space",
  failure: "https://www.cosmicpass.space",
  pending: "https://www.cosmicpass.space"
},

auto_return: "approved",

external_reference: String(ticket.id)
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

    console.log(
      "MP WEBHOOK:",
      JSON.stringify(req.body, null, 2)
    );

 console.log(
  "BODY COMPLETO:",
  JSON.stringify(req.body, null, 2)
);

if (
  (req.body.type || req.body.topic)
  !== "payment"
) {

  console.log(
    "WEBHOOK IGNORADO:",
    req.body.type ||
    req.body.topic
  );

  return res.sendStatus(200);

}

const paymentId =
  req.body.data?.id ||
  req.body.resource;

console.log(
  "TIPO:",
  req.body.type || req.body.topic
);

console.log(
  "RESOURCE:",
  req.body.resource
);

console.log(
  "DATA:",
  req.body.data
);

    console.log(
      "PAYMENT ID:",
      paymentId
    );

    if (!paymentId) {
      return res.sendStatus(200);
    }

    const payment =
      new Payment(mpClient);

    const pago =
  await payment.get({
    id: paymentId
  });



      const { data: existe } =
  await supabase
    .from("tickets")
    .select("id")
    .eq("payment_id", String(pago.id))
    .maybeSingle();

if (existe) {
  return res.sendStatus(200);
}

if (pago.status !== "approved") {
  return res.sendStatus(200);
}

const ticketId =
  Number(pago.external_reference);

const cantidad =
  Number(
    pago.additional_info?.items?.[0]?.quantity || 1
  );

const { data: ticketInfo, error: ticketError } =
  await supabase
    .from("ticket_types")
    .select("*")
    .eq("id", ticketId)
    .single();

if (ticketError || !ticketInfo) {

  console.error(
    "TICKET NO ENCONTRADO",
    ticketError
  );

  return res.sendStatus(200);
}

const ticketToken =
  crypto.randomUUID();

const folio =
  `CP-${Date.now()}`;

const { error: insertError } =
  await supabase
    .from("tickets")
    .insert([{

      evento_id:
        ticketInfo.id_evento,

     nombre_cliente:
  pago.metadata?.nombre || "Cliente Mercado Pago",

correo:
  pago.metadata?.correo ||
  pago.payer?.email ||
  null,

telefono:
  pago.metadata?.telefono || null,

      cantidad:
        cantidad,

      monto:
        pago.transaction_amount,

      metodo_pago:
        "MERCADO_PAGO",

      payment_id:
        String(pago.id),

      payment_status:
        pago.status,

      fecha_pago:
        new Date(),

      estatus:
        "pendiente",

      ticket_type_id:
        ticketInfo.id,

      ticket_token:
        ticketToken,

      folio:
        folio

    }]);

    if (!insertError) {

  await supabase.rpc(
    "descontar_stock",
    {
      p_ticket_id: ticketInfo.id,
      p_cantidad: cantidad
    }
  );

  console.log(
    "TICKET MP GUARDADO"
  );

}

if (insertError) {

  console.error(
    "ERROR INSERT MP:",
    JSON.stringify(
      insertError,
      null,
      2
    )
  );

  return res.sendStatus(200);

}

console.log(
  "TICKET MP GUARDADO"
);
    res.sendStatus(200);

  } catch (err) {

    console.error(
      "ERROR WEBHOOK MP:",
      err
    );

    res.sendStatus(200);

  }

});


module.exports = app;