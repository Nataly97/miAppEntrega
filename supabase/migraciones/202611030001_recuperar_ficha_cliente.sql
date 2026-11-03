-- Recupero la ficha del cliente actual si falta, sin permitir modificar sus puntos.
create or replace function public.crear_ficha_cliente_propia(
  p_documento text,
  p_telefono text default '',
  p_direccion text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  id_actual text := auth.uid()::text;
  ficha public.clientes%rowtype;
begin
  if id_actual is null then
    raise exception 'Debes iniciar sesión para recuperar tu ficha.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.usuarios
    where id = id_actual and rol = 'cliente' and activo = true and "confirmacionPendiente" = false
  ) then
    raise exception 'La cuenta no está activa como cliente.' using errcode = '42501';
  end if;

  insert into public.clientes (
    id, "usuarioId", documento, telefono, direccion, "puntosDisponibles", "puntosAcumulados"
  ) values (
    id_actual,
    id_actual,
    coalesce(nullif(trim(p_documento), ''), 'PENDIENTE-' || id_actual),
    coalesce(p_telefono, ''),
    coalesce(p_direccion, ''),
    0,
    0
  ) on conflict ("usuarioId") do nothing;

  select * into ficha from public.clientes where "usuarioId" = id_actual;
  if not found then raise exception 'No se pudo recuperar la ficha del cliente.'; end if;
  return to_jsonb(ficha);
end;
$$;

revoke all on function public.crear_ficha_cliente_propia(text, text, text) from public, anon;
grant execute on function public.crear_ficha_cliente_propia(text, text, text) to authenticated;
notify pgrst, 'reload schema';
