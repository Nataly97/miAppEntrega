-- Esquema inicial completo de ReciCash. Ejecuta este unico archivo en un proyecto Supabase nuevo.
-- Incluye tablas, relaciones, autenticacion, permisos RLS y una comprobacion final de seguridad.
-- La aplicacion usa Supabase Auth para las contrasenas; nunca guardo claves en public.usuarios.

-- Crea las diez tablas que utiliza ReciCash.
-- Este archivo reúne el esquema, la autenticación, las funciones y la seguridad de ReciCash.

create table if not exists public.usuarios (
  id text primary key,
  nombre text not null,
  usuario text not null,
  correo text not null,
  rol text not null check (rol in ('administrador', 'gestor', 'entidad_financiera', 'cliente')),
  activo boolean not null default true,
  "confirmacionPendiente" boolean not null default false,
  "fechaCreacion" text not null
);

create table if not exists public.clientes (
  id text primary key,
  "usuarioId" text not null references public.usuarios(id),
  documento text not null,
  telefono text not null,
  direccion text not null,
  "puntosDisponibles" integer not null default 0 check ("puntosDisponibles" >= 0),
  "puntosAcumulados" integer not null default 0 check ("puntosAcumulados" >= 0)
);

create table if not exists public."materialesReciclables" (
  id text primary key,
  nombre text not null,
  "unidadMedida" text not null check ("unidadMedida" in ('kg', 'unidad')),
  "puntosPorUnidad" integer not null check ("puntosPorUnidad" >= 0),
  activo boolean not null default true
);

create table if not exists public."movimientosPuntos" (
  id text primary key,
  "clienteId" text not null references public.clientes(id),
  "empleadoId" text not null references public.usuarios(id),
  "materialId" text references public."materialesReciclables"(id),
  tipo text not null check (tipo in ('acumulacion', 'canje', 'ajuste')),
  "cantidadMaterial" numeric check ("cantidadMaterial" is null or "cantidadMaterial" >= 0),
  puntos integer not null,
  descripcion text not null,
  fecha text not null
);

create table if not exists public.aliados (
  id text primary key,
  nombre text not null,
  categoria text not null,
  ciudad text not null,
  activo boolean not null default true
);

create table if not exists public.recompensas (
  id text primary key,
  "aliadoId" text references public.aliados(id),
  "gestorId" text references public.usuarios(id),
  nombre text not null,
  descripcion text not null,
  "puntosRequeridos" integer not null check ("puntosRequeridos" >= 0),
  stock integer not null check (stock >= 0),
  activo boolean not null default true
);

create table if not exists public.canjes (
  id text primary key,
  "clienteId" text not null references public.clientes(id),
  "recompensaId" text not null references public.recompensas(id),
  "empleadoId" text references public.usuarios(id),
  "puntosUsados" integer not null check ("puntosUsados" >= 0),
  estado text not null check (estado in ('pendiente', 'aprobado', 'entregado', 'cancelado')),
  "fechaSolicitud" text not null,
  "fechaEntrega" text
);

create table if not exists public."centrosAcopio" (
  id text primary key,
  nombre text not null,
  direccion text not null,
  ciudad text not null,
  activo boolean not null default true
);

create table if not exists public."solicitudesRecogida" (
  id text primary key default gen_random_uuid()::text,
  "clienteId" text not null references public.clientes(id) on delete cascade,
  "gestorId" text references public.usuarios(id),
  "creadoPor" text references public.usuarios(id),
  direccion text not null,
  "fechaSolicitada" timestamptz not null,
  observaciones text not null default '',
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'asignada', 'completada', 'cancelada')),
  "fechaCreacion" timestamptz not null default now()
);

create table if not exists public."entidadesFinancieras" (
  id text primary key default gen_random_uuid()::text,
  "usuarioId" text not null unique references public.usuarios(id) on delete cascade,
  nombre text not null,
  identificacion text not null unique,
  activo boolean not null default true
);

-- Evito duplicar correos, nombres de usuario y documentos sin importar mayusculas.
create unique index if not exists usuarios_correo_unico on public.usuarios (lower(correo));
create unique index if not exists usuarios_nombre_unico on public.usuarios (lower(usuario));
create unique index if not exists clientes_documento_unico on public.clientes (documento);
create unique index if not exists clientes_documento_normalizado_unico on public.clientes (lower(btrim(documento)));


-- Configuracion completa de autenticacion y permisos por rol.
-- Ejecuta este archivo en SQL Editor despues de crear las tablas iniciales de ReciCash.
-- La autenticacion y las contrasenas quedan a cargo de Supabase Auth.

alter table public.usuarios drop column if exists clave;
alter table public.usuarios add column if not exists "confirmacionPendiente" boolean not null default false;

-- Roles de ReciCash: el registro publico sigue creando unicamente clientes.
do $$
declare restriccion record;
begin
  for restriccion in
    select conname from pg_constraint
    where conrelid = 'public.usuarios'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%rol%'
  loop
    execute format('alter table public.usuarios drop constraint %I', restriccion.conname);
  end loop;
end;
$$;
update public.usuarios set rol = 'gestor' where rol = 'empleado';
alter table public.usuarios add constraint usuarios_rol_check
  check (rol in ('administrador', 'gestor', 'entidad_financiera', 'cliente'));

create table if not exists public."solicitudesRecogida" (
  id text primary key default gen_random_uuid()::text,
  "clienteId" text not null references public.clientes(id) on delete cascade,
  "gestorId" text references public.usuarios(id),
  "creadoPor" text references public.usuarios(id),
  direccion text not null,
  "fechaSolicitada" timestamptz not null,
  observaciones text not null default '',
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'asignada', 'completada', 'cancelada')),
  "fechaCreacion" timestamptz not null default now()
);

create table if not exists public."entidadesFinancieras" (
  id text primary key default gen_random_uuid()::text,
  "usuarioId" text not null unique references public.usuarios(id) on delete cascade,
  nombre text not null,
  identificacion text not null unique,
  activo boolean not null default true
);

alter table public."movimientosPuntos" alter column "empleadoId" drop not null;
alter table public."solicitudesRecogida" add column if not exists "gestorId" text references public.usuarios(id);
-- Las recompensas se relacionan con la cuenta de gestor que las ofrece.
alter table public.recompensas alter column "aliadoId" drop not null;
alter table public.recompensas add column if not exists "gestorId" text references public.usuarios(id);
create unique index if not exists clientes_usuario_unico on public.clientes ("usuarioId");
alter table public."solicitudesRecogida" enable row level security;
alter table public."entidadesFinancieras" enable row level security;
revoke all on public."solicitudesRecogida", public."entidadesFinancieras" from anon;
grant select, insert, update, delete on public."solicitudesRecogida", public."entidadesFinancieras" to authenticated;

create unique index if not exists usuarios_correo_unico on public.usuarios (lower(correo));
create unique index if not exists usuarios_nombre_unico on public.usuarios (lower(usuario));
create unique index if not exists clientes_documento_unico on public.clientes (documento);
create unique index if not exists clientes_documento_normalizado_unico on public.clientes (lower(btrim(documento)));

-- Compruebo si la cuenta actual es un administrador activo.
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

-- Compruebo si la cuenta actual puede registrar movimientos operativos.
create or replace function public.es_empleado_o_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid()::text and rol in ('gestor', 'administrador') and activo = true
  );
$$;

-- Compruebo si la cuenta actual es gestor o administrador activo.
create or replace function public.es_gestor_o_administrador()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.usuarios where id = auth.uid()::text
    and rol in ('gestor', 'administrador') and activo = true
); $$;

-- Compruebo si la cuenta actual pertenece a una entidad financiera activa.
create or replace function public.es_entidad_financiera()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.usuarios where id = auth.uid()::text
    and rol = 'entidad_financiera' and activo = true
); $$;

