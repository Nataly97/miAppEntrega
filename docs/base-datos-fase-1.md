# Base de datos - Fase 1

Proveedor elegido: Firebase Realtime Database.

La app lee la URL desde `EXPO_PUBLIC_FIREBASE_DATABASE_URL`. Para configurarlo, crea un archivo `.env` en la raiz de `miAppEntrega` tomando como base `.env.example`.

## Colecciones

### usuarios

Representa las cuentas que pueden entrar a la app.

Campos:
- `id`: identificador unico.
- `nombre`: nombre visible.
- `usuario`: nombre de usuario para iniciar sesion.
- `correo`: correo de acceso.
- `clave`: clave de acceso para la fase academica.
- `rol`: `administrador`, `empleado` o `cliente`.
- `activo`: estado de la cuenta.
- `fechaCreacion`: fecha de registro.

Usuarios semilla para pruebas:
- Administrador: `admin` / `admin123`
- Empleado: `empleado` / `empleado123`
- Cliente: `cliente` / `cliente123`

Nota: guardar claves en texto plano solo es aceptable para esta fase academica inicial. En una version real se debe usar Firebase Authentication o contrasenas cifradas desde un backend.

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

## JSON inicial para Firebase

El archivo `src/datos/modeloBaseDatos.ts` contiene datos semilla para estas colecciones. Ese mismo objeto puede usarse desde `guardarDatosIniciales()` en `src/servicios/firebase.ts` para cargar informacion inicial en la base de datos.

## Reglas sugeridas para desarrollo

Estas reglas sirven solo para pruebas academicas de fase 1. En fases posteriores se deben reemplazar por reglas con autenticacion y permisos por rol.

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## Relacion entre entidades

- `usuarios` 1 a 1 `clientes` cuando el rol es cliente.
- `clientes` 1 a muchos `movimientosPuntos`.
- `materialesReciclables` 1 a muchos `movimientosPuntos`.
- `aliados` 1 a muchos `recompensas`.
- `clientes` 1 a muchos `canjes`.
- `recompensas` 1 a muchos `canjes`.
- `usuarios` con rol empleado puede registrar `movimientosPuntos` y entregar `canjes`.
