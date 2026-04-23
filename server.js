

/* local */
/*
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const PORT = 3000;
const HOST = "0.0.0.0";
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "cosmic-event",
  password: "Universo22..",
  port: 5432,
});

app.get("/events", async (req, res) => {
  try {
    const { id_productora } = req.query;

    const id = id_productora ? parseInt(id_productora) : null;

    const result = await pool.query(
      "SELECT * FROM events.get_events($1)",
      [id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Error al obtener eventos:", error);
    res.status(500).json({
      error: "Error en servidor",
      detalle: error.message
    });
  }
});

app.get("/events/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(
      "SELECT * FROM events.get_productora_by_id($1)",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Error al obtener evento:", error);
    res.status(500).json({ error: "Error en servidor" });
  }
});


app.get("/productoras/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(
      "SELECT * FROM events.get_productora_by_id($1)",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Productora no encontrada" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Error al obtener productora:", error);
    res.status(500).json({ error: "Error en servidor" });
  }
});


app.get("/productoras/:id/eventos", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(
      "SELECT * FROM events.get_events_by_productora($1)",
      [id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Error al obtener eventos de productora:", error);
    res.status(500).json({ error: "Error en servidor" });
  }
});

app.get("/productoras/:id/detalle/:eventoId", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const eventoId = parseInt(req.params.eventoId);

    const result = await pool.query(
      "SELECT * FROM events.get_detalle_productora($1, $2)",
      [id, eventoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Detalle no encontrado" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Error detalle productora:", error);
    res.status(500).json({ error: "Error en servidor" });
  }
});


app.post("/contacto", async (req, res) => {
  try {
    const { nombre, email, mensaje } = req.body;

    // validación básica
    if (!nombre || !email || !mensaje) {
      return res.status(400).json({ error: "Faltan datos" });
    }


    const result = await pool.query(
  "SELECT * FROM events.insert_contacto($1, $2, $3)",
  [nombre, email, mensaje]
);
    res.json({ ok: true, data: result.rows[0] });

  } catch (error) {
    console.error("Error en contacto:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

app.get("/eventos/buscar", async (req, res) => {
  const { q } = req.query;

  try {
    const result = await pool.query(
      `SELECT * FROM events.cat_events 
       WHERE LOWER(name) LIKE LOWER($1)`,
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
});

app.get("/productoras/:id/features", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const result = await pool.query(
      "SELECT * FROM events.get_productora_features($1)",
      [id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Error al obtener features:", error);
    res.status(500).json({ error: "Error en servidor" });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server corriendo en http://${HOST}:${PORT}`);
});


*/
// CON SUPABASE

let cacheEventos = {};
let cacheTime = null;
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const HOST = "0.0.0.0";
//const PORT = 3000;
const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

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
    console.error("Error en /productora-full:", error);
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
      console.log("⚡ cache backend:", key);
      return res.json(cacheEventos[key].data);
    }

    const { data, error } = await supabase.rpc("get_events", {
      p_id_productora: id_productora ? parseInt(id_productora) : null
    });

    if (error) throw error;

    // 💾 guardar en cache
    cacheEventos[key] = {
      data,
      time: now
    };

    console.log("🌐 supabase fetch:", key);

    res.json(data);

  } catch (error) {
    console.error("Error al obtener eventos:", error);
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
    console.error("Error al obtener evento:", error);
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
    console.error("Error al obtener productora:", error);
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
    console.error("Error al obtener eventos:", error);
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
    console.error("Error detalle:", error);
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
    console.error("Error en contacto:", error);
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
    console.error("Error buscar:", error);
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
    console.error("Error features:", error);
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
    console.error("Error obteniendo tickets:", error);

    res.status(500).json({
      error: "Error en servidor"
    });
  }
});

// INICIO QR
app.post("/api/create-ticket", async (req, res) => {
  try {
    const { event_id, name, email } = req.body;

    // 1. generar folio único
    const qrCode = `CPASS-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    // 2. generar imagen QR
    const qrImage = await QRCode.toDataURL(qrCode);

    // 3. guardar en Supabase
    const { data, error } = await supabase
      .from("tickets")
      .insert([
        {
          event_id,
          buyer_name: name,
          buyer_email: email,
          qr_code: qrCode,
          qr_image_url: qrImage,
          payment_status: "free"
        }
      ])
      .select();

    if (error) throw error;

    // 4. responder
    res.json({
      success: true,
      ticket: data[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error al generar ticket"
    });
  }
});
// FIN QR
// Solo local
//app.listen(PORT, HOST, () => {
//  console.log(`🚀 Server corriendo en http://${HOST}:${PORT}`);
//});
