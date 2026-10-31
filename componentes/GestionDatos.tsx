import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../App';
import { coleccionesFase1, datosIniciales } from '../src/datos/modeloBaseDatos';
import type { ColeccionesSupabase } from '../src/modelos/baseDatos';
import PanelOperativo from './PanelOperativo';
import GestionRecompensas from './GestionRecompensas';
import GestionPuntosCanjes from './GestionPuntosCanjes';
import GestionRecogidas from './GestionRecogidas';
import { actualizarRegistro, crearRegistro, eliminarRegistro, listarRegistros, supabase, type FilaColeccion } from '../src/servicios/supabase';
import { colores } from '../src/tema/colores';

type Props = NativeStackScreenProps<RootStackParamList, 'GestionDatos'>;
type TablaGestionable = Exclude<keyof ColeccionesSupabase, 'usuarios'>;

// Dejo la tabla de cuentas fuera de este formulario para no manejar claves desde la base publica.
const tablas = coleccionesFase1.filter((tabla): tabla is TablaGestionable => tabla !== 'usuarios');
const grupos: Record<string, TablaGestionable[]> = {
  usuarios: [], productos: ['recompensas', 'aliados'],
  puntos: ['materialesReciclables', 'movimientosPuntos', 'canjes'],
  recogidas: ['centrosAcopio', 'solicitudesRecogida'], historial: ['solicitudesRecogida'], reportes: ['solicitudesRecogida'], canjes: ['canjes'],
};
const nombresTabla: Partial<Record<TablaGestionable, string>> = {
  clientes: 'Clientes', materialesReciclables: 'Materiales reciclables', movimientosPuntos: 'Movimientos de puntos',
  aliados: 'Aliados', recompensas: 'Recompensas', canjes: 'Canjes', centrosAcopio: 'Centros de acopio', solicitudesRecogida: 'Solicitudes de recogida', entidadesFinancieras: 'Entidades financieras',
};
const nombresCampo: Record<string, string> = {
  usuarioId: 'Usuario', puntosDisponibles: 'Puntos disponibles', puntosAcumulados: 'Puntos acumulados', unidadMedida: 'Unidad de medida',
  puntosPorUnidad: 'Puntos por unidad', empleadoId: 'Gestor responsable', materialId: 'Material reciclable', cantidadMaterial: 'Cantidad de material',
  aliadoId: 'Aliado', puntosRequeridos: 'Puntos requeridos', clienteId: 'Cliente', recompensaId: 'Recompensa', puntosUsados: 'Puntos utilizados',
  fechaSolicitud: 'Fecha de solicitud', fechaEntrega: 'Fecha de entrega', fechaSolicitada: 'Fecha solicitada', fechaCreacion: 'Fecha de creación',
  gestorId: 'Gestor asignado', observaciones: 'Observaciones', identificacion: 'Identificación', stock: 'Existencias', activo: 'Activo',
};
const relaciones: Record<string, { tabla: string; etiqueta: string }> = {
  usuarioId: { tabla: 'usuarios', etiqueta: 'nombre' }, aliadoId: { tabla: 'aliados', etiqueta: 'nombre' }, clienteId: { tabla: 'clientes', etiqueta: 'documento' },
  recompensaId: { tabla: 'recompensas', etiqueta: 'nombre' }, empleadoId: { tabla: 'usuarios', etiqueta: 'nombre' }, gestorId: { tabla: 'usuarios', etiqueta: 'nombre' }, materialId: { tabla: 'materialesReciclables', etiqueta: 'nombre' },
};
// Convierto los nombres técnicos de la base de datos en títulos fáciles de leer.
const etiquetaCampo = (campo: string) => nombresCampo[campo] ?? campo.replace(/([A-Z])/g, ' $1').replace(/^./, (letra) => letra.toUpperCase());

// Muestro el formulario genérico de administración para las tablas sin pantalla propia.
export default function GestionDatos({ navigation, route }: Props) {
  const [tabla, setTabla] = useState<TablaGestionable>('clientes');
  const [filas, setFilas] = useState<FilaColeccion[]>([]);
  const [formulario, setFormulario] = useState<Record<string, string>>({});
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [opciones, setOpciones] = useState<Record<string, { id: string; etiqueta: string }[]>>({});
  const [selector, setSelector] = useState<string | null>(null);
  const grupoTablas = grupos[route.params?.grupo ?? ''] ?? tablas;

  // Uso un registro de ejemplo para conocer los campos y sus tipos.
  const ejemplo = useMemo(() => {
    const registros = datosIniciales[tabla] as Record<string, Record<string, unknown>>;
    return Object.values(registros)[0] ?? { id: '' };
  }, [tabla]);
  const campos = Object.keys(ejemplo).filter((campo) => campo !== 'id');

  useEffect(() => {
    const elegida = route.params?.tabla as TablaGestionable | undefined;
    const inicial = elegida && grupoTablas.includes(elegida) ? elegida : grupoTablas[0];
    if (inicial) setTabla(inicial);
  }, [route.params?.grupo, route.params?.tabla]);

  useEffect(() => {
    let activo = true;
    if (!supabase) return () => { activo = false; };
    const tablasRelacionadas = [...new Set(campos.map((campo) => relaciones[campo]?.tabla).filter((valor): valor is string => Boolean(valor)))];
    // Cargo las opciones de las listas desplegables y aviso si una consulta falla.
    void Promise.all(tablasRelacionadas.map(async (relacionada) => {
      const { data, error } = await supabase!.from(relacionada).select('*').limit(300);
      if (error) throw error;
      const etiqueta = Object.entries(relaciones).find(([, valor]) => valor.tabla === relacionada)?.[1].etiqueta ?? 'nombre';
      return [relacionada, (data ?? []).map((fila: Record<string, unknown>) => ({ id: String(fila.id), etiqueta: String(fila[etiqueta] ?? fila.nombre ?? fila.id) }))] as const;
    })).then((listas) => { if (activo) setOpciones(Object.fromEntries(listas)); }).catch((fallo: unknown) => {
      if (activo) setMensaje(fallo instanceof Error ? `No se pudieron cargar las opciones: ${fallo.message}` : 'No se pudieron cargar las opciones del formulario.');
    });
    return () => { activo = false; };
  }, [tabla]);

  // Consulto la tabla elegida y actualizo la lista visible.
  // Consulto Supabase y actualizo la lista de la tabla seleccionada.
  const cargarFilas = useCallback(async () => {
    setCargando(true);
    setMensaje('');
    try {
      setFilas(await listarRegistros(tabla));
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No fue posible cargar los datos.');
    } finally {
      setCargando(false);
    }
  }, [tabla]);

  useEffect(() => { void cargarFilas(); }, [cargarFilas]);

  const filasFiltradas = filas.filter((fila) =>
    Object.values(fila).some((valor) => String(valor ?? '').toLowerCase().includes(busqueda.toLowerCase())),
  );

  // Convierto cada campo al tipo que espera la tabla antes de guardarlo.
  // Convierto el texto del formulario a los tipos que espera la base de datos.
  const prepararValores = (): FilaColeccion => {
    const valores: Record<string, string | number | boolean | null> = {};
    for (const campo of campos) {
      const texto = formulario[campo] ?? '';
      const tipoOriginal = ejemplo[campo];
      if (typeof tipoOriginal === 'boolean') valores[campo] = texto.toLowerCase() === 'true';
      else if (typeof tipoOriginal === 'number') valores[campo] = texto === '' ? 0 : Number(texto);
      else valores[campo] = texto;
    }
    if (!idEditando) valores.id = `${tabla}_${Date.now()}`;
    return valores as FilaColeccion;
  };

  // Guardo el formulario como registro nuevo o como edicion.
  // Valido los campos y guardo el registro nuevo o sus cambios.
  const guardar = async () => {
    setMensaje('');
    const valores = prepararValores();
    const numeroInvalido = campos.some((campo) =>
      typeof ejemplo[campo] === 'number' && !Number.isFinite(Number(formulario[campo] ?? '')),
    );
    if (numeroInvalido) {
      setMensaje('Revisa los campos numericos; solo aceptan numeros.');
      return;
    }
    const booleanoInvalido = campos.some((campo) =>
      typeof ejemplo[campo] === 'boolean' && !['true', 'false'].includes((formulario[campo] ?? '').toLowerCase()),
    );
    if (booleanoInvalido) {
      setMensaje('En los campos de estado escribe true o false.');
      return;
    }
    if (Object.entries(valores).some(([campo, valor]) => campo !== 'id' && valor === '')) {
      setMensaje('Completa todos los campos antes de guardar.');
      return;
    }

    setGuardando(true);
    try {
      if (idEditando) await actualizarRegistro(tabla, idEditando, valores);
      else await crearRegistro(tabla, valores);
      setFormulario({});
      setIdEditando(null);
      await cargarFilas();
      setMensaje('Los cambios se guardaron correctamente.');
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No fue posible guardar el registro.');
    } finally {
      setGuardando(false);
    }
  };

  // Cargo en el formulario los datos del registro que se va a editar.
  // Cargo un registro existente en el formulario para poder editarlo.
  const editar = (fila: FilaColeccion) => {
    setIdEditando(fila.id);
    setFormulario(Object.fromEntries(Object.entries(fila).map(([campo, valor]) => [campo, String(valor ?? '')])));
  };

  // Pido confirmacion antes de eliminar porque esta accion no se puede deshacer desde la app.
  // Confirmo la eliminación antes de borrar un registro de la base de datos.
  const confirmarEliminacion = (id: string) => Alert.alert('Eliminar registro', '¿Quieres eliminar este registro?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => void borrar(id) },
  ]);

  // Elimino el registro y vuelvo a cargar la lista para mostrar el resultado.
  const borrar = async (id: string) => {
    setMensaje('');
    try {
      await eliminarRegistro(tabla, id);
      await cargarFilas();
      setMensaje('El registro se elimino correctamente.');
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No fue posible eliminar el registro.');
    }
  };

  if (route.params?.rol && route.params.rol !== 'administrador' && route.params.usuarioId) {
    return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.contenedor}><View style={estilos.encabezado}><View style={{ flex: 1 }}><Text style={estilos.marca}>ReciCash</Text><Text style={estilos.titulo}>{route.params.grupo === 'puntos' ? 'Mis puntos e historial' : route.params.grupo === 'productos' ? 'Canjes disponibles' : route.params.grupo === 'recogidas' ? 'Gestión de recogidas' : route.params.grupo === 'reportes' ? 'Reportes de recogida' : 'Historial de recogidas'}</Text></View><TouchableOpacity style={estilos.botonVolver} onPress={() => navigation.goBack()}><Text style={estilos.textoAccion}>Volver</Text></TouchableOpacity></View><PanelOperativo rol={route.params.rol} usuarioId={route.params.usuarioId} seccion={route.params.grupo} /></ScrollView>;
  }

  if (route.params?.grupo === 'productos' && route.params.rol === 'administrador' && route.params.usuarioId) {
    return <GestionRecompensas onVolver={() => navigation.goBack()} />;
  }

  if (route.params?.grupo === 'puntos' && route.params.rol === 'administrador' && route.params.usuarioId) {
    return <GestionPuntosCanjes onVolver={() => navigation.goBack()} />;
  }

  if (route.params?.grupo === 'recogidas' && route.params.rol === 'administrador' && route.params.usuarioId) {
    return <GestionRecogidas onVolver={() => navigation.goBack()} />;
  }

  if (route.params?.grupo === 'usuarios' && route.params.usuarioId) {
    return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.contenedor}><View style={estilos.encabezado}><View style={{ flex: 1 }}><Text style={estilos.marca}>ReciCash</Text><Text style={estilos.titulo}>Usuarios y roles</Text><Text style={estilos.descripcion}>Gestiona cada tipo de cuenta desde su propia sección.</Text></View><TouchableOpacity style={estilos.botonVolver} onPress={() => navigation.goBack()}><Text style={estilos.textoAccion}>Volver</Text></TouchableOpacity></View><PanelOperativo rol="administrador" usuarioId={route.params.usuarioId} /></ScrollView>;
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <View style={estilos.encabezado}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.marca}>ReciCash</Text>
        <Text style={estilos.titulo}>{route.params?.grupo === 'usuarios' ? 'Usuarios y roles' : route.params?.grupo === 'productos' ? 'Productos y servicios' : route.params?.grupo === 'puntos' ? 'Puntos y canjes' : 'Gestión de recogidas'}</Text>
          <Text style={estilos.descripcion}>Consulta, filtra, crea, edita y elimina registros de Supabase.</Text>
        </View>
        <TouchableOpacity style={estilos.botonVolver} onPress={() => navigation.goBack()}><Text style={estilos.textoAccion}>Volver</Text></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.selector}>
        {grupoTablas.map((nombreTabla) => (
          <TouchableOpacity key={nombreTabla} style={[estilos.pestana, tabla === nombreTabla && estilos.pestanaActiva]} onPress={() => { setTabla(nombreTabla); setFormulario({}); setIdEditando(null); }}>
            <Text style={[estilos.textoPestana, tabla === nombreTabla && estilos.textoPestanaActiva]}>{nombresTabla[nombreTabla] ?? nombreTabla}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

        <View style={estilos.tarjeta}>
        <Text style={estilos.tituloSeccion}>{idEditando ? 'Editar registro' : 'Nuevo registro'}</Text>
        {campos.map((campo) => (
          <View key={campo} style={estilos.grupoCampo}>
            <Text style={estilos.etiqueta}>{etiquetaCampo(campo)}</Text>
            {relaciones[campo] ? <>
              <TouchableOpacity style={estilos.campo} onPress={() => setSelector(campo)}><Text style={estilos.valorSelector}>{opciones[relaciones[campo].tabla]?.find((opcion) => opcion.id === formulario[campo])?.etiqueta ?? (formulario[campo] ? 'Selecciona un registro' : `Selecciona ${etiquetaCampo(campo).toLowerCase()}`)}</Text></TouchableOpacity>
              <Modal visible={selector === campo} transparent animationType="fade" onRequestClose={() => setSelector(null)}><View style={estilos.fondoModal}><View style={estilos.modal}><Text style={estilos.tituloSeccion}>Seleccionar {etiquetaCampo(campo).toLowerCase()}</Text><ScrollView>{(opciones[relaciones[campo].tabla] ?? []).map((opcion) => <TouchableOpacity key={opcion.id} style={estilos.opcion} onPress={() => { setFormulario((actual) => ({ ...actual, [campo]: opcion.id })); setSelector(null); }}><Text style={estilos.textoOpcion}>{opcion.etiqueta}</Text></TouchableOpacity>)}</ScrollView><TouchableOpacity onPress={() => setSelector(null)}><Text style={estilos.textoAccion}>Cerrar</Text></TouchableOpacity></View></View></Modal>
            </> : typeof ejemplo[campo] === 'boolean' ? <View style={estilos.filaBotones}>{['true', 'false'].map((valor) => <TouchableOpacity key={valor} style={[estilos.opcionBoolean, formulario[campo] === valor && estilos.booleanActivo]} onPress={() => setFormulario((actual) => ({ ...actual, [campo]: valor }))}><Text style={estilos.textoAccion}>{valor === 'true' ? 'Sí' : 'No'}</Text></TouchableOpacity>)}</View> : <TextInput style={estilos.campo} value={formulario[campo] ?? ''} onChangeText={(valor) => setFormulario((actual) => ({ ...actual, [campo]: valor }))} keyboardType={typeof ejemplo[campo] === 'number' ? 'decimal-pad' : 'default'} placeholder={`Escribe ${etiquetaCampo(campo).toLowerCase()}`} />}
          </View>
        ))}
        {mensaje ? <Text style={estilos.mensaje}>{mensaje}</Text> : null}
        <View style={estilos.filaBotones}>
          <TouchableOpacity style={estilos.botonPrincipal} onPress={() => void guardar()} disabled={guardando}>
            <Text style={estilos.textoBotonPrincipal}>{guardando ? 'Guardando...' : idEditando ? 'Actualizar' : 'Crear registro'}</Text>
          </TouchableOpacity>
          {idEditando ? <TouchableOpacity style={estilos.botonSecundario} onPress={() => { setIdEditando(null); setFormulario({}); }}><Text style={estilos.textoAccion}>Cancelar edicion</Text></TouchableOpacity> : null}
        </View>
      </View>

      <View style={estilos.tarjeta}>
        <Text style={estilos.tituloSeccion}>Registros ({filasFiltradas.length})</Text>
        <TextInput style={estilos.campo} value={busqueda} onChangeText={setBusqueda} placeholder="Filtrar por cualquier campo" />
        {cargando ? <ActivityIndicator color={colores.verde} style={{ margin: 20 }} /> : null}
        {!cargando && filasFiltradas.length === 0 ? <Text style={estilos.vacio}>No hay registros para mostrar.</Text> : null}
        {filasFiltradas.map((fila) => (
          <View key={fila.id} style={estilos.registro}>
            {Object.entries(fila).filter(([campo]) => campo !== 'id').map(([campo, valor]) => <Text key={campo} style={estilos.dato}><Text style={estilos.etiqueta}>{etiquetaCampo(campo)}: </Text>{String(valor ?? '—')}</Text>)}
            <View style={estilos.filaBotones}>
              <TouchableOpacity style={estilos.botonSecundario} onPress={() => editar(fila)}><Text style={estilos.textoAccion}>Editar</Text></TouchableOpacity>
              <TouchableOpacity style={estilos.botonEliminar} onPress={() => confirmarEliminacion(fila.id)}><Text style={estilos.textoEliminar}>Eliminar</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// Mantengo estilos sencillos para que la tabla y los formularios se lean bien en celular.
const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, backgroundColor: colores.fondo, padding: 20, paddingTop: 48, gap: 16 },
  encabezado: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  marca: { color: colores.verde, fontSize: 14, fontWeight: '900', textTransform: 'uppercase' },
  titulo: { color: colores.tinta, fontSize: 28, fontWeight: '900', marginTop: 4 },
  descripcion: { color: colores.textoSuave, fontSize: 14, lineHeight: 20, marginTop: 6 },
  botonVolver: { backgroundColor: colores.blanco, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colores.borde },
  selector: { gap: 8, paddingVertical: 4 },
  pestana: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colores.borde, backgroundColor: colores.blanco },
  pestanaActiva: { backgroundColor: colores.verde, borderColor: colores.verde },
  textoPestana: { color: colores.tinta, fontSize: 13, fontWeight: '700' },
  textoPestanaActiva: { color: colores.blanco },
  tarjeta: { backgroundColor: colores.blanco, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: colores.borde },
  tituloSeccion: { color: colores.tinta, fontSize: 19, fontWeight: '900', marginBottom: 12 },
  grupoCampo: { marginBottom: 12 },
  etiqueta: { color: colores.tinta, fontSize: 13, fontWeight: '800' },
  campo: { minHeight: 44, borderWidth: 1, borderColor: colores.borde, borderRadius: 8, paddingHorizontal: 12, color: colores.tinta, marginTop: 5 },
  mensaje: { color: colores.verdeOscuro, lineHeight: 20, marginBottom: 10 },
  filaBotones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  botonPrincipal: { backgroundColor: colores.verde, borderRadius: 8, paddingHorizontal: 16, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textoBotonPrincipal: { color: colores.blanco, fontWeight: '800' },
  botonSecundario: { backgroundColor: colores.menta, borderRadius: 8, borderWidth: 1, borderColor: colores.borde, paddingHorizontal: 14, minHeight: 42, justifyContent: 'center' },
  textoAccion: { color: colores.verdeOscuro, fontWeight: '800' },
  botonEliminar: { backgroundColor: '#fff0ee', borderRadius: 8, borderWidth: 1, borderColor: colores.error, paddingHorizontal: 14, minHeight: 42, justifyContent: 'center' },
  textoEliminar: { color: colores.error, fontWeight: '800' },
  registro: { borderTopWidth: 1, borderTopColor: colores.borde, paddingTop: 12, marginTop: 12 },
  dato: { color: colores.textoSuave, fontSize: 13, lineHeight: 19 },
  vacio: { color: colores.textoSuave, paddingVertical: 16, textAlign: 'center' },
  valorSelector: { color: colores.tinta, paddingTop: 12 },
  fondoModal: { flex: 1, justifyContent: 'center', backgroundColor: '#0008', padding: 24 },
  modal: { maxHeight: '75%', backgroundColor: colores.blanco, borderRadius: 14, padding: 18, gap: 12 },
  opcion: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colores.borde },
  textoOpcion: { color: colores.tinta },
  opcionBoolean: { borderWidth: 1, borderColor: colores.borde, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  booleanActivo: { backgroundColor: '#e7e9f5', borderColor: colores.azulOscuro },
});
