import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../App';
import { coleccionesFase1, datosIniciales } from '../src/datos/modeloBaseDatos';
import type { Cliente, RolUsuario } from '../src/modelos/baseDatos';
import { obtenerColeccion, verificarConexionSupabase } from '../src/servicios/supabase';
import { cerrarSesion } from '../src/servicios/autenticacion';
import { colores } from '../src/tema/colores';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Esta estructura define la informacion que voy a mostrar en el panel de cada rol.
type ConfiguracionPanel = {
  titulo: string;
  descripcion: string;
  metricas: { etiqueta: string; valor: number | string }[];
  permisos: string[];
  moduloPrincipal: {
    titulo: string;
    items: string[];
  };
};

// Esta funcion arma una vista diferente segun el rol del usuario.
// Asi centralizo permisos, metricas y modulos en un solo lugar.
const crearConfiguracionPanel = (rol: RolUsuario, clienteReal: Cliente | null): ConfiguracionPanel => {
  const cliente = clienteReal ?? { puntosDisponibles: 0, puntosAcumulados: 0 };

  // Cada rol tiene su propio resumen, permisos y modulo principal.
  const paneles: Record<RolUsuario, ConfiguracionPanel> = {
    administrador: {
      titulo: 'Panel administrador',
      descripcion: 'Control completo de usuarios, aliados, puntos, canjes y catalogos.',
      metricas: [
        { etiqueta: 'Usuarios', valor: Object.keys(datosIniciales.usuarios).length },
        { etiqueta: 'Clientes', valor: Object.keys(datosIniciales.clientes).length },
        { etiqueta: 'Movimientos', valor: Object.keys(datosIniciales.movimientosPuntos).length },
        { etiqueta: 'Canjes', valor: Object.keys(datosIniciales.canjes).length },
      ],
      permisos: [
        'Consultar todos los clientes y empleados',
        'Administrar materiales reciclables',
        'Crear y editar aliados',
        'Revisar historial completo de puntos',
        'Aprobar o cancelar canjes',
      ],
      moduloPrincipal: {
        titulo: 'Gestion general',
        items: ['Usuarios activos', 'Aliados disponibles', 'Catalogo de recompensas', 'Auditoria de puntos'],
      },
    },
    empleado: {
      titulo: 'Panel empleado',
      descripcion: 'Operacion en punto de atencion: clientes, reciclaje, puntos y entregas.',
      metricas: [
        { etiqueta: 'Clientes registrados', valor: Object.keys(datosIniciales.clientes).length },
        { etiqueta: 'Materiales activos', valor: Object.keys(datosIniciales.materialesReciclables).length },
        { etiqueta: 'Puntos registrados', valor: datosIniciales.movimientosPuntos.mov_001.puntos },
        { etiqueta: 'Canjes por entregar', valor: 1 },
      ],
      permisos: [
        'Crear clientes',
        'Registrar material reciclado',
        'Asignar puntos por entrega',
        'Consultar clientes',
        'Entregar canjes aprobados',
      ],
      moduloPrincipal: {
        titulo: 'Operacion diaria',
        items: ['Nuevo cliente', 'Registrar puntos', 'Buscar cliente', 'Validar recompensa'],
      },
    },
    cliente: {
      titulo: 'Panel cliente',
      descripcion: 'Consulta tu perfil, puntos disponibles, movimientos y recompensas.',
      metricas: [
        { etiqueta: 'Puntos disponibles', valor: cliente.puntosDisponibles },
        { etiqueta: 'Puntos acumulados', valor: cliente.puntosAcumulados },
        { etiqueta: 'Canjes realizados', valor: Object.keys(datosIniciales.canjes).length },
        { etiqueta: 'Recompensas', valor: Object.keys(datosIniciales.recompensas).length },
      ],
      permisos: [
        'Ver perfil personal',
        'Consultar historial de puntos',
        'Consultar historial de canjes',
        'Canjear puntos por recompensas',
      ],
      moduloPrincipal: {
        titulo: 'Mis beneficios',
        items: ['Bono de mercado disponible', 'Ultima entrega: Plastico PET', 'Canje entregado: 300 puntos'],
      },
    },
  };

  return paneles[rol];
};

