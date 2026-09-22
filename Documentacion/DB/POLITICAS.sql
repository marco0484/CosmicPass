/* PRODCUTORAS */

CREATE POLICY "Permitir lectura publica cat_productoras" ON public.cat_productoras
 AS PERMISSIVE
 FOR SELECT
 TO anon
 USING (true);
CREATE POLICY public_read_productoras ON public.cat_productoras
 AS PERMISSIVE
 FOR SELECT
 TO anon
 USING (true);

/*EVENTOS */

 CREATE POLICY "Public read cat_events" ON public.cat_events
 AS PERMISSIVE
 FOR SELECT
 USING (true);
CREATE POLICY public_read_events ON public.cat_events
 AS PERMISSIVE
 FOR SELECT
 TO anon
 USING (true);

/*TIPO DE TICKETS */

 CREATE POLICY "Public read ticket_types" ON public.ticket_types
 AS PERMISSIVE
 FOR SELECT
 USING (true);
CREATE POLICY public_read_ticket_types ON public.ticket_types
 AS PERMISSIVE
 FOR SELECT
 TO anon
 USING (true);

 /*FEATURES*/

 CREATE POLICY "Public read cat_features" ON public.cat_features
 AS PERMISSIVE
 FOR SELECT
 USING (true);
CREATE POLICY public_read_features ON public.cat_features
 AS PERMISSIVE
 FOR SELECT
 TO anon
 USING (true);

 /* REL FEATURE X MENUS Y LINEUP*/

 CREATE POLICY "Permitir lectura publica rel_productora_features" ON public.rel_productora_features
 AS PERMISSIVE
 FOR SELECT
 TO anon
 USING (true);