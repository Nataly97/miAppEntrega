-- El gestor activo puede consultar materiales para cerrar una recogida.
drop policy if exists "materiales_gestor_lectura" on public."materialesReciclables";
create policy "materiales_gestor_lectura" on public."materialesReciclables"
  for select to authenticated using (public.es_gestor_activo());

-- Registro el material, calculo los puntos y completo la recogida en una sola transacción.
create or replace function public.completar_recogida_con_puntos(
  p_solicitud_id text,
  p_material_id text,
  p_cantidad numeric
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  id_gestor text := auth.uid()::text;
  solicitud public."solicitudesRecogida"%rowtype;
  material public."materialesReciclables"%rowtype;
  puntos_ganados integer;
begin
  if id_gestor is null or not public.es_gestor_activo() then
    raise exception 'Solo un gestor activo puede completar la recogida.' using errcode = '42501';
  end if;
  if p_cantidad is null or p_cantidad <= 0 or p_cantidad::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Registra una cantidad mayor que cero.';
  end if;

  select * into solicitud
  from public."solicitudesRecogida"
  where id = p_solicitud_id and "gestorId" = id_gestor and estado = 'asignada'
  for update;
  if not found then raise exception 'La recogida ya no está asignada a tu cuenta o ya fue completada.'; end if;

  select * into material
  from public."materialesReciclables"
  where id = p_material_id and activo = true
  for share;
  if not found then raise exception 'Selecciona un material reciclable activo.'; end if;
  if material."unidadMedida" = 'unidad' and p_cantidad <> trunc(p_cantidad) then
    raise exception 'Este material se registra en unidades completas.';
  end if;
  if material."unidadMedida" = 'kg' and p_cantidad <> round(p_cantidad, 3) then
    raise exception 'El peso puede tener máximo tres decimales.';
  end if;

  puntos_ganados := floor(p_cantidad * material."puntosPorUnidad")::integer;
  if puntos_ganados < 1 then raise exception 'La cantidad no alcanza un punto con la tarifa actual.'; end if;

  update public.clientes
  set "puntosDisponibles" = "puntosDisponibles" + puntos_ganados,
      "puntosAcumulados" = "puntosAcumulados" + puntos_ganados
  where id = solicitud."clienteId";
  if not found then raise exception 'No se encontró el perfil del cliente de esta recogida.'; end if;

  insert into public."movimientosPuntos" (
    id, "clienteId", "empleadoId", "materialId", tipo, "cantidadMaterial", puntos, descripcion, fecha
  ) values (
    gen_random_uuid()::text, solicitud."clienteId", id_gestor, material.id, 'acumulacion', p_cantidad,
    puntos_ganados, 'Puntos por recogida: ' || material.nombre, now()::text
  );

  update public."solicitudesRecogida" set estado = 'completada' where id = solicitud.id;
  return puntos_ganados;
end;
$$;

revoke all on function public.completar_recogida_con_puntos(text, text, numeric) from public, anon;
grant execute on function public.completar_recogida_con_puntos(text, text, numeric) to authenticated;
notify pgrst, 'reload schema';
