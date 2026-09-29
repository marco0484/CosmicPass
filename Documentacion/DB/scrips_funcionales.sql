select  cp.id as id_prodcutora
	   ,cp.name as nombre_productora
	   ,ce.name as nombre_evento
	   ,ce.ind_activo 
	   ,tt.tipo_ticket
	   ,tt.desc_ticket 
	   ,tt.precio
	   ,tt.stock_disponible 
	   ,tt.fecha_inicio 
	   ,tt.fecha_fin
from cat_productoras cp
inner join cat_events ce
on cp.id = ce.id
inner join ticket_types tt
on ce.id_productora = tt.id_productora
where ce.ind_activo = 1
  and cp.id = 1000;



select * from cosmic_usuarios;
select * from cat_productoras;
select * from cat_rps;
select * from cat_events;
select * from qr_valida_tickets; -- VALIDACION DE TICKETS 
select * from cat_menus;
select * from cat_roles_menus;
select * from cat_features;
select * from rel_productora_features;
select * from rp_asignaciones;
select * from scanner_sessions;
select * from ticket_types; 
select * from tickets;  -- TICKETS ACTIVOS

