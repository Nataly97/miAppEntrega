# Base de datos - Fase 1

Proveedor elegido: Supabase.

La app lee la configuracion desde `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Para configurarlo, crea un archivo `.env` en la raiz de `miAppEntrega` tomando como base `.env.example`.

## Colecciones

### usuarios

Representa las cuentas que pueden entrar a la app.

Campos:
- `id`: identificador unico.
- `nombre`: nombre visible.
- `usuario`: nombre de usuario para iniciar sesion.
- `correo`: correo de acceso.
- `rol`: `administrador`, `empleado` o `cliente`.
- `activo`: estado de la cuenta.
- `fechaCreacion`: fecha de registro.

Las claves se administran en Supabase Auth y no se guardan en la tabla `usuarios`. Las cuentas administrativas y de empleados se crean primero en Supabase Auth y luego se les asigna su rol en el perfil.

### clientes

Informacion extendida de los usuarios con rol cliente.

Campos:
- `id`: identificador unico.
- `usuarioId`: referencia a `usuarios`.
- `documento`: numero de documento.
- `telefono`: telefono de contacto.
- `direccion`: ubicacion del cliente.
- `puntosDisponibles`: puntos listos para canjear.
- `puntosAcumulados`: total historico de puntos ganados.

### materialesReciclables

Catalogo de residuos que generan puntos.

Campos:
- `id`: identificador unico.
- `nombre`: nombre del material.
- `unidadMedida`: `kg` o `unidad`.
- `puntosPorUnidad`: puntos otorgados por unidad.
- `activo`: disponibilidad del material.

### movimientosPuntos

Historial de acumulaciones, canjes y ajustes.

Campos:
- `id`: identificador unico.
- `clienteId`: referencia a `clientes`.
- `empleadoId`: usuario que registra el movimiento.
- `materialId`: material reciclado cuando aplica.
- `tipo`: `acumulacion`, `canje` o `ajuste`.
- `cantidadMaterial`: cantidad recibida.
- `puntos`: puntos sumados o descontados.
- `descripcion`: detalle del movimiento.
- `fecha`: fecha del movimiento.

### aliados

Empresas o comercios donde se redimen beneficios.

Campos:
- `id`: identificador unico.
- `nombre`: nombre del aliado.
- `categoria`: tipo de aliado.
- `ciudad`: ciudad principal.
- `activo`: estado del convenio.

### recompensas

Productos, servicios o bonos disponibles para canje.

Campos:
- `id`: identificador unico.
- `aliadoId`: referencia a `aliados`.
- `nombre`: nombre de la recompensa.
- `descripcion`: condiciones basicas.
- `puntosRequeridos`: costo en puntos.
- `stock`: unidades disponibles.
- `activo`: disponibilidad.

### canjes

Solicitudes y entregas realizadas por clientes.

Campos:
- `id`: identificador unico.
- `clienteId`: referencia a `clientes`.
- `recompensaId`: referencia a `recompensas`.
- `empleadoId`: empleado que entrega, si aplica.
- `puntosUsados`: puntos descontados.
- `estado`: `pendiente`, `aprobado`, `entregado` o `cancelado`.
- `fechaSolicitud`: fecha de solicitud.
- `fechaEntrega`: fecha de entrega, si aplica.

### centrosAcopio

Puntos fisicos donde se recibe reciclaje.

Campos:
- `id`: identificador unico.
- `nombre`: nombre del centro.
- `direccion`: direccion.
- `ciudad`: ciudad.
- `activo`: estado del punto.

## Datos iniciales para Supabase

El archivo `src/datos/modeloBaseDatos.ts` contiene datos de ejemplo usados en las metricas de la interfaz. No los cargues como usuarios reales: las cuentas deben crearse en Supabase Auth y vincularse con sus perfiles.

## SQL inicial

En el SQL Editor de Supabase puedes crear las tablas con estos nombres y campos para que coincidan con el codigo actual de la app:

```sql
create table usuarios (
  id text primary key,
  nombre text not null,
  usuario text not null,
  correo text not null,
  rol text not null check (rol in ('administrador', 'empleado', 'cliente')),
  activo boolean not null default true,
  "fechaCreacion" text not null
);

create table clientes (
  id text primary key,
  "usuarioId" text not null references usuarios(id),
  documento text not null,
  telefono text not null,
  direccion text not null,
  "puntosDisponibles" integer not null default 0,
  "puntosAcumulados" integer not null default 0
);

create table "materialesReciclables" (
  id text primary key,
  nombre text not null,
  "unidadMedida" text not null check ("unidadMedida" in ('kg', 'unidad')),
  "puntosPorUnidad" integer not null,
  activo boolean not null default true
);

create table "movimientosPuntos" (
  id text primary key,
  "clienteId" text not null references clientes(id),
  "empleadoId" text not null references usuarios(id),
  "materialId" text references "materialesReciclables"(id),
  tipo text not null check (tipo in ('acumulacion', 'canje', 'ajuste')),
  "cantidadMaterial" numeric,
  puntos integer not null,
  descripcion text not null,
  fecha text not null
);

create table aliados (
  id text primary key,
  nombre text not null,
  categoria text not null,
  ciudad text not null,
  activo boolean not null default true
);

create table recompensas (
  id text primary key,
  "aliadoId" text not null references aliados(id),
  nombre text not null,
  descripcion text not null,
  "puntosRequeridos" integer not null,
  stock integer not null,
  activo boolean not null default true
);

create table canjes (
  id text primary key,
  "clienteId" text not null references clientes(id),
  "recompensaId" text not null references recompensas(id),
  "empleadoId" text references usuarios(id),
  "puntosUsados" integer not null,
  estado text not null check (estado in ('pendiente', 'aprobado', 'entregado', 'cancelado')),
  "fechaSolicitud" text not null,
  "fechaEntrega" text
);

create table "centrosAcopio" (
  id text primary key,
  nombre text not null,
  direccion text not null,
  ciudad text not null,
  activo boolean not null default true
);
```

## Configuracion final de autenticacion y RLS

Despues de crear las tablas, ejecuta [`supabase/entrega_final.sql`](../supabase/entrega_final.sql) en el SQL Editor de Supabase. El script quita la columna de claves en texto plano, crea los perfiles de cliente desde Supabase Auth y aplica politicas RLS para separar operaciones de clientes, empleados y administradores. No se deben habilitar politicas de lectura o escritura publica para `anon`.

## Relacion entre entidades

- `usuarios` 1 a 1 `clientes` cuando el rol es cliente.
- `clientes` 1 a muchos `movimientosPuntos`.
- `materialesReciclables` 1 a muchos `movimientosPuntos`.
- `aliados` 1 a muchos `recompensas`.
- `clientes` 1 a muchos `canjes`.
- `recompensas` 1 a muchos `canjes`.
- `usuarios` con rol empleado puede registrar `movimientosPuntos` y entregar `canjes`.
