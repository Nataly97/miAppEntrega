import type { ColeccionesSupabase } from '../modelos/baseDatos';

// Lista de colecciones que debe tener mi base de datos en la fase 1.
// La uso tambien en Home para mostrar el modelo de datos del proyecto.
export const coleccionesFase1 = [
  'usuarios',
  'clientes',
  'materialesReciclables',
  'movimientosPuntos',
  'aliados',
  'recompensas',
  'canjes',
  'centrosAcopio',
  'solicitudesRecogida',
  'entidadesFinancieras',
] as const;

// Estos son datos iniciales para probar la app sin depender todavia de Supabase.
// Si Supabase esta configurado, estos mismos datos sirven como ejemplo para crear la base.
export const datosIniciales: ColeccionesSupabase = {
  // Perfiles de ejemplo para mostrar metricas del panel.
  usuarios: {
    admin_001: {
      id: 'admin_001',
      nombre: 'Administradora General',
      usuario: 'admin',
      correo: 'admin@ecopuntos.com',
      rol: 'administrador',
      activo: true,
      fechaCreacion: '2026-10-06',
    },
    empleado_001: {
      id: 'empleado_001',
      nombre: 'Empleado Punto Verde',
      usuario: 'empleado',
      correo: 'empleado@ecopuntos.com',
      rol: 'gestor',
      activo: true,
      fechaCreacion: '2026-10-06',
    },
    cliente_001: {
      id: 'cliente_001',
      nombre: 'Cliente EcoPuntos',
      usuario: 'cliente',
      correo: 'cliente@ecopuntos.com',
      rol: 'cliente',
      activo: true,
      fechaCreacion: '2026-10-06',
    },
  },
  // Informacion extendida del cliente de prueba.
  clientes: {
    cliente_001: {
      id: 'cliente_001',
      usuarioId: 'cliente_001',
      documento: '1000000001',
      telefono: '3000000000',
      direccion: 'Medellin, Antioquia',
      puntosDisponibles: 1280,
      puntosAcumulados: 1580,
    },
  },
  // Catalogo inicial de materiales que generan puntos.
  materialesReciclables: {
    plastico_pet: {
      id: 'plastico_pet',
      nombre: 'Plastico PET',
      unidadMedida: 'kg',
      puntosPorUnidad: 120,
      activo: true,
    },
    carton: {
      id: 'carton',
      nombre: 'Carton',
      unidadMedida: 'kg',
      puntosPorUnidad: 80,
      activo: true,
    },
  },
  // Primer movimiento de puntos para mostrar historial y resumen.
  movimientosPuntos: {
    mov_001: {
      id: 'mov_001',
      clienteId: 'cliente_001',
      empleadoId: 'empleado_001',
      materialId: 'plastico_pet',
      tipo: 'acumulacion',
      cantidadMaterial: 5,
      puntos: 600,
      descripcion: 'Entrega de plastico PET',
      fecha: '2026-10-06',
    },
  },
  // Aliados donde los clientes podran redimir recompensas.
  aliados: {
    aliado_001: {
      id: 'aliado_001',
      nombre: 'Mercado Aliado Verde',
      categoria: 'Mercado',
      ciudad: 'Medellin',
      activo: true,
    },
  },
  // Recompensas disponibles para canjear con puntos.
  recompensas: {
    recompensa_001: {
      id: 'recompensa_001',
      gestorId: 'empleado_001',
      aliadoId: null,
      nombre: 'Bono de mercado',
      descripcion: 'Bono redimible en productos seleccionados.',
      puntosRequeridos: 1000,
      stock: 25,
      activo: true,
    },
  },
  // Historial inicial de canjes.
  canjes: {
    canje_001: {
      id: 'canje_001',
      clienteId: 'cliente_001',
      recompensaId: 'recompensa_001',
      empleadoId: 'empleado_001',
      puntosUsados: 300,
      estado: 'entregado',
      fechaSolicitud: '2026-10-06',
      fechaEntrega: '2026-10-06',
    },
  },
  // Lugares donde se puede entregar reciclaje.
  centrosAcopio: {
    centro_001: {
      id: 'centro_001',
      nombre: 'Centro Verde Principal',
      direccion: 'Carrera 50 # 45-20',
      ciudad: 'Medellin',
      activo: true,
    },
  },
  solicitudesRecogida: {
    solicitud_ejemplo: { id: 'solicitud_ejemplo', clienteId: 'cliente_001', direccion: 'Dirección de ejemplo', fechaSolicitada: '2026-10-27T12:00:00.000Z', observaciones: '', estado: 'pendiente', fechaCreacion: '2026-10-27T12:00:00.000Z' },
  },
  entidadesFinancieras: {
    entidad_ejemplo: { id: 'entidad_ejemplo', usuarioId: 'usuario_ejemplo', nombre: 'Entidad financiera', identificacion: 'NIT de ejemplo', activo: true },
  },
};
