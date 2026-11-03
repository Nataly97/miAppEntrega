-- Permito al cliente cambiar los datos de sus solicitudes mientras sigan pendientes.
create or replace function public.proteger_cambios_recogida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.es_administrador() then return new; end if;

  if public.es_cliente_activo() then
    if not public.es_propietario_cliente(old."clienteId")
      or old.estado <> 'pendiente'
      or new.estado not in ('pendiente', 'cancelada')
      or new.id is distinct from old.id
      or new."clienteId" is distinct from old."clienteId"
      or new."gestorId" is distinct from old."gestorId"
      or new."creadoPor" is distinct from old."creadoPor"
      or new."fechaCreacion" is distinct from old."fechaCreacion" then
      raise exception 'Solo puedes editar o cancelar tus solicitudes pendientes.';
    end if;

    -- Al cancelar no permito enviar cambios adicionales en los datos.
    if new.estado = 'cancelada' and (
      new.direccion is distinct from old.direccion
      or new."fechaSolicitada" is distinct from old."fechaSolicitada"
      or new.observaciones is distinct from old.observaciones
    ) then
      raise exception 'No puedes cambiar los datos de una solicitud al cancelarla.';
    end if;
    return new;
  end if;

  if not public.es_gestor_o_administrador() then
    raise exception 'No tienes permiso para modificar recogidas.';
  end if;
  if new."clienteId" is distinct from old."clienteId"
    or new.direccion is distinct from old.direccion
    or new."fechaSolicitada" is distinct from old."fechaSolicitada"
    or new.observaciones is distinct from old.observaciones
    or new."creadoPor" is distinct from old."creadoPor"
    or new."fechaCreacion" is distinct from old."fechaCreacion" then
    raise exception 'El gestor solo puede actualizar el estado de la recogida.';
  end if;
  if new."gestorId" is distinct from old."gestorId"
    and new."gestorId" is distinct from auth.uid()::text then
    raise exception 'Un gestor solo puede asignarse la recogida a sí mismo.';
  end if;
  if old.estado = 'pendiente' and new.estado not in ('pendiente', 'asignada', 'cancelada')
    or old.estado = 'asignada' and new.estado not in ('asignada', 'completada', 'cancelada')
    or old.estado in ('completada', 'cancelada') and new.estado <> old.estado then
    raise exception 'El cambio de estado no es válido para esta recogida.';
  end if;
  if new.estado = 'completada' and old."gestorId" is distinct from auth.uid()::text then
    raise exception 'Solo el gestor asignado puede completar esta recogida.';
  end if;
  return new;
end;
$$;

-- Mantengo al cliente limitado a sus filas y a estados editables.
drop policy if exists "recogidas_cliente_cancelar" on public."solicitudesRecogida";
create policy "recogidas_cliente_cancelar" on public."solicitudesRecogida"
  for update to authenticated
  using (public.es_propietario_cliente("clienteId") and estado = 'pendiente')
  with check (public.es_propietario_cliente("clienteId") and estado in ('pendiente', 'cancelada'));

notify pgrst, 'reload schema';
