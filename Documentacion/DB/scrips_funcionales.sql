UPDATE public.cosmic_usuarios
SET password_hash = extensions.crypt(
    'marco0484**..',
    extensions.gen_salt('bf')
)
WHERE id = 1;


select  cp.id as id_prodcutora
	   ,cp.name as nombre_productora
	   ,ce.name as nombre_evento
	   ,ce.ind_activo 
from cat_productoras cp
inner join cat_events ce
on cp.id = ce.id
where ce.ind_activo = 1;