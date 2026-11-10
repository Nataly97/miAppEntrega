import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../App';
import { cerrarSesion } from '../src/servicios/autenticacion';
import { supabase, verificarConexionSupabase } from '../src/servicios/supabase';
import { colores } from '../src/tema/colores';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type Atajo = { titulo: string; detalle: string; grupo: string; simbolo: string };
const nombresRoles = { administrador: 'Administración', gestor: 'Gestor de recogidas', entidad_financiera: 'Entidad financiera', cliente: 'Cliente' };
const atajos: Record<Props['route']['params']['rol'], Atajo[]> = {
  administrador: [
    { titulo: 'Usuarios y roles', detalle: 'Cuentas, permisos y perfiles por tipo', grupo: 'usuarios', simbolo: '👥' },
    { titulo: 'Productos y servicios', detalle: 'Recompensas y catálogo de canjes', grupo: 'productos', simbolo: '🎁' },
    { titulo: 'Puntos y canjes', detalle: 'Materiales reciclables y movimientos', grupo: 'puntos', simbolo: '♻️' },
    { titulo: 'Recogidas', detalle: 'Centros de acopio y solicitudes', grupo: 'recogidas', simbolo: '🚚' },
  ],
  cliente: [
    { titulo: 'Solicitar recogida', detalle: 'Programa el retiro de tus reciclables', grupo: 'recogidas', simbolo: '🚚' },
    { titulo: 'Mis puntos', detalle: 'Consulta tu saldo e historial', grupo: 'puntos', simbolo: '✨' },
    { titulo: 'Canjes disponibles', detalle: 'Explora recompensas y arma tu carrito', grupo: 'productos', simbolo: '🎁' },
  ],
  gestor: [
    { titulo: 'Solicitudes de recogida', detalle: 'Revisa y gestiona la operación', grupo: 'recogidas', simbolo: '🚚' },
    { titulo: 'Historial de recogidas', detalle: 'Consulta el estado de cada solicitud', grupo: 'historial', simbolo: '🕘' },
    { titulo: 'Reportes', detalle: 'Resumen de la operación', grupo: 'reportes', simbolo: '📊' },
  ],
  entidad_financiera: [
    { titulo: 'Historial de canjes', detalle: 'Canjes aprobados y entregados', grupo: 'canjes', simbolo: '🎁' },
  ],
};

