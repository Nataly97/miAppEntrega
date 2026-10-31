import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../App';
import { cerrarSesion } from '../src/servicios/autenticacion';
import { supabase, verificarConexionSupabase } from '../src/servicios/supabase';
import { colores } from '../src/tema/colores';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type Atajo = { titulo: string; detalle: string; grupo: string; simbolo: string };
const nombresRoles = { administrador: 'Administración', gestor: 'Gestor de recogidas', entidad_financiera: 'Entidad financiera', cliente: 'Cliente' };
const atajos: Record<Props['route']['params']['rol'], Atajo[]> = {
  administrador: [
    { titulo: 'Usuarios y roles', detalle: 'Cuentas, permisos y perfiles por tipo', grupo: 'usuarios', simbolo: '01' },
    { titulo: 'Productos y servicios', detalle: 'Recompensas y catálogo de canjes', grupo: 'productos', simbolo: '02' },
    { titulo: 'Puntos y canjes', detalle: 'Materiales reciclables y movimientos', grupo: 'puntos', simbolo: '03' },
    { titulo: 'Recogidas', detalle: 'Centros de acopio y solicitudes', grupo: 'recogidas', simbolo: '04' },
  ],
  cliente: [
    { titulo: 'Solicitar recogida', detalle: 'Programa el retiro de tus reciclables', grupo: 'recogidas', simbolo: '01' },
    { titulo: 'Mis puntos', detalle: 'Consulta tu saldo e historial', grupo: 'puntos', simbolo: '02' },
    { titulo: 'Canjes disponibles', detalle: 'Explora recompensas y arma tu carrito', grupo: 'productos', simbolo: '03' },
  ],
  gestor: [
    { titulo: 'Solicitudes de recogida', detalle: 'Revisa y gestiona la operación', grupo: 'recogidas', simbolo: '01' },
    { titulo: 'Historial de recogidas', detalle: 'Consulta el estado de cada solicitud', grupo: 'historial', simbolo: '02' },
    { titulo: 'Reportes', detalle: 'Resumen de la operación', grupo: 'reportes', simbolo: '03' },
  ],
  entidad_financiera: [
    { titulo: 'Historial de canjes', detalle: 'Canjes aprobados y entregados', grupo: 'canjes', simbolo: '01' },
  ],
};