-- Compruebo si la cuenta actual es un cliente activo.
create or replace function public.es_cliente_activo()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.usuarios where id = auth.uid()::text
    and rol = 'cliente' and activo = true
); $$;

-- Compruebo que quien usa la operación tenga una cuenta activa de gestor.
create or replace function public.es_gestor_activo()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.usuarios where id = auth.uid()::text
    and rol = 'gestor' and activo = true
); $$;

-- Compruebo que el gestor elegido exista y tenga una cuenta activa.
create or replace function public.gestor_activo(gestor_id text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.usuarios where id = gestor_id
    and rol = 'gestor' and activo = true
); $$;

-- Compruebo que el cliente de una recogida tenga una cuenta activa.
create or replace function public.cliente_activo(cliente_id text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.clientes c join public.usuarios u on u.id = c."usuarioId"
  where c.id = cliente_id and u.rol = 'cliente' and u.activo = true
); $$;

-- Guardo la lógica común para que clientes, gestores y administración creen solicitudes.
create or replace function public.crear_solicitud_recogida(
  p_cliente_id text,
  p_gestor_id text,
  p_direccion text,
  p_fecha_solicitada timestamptz,
  p_observaciones text default ''
)
returns text language plpgsql security definer set search_path = public
as $$
declare
  rol_actual text;
  estado_inicial text;
  nueva_solicitud_id text := gen_random_uuid()::text;
begin
  select u.rol into rol_actual from public.usuarios u
  where u.id = auth.uid()::text and u.activo = true;
  if rol_actual is null then raise exception 'Tu cuenta no está activa o no se pudo validar la sesión.'; end if;
  if coalesce(trim(p_direccion), '') = '' then raise exception 'Escribe la dirección de recogida.'; end if;
  if p_fecha_solicitada is null then raise exception 'Selecciona la fecha y hora de recogida.'; end if;

  if rol_actual = 'cliente' then
    if not public.es_propietario_cliente(p_cliente_id) then
      raise exception 'Solo puedes solicitar recogidas para tu propio perfil de cliente.';
    end if;
    if p_gestor_id is not null then raise exception 'Las solicitudes de clientes quedan pendientes para asignación.'; end if;
    estado_inicial := 'pendiente';
  elsif rol_actual in ('gestor', 'administrador') then
    if not public.cliente_activo(p_cliente_id) then raise exception 'Selecciona un cliente activo.'; end if;
    if p_gestor_id is not null and not public.gestor_activo(p_gestor_id) then
      raise exception 'Selecciona un gestor activo o deja la solicitud sin asignar.';
    end if;
    estado_inicial := case when p_gestor_id is null then 'pendiente' else 'asignada' end;
  else
    raise exception 'Tu rol no tiene permiso para crear solicitudes de recogida.';
  end if;

  insert into public."solicitudesRecogida" (
    id, "clienteId", "gestorId", "creadoPor", direccion, "fechaSolicitada", observaciones, estado
  ) values (
    nueva_solicitud_id, p_cliente_id, p_gestor_id, auth.uid()::text,
    trim(p_direccion), p_fecha_solicitada, coalesce(p_observaciones, ''), estado_inicial
  );
  return nueva_solicitud_id;
end;
$$;

create or replace function public.proteger_cambios_recogida()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.es_administrador() then return new; end if;
  if not public.es_gestor_o_administrador() then raise exception 'No tienes permiso para modificar recogidas.'; end if;
  if new."clienteId" is distinct from old."clienteId"
    or new.direccion is distinct from old.direccion
    or new."fechaSolicitada" is distinct from old."fechaSolicitada"
    or new.observaciones is distinct from old.observaciones
    or new."creadoPor" is distinct from old."creadoPor"
    or new."fechaCreacion" is distinct from old."fechaCreacion" then
    raise exception 'El gestor solo puede actualizar el estado de la recogida.';
  end if;
  if new."gestorId" is distinct from old."gestorId" and new."gestorId" is distinct from auth.uid()::text then
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
drop trigger if exists proteger_cambios_recogida on public."solicitudesRecogida";
create trigger proteger_cambios_recogida before update on public."solicitudesRecogida"
  for each row execute function public.proteger_cambios_recogida();

