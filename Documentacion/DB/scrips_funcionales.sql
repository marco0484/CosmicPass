UPDATE public.cosmic_usuarios
SET password_hash = extensions.crypt(
    'marco0484**..',
    extensions.gen_salt('bf')
)
WHERE id = 1;