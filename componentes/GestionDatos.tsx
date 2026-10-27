import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../App';
import { coleccionesFase1, datosIniciales } from '../src/datos/modeloBaseDatos';
import type { ColeccionesSupabase } from '../src/modelos/baseDatos';
import { actualizarRegistro, crearRegistro, eliminarRegistro, listarRegistros, type FilaColeccion } from '../src/servicios/supabase';
import { colores } from '../src/tema/colores';

type Props = NativeStackScreenProps<RootStackParamList, 'GestionDatos'>;
type TablaGestionable = Exclude<keyof ColeccionesSupabase, 'usuarios'>;

// Dejo la tabla de cuentas fuera de este formulario para no manejar claves desde la base publica.
const tablas = coleccionesFase1.filter((tabla): tabla is TablaGestionable => tabla !== 'usuarios');

export default function GestionDatos({ navigation }: Props) {
  const [tabla, setTabla] = useState<TablaGestionable>('clientes');
  const [filas, setFilas] = useState<FilaColeccion[]>([]);
  const [formulario, setFormulario] = useState<Record<string, string>>({});
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const ejemplo = useMemo(() => {
    const registros = datosIniciales[tabla] as Record<string, Record<string, unknown>>;
    return Object.values(registros)[0] ?? { id: '' };
  }, [tabla]);
  const campos = Object.keys(ejemplo);

  // Consulto la tabla elegida y actualizo la lista visible.
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
  const prepararValores = (): FilaColeccion => {
    const valores: Record<string, string | number | boolean | null> = {};
    for (const campo of campos) {
      if (campo === 'id' && !idEditando) continue;
      const texto = formulario[campo] ?? '';
      const tipoOriginal = ejemplo[campo];
      if (typeof tipoOriginal === 'boolean') valores[campo] = texto.toLowerCase() === 'true';
      else if (typeof tipoOriginal === 'number') valores[campo] = texto === '' ? 0 : Number(texto);
      else valores[campo] = texto;
    }
    if (!idEditando && !formulario.id?.trim()) valores.id = `${tabla}_${Date.now()}`;
    return valores as FilaColeccion;
  };

  // Guardo el formulario como registro nuevo o como edicion.
  const guardar = async () => {
    setMensaje('');
    const valores = prepararValores();
    if (!String(valores.id ?? '').trim()) {
      setMensaje('El identificador es obligatorio.');
      return;
    }
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
  const editar = (fila: FilaColeccion) => {
    setIdEditando(fila.id);
    setFormulario(Object.fromEntries(Object.entries(fila).map(([campo, valor]) => [campo, String(valor ?? '')])));
  };

  // Pido confirmacion antes de eliminar porque esta accion no se puede deshacer desde la app.
  const confirmarEliminacion = (id: string) => Alert.alert('Eliminar registro', '¿Quieres eliminar este registro?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => void borrar(id) },
  ]);

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

  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <View style={estilos.encabezado}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.marca}>ReciCash</Text>
          <Text style={estilos.titulo}>Gestion de datos</Text>
          <Text style={estilos.descripcion}>Consulta, filtra, crea, edita y elimina registros de Supabase.</Text>
        </View>
        <TouchableOpacity style={estilos.botonVolver} onPress={() => navigation.goBack()}><Text style={estilos.textoAccion}>Volver</Text></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.selector}>
        {tablas.map((nombreTabla) => (
          <TouchableOpacity key={nombreTabla} style={[estilos.pestana, tabla === nombreTabla && estilos.pestanaActiva]} onPress={() => { setTabla(nombreTabla); setFormulario({}); setIdEditando(null); }}>
            <Text style={[estilos.textoPestana, tabla === nombreTabla && estilos.textoPestanaActiva]}>{nombreTabla}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={estilos.tarjeta}>
        <Text style={estilos.tituloSeccion}>{idEditando ? 'Editar registro' : 'Nuevo registro'}</Text>
        {campos.map((campo) => (
          <View key={campo} style={estilos.grupoCampo}>
            <Text style={estilos.etiqueta}>{campo}{ejemplo[campo] === 'boolean' ? ' (true/false)' : ''}</Text>
            <TextInput
              style={estilos.campo}
              value={formulario[campo] ?? ''}
              onChangeText={(valor) => setFormulario((actual) => ({ ...actual, [campo]: valor }))}
              editable={campo !== 'id' || !idEditando}
              keyboardType={typeof ejemplo[campo] === 'number' ? 'decimal-pad' : 'default'}
              placeholder={campo === 'id' ? 'Se genera automaticamente si lo dejas vacio' : `Escribe ${campo}`}
            />
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
            {Object.entries(fila).map(([campo, valor]) => <Text key={campo} style={estilos.dato}><Text style={estilos.etiqueta}>{campo}: </Text>{String(valor ?? '—')}</Text>)}
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
});
