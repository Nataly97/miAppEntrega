-- Permito que un cliente activo cree su propia ficha si todavía no existe.
-- No puede crear fichas para otras cuentas ni asignarse puntos.
drop policy if exists "clientes_crear_perfil_propio" on public.clientes;
create policy "clientes_crear_perfil_propio" on public.clientes
  for insert to authenticated
  with check (
    id = auth.uid()::text
    and "usuarioId" = auth.uid()::text
    and public.es_cliente_activo()
    and "puntosDisponibles" = 0
    and "puntosAcumulados" = 0
  );
