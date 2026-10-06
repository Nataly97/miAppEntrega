// Este archivo guarda los tipos principales de la base de datos.
// La idea es tener una guia clara de que campos debe tener cada entidad.

// Roles permitidos en el sistema. Cada rol tiene permisos diferentes en la app.
export type RolUsuario = 'administrador' | 'empleado' | 'cliente';

// Estados posibles para un canje.
export type EstadoCanje = 'pendiente' | 'aprobado' | 'entregado' | 'cancelado';

// Tipos de movimientos que pueden afectar los puntos de un cliente.
export type TipoMovimientoPuntos = 'acumulacion' | 'canje' | 'ajuste';

// Usuario representa una cuenta que puede iniciar sesion.
export type Usuario = {
  id: string;
  nombre: string;
  usuario: string;
  correo: string;
  clave: string;
  rol: RolUsuario;
  activo: boolean;
  fechaCreacion: string;
};

// Cliente guarda datos adicionales del usuario que recicla y acumula puntos.
export type Cliente = {
  id: string;
  usuarioId: string;
  documento: string;
  telefono: string;
  direccion: string;
  puntosDisponibles: number;
  puntosAcumulados: number;
};

// MaterialReciclable define cuanto vale cada material en puntos.
export type MaterialReciclable = {
  id: string;
  nombre: string;
  unidadMedida: 'kg' | 'unidad';
  puntosPorUnidad: number;
  activo: boolean;
};

// MovimientoPuntos es el historial de puntos ganados, canjeados o ajustados.
export type MovimientoPuntos = {
  id: string;
  clienteId: string;
  empleadoId: string;
  materialId?: string;
  tipo: TipoMovimientoPuntos;
  cantidadMaterial?: number;
  puntos: number;
  descripcion: string;
  fecha: string;
};

// Aliado es una empresa o negocio donde se pueden redimir beneficios.
export type Aliado = {
  id: string;
  nombre: string;
  categoria: string;
  ciudad: string;
  activo: boolean;
};

// Recompensa es un producto, servicio o bono que se puede comprar con puntos.
export type Recompensa = {
  id: string;
  aliadoId: string;
  nombre: string;
  descripcion: string;
  puntosRequeridos: number;
  stock: number;
  activo: boolean;
};

// Canje guarda la solicitud o entrega de una recompensa.
export type Canje = {
  id: string;
  clienteId: string;
  recompensaId: string;
  empleadoId?: string;
  puntosUsados: number;
  estado: EstadoCanje;
  fechaSolicitud: string;
  fechaEntrega?: string;
};

// CentroAcopio representa un lugar fisico donde se recibe reciclaje.
export type CentroAcopio = {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  activo: boolean;
};

// Este tipo resume todas las colecciones que espero tener en Firebase.
export type ColeccionesFirebase = {
  usuarios: Record<string, Usuario>;
  clientes: Record<string, Cliente>;
  materialesReciclables: Record<string, MaterialReciclable>;
  movimientosPuntos: Record<string, MovimientoPuntos>;
  aliados: Record<string, Aliado>;
  recompensas: Record<string, Recompensa>;
  canjes: Record<string, Canje>;
  centrosAcopio: Record<string, CentroAcopio>;
};
