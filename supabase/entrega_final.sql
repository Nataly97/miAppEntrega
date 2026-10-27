-- Ejecuta este archivo en SQL Editor despues de crear las ocho tablas de docs/base-datos-fase-1.md.
-- La autenticacion y las contrasenas quedan a cargo de Supabase Auth.

alter table public.usuarios drop column if exists clave;

create unique index if not exists usuarios_correo_unico on public.usuarios (lower(correo));
create unique index if not exists usuarios_nombre_unico on public.usuarios (lower(usuario));
create unique index if not exists clientes_documento_unico on public.clientes (documento);

create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid()::text and rol = 'administrador' and activo = true
  );
$$;

create or replace function public.es_empleado_o_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid()::text and rol in ('empleado', 'administrador') and activo = true
  );
$$;

create or replace function public.es_propietario_cliente(cliente_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clientes
    where id = cliente_id and "usuarioId" = auth.uid()::text
  );
$$;

-- Creo el perfil y la ficha del cliente cuando alguien confirma su cuenta en Supabase Auth.
create or replace function public.crear_perfil_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nombre, usuario, correo, rol, activo, "fechaCreacion")
  values (
    new.id::text,
    coalesce(new.raw_user_meta_data->>'nombre', 'Cliente'),
    coalesce(new.raw_user_meta_data->>'usuario', split_part(new.email, '@', 1)),
    new.email,
    'cliente',
    true,
    to_char(now() at time zone 'utc', 'YYYY-MM-DD')
  )
  on conflict (id) do nothing;

  insert into public.clientes (id, "usuarioId", documento, telefono, direccion, "puntosDisponibles", "puntosAcumulados")
  values (
    new.id::text,
    new.id::text,
    coalesce(new.raw_user_meta_data->>'documento', ''),
    coalesce(new.raw_user_meta_data->>'telefono', ''),
    coalesce(new.raw_user_meta_data->>'direccion', ''),
    0,
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_cuenta_crear_perfil on auth.users;
create trigger al_crear_cuenta_crear_perfil
  after insert on auth.users
  for each row execute procedure public.crear_perfil_cliente();

alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public."materialesReciclables" enable row level security;
alter table public."movimientosPuntos" enable row level security;
alter table public.aliados enable row level security;
alter table public.recompensas enable row level security;
alter table public.canjes enable row level security;
alter table public."centrosAcopio" enable row level security;

-- Quito politicas de lectura anonimas de la version academica anterior.
drop policy if exists "lectura publica usuarios" on public.usuarios;
drop policy if exists "lectura publica clientes" on public.clientes;
drop policy if exists "lectura publica materiales" on public."materialesReciclables";
drop policy if exists "lectura publica movimientos" on public."movimientosPuntos";
drop policy if exists "lectura publica aliados" on public.aliados;
drop policy if exists "lectura publica recompensas" on public.recompensas;
drop policy if exists "lectura publica canjes" on public.canjes;
drop policy if exists "lectura publica centros" on public."centrosAcopio";

revoke all on public.usuarios, public.clientes, public."materialesReciclables",
  public."movimientosPuntos", public.aliados, public.recompensas, public.canjes,
  public."centrosAcopio" from anon;
grant select, insert, update, delete on public.usuarios, public.clientes,
  public."materialesReciclables", public."movimientosPuntos", public.aliados,
  public.recompensas, public.canjes, public."centrosAcopio" to authenticated;

drop policy if exists "usuarios_consultar_perfil" on public.usuarios;
create policy "usuarios_consultar_perfil" on public.usuarios
  for select to authenticated
  using (id = auth.uid()::text or public.es_administrador());

drop policy if exists "usuarios_editar_perfil" on public.usuarios;
create policy "usuarios_editar_perfil" on public.usuarios
  for update to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

drop policy if exists "clientes_leer_perfil" on public.clientes;
create policy "clientes_leer_perfil" on public.clientes
  for select to authenticated
  using ("usuarioId" = auth.uid()::text or public.es_empleado_o_administrador());
drop policy if exists "clientes_gestionar" on public.clientes;
drop policy if exists "clientes_admin_crud" on public.clientes;
create policy "clientes_admin_crud" on public.clientes
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

-- Los catalogos se pueden consultar con sesion; solo administracion los modifica.
do $$
declare tabla text;
begin
  foreach tabla in array array['materialesReciclables', 'aliados', 'recompensas', 'centrosAcopio'] loop
    execute format('drop policy if exists %I on public.%I', tabla || '_lectura', tabla);
    execute format('create policy %I on public.%I for select to authenticated using (true)', tabla || '_lectura', tabla);
    execute format('drop policy if exists %I on public.%I', tabla || '_admin_crud', tabla);
    execute format('create policy %I on public.%I for all to authenticated using (public.es_administrador()) with check (public.es_administrador())', tabla || '_admin_crud', tabla);
  end loop;
end;
$$;

drop policy if exists "movimientos_leer" on public."movimientosPuntos";
create policy "movimientos_leer" on public."movimientosPuntos"
  for select to authenticated using (public.es_empleado_o_administrador() or public.es_propietario_cliente("clienteId"));
drop policy if exists "movimientos_registrar" on public."movimientosPuntos";
create policy "movimientos_registrar" on public."movimientosPuntos"
  for insert to authenticated
  with check (public.es_empleado_o_administrador() and "empleadoId" = auth.uid()::text);
drop policy if exists "movimientos_admin_editar" on public."movimientosPuntos";
create policy "movimientos_admin_editar" on public."movimientosPuntos"
  for update to authenticated using (public.es_administrador()) with check (public.es_administrador());
drop policy if exists "movimientos_admin_eliminar" on public."movimientosPuntos";
create policy "movimientos_admin_eliminar" on public."movimientosPuntos"
  for delete to authenticated using (public.es_administrador());

drop policy if exists "canjes_leer" on public.canjes;
create policy "canjes_leer" on public.canjes
  for select to authenticated using (public.es_empleado_o_administrador() or public.es_propietario_cliente("clienteId"));
drop policy if exists "canjes_solicitar" on public.canjes;
create policy "canjes_solicitar" on public.canjes
  for insert to authenticated
  with check (public.es_empleado_o_administrador() and "empleadoId" = auth.uid()::text);
drop policy if exists "canjes_actualizar" on public.canjes;
create policy "canjes_actualizar" on public.canjes
  for update to authenticated using (public.es_empleado_o_administrador()) with check (public.es_empleado_o_administrador());
drop policy if exists "canjes_eliminar_admin" on public.canjes;
create policy "canjes_eliminar_admin" on public.canjes
  for delete to authenticated using (public.es_administrador());

revoke all on function public.es_administrador() from public, anon;
revoke all on function public.es_empleado_o_administrador() from public, anon;
revoke all on function public.es_propietario_cliente(text) from public, anon;
grant execute on function public.es_administrador() to authenticated;
grant execute on function public.es_empleado_o_administrador() to authenticated;
grant execute on function public.es_propietario_cliente(text) to authenticated;