-- Compruebo que el perfil de cliente consultado pertenezca a la cuenta actual.
create or replace function public.es_propietario_cliente(cliente_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clientes c join public.usuarios u on u.id = c."usuarioId"
    where c.id = cliente_id and c."usuarioId" = auth.uid()::text
      and u.rol = 'cliente' and u.activo = true
  );
$$;

-- Creo el perfil y la ficha del cliente cuando alguien confirma su cuenta en Supabase Auth.
create or replace function public.crear_perfil_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pendiente_confirmacion boolean := coalesce(new.raw_user_meta_data->>'cuentaInternaPendiente' = 'true', false);
begin
  insert into public.usuarios (id, nombre, usuario, correo, rol, activo, "confirmacionPendiente", "fechaCreacion")
  values (
    new.id::text,
    coalesce(new.raw_user_meta_data->>'nombre', 'Cliente'),
    coalesce(new.raw_user_meta_data->>'usuario', split_part(new.email, '@', 1)),
    new.email,
    'cliente',
    not pendiente_confirmacion,
    pendiente_confirmacion,
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

-- Activo las cuentas internas cuando Supabase verifica el correo solicitado por el administrador.
create or replace function public.activar_perfil_tras_confirmacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.usuarios
      set activo = true, "confirmacionPendiente" = false
      where id = new.id::text and "confirmacionPendiente" = true;
  end if;
  return new;
end;
$$;

drop trigger if exists al_confirmar_correo_activar_perfil on auth.users;
create trigger al_confirmar_correo_activar_perfil
  after update of email_confirmed_at on auth.users
  for each row execute procedure public.activar_perfil_tras_confirmacion();

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
  using (public.es_propietario_cliente(id) or public.es_administrador());
-- Si falta su ficha, el cliente puede crear solo la propia y empieza con cero puntos.
drop policy if exists "clientes_crear_perfil_propio" on public.clientes;
create policy "clientes_crear_perfil_propio" on public.clientes
  for insert to authenticated
  with check (
    id = auth.uid()::text and "usuarioId" = auth.uid()::text
    and public.es_cliente_activo()
    and "puntosDisponibles" = 0 and "puntosAcumulados" = 0
  );
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
    execute format('create policy %I on public.%I for select to authenticated using (public.es_administrador() or public.es_cliente_activo())', tabla || '_lectura', tabla);
    execute format('drop policy if exists %I on public.%I', tabla || '_admin_crud', tabla);
    execute format('create policy %I on public.%I for all to authenticated using (public.es_administrador()) with check (public.es_administrador())', tabla || '_admin_crud', tabla);
  end loop;
end;
$$;

drop policy if exists "movimientos_leer" on public."movimientosPuntos";
create policy "movimientos_leer" on public."movimientosPuntos"
  for select to authenticated using (public.es_administrador() or public.es_propietario_cliente("clienteId"));
drop policy if exists "movimientos_registrar" on public."movimientosPuntos";
create policy "movimientos_registrar" on public."movimientosPuntos"
  for insert to authenticated
  with check (public.es_administrador() and "empleadoId" = auth.uid()::text);
drop policy if exists "movimientos_admin_editar" on public."movimientosPuntos";
create policy "movimientos_admin_editar" on public."movimientosPuntos"
  for update to authenticated using (public.es_administrador()) with check (public.es_administrador());
drop policy if exists "movimientos_admin_eliminar" on public."movimientosPuntos";
create policy "movimientos_admin_eliminar" on public."movimientosPuntos"
  for delete to authenticated using (public.es_administrador());

drop policy if exists "canjes_leer" on public.canjes;
create policy "canjes_leer" on public.canjes
  for select to authenticated using (public.es_administrador() or public.es_propietario_cliente("clienteId"));
drop policy if exists "canjes_solicitar" on public.canjes;
-- Solo la función transaccional puede insertar canjes de clientes.
drop policy if exists "canjes_actualizar" on public.canjes;
create policy "canjes_actualizar" on public.canjes
  for update to authenticated using (public.es_administrador()) with check (public.es_administrador());
drop policy if exists "canjes_eliminar_admin" on public.canjes;
create policy "canjes_eliminar_admin" on public.canjes
  for delete to authenticated using (public.es_administrador());

-- Solicitudes: el cliente solo crea y consulta las propias; gestores operan la cola.
drop policy if exists "recogidas_cliente_select" on public."solicitudesRecogida";
create policy "recogidas_cliente_select" on public."solicitudesRecogida"
  for select to authenticated using (public.es_propietario_cliente("clienteId"));
drop policy if exists "recogidas_cliente_insert" on public."solicitudesRecogida";
create policy "recogidas_cliente_insert" on public."solicitudesRecogida"
  for insert to authenticated with check (
    public.es_propietario_cliente("clienteId") and estado = 'pendiente' and "gestorId" is null
  );
drop policy if exists "recogidas_gestor_insert" on public."solicitudesRecogida";
create policy "recogidas_gestor_insert" on public."solicitudesRecogida"
  for insert to authenticated with check (
    public.es_gestor_activo() and public.cliente_activo("clienteId")
    and (("gestorId" is null and estado = 'pendiente')
      or (public.gestor_activo("gestorId") and estado = 'asignada'))
  );
drop policy if exists "recogidas_admin_insert" on public."solicitudesRecogida";
create policy "recogidas_admin_insert" on public."solicitudesRecogida"
  for insert to authenticated with check (
    public.es_administrador() and public.cliente_activo("clienteId")
    and (("gestorId" is null and estado = 'pendiente')
      or (public.gestor_activo("gestorId") and estado = 'asignada'))
  );
drop policy if exists "recogidas_gestor_select" on public."solicitudesRecogida";
create policy "recogidas_gestor_select" on public."solicitudesRecogida"
  for select to authenticated using (
    public.es_administrador() or (public.es_gestor_activo() and (estado = 'pendiente' or "gestorId" = auth.uid()::text))
  );
drop policy if exists "recogidas_gestor_update" on public."solicitudesRecogida";
create policy "recogidas_gestor_update" on public."solicitudesRecogida"
  for update to authenticated
  using (public.es_administrador() or (public.es_gestor_activo() and (estado = 'pendiente' or "gestorId" = auth.uid()::text)))
  with check (public.es_administrador() or (public.es_gestor_activo() and (estado = 'pendiente' or "gestorId" = auth.uid()::text)));
drop policy if exists "recogidas_admin_delete" on public."solicitudesRecogida";
create policy "recogidas_admin_delete" on public."solicitudesRecogida"
  for delete to authenticated using (public.es_administrador());

-- Devuelvo las solicitudes con el nombre del cliente y del gestor asignado.
drop function if exists public.lista_recogidas_gestor();
create function public.lista_recogidas_gestor()
returns table (
  id text, "clienteId" text, "nombreCliente" text, telefono text, direccion text,
  "fechaSolicitada" timestamptz, observaciones text, estado text, "gestorId" text, "nombreGestor" text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.es_gestor_o_administrador() then raise exception 'Esta consulta es exclusiva de gestores.'; end if;
  return query select r.id, r."clienteId", u.nombre, c.telefono, r.direccion,
      r."fechaSolicitada", r.observaciones, r.estado, r."gestorId", g.nombre
    from public."solicitudesRecogida" r
    join public.clientes c on c.id = r."clienteId"
    join public.usuarios u on u.id = c."usuarioId"
    left join public.usuarios g on g.id = r."gestorId" and g.rol = 'gestor'
    where public.es_administrador() or r.estado = 'pendiente'
      or r."gestorId" = auth.uid()::text or r."creadoPor" = auth.uid()::text
    order by r."fechaSolicitada";
end;
$$;
revoke all on function public.lista_recogidas_gestor() from public, anon;
grant execute on function public.lista_recogidas_gestor() to authenticated;

-- Entrego al gestor solo los datos necesarios para elegir un cliente activo.
create or replace function public.lista_clientes_para_recogida()
returns table (id text, nombre text, documento text, telefono text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.es_gestor_o_administrador() then
    raise exception 'Esta consulta es exclusiva de gestores.';
  end if;
  return query
    select c.id, u.nombre, c.documento, c.telefono
    from public.clientes c
    join public.usuarios u on u.id = c."usuarioId"
    where u.rol = 'cliente' and u.activo = true
    order by u.nombre;
end;
$$;
revoke all on function public.lista_clientes_para_recogida() from public, anon;
grant execute on function public.lista_clientes_para_recogida() to authenticated;

-- Entrego los gestores activos disponibles para asignar una recogida.
create or replace function public.lista_gestores_para_recogida()
returns table (id text, nombre text, usuario text, correo text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.es_gestor_o_administrador() then
    raise exception 'Esta consulta es exclusiva de gestores.';
  end if;
  return query
    select u.id, u.nombre, u.usuario, u.correo
    from public.usuarios u
    where u.rol = 'gestor' and u.activo = true
    order by u.nombre;
end;
$$;
revoke all on function public.lista_gestores_para_recogida() from public, anon;
grant execute on function public.lista_gestores_para_recogida() to authenticated;

drop policy if exists "financieras_select" on public."entidadesFinancieras";
create policy "financieras_select" on public."entidadesFinancieras"
  for select to authenticated using (("usuarioId" = auth.uid()::text and public.es_entidad_financiera()) or public.es_administrador());
drop policy if exists "financieras_admin_all" on public."entidadesFinancieras";
create policy "financieras_admin_all" on public."entidadesFinancieras"
  for all to authenticated using (public.es_administrador()) with check (public.es_administrador());

-- Las entidades financieras solo pueden consultar canjes finalizados.
drop policy if exists "canjes_financieras_historial" on public.canjes;
create policy "canjes_financieras_historial" on public.canjes
  for select to authenticated using (public.es_entidad_financiera() and estado in ('aprobado', 'entregado'));

-- Entrego a una entidad financiera solo los canjes que puede consultar.
create or replace function public.historial_canjes_financieras()
returns table ("canjeId" text, producto text, "puntosUsados" integer, estado text, "fechaSolicitud" text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.es_entidad_financiera() then raise exception 'Esta consulta es exclusiva de entidades financieras.'; end if;
  return query select c.id, r.nombre, c."puntosUsados", c.estado, c."fechaSolicitud"
    from public.canjes c join public.recompensas r on r.id = c."recompensaId"
    where c.estado in ('aprobado', 'entregado') order by c."fechaSolicitud" desc;
end;
$$;
revoke all on function public.historial_canjes_financieras() from public, anon;
grant execute on function public.historial_canjes_financieras() to authenticated;

-- El canje y el descuento de puntos/stock ocurren en una unica transaccion.
-- Registro un canje y descuento puntos y stock dentro de una sola operación.
create or replace function public.canjear_recompensa(recompensa_id text)
returns text language plpgsql security definer set search_path = public
as $$
declare
  cliente public.clientes%rowtype;
  premio public.recompensas%rowtype;
  nuevo_id text := gen_random_uuid()::text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion para canjear.'; end if;
  if not exists (select 1 from public.usuarios where id = auth.uid()::text and rol = 'cliente' and activo = true) then
    raise exception 'Solo una cuenta activa de cliente puede realizar canjes.';
  end if;
  select * into cliente from public.clientes
    where "usuarioId" = auth.uid()::text for update;
  if not found then raise exception 'No se encontro tu perfil de cliente.'; end if;
  select * into premio from public.recompensas where id = recompensa_id for update;
  if not found or not premio.activo then raise exception 'El producto ya no esta disponible.'; end if;
  if premio.stock < 1 then raise exception 'No hay unidades disponibles.'; end if;
  if cliente."puntosDisponibles" < premio."puntosRequeridos" then
    raise exception 'No tienes puntos suficientes para este canje.';
  end if;
  update public.clientes set "puntosDisponibles" = "puntosDisponibles" - premio."puntosRequeridos"
    where id = cliente.id;
  update public.recompensas set stock = stock - 1 where id = premio.id;
  insert into public.canjes (id, "clienteId", "recompensaId", "empleadoId", "puntosUsados", estado, "fechaSolicitud")
    values (nuevo_id, cliente.id, premio.id, null, premio."puntosRequeridos", 'pendiente', now()::text);
  insert into public."movimientosPuntos" (id, "clienteId", "empleadoId", tipo, puntos, descripcion, fecha)
    values (gen_random_uuid()::text, cliente.id, null, 'canje', -premio."puntosRequeridos",
      'Canje solicitado: ' || premio.nombre, now()::text);
  return nuevo_id;
end;
$$;

revoke all on function public.canjear_recompensa(text) from public, anon;
grant execute on function public.canjear_recompensa(text) to authenticated;

revoke all on function public.es_administrador() from public, anon;
revoke all on function public.es_empleado_o_administrador() from public, anon;
revoke all on function public.es_propietario_cliente(text) from public, anon;
grant execute on function public.es_administrador() to authenticated;
grant execute on function public.es_empleado_o_administrador() to authenticated;
grant execute on function public.es_propietario_cliente(text) to authenticated;
revoke all on function public.es_gestor_o_administrador() from public, anon;
revoke all on function public.es_entidad_financiera() from public, anon;
revoke all on function public.es_cliente_activo() from public, anon;
revoke all on function public.es_gestor_activo() from public, anon;
revoke all on function public.cliente_activo(text) from public, anon;
revoke all on function public.gestor_activo(text) from public, anon;
revoke all on function public.crear_solicitud_recogida(text, text, text, timestamptz, text) from public, anon;
grant execute on function public.es_gestor_o_administrador() to authenticated;
grant execute on function public.es_entidad_financiera() to authenticated;
grant execute on function public.es_cliente_activo() to authenticated;
grant execute on function public.es_gestor_activo() to authenticated;
grant execute on function public.cliente_activo(text) to authenticated;
grant execute on function public.gestor_activo(text) to authenticated;
grant execute on function public.crear_solicitud_recogida(text, text, text, timestamptz, text) to authenticated;

-- Aviso a Supabase para que la API reconozca de inmediato las funciones RPC nuevas.
notify pgrst, 'reload schema';

-- Al final compruebo que las tablas tengan RLS activa y politicas registradas.
-- Esta comprobación se ejecuta automáticamente al final de este mismo archivo.
-- Comprueba que RLS esta habilitada y que las tablas tienen politicas registradas.
do $$
declare
  nombre text;
  habilitada boolean;
  cantidad_politicas integer;
begin
  foreach nombre in array array[
    'usuarios', 'clientes', 'materialesReciclables', 'movimientosPuntos',
    'aliados', 'recompensas', 'canjes', 'centrosAcopio',
    'solicitudesRecogida', 'entidadesFinancieras'
  ] loop
    select c.relrowsecurity into habilitada
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = nombre;
    if habilitada is distinct from true then
      raise exception 'RLS no esta habilitada en public.%', nombre;
    end if;
    select count(*) into cantidad_politicas from pg_policies
      where schemaname = 'public' and tablename = nombre;
    if cantidad_politicas = 0 then
      raise exception 'No hay politicas RLS para public.%', nombre;
    end if;
  end loop;
  raise notice 'Correcto: RLS habilitada y con politicas en las diez tablas.';
end;
$$;

-- Revisa destinatarios, operaciones y expresiones de cada politica.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'usuarios', 'clientes', 'materialesReciclables', 'movimientosPuntos',
    'aliados', 'recompensas', 'canjes', 'centrosAcopio',
    'solicitudesRecogida', 'entidadesFinancieras'
  )
order by tablename, policyname;