export default function Home({ navigation, route }: Props) {
  const { rol, nombre, correo, usuarioId } = route.params;
  const [conexion, setConexion] = useState('Verificando conexión…');
  const [cargando, setCargando] = useState(true);
  const [resumen, setResumen] = useState<{ etiqueta: string; valor: string }[]>([]);

  useFocusEffect(useCallback(() => {
    let activo = true;
    setCargando(true);
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
  }, [rol, usuarioId]));

  const salir = async () => {
    try { await cerrarSesion(); }
    catch (error) { Alert.alert('No se pudo cerrar sesión', error instanceof Error ? error.message : 'Inténtalo de nuevo.'); }
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <View style={estilos.contenido}>
        <View style={estilos.barra}>
          <View style={estilos.marca}>
            <Image accessibilityLabel="Logo ReciCash" source={require('../assets/logo-3r-energy.png')} resizeMode="contain" style={estilos.logo} />
            <Text style={estilos.marcaTexto}>ReciCash</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" style={estilos.botonSalir} onPress={() => void salir()}><Text style={estilos.textoSalir}>Cerrar sesión</Text></TouchableOpacity>
        </View>
        <View style={estilos.hero}>
          <View style={estilos.decoracionHero} />
          <View style={estilos.contenidoHero}>
            <Text style={estilos.saludo}>TU ESPACIO RECICASH</Text>
            <Text style={estilos.titulo}>¡Hola, {nombre}! <Text style={estilos.manoSaludo}>👋</Text></Text>
            <Text style={estilos.subtitulo}>Qué bueno tenerte por aquí. Estás en tu espacio de {nombresRoles[rol].toLowerCase()}.</Text>
            <View style={estilos.insigniaHero}><View style={estilos.puntoHero} /><Text style={estilos.textoInsignia}>{correo}</Text></View>
          </View>
          <View accessibilityLabel="Perfil" style={estilos.sello}><Text style={estilos.selloTexto}>👤</Text></View>
        </View>
        {/* Dejo el indicador de conexión comentado para poder activarlo cuando diagnostique una falla de Supabase. */}
        {/* <View style={estilos.estado}>{cargando ? <ActivityIndicator size="small" color={colores.verde} /> : <View style={estilos.puntoEstado} />}<Text style={estilos.estadoTexto}>{conexion}</Text></View> */}

        {resumen.length > 0 ? <View style={estilos.resumen}>
          <View style={estilos.cabeceraSeccion}><View><Text style={estilos.seccionTitulo}>{rol === 'cliente' ? 'Tu impacto' : 'Tu resumen'}</Text><Text style={estilos.seccionSubtitulo}>Una mirada rápida a tu actividad</Text></View><View style={estilos.acentoAmarillo} /></View>
          <View style={estilos.grid}>{resumen.map((item, indice) => <View key={item.etiqueta} style={estilos.metrica}>
            <View style={[estilos.acentoMetrica, indice % 2 === 0 ? estilos.acentoVerde : estilos.acentoMetricaAmarillo]} />
            <Text style={estilos.metricaValor}>{item.valor}</Text><Text style={estilos.metricaEtiqueta}>{item.etiqueta}</Text>
          </View>)}</View>
        </View> : null}

        <View style={estilos.seccionEncabezado}>
          <View><Text style={estilos.seccionTitulo}>{rol === 'cliente' ? '¿Qué quieres hacer hoy?' : 'Accesos rápidos'}</Text><Text style={estilos.seccionSubtitulo}>{rol === 'cliente' ? 'Elige una opción para continuar' : 'Tus herramientas están organizadas aquí'}</Text></View>
          <Text style={estilos.contador}>{atajos[rol].length} MÓDULOS</Text>
        </View>
        <View style={estilos.menu}>{atajos[rol].map((item, indice) => <TouchableOpacity key={item.grupo} accessibilityRole="button" style={estilos.tarjeta} onPress={() => navigation.navigate('GestionDatos', { grupo: item.grupo, usuarioId, rol })}>
          <View style={[estilos.icono, indice % 2 === 0 ? estilos.iconoVerde : estilos.iconoAmarillo]}><Text style={estilos.iconoTexto}>{item.simbolo}</Text></View>
          <View style={estilos.tarjetaTexto}><Text style={estilos.tarjetaTitulo}>{item.titulo}</Text><Text style={estilos.tarjetaDetalle}>{item.detalle}</Text><Text style={estilos.abrirModulo}>Abrir módulo  ›</Text></View>
        </TouchableOpacity>)}</View>

        <View style={estilos.pie}>
          <View style={estilos.pieMarca}><Text style={estilos.pieNombre}>ReciCash</Text><Text style={estilos.pieTexto}>Reciclar, sumar y transformar.</Text></View>
          <Text style={estilos.pieLegal}>SESIÓN PROTEGIDA · {usuarioId.slice(0, 8)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, backgroundColor: colores.fondo, paddingHorizontal: 22, paddingTop: 25, paddingBottom: 18 },
  contenido: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 54, height: 54, borderRadius: 12, backgroundColor: colores.azulOscuro },
  marcaTexto: { color: colores.azulOscuro, fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  marcaSubtexto: { color: colores.textoSuave, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 2 },
  botonSalir: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 11, backgroundColor: colores.blanco, borderWidth: 1, borderColor: colores.borde },
  textoSalir: { color: colores.azulOscuro, fontSize: 12, fontWeight: '800' },
  hero: { position: 'relative', backgroundColor: '#e8f5eb', borderRadius: 23, paddingHorizontal: 27, paddingVertical: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 13, overflow: 'hidden', minHeight: 172, borderWidth: 1, borderColor: '#d8eadd' },
  decoracionHero: { position: 'absolute', width: 290, height: 290, borderWidth: 1, borderColor: '#0c0d3712', borderRadius: 160, right: -90, top: -130 },
  contenidoHero: { flex: 1 },
  saludo: { color: colores.verde, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  titulo: { color: colores.azulOscuro, fontSize: 31, fontWeight: '900', marginTop: 8, letterSpacing: -0.6 },
  manoSaludo: { fontSize: 25 },
  subtitulo: { maxWidth: 620, color: '#52645a', fontSize: 13, lineHeight: 20, marginTop: 6 },
  insigniaHero: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, marginTop: 15, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 18, backgroundColor: colores.blanco, borderWidth: 1, borderColor: '#dce9de' },
  puntoHero: { width: 7, height: 7, borderRadius: 4, backgroundColor: colores.verde },
  textoInsignia: { color: colores.azulOscuro, fontSize: 10, fontWeight: '700' },
  sello: { width: 76, height: 76, borderRadius: 25, backgroundColor: colores.azulOscuro, borderWidth: 1, borderColor: '#ffffff20', alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
  selloTexto: { color: '#08a04c', fontSize: 39, fontWeight: '900' },
  selloRayo: { position: 'absolute', top: 20 },
  selloRayoTexto: { color: colores.amarillo, fontSize: 31, fontWeight: '900' },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: colores.blanco, borderRadius: 11, marginBottom: 22, borderWidth: 1, borderColor: colores.borde },
  puntoEstado: { width: 8, height: 8, borderRadius: 5, backgroundColor: colores.verde },
  estadoTexto: { color: colores.textoSuave, flex: 1, fontSize: 11 },
  resumen: { marginBottom: 24 },
  cabeceraSeccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  seccionEncabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  seccionTitulo: { color: colores.azulOscuro, fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  seccionSubtitulo: { color: colores.textoSuave, fontSize: 12, marginTop: 3 },
  acentoAmarillo: { width: 28, height: 4, borderRadius: 4, backgroundColor: colores.amarillo },
  contador: { color: colores.azulOscuro, backgroundColor: '#e7e9f5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metrica: { position: 'relative', flexGrow: 1, flexBasis: 150, minWidth: 140, overflow: 'hidden', backgroundColor: colores.blanco, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colores.borde },
  acentoMetrica: { width: 28, height: 4, borderRadius: 4, marginBottom: 12 },
  acentoVerde: { backgroundColor: colores.verde },
  acentoMetricaAmarillo: { backgroundColor: colores.amarillo },
  metricaValor: { color: colores.azulOscuro, fontSize: 26, fontWeight: '900' },
  metricaEtiqueta: { color: colores.textoSuave, fontSize: 11, marginTop: 4 },
  menu: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tarjeta: { flexGrow: 1, flexBasis: 320, minHeight: 154, flexDirection: 'row', alignItems: 'flex-start', gap: 13, padding: 17, backgroundColor: colores.blanco, borderWidth: 1, borderColor: colores.borde, borderRadius: 16 },
  icono: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  iconoVerde: { backgroundColor: '#e7f4e9' },
  iconoAmarillo: { backgroundColor: '#fff7dc' },
  iconoTexto: { color: colores.azulOscuro, fontSize: 24, fontWeight: '900' },
  tarjetaTexto: { flex: 1 },
  tarjetaTitulo: { color: colores.azulOscuro, fontSize: 15, fontWeight: '900', marginTop: 2 },
  tarjetaDetalle: { color: colores.textoSuave, fontSize: 12, marginTop: 6, lineHeight: 18 },
  abrirModulo: { color: colores.verdeOscuro, fontSize: 11, fontWeight: '900', marginTop: 13 },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 24, paddingTop: 15, borderTopWidth: 1, borderTopColor: colores.borde },
  pieMarca: { gap: 3 },
  pieNombre: { color: colores.azulOscuro, fontWeight: '900', fontSize: 12 },
  pieTexto: { color: colores.textoSuave, fontSize: 10 },
  pieLegal: { color: '#8a968e', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
});
