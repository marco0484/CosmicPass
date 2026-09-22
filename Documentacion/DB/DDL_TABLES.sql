/* PROODUCTORAS */

CREATE TABLE  cat_productoras (
	id int4 		NOT NULL,
	"name" 			varchar(255) NOT NULL,
	description 	text NULL,
	instagram varchar(255) NULL,
	facebook varchar(255) NULL,
	logo varchar(255) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	tiktok varchar(255) NULL,
	youtube varchar(255) NULL,
	x varchar(255) NULL,
	whatsapp text NULL,
	fbevent text NULL,
	stripe_account_id text NULL,
	stripe_onboarding_complete bool DEFAULT false NULL,
	mp_access_token text NULL,
	mp_refresh_token text NULL,
	mp_user_id text NULL,
	mp_token_expires_at timestamptz NULL,
	mp_connected bool DEFAULT false NULL,
	desc_slug text NULL,
	CONSTRAINT rpk_02 PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ind_02 ON  cat_productoras USING btree (id);
ALTER TABLE  cat_productoras ENABLE ROW LEVEL SECURITY;

/* EVENTOS */

CREATE TABLE  cat_events (
	id int4 NOT NULL,
	"name" varchar(255) NOT NULL,
	city varchar(100) NOT NULL,
	price numeric(10, 2) NOT NULL,
	image varchar(255) NULL,
	"date" date NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	id_productora int4 NULL,
	ind_prioridad int4 NULL,
	ind_activo int4 NULL,
	CONSTRAINT rpk_01 PRIMARY KEY (id),
	CONSTRAINT rfk_cat_events FOREIGN KEY (id_productora) REFERENCES  cat_productoras(id)
);
CREATE UNIQUE INDEX ind_01 ON  cat_events USING btree (id);
ALTER TABLE  cat_events ENABLE ROW LEVEL SECURITY;

/* REL FEATURE X PRODCUTORA QUE CAMBIARA A MENUS Y LINE UP */

CREATE TABLE rel_productora_features (
	id_productora int4 NOT NULL,
	id_feature int4 NOT NULL,
	CONSTRAINT rkp_04 PRIMARY KEY (id_productora, id_feature),
	CONSTRAINT fk_rel_productora_features_feature FOREIGN KEY (id_feature) REFERENCES   cat_features(id_features),
	CONSTRAINT rfk_rel_productora_f FOREIGN KEY (id_productora) REFERENCES   cat_productoras(id)
);
CREATE UNIQUE INDEX ind_04 ON   rel_productora_features USING btree (id_productora, id_feature);
ALTER TABLE   rel_productora_features ENABLE ROW LEVEL SECURITY;


/* FEATURE CAMBIARA POR LINE UP*/

CREATE TABLE cat_features (
	id_features int4 NOT NULL,
	"name" text NULL,
	icon text NULL,
	"level" int4 NULL,
	ind_activo int4 NULL,
	CONSTRAINT rpk_03 PRIMARY KEY (id_features)
);
CREATE UNIQUE INDEX ind_03 ON   cat_features USING btree (id_features);
ALTER TABLE   cat_features ENABLE ROW LEVEL SECURITY;


/* TIPO DE TICKET OFRECIDOS X EVENTO */

CREATE TABLE  ticket_types (
	id int4 			  NOT NULL,
	id_evento int4		  NOT NULL,
	id_productora int4    NOT NULL,
	tipo_ticket 		  varchar(100) NOT NULL,
	desc_ticket 		  text NULL,
	precio				  numeric(10, 2) NOT NULL,
	stock_disponible int4 NULL,
	fecha_inicio 		  timestamp NULL,
	fecha_fin 			  timestamp NULL,
	ind_activo int4 	  NULL,
	detalle_pago 		  text NULL,
	CONSTRAINT rpk_05 PRIMARY KEY (id, id_productora),
	CONSTRAINT rfk_ticket_types FOREIGN KEY (id_productora) REFERENCES  cat_productoras(id)
);
CREATE UNIQUE INDEX ind_05 ON  ticket_types USING btree (id, id_evento);
ALTER TABLE  ticket_types ENABLE ROW LEVEL SECURITY;

/*USUARIOS COSMICPASS */

CREATE TABLE  cosmic_usuarios (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	usuario text NOT NULL,
	nombre text NULL,
	rol text DEFAULT 'admin'::text NULL,
	activo bool DEFAULT true NULL,
	created_at timestamptz DEFAULT now() NULL,
	id_productora int4 NULL,
	password_hash text NULL,
	CONSTRAINT cosmic_usuarios_pkey PRIMARY KEY (id),
	CONSTRAINT cosmic_usuarios_usuario_key UNIQUE (usuario),
	CONSTRAINT cosmic_usuarios_productora_fk FOREIGN KEY (id_productora) REFERENCES  cat_productoras(id)
);
ALTER TABLE  cosmic_usuarios ENABLE ROW LEVEL SECURITY;

/* CATALOGO RP */

CREATE TABLE   cat_rps (
	id bigserial NOT NULL,
	id_rp_user int8 NOT NULL,
	nombre text NOT NULL,
	telefono text NULL,
	instagram text NULL,
	id_productora int4 NOT NULL,
	activo bool DEFAULT true NOT NULL,
	created_by int8 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT cat_rps_pkey null,
	CONSTRAINT uq_cat_rps_user UNIQUE (id_rp_user),
	CONSTRAINT cat_rps_created_by_fkey FOREIGN KEY (created_by) REFERENCES   cosmic_usuarios(id),
	CONSTRAINT cat_rps_productora_fkey FOREIGN KEY (id_productora) REFERENCES   cat_productoras(id),
	CONSTRAINT cat_rps_user_fkey FOREIGN KEY (id_rp_user) REFERENCES   cosmic_usuarios(id)
);


/* ASIGNACIONES RP */

CREATE TABLE  rp_asignaciones (
	id bigserial NOT NULL,
	id_productora int4 NOT NULL,
	id_evento int4 NOT NULL,
	ticket_type_id int8 NOT NULL,
	rp_user_id int8 NOT NULL,
	cantidad_asignada int4 NOT NULL,
	activo bool DEFAULT true NOT NULL,
	created_by int8 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT chk_rp_tickets_asignados CHECK ((cantidad_asignada > 0)),
	CONSTRAINT rp_asignaciones_pkey PRIMARY KEY (id),
	CONSTRAINT uq_rp_asignacion UNIQUE (rp_user_id, id_evento, ticket_type_id, id_productora),
	CONSTRAINT fk_rp_asignaciones_ticket_type FOREIGN KEY (ticket_type_id,id_productora) REFERENCES  ticket_types(id,id_productora),
	CONSTRAINT rp_asignaciones_created_by_fkey FOREIGN KEY (created_by) REFERENCES  cosmic_usuarios(id),
	CONSTRAINT rp_asignaciones_id_evento_fkey FOREIGN KEY (id_evento) REFERENCES  cat_events(id),
	CONSTRAINT rp_asignaciones_id_productora_fkey FOREIGN KEY (id_productora) REFERENCES  cat_productoras(id),
	CONSTRAINT rp_asignaciones_rp_user_id_fkey FOREIGN KEY (rp_user_id) REFERENCES  cosmic_usuarios(id)
);

/*TICKETS YA PAGADOS */

CREATE TABLE tickets (
	id bigserial NOT NULL,
	evento_id int4 NOT NULL,
	nombre_cliente varchar(255) NOT NULL,
	telefono varchar(100) NULL,
	correo varchar(255) NULL,
	tipo_ticket varchar(100) DEFAULT 'general'::character varying NULL,
	ticket_token varchar(255) NOT NULL,
	cantidad int4 DEFAULT 1 NULL,
	monto numeric(10, 2) NULL,
	metodo_pago varchar(50) NULL,
	payment_id varchar(255) NULL,
	payment_status varchar(50) DEFAULT 'pendiente'::character varying NULL,
	fecha_pago timestamp NULL,
	ticket_type_id int8 NULL,
	rp_user_id int8 NULL,
	CONSTRAINT tickets_payment_id_unique UNIQUE (payment_id),
	CONSTRAINT tickets_pkey PRIMARY KEY (id),
	CONSTRAINT tickets_ticket_token_key UNIQUE (ticket_token),
	CONSTRAINT rfk_tickets FOREIGN KEY (evento_id) REFERENCES   cat_events(id),
	CONSTRAINT tickets_rp_user_id_fkey FOREIGN KEY (rp_user_id) REFERENCES   cosmic_usuarios(id)
);
CREATE INDEX idx_tickets_correo ON   tickets USING btree (correo);
CREATE INDEX idx_tickets_evento ON   tickets USING btree (evento_id);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

/*	SESION QUE AUTORIZA ABRIR EL SCANER */

CREATE TABLE   scanner_sessions (
	"token" uuid NOT NULL,
	user_id int8 NOT NULL,
	id_productora int4 NOT NULL,
	id_evento int4 NULL,
	expires_at timestamptz NOT NULL,
	used bool DEFAULT false NULL,
	created_at timestamptz DEFAULT now() NULL,
	id_origen int4 NULL,
	CONSTRAINT scanner_sessions_pkey PRIMARY KEY (token),
	CONSTRAINT scanner_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES   cosmic_usuarios(id)
);

/* TICKETS VALIDADOS POR EL SCANER Y EN ESPERA */

CREATE TABLE   qr_valida_tickets (
	id text NOT NULL,
	"name" text NULL,
	"type" text NULL,
	used bool DEFAULT false NULL,
	used_at text NULL,
	id_evento int8 NULL,
	id_productora int8 NULL,
	CONSTRAINT qr_valida_tickets_pkey PRIMARY KEY (id)
);

/* Permisos por rol */

CREATE TABLE public.cat_roles_menus (
    id bigserial PRIMARY KEY,
    rol varchar(50) NOT NULL,
    menu_id bigint NOT NULL REFERENCES public.cat_menus(id) ON DELETE CASCADE,
    activo boolean NOT NULL DEFAULT true,
    UNIQUE (rol, menu_id)
);