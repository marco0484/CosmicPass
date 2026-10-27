ALTER TABLE cat_images 				ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_galeria_historica   ENABLE ROW LEVEL SECURITY;
ALTER table cat_talleres            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_menus               ENABLE ROW LEVEL SECURITY;
alter table scanner_sessions  		enable row level security;
alter table cat_roles_menus   		enable row level security;
alter table cat_mercancia   		enable row level security;
alter table parking_config   		enable row level security;

CREATE POLICY "Lectura publica de imagenes"
ON public.cat_images
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Lectura publica de galeria historica"
ON public.cat_galeria_historica
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Lectura publica de talleres"
ON public.cat_talleres
FOR SELECT
TO anon, authenticated
USING (true);


CREATE POLICY "Lectura publica menus"
ON cat_menus
FOR SELECT
TO anon, authenticated
USING (true);

create policy "Lectura publica scanner"
on scanner_sessions
FOR SELECT
TO anon, authenticated
USING (true);

create policy "Lectura publica catalogo menus"
on cat_roles_menus
FOR SELECT
TO anon, authenticated
USING (true);

create policy "Lectura publica rps"
on cat_roles_menus
FOR SELECT
TO anon, authenticated
USING (true);

create policy "Lectura publica catalogo parking config"
on parking_config
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Lectura publica de mercancia"
ON public.cat_mercancia
FOR SELECT
TO anon, authenticated
USING (true);