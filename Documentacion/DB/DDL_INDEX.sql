CREATE UNIQUE INDEX ind_02 ON  cat_productoras USING btree (id);

CREATE UNIQUE INDEX ind_01 ON  cat_events USING btree (id);

CREATE INDEX IF NOT EXISTS idx_cat_mercancia_productora
    ON cat_mercancia(id_productora);

CREATE INDEX IF NOT EXISTS idx_cat_talleres_productora
    ON cat_talleres(id_productora);

CREATE INDEX IF NOT EXISTS idx_cat_images_evento
    ON cat_images (id_evento, activo, orden);

CREATE INDEX IF NOT EXISTS idx_cat_images_productora
    ON cat_images (id_productora);

CREATE UNIQUE INDEX ind_04 ON   rel_productora_features 
USING btree (id_productora, id_feature);

CREATE UNIQUE INDEX ind_03 ON   cat_features USING btree (id_features);

CREATE UNIQUE INDEX ind_05 ON  ticket_types USING btree (id, id_evento);

CREATE INDEX idx_tickets_correo ON   tickets USING btree (correo);

CREATE INDEX idx_tickets_evento ON   tickets USING btree (evento_id);

CREATE INDEX IF NOT EXISTS idx_galeria_historica_productora
ON cat_galeria_historica
    (id_productora, activo, orden);