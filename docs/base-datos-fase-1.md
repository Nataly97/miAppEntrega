# Base de datos - Fase 1

Proveedor elegido: Supabase.

La app lee `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (también acepta el alias existente `EXPO_PUBLIC_SUPABASE_KEY`). Crea un archivo `.env` en la raíz; la URL debe ser la raíz del proyecto, sin `/rest/v1`.

## Colecciones

### usuarios

Representa las cuentas que pueden entrar a la app.

Campos:
- `id`: identificador unico.
- `nombre`: nombre visible.
- `usuario`: nombre de usuario para iniciar sesion.
- `correo`: correo de acceso.
- `rol`: `administrador`, `gestor`, `entidad_financiera` o `cliente`.
- `activo`: estado de la cuenta.
- `fechaCreacion`: fecha de registro.

Las claves se administran en Supabase Auth y no se guardan en la tabla `usuarios`. El registro público crea clientes; el administrador crea cuentas internas usando una Edge Function con clave de servidor.

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

## Esquema completo

En el SQL Editor de un proyecto Supabase nuevo ejecuta [supabase/esquema_inicial.sql](../supabase/esquema_inicial.sql). Este unico archivo crea las diez tablas, sus relaciones, indices unicos, funciones, triggers, permisos y politicas RLS. Al final comprueba que las diez tablas tengan RLS activa y politicas registradas.

El esquema esta preparado para una instalacion nueva. No lo ejecutes encima de una base que ya tenga datos. Las contrasenas se guardan unicamente en Supabase Auth; la tabla usuarios conserva el perfil y el rol. La Edge Function que crea cuentas internas se despliega aparte con Supabase CLI.

## Relacion entre entidades

- `usuarios` 1 a 1 `clientes` cuando el rol es cliente.
- `clientes` 1 a muchos `movimientosPuntos`.
- `materialesReciclables` 1 a muchos `movimientosPuntos`.
- `aliados` 1 a muchos `recompensas`.
- `clientes` 1 a muchos `canjes`.
- `recompensas` 1 a muchos `canjes`.
- `usuarios` con rol gestor puede operar solicitudes de recogida.
- `usuarios` con rol entidad financiera puede consultar el historial aprobado/finalizado de canjes.
- `solicitudesRecogida` relaciona cada recogida con un cliente y restringe al gestor la edición del estado.
- `entidadesFinancieras` enlaza el perfil financiero con su cuenta de Supabase Auth.