export default function Home({ navigation, route }: Props) {
  const { rol, nombre, correo, usuarioId } = route.params;
  const [conexion, setConexion] = useState('Verificando conexión…');
  const [cargando, setCargando] = useState(true);
  const [resumen, setResumen] = useState<{ etiqueta: string; valor: string }[]>([]);

  useEffect(() => {
    let activo = true;
    // Cargo el resumen del rol y muestro un mensaje si falla la consulta, sin tumbar la pantalla.
    const cargarResumen = async () => {
      try {
        const estadoConexion = await verificarConexionSupabase();
        if (activo) setConexion(estadoConexion.mensaje);
        const clienteSupabase = supabase;
        if (!clienteSupabase) return;

        if (rol === 'administrador') {
          const tablas = [['usuarios', 'Usuarios'], ['clientes', 'Clientes'], ['recompensas', 'Recompensas'], ['solicitudesRecogida', 'Recogidas']] as const;
          const datos = await Promise.all(tablas.map(async ([tabla, etiqueta]) => {
            const { count, error } = await clienteSupabase.from(tabla).select('*', { count: 'exact', head: true });
            if (error) throw error;
            return { etiqueta, valor: String(count ?? 0) };
          }));
          if (activo) setResumen(datos);
        } else if (rol === 'cliente') {
          const { data, error } = await clienteSupabase.from('clientes').select('puntosDisponibles,puntosAcumulados').eq('usuarioId', usuarioId).maybeSingle();
          if (error) throw error;
          if (activo) setResumen([{ etiqueta: 'Puntos disponibles', valor: String(data?.puntosDisponibles ?? 0) }, { etiqueta: 'Puntos acumulados', valor: String(data?.puntosAcumulados ?? 0) }]);
        } else if (rol === 'gestor') {
          const { data, error } = await clienteSupabase.rpc('lista_recogidas_gestor');
          if (error) throw error;
          if (activo) setResumen([{ etiqueta: 'Solicitudes por gestionar', valor: String(data?.filter((fila: { estado: string }) => fila.estado === 'pendiente').length ?? 0) }, { etiqueta: 'Recogidas asignadas', valor: String(data?.filter((fila: { estado: string }) => fila.estado === 'asignada').length ?? 0) }]);
        } else {
          const { data, error } = await clienteSupabase.rpc('historial_canjes_financieras');
          if (error) throw error;
          if (activo) setResumen([{ etiqueta: 'Canjes en historial', valor: String(data?.length ?? 0) }]);
        }
      } catch (error) {
        if (activo) setConexion(error instanceof Error ? `No se pudo cargar el resumen: ${error.message}` : 'No se pudo cargar el resumen. Inténtalo de nuevo.');
      } finally {
        if (activo) setCargando(false);
      }
    };
    void cargarResumen();
    return () => { activo = false; };
  }, [rol, usuarioId]);

  const salir = async () => {
    try { await cerrarSesion(); }
    catch (error) { Alert.alert('No se pudo cerrar sesión', error instanceof Error ? error.message : 'Inténtalo de nuevo.'); }
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <View style={estilos.contenido}>
        <View style={estilos.barra}>
          <View style={estilos.marca}><View style={estilos.logo}><Text style={estilos.logoTexto}>R</Text></View><Text style={estilos.marcaTexto}>ReciCash</Text></View>
          <TouchableOpacity accessibilityRole="button" style={estilos.botonSalir} onPress={() => void salir()}><Text style={estilos.textoSalir}>Cerrar sesión</Text></TouchableOpacity>
        </View>
        <View style={estilos.hero}>
          <View style={{ flex: 1 }}><Text style={estilos.saludo}>TU PANEL DE CONTROL</Text><Text style={estilos.titulo}>Hola, {nombre}</Text><Text style={estilos.subtitulo}>{nombresRoles[rol]} · {correo}</Text></View>
          <View style={estilos.sello}><Text style={estilos.selloTexto}>♻</Text></View>
        </View>
        <View style={estilos.estado}>{cargando ? <ActivityIndicator size="small" color={colores.verde} /> : <View style={estilos.puntoEstado} />}<Text style={estilos.estadoTexto}>{conexion}</Text></View>

        {resumen.length > 0 ? <View style={estilos.resumen}><Text style={estilos.seccionTitulo}>Resumen</Text><View style={estilos.grid}>{resumen.map((item) => <View key={item.etiqueta} style={estilos.metrica}><Text style={estilos.metricaValor}>{item.valor}</Text><Text style={estilos.metricaEtiqueta}>{item.etiqueta}</Text></View>)}</View></View> : null}

        <View style={estilos.seccionEncabezado}><View><Text style={estilos.seccionTitulo}>Tu espacio</Text><Text style={estilos.seccionSubtitulo}>Elige un módulo para continuar</Text></View><Text style={estilos.contador}>{atajos[rol].length} MÓDULOS</Text></View>
        <View style={estilos.menu}>{atajos[rol].map((item) => <TouchableOpacity key={item.grupo} accessibilityRole="button" style={estilos.tarjeta} onPress={() => navigation.navigate('GestionDatos', { grupo: item.grupo, usuarioId, rol })}>
          <View style={estilos.icono}><Text style={estilos.iconoTexto}>{item.simbolo}</Text></View><View style={estilos.tarjetaTexto}><Text style={estilos.tarjetaTitulo}>{item.titulo}</Text><Text style={estilos.tarjetaDetalle}>{item.detalle}</Text></View><Text style={estilos.flecha}>›</Text>
        </TouchableOpacity>)}</View>

        <View style={estilos.pie}><Text style={estilos.pieMarca}>ReciCash</Text><Text style={estilos.pieTexto}>Reciclar, sumar y transformar.</Text><Text style={estilos.pieLegal}>Sesión protegida · {usuarioId.slice(0, 8)}</Text></View>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, backgroundColor: colores.fondo, padding: 20, paddingTop: 30 },
  contenido: { width: '100%', maxWidth: 1060, alignSelf: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 9 }, logo: { width: 34, height: 34, borderRadius: 11, backgroundColor: colores.azulOscuro, alignItems: 'center', justifyContent: 'center' }, logoTexto: { color: colores.blanco, fontWeight: '900', fontSize: 18 }, marcaTexto: { color: colores.azulOscuro, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  botonSalir: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: colores.blanco, borderWidth: 1, borderColor: colores.borde }, textoSalir: { color: colores.azulOscuro, fontSize: 13, fontWeight: '800' },
  hero: { backgroundColor: colores.azulOscuro, borderRadius: 22, padding: 26, flexDirection: 'row', alignItems: 'center', marginBottom: 14, overflow: 'hidden' }, saludo: { color: '#b9c5ff', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 }, titulo: { color: colores.blanco, fontSize: 31, fontWeight: '900', marginTop: 8 }, subtitulo: { color: '#d7dcf7', fontSize: 14, marginTop: 6 }, sello: { width: 74, height: 74, borderRadius: 25, backgroundColor: '#24264f', alignItems: 'center', justifyContent: 'center', marginLeft: 16 }, selloTexto: { color: '#8fe1ad', fontSize: 38 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, backgroundColor: colores.blanco, borderRadius: 12, marginBottom: 23, borderWidth: 1, borderColor: colores.borde }, puntoEstado: { width: 9, height: 9, borderRadius: 5, backgroundColor: colores.verde }, estadoTexto: { color: colores.textoSuave, flex: 1, fontSize: 12 },
  resumen: { marginBottom: 24 }, seccionEncabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, seccionTitulo: { color: colores.azulOscuro, fontSize: 20, fontWeight: '900' }, seccionSubtitulo: { color: colores.textoSuave, fontSize: 13, marginTop: 3 }, contador: { color: colores.azulOscuro, backgroundColor: '#e7e9f5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, fontSize: 10, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }, metrica: { flexGrow: 1, minWidth: 140, backgroundColor: colores.blanco, borderRadius: 14, padding: 15, borderWidth: 1, borderColor: colores.borde }, metricaValor: { color: colores.azulOscuro, fontSize: 25, fontWeight: '900' }, metricaEtiqueta: { color: colores.textoSuave, fontSize: 12, marginTop: 4 },
  menu: { gap: 10 }, tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 82, padding: 14, backgroundColor: colores.blanco, borderWidth: 1, borderColor: colores.borde, borderRadius: 15 }, icono: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#eff0fa' }, iconoTexto: { color: colores.azulOscuro, fontSize: 14, fontWeight: '900' }, tarjetaTexto: { flex: 1 }, tarjetaTitulo: { color: colores.azulOscuro, fontSize: 15, fontWeight: '900' }, tarjetaDetalle: { color: colores.textoSuave, fontSize: 12, marginTop: 4, lineHeight: 17 }, flecha: { color: colores.verde, fontSize: 29, fontWeight: '500', paddingHorizontal: 4 },
  pie: { alignItems: 'center', marginTop: 26, paddingVertical: 17, borderTopWidth: 1, borderTopColor: colores.borde }, pieMarca: { color: colores.azulOscuro, fontWeight: '900', fontSize: 13 }, pieTexto: { color: colores.textoSuave, fontSize: 12, marginTop: 4 }, pieLegal: { color: '#8a968e', fontSize: 10, marginTop: 8 },
});