export default function Home({ navigation, route }: Props) {
  // Recibo desde el login los datos del usuario autenticado.
  const { rol, nombre, correo, usuarioId, usuario } = route.params;
  const [estadoConexion, setEstadoConexion] = useState('Verificando conexion...');
  const [conexionActiva, setConexionActiva] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  // Al cargar la pantalla reviso si Supabase esta conectado.
  useEffect(() => {
    verificarConexionSupabase().then((resultado) => {
      setConexionActiva(resultado.ok);
      setEstadoConexion(resultado.mensaje);
    });
  }, []);

  // Cargo los puntos del cliente autenticado desde su propio registro en Supabase.
  useEffect(() => {
    if (rol !== 'cliente') return;
    obtenerColeccion('clientes')
      .then((clientes) => setCliente(Object.values(clientes).find((item) => item.usuarioId === usuarioId) ?? null))
      .catch(() => setCliente(null));
  }, [rol, usuarioId]);

  // Memorizo la configuracion para recalcularla solo si cambia el rol o usuario.
  const panel = useMemo(() => crearConfiguracionPanel(rol, cliente), [rol, cliente]);

  // Cierro la sesion guardada para que la siguiente pantalla sea el login.
  const salir = async () => {
    try {
      await cerrarSesion();
    } catch (error) {
      Alert.alert('No se pudo cerrar sesion', error instanceof Error ? error.message : 'Intenta de nuevo.');
    }
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      {/* Encabezado con nombre del usuario y boton para cerrar sesion. */}
      <View style={estilos.header}>
        <View style={estilos.headerTexto}>
          <Text style={estilos.marca}>ReciCash</Text>
          <Text style={estilos.titulo}>Hola, {nombre}</Text>
          <Text style={estilos.subtitulo}>{panel.titulo}</Text>
        </View>

        <TouchableOpacity style={estilos.botonSalir} onPress={() => void salir()}>
          <Text style={estilos.textoBotonSalir}>Salir</Text>
        </TouchableOpacity>
      </View>

      {rol === 'administrador' ? (
        <TouchableOpacity style={estilos.botonGestion} onPress={() => navigation.navigate('GestionDatos')}>
          <Text style={estilos.textoBotonGestion}>Gestionar datos de Supabase</Text>
        </TouchableOpacity>
      ) : null}

      {/* Tarjeta con los datos basicos que fueron validados en el login. */}
      <View style={estilos.tarjetaPerfil}>
        <View>
          <Text style={estilos.etiquetaPerfil}>Usuario</Text>
          <Text style={estilos.valorPerfil}>{usuario}</Text>
        </View>
        <View>
          <Text style={estilos.etiquetaPerfil}>Correo</Text>
          <Text style={estilos.valorPerfil}>{correo}</Text>
        </View>
        <View>
          <Text style={estilos.etiquetaPerfil}>Rol validado</Text>
          <Text style={estilos.valorPerfil}>{rol}</Text>
        </View>
      </View>

      {/* Estado de conexion a la base de datos. */}
      <View style={[estilos.estadoConexion, conexionActiva ? estilos.estadoOk : estilos.estadoPendiente]}>
        <Text style={estilos.estadoTitulo}>Base de datos</Text>
        <Text style={estilos.estadoTexto}>{estadoConexion}</Text>
      </View>

      {/* Descripcion general del panel segun el rol. */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>{panel.titulo}</Text>
        <Text style={estilos.descripcion}>{panel.descripcion}</Text>
      </View>

      {/* Metricas principales de cada rol. */}
      <View style={estilos.resumenGrid}>
        {panel.metricas.map((item) => (
          <View key={item.etiqueta} style={estilos.tarjetaResumen}>
            <Text style={estilos.valorResumen}>{item.valor}</Text>
            <Text style={estilos.etiquetaResumen}>{item.etiqueta}</Text>
          </View>
        ))}
      </View>

      {/* Lista de permisos que tendra este rol en el sistema. */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>Permisos disponibles</Text>
        <View style={estilos.listaAcciones}>
          {panel.permisos.map((permiso) => (
            <View key={permiso} style={estilos.accion}>
              <View style={estilos.puntoAccion} />
              <Text style={estilos.textoAccion}>{permiso}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Acciones o accesos principales para el rol actual. */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>{panel.moduloPrincipal.titulo}</Text>
        <View style={estilos.modulos}>
          {panel.moduloPrincipal.items.map((item) => (
            <TouchableOpacity key={item} style={estilos.modulo}>
              <Text style={estilos.textoModulo}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Solo el administrador ve el modelo completo de colecciones. */}
      {rol === 'administrador' ? (
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Modelo de datos fase 1</Text>
          <View style={estilos.colecciones}>
            {coleccionesFase1.map((coleccion) => (
              <Text key={coleccion} style={estilos.coleccion}>
                {coleccion}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

// Estilos de Home. Uso tarjetas sencillas para que cada bloque se entienda facil.
const estilos = StyleSheet.create({
  contenedor: {
    flexGrow: 1,
    backgroundColor: colores.fondo,
    padding: 22,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 18,
  },
  headerTexto: {
    flex: 1,
  },
  marca: {
    color: colores.verde,
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  titulo: {
    color: colores.tinta,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  subtitulo: {
    color: colores.textoSuave,
    fontSize: 15,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  botonSalir: {
    minWidth: 72,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.blanco,
  },
  textoBotonSalir: {
    color: colores.verdeOscuro,
    fontSize: 14,
    fontWeight: '800',
  },
  botonGestion: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  textoBotonGestion: {
    color: colores.blanco,
    fontSize: 15,
    fontWeight: '800',
  },
  tarjetaPerfil: {
    backgroundColor: colores.blanco,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colores.borde,
    gap: 12,
    marginBottom: 18,
  },
  etiquetaPerfil: {
    color: colores.textoSuave,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  valorPerfil: {
    color: colores.tinta,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  estadoConexion: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  estadoOk: {
    backgroundColor: colores.verdeClaro,
    borderColor: colores.verde,
  },
  estadoPendiente: {
    backgroundColor: '#fff8df',
    borderColor: colores.amarillo,
  },
  estadoTitulo: {
    color: colores.tinta,
    fontSize: 15,
    fontWeight: '900',
  },
  estadoTexto: {
    color: colores.textoSuave,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  seccion: {
    backgroundColor: colores.blanco,
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: colores.borde,
    marginBottom: 18,
  },
  tituloSeccion: {
    color: colores.tinta,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  descripcion: {
    color: colores.textoSuave,
    fontSize: 15,
    lineHeight: 22,
  },
  resumenGrid: {
    gap: 12,
    marginBottom: 18,
  },
  tarjetaResumen: {
    backgroundColor: colores.blanco,
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  valorResumen: {
    color: colores.verdeOscuro,
    fontSize: 28,
    fontWeight: '900',
  },
  etiquetaResumen: {
    color: colores.textoSuave,
    fontSize: 14,
    marginTop: 4,
  },
  listaAcciones: {
    gap: 10,
  },
  accion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  puntoAccion: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colores.amarillo,
  },
  textoAccion: {
    color: colores.tinta,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  modulos: {
    gap: 10,
  },
  modulo: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colores.borde,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: colores.menta,
  },
  textoModulo: {
    color: colores.verdeOscuro,
    fontSize: 15,
    fontWeight: '800',
  },
  colecciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  coleccion: {
    backgroundColor: colores.menta,
    color: colores.verdeOscuro,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '800',
  },
});
