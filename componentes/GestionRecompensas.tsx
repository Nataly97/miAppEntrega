import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/servicios/supabase';
import { colores } from '../src/tema/colores';

type Recompensa = {
  id: string;
  gestorId: string | null;
  aliadoId?: string | null;
  nombre: string;
  descripcion: string;
  puntosRequeridos: number;
  stock: number;
  activo: boolean;
};
type Gestor = { id: string; nombre: string; usuario: string; correo: string; activo: boolean };
type RecompensaFormulario = { nombre: string; descripcion: string; gestorId: string; puntosRequeridos: string; stock: string; activo: boolean };
type Dialogo = { tipo: 'confirmar' | 'resultado'; titulo: string; mensaje: string; confirmar?: string; ejecutar?: () => Promise<string>; error?: boolean };

// Devuelvo el formulario limpio para crear una nueva recompensa.
const formularioVacio = (): RecompensaFormulario => ({ nombre: '', descripcion: '', gestorId: '', puntosRequeridos: '', stock: '', activo: true });

// En esta pantalla administro las recompensas que los clientes pueden canjear.
export default function GestionRecompensas({ onVolver }: { onVolver: () => void }) {
  const [recompensas, setRecompensas] = useState<Recompensa[]>([]);
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [formulario, setFormulario] = useState<RecompensaFormulario>(formularioVacio());
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState('');
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [gestoresVisible, setGestoresVisible] = useState(false);
  const [detalle, setDetalle] = useState<Recompensa | null>(null);

  // Cargo las recompensas y los gestores para mostrar sus nombres en la pantalla.
  const cargar = useCallback(async () => {
    if (!supabase) {
      setErrorFormulario('No hay conexión con Supabase. Verifica la configuración e inténtalo de nuevo.');
      setCargando(false);
      return;
    }
    setCargando(true);
    setErrorFormulario('');
    try {
      const [{ data: items, error: errorItems }, { data: cuentas, error: errorCuentas }] = await Promise.all([
        supabase.from('recompensas').select('*').order('nombre'),
        supabase.from('usuarios').select('id,nombre,usuario,correo,activo').eq('rol', 'gestor').order('nombre'),
      ]);
      if (errorItems || errorCuentas) throw errorItems ?? errorCuentas;
      setRecompensas((items ?? []) as Recompensa[]);
      setGestores((cuentas ?? []) as Gestor[]);
    } catch (fallo) {
      setErrorFormulario(fallo instanceof Error ? fallo.message : 'No se pudieron cargar las recompensas. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const gestoresPorId = useMemo(() => new Map(gestores.map((gestor) => [gestor.id, gestor])), [gestores]);
  const termino = busqueda.trim().toLocaleLowerCase();
  const visibles = recompensas.filter((recompensa) => {
    const gestor = gestoresPorId.get(recompensa.gestorId ?? '')?.nombre ?? '';
    return !termino || [recompensa.nombre, recompensa.descripcion, gestor, recompensa.puntosRequeridos, recompensa.stock]
      .some((valor) => String(valor).toLocaleLowerCase().includes(termino));
  });
  const resumen = [
    { etiqueta: 'Recompensas', valor: recompensas.length },
    { etiqueta: 'Activas', valor: recompensas.filter((item) => item.activo).length },
    { etiqueta: 'Agotadas', valor: recompensas.filter((item) => item.stock === 0).length },
  ];

  // Actualizo un campo del formulario y limpio el error cuando se corrige.
  const actualizarCampo = <K extends keyof RecompensaFormulario>(campo: K, valor: RecompensaFormulario[K]) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setErrorFormulario('');
  };

  // Paso los datos de una recompensa al formulario para editarlos.
  const editar = (recompensa: Recompensa) => {
    setIdEditando(recompensa.id);
    setFormulario({
      nombre: recompensa.nombre,
      descripcion: recompensa.descripcion,
      gestorId: recompensa.gestorId ?? '',
      puntosRequeridos: String(recompensa.puntosRequeridos),
      stock: String(recompensa.stock),
      activo: recompensa.activo,
    });
    setDetalle(null);
    setErrorFormulario('');
  };

  // Valido el formulario y pido confirmación antes de crear o guardar una recompensa.
  const guardar = () => {
    const puntos = Number(formulario.puntosRequeridos);
    const stock = Number(formulario.stock);
    if (!formulario.nombre.trim() || !formulario.descripcion.trim() || !formulario.gestorId || formulario.puntosRequeridos === '' || formulario.stock === '') {
      setErrorFormulario('Completa Nombre, Descripción, Gestor responsable, Puntos requeridos y Existencias.');
      return;
    }
    if (!Number.isInteger(puntos) || puntos < 0 || !Number.isInteger(stock) || stock < 0) {
      setErrorFormulario('Puntos requeridos y Existencias deben ser números enteros iguales o mayores que cero.');
      return;
    }
    setDialogo({
      tipo: 'confirmar',
      titulo: idEditando ? 'Guardar cambios' : 'Crear recompensa',
      mensaje: idEditando ? `¿Confirmas guardar los cambios de “${formulario.nombre.trim()}”?` : `¿Confirmas crear la recompensa “${formulario.nombre.trim()}”?`,
      confirmar: idEditando ? 'Guardar cambios' : 'Crear recompensa',
      ejecutar: async () => {
        if (!supabase) throw new Error('No hay conexión con Supabase.');
        setGuardando(true);
        const valores = {
          nombre: formulario.nombre.trim(),
          descripcion: formulario.descripcion.trim(),
          gestorId: formulario.gestorId,
          aliadoId: null,
          puntosRequeridos: puntos,
          stock,
          activo: formulario.activo,
        };
        try {
          const { error } = idEditando
            ? await supabase.from('recompensas').update(valores).eq('id', idEditando)
            : await supabase.from('recompensas').insert({ id: `recompensa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ...valores });
          if (error) throw error;
          await cargar();
          setFormulario(formularioVacio());
          setIdEditando(null);
          return idEditando ? 'Los cambios de la recompensa se guardaron correctamente.' : 'La recompensa se creó correctamente.';
        } finally {
          setGuardando(false);
        }
      },
    });
  };

  // Activo o retiro una recompensa del catálogo sin borrar su historial.
  const cambiarEstado = (recompensa: Recompensa) => {
    const nuevoEstado = !recompensa.activo;
    setDetalle(null);
    setDialogo({
      tipo: 'confirmar',
      titulo: nuevoEstado ? 'Activar recompensa' : 'Desactivar recompensa',
      mensaje: `¿Confirmas ${nuevoEstado ? 'activar' : 'desactivar'} “${recompensa.nombre}”?`,
      confirmar: nuevoEstado ? 'Activar' : 'Desactivar',
      ejecutar: async () => {
        if (!supabase) throw new Error('No hay conexión con Supabase.');
        const { error } = await supabase.from('recompensas').update({ activo: nuevoEstado }).eq('id', recompensa.id);
        if (error) throw error;
        await cargar();
        return `La recompensa quedó ${nuevoEstado ? 'activa' : 'desactivada'}.`;
      },
    });
  };

  // Evito eliminar una recompensa que ya esté ligada a canjes.
  const eliminar = (recompensa: Recompensa) => {
    setDetalle(null);
    setDialogo({
      tipo: 'confirmar',
      titulo: 'Eliminar recompensa',
      mensaje: `Se revisará si “${recompensa.nombre}” tiene canjes relacionados antes de eliminarla.`,
      confirmar: 'Revisar y eliminar',
      ejecutar: async () => {
        if (!supabase) throw new Error('No hay conexión con Supabase.');
        const { count, error: errorCanjes } = await supabase.from('canjes').select('id', { count: 'exact', head: true }).eq('recompensaId', recompensa.id);
        if (errorCanjes) throw new Error(`No se pudo revisar el historial de canjes: ${errorCanjes.message}`);
        if ((count ?? 0) > 0) throw new Error('No se puede eliminar esta recompensa porque tiene canjes asociados. Puedes desactivarla para retirarla del catálogo.');
        const { error } = await supabase.from('recompensas').delete().eq('id', recompensa.id);
        if (error) throw new Error(`No se pudo eliminar la recompensa: ${error.message}`);
        await cargar();
        if (idEditando === recompensa.id) {
          setIdEditando(null);
          setFormulario(formularioVacio());
        }
        return 'La recompensa se eliminó correctamente.';
      },
    });
  };

  // Pido confirmación antes de descartar cambios hechos en el formulario.
  const cancelarEdicion = () => {
    setDialogo({
      tipo: 'confirmar', titulo: 'Cancelar edición', mensaje: 'Se descartarán los cambios que no hayas guardado. ¿Deseas cancelar?', confirmar: 'Descartar cambios',
      ejecutar: async () => {
        setIdEditando(null);
        setFormulario(formularioVacio());
        return 'Los cambios sin guardar se descartaron.';
      },
    });
  };

  // Ejecuto la acción confirmada y muestro un mensaje de éxito o de error.
  const ejecutarDialogo = async () => {
    if (!dialogo?.ejecutar) return;
    setGuardando(true);
    const accion = dialogo.ejecutar;
    try {
      const mensaje = await accion();
      setDialogo({ tipo: 'resultado', titulo: 'Acción completada', mensaje });
    } catch (error) {
      setDialogo({ tipo: 'resultado', titulo: 'No se completó la acción', mensaje: error instanceof Error ? error.message : 'Ocurrió un error al procesar la solicitud.', error: true });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView style={estilos.fondo} contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <View style={estilos.encabezado}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.eyebrow}>CATÁLOGO DE CANJES</Text>
          <Text style={estilos.titulo}>Productos y servicios</Text>
          <Text style={estilos.subtitulo}>Administra las recompensas que los clientes pueden canjear con sus puntos.</Text>
        </View>
        <TouchableOpacity style={estilos.botonVolver} onPress={onVolver}><Text style={estilos.textoVolver}>Volver</Text></TouchableOpacity>
      </View>

      <Text style={estilos.seccion}>Resumen del catálogo</Text>
      <View style={estilos.grid}>
        {resumen.map((item) => <View key={item.etiqueta} style={estilos.tarjetaResumen}><Text style={estilos.numeroResumen}>{item.valor}</Text><Text style={estilos.etiquetaResumen}>{item.etiqueta}</Text></View>)}
      </View>

      <View style={estilos.tarjetaFormulario}>
        <Text style={estilos.seccion}>{idEditando ? 'Editar recompensa' : 'Nueva recompensa'}</Text>
        <Text style={estilos.ayuda}>Cada recompensa puede representar un producto, servicio o bono disponible para canje.</Text>
        {errorFormulario ? <Text accessibilityRole="alert" style={estilos.error}>{errorFormulario}</Text> : null}
        <Text style={estilos.etiquetaCampo}>Nombre</Text>
        <TextInput style={estilos.input} placeholder="Ej. Bono de mercado" value={formulario.nombre} onChangeText={(valor) => actualizarCampo('nombre', valor)} />
        <Text style={estilos.etiquetaCampo}>Descripción</Text>
        <TextInput style={[estilos.input, estilos.inputMultilinea]} placeholder="Describe el producto o servicio" multiline value={formulario.descripcion} onChangeText={(valor) => actualizarCampo('descripcion', valor)} />
        <Text style={estilos.etiquetaCampo}>Gestor responsable</Text>
        <TouchableOpacity style={estilos.selectorAliado} onPress={() => setGestoresVisible(true)}>
          <Text style={formulario.gestorId ? estilos.textoSelector : estilos.textoPlaceholder}>{gestoresPorId.get(formulario.gestorId)?.nombre ?? 'Selecciona un usuario con rol Gestor'}</Text>
          <Text style={estilos.iconoSelector}>⌄</Text>
        </TouchableOpacity>
        <View style={estilos.filaCampos}>
          <View style={estilos.campoMitad}><Text style={estilos.etiquetaCampo}>Puntos requeridos</Text><TextInput style={estilos.input} placeholder="0" keyboardType="number-pad" value={formulario.puntosRequeridos} onChangeText={(valor) => actualizarCampo('puntosRequeridos', valor.replace(/[^0-9]/g, ''))} /></View>
          <View style={estilos.campoMitad}><Text style={estilos.etiquetaCampo}>Existencias</Text><TextInput style={estilos.input} placeholder="0" keyboardType="number-pad" value={formulario.stock} onChangeText={(valor) => actualizarCampo('stock', valor.replace(/[^0-9]/g, ''))} /></View>
        </View>
        {idEditando ? <View style={estilos.estadoFormulario}><Text style={estilos.etiquetaCampo}>Estado</Text><View style={estilos.filaEstado}>{[true, false].map((activo) => <TouchableOpacity key={String(activo)} style={[estilos.chipEstado, formulario.activo === activo && estilos.chipEstadoActivo]} onPress={() => actualizarCampo('activo', activo)}><Text style={[estilos.textoEstado, formulario.activo === activo && estilos.textoEstadoActivo]}>{activo ? 'Activa' : 'Inactiva'}</Text></TouchableOpacity>)}</View></View> : null}
        <TouchableOpacity style={estilos.botonPrincipal} disabled={guardando} onPress={guardar}><Text style={estilos.textoBotonPrincipal}>{idEditando ? 'Guardar cambios' : 'Crear recompensa'}</Text></TouchableOpacity>
        {idEditando ? <TouchableOpacity style={estilos.botonSecundario} disabled={guardando} onPress={cancelarEdicion}><Text style={estilos.textoBotonSecundario}>Cancelar edición</Text></TouchableOpacity> : null}
      </View>

      <View style={estilos.tarjetaLista}>
        <View style={estilos.encabezadoLista}><View style={{ flex: 1 }}><Text style={estilos.seccion}>Recompensas</Text><Text style={estilos.ayuda}>{visibles.length} de {recompensas.length} registros</Text></View></View>
        <TextInput style={estilos.input} placeholder="Buscar por nombre, descripción o gestor" value={busqueda} onChangeText={setBusqueda} autoCapitalize="none" />
        {cargando ? <ActivityIndicator size="large" color={colores.azulOscuro} style={{ margin: 24 }} /> : null}
        {!cargando && visibles.length === 0 ? <Text style={estilos.vacio}>{termino ? 'No hay resultados que coincidan con la búsqueda.' : 'Aún no hay recompensas. Crea la primera desde el formulario.'}</Text> : null}
        {visibles.map((recompensa) => <View key={recompensa.id} style={estilos.tarjetaItem}>
          <View style={estilos.filaTituloItem}><View style={{ flex: 1 }}><Text style={estilos.nombreItem}>{recompensa.nombre}</Text><Text style={estilos.subtituloItem}>{gestoresPorId.get(recompensa.gestorId ?? '')?.nombre ?? 'Sin gestor asociado · edita para asignarlo'}</Text></View><Text style={[estilos.badge, recompensa.activo ? estilos.badgeActiva : estilos.badgeInactiva]}>{recompensa.activo ? 'ACTIVA' : 'INACTIVA'}</Text></View>
          <Text style={estilos.descripcionItem} numberOfLines={2}>{recompensa.descripcion}</Text>
          <View style={estilos.datosItem}><Text style={estilos.datoDestacado}>{recompensa.puntosRequeridos} puntos</Text><Text style={estilos.datoSecundario}>{recompensa.stock} existencias</Text>{recompensa.stock === 0 ? <Text style={estilos.sinStock}>Agotada</Text> : null}</View>
          <View style={estilos.accionesItem}>
            <TouchableOpacity style={estilos.botonDetalle} onPress={() => setDetalle(recompensa)}><Text style={estilos.textoDetalle}>Ver detalle</Text></TouchableOpacity>
            <TouchableOpacity style={estilos.botonAccion} onPress={() => editar(recompensa)}><Text style={estilos.textoAccion}>Editar</Text></TouchableOpacity>
            <TouchableOpacity style={estilos.botonEliminar} onPress={() => eliminar(recompensa)}><Text style={estilos.textoEliminar}>Eliminar</Text></TouchableOpacity>
          </View>
        </View>)}
      </View>

      <Modal visible={gestoresVisible} transparent animationType="fade" onRequestClose={() => setGestoresVisible(false)}>
        <View style={estilos.fondoModal}><View style={estilos.modal}>
          <Text style={estilos.tituloModal}>Seleccionar gestor</Text><Text style={estilos.ayuda}>Se muestran las cuentas activas creadas con el rol Gestor.</Text>
          <ScrollView style={{ maxHeight: 340 }}>{gestores.filter((gestor) => gestor.activo).map((gestor) => <TouchableOpacity key={gestor.id} style={estilos.opcionAliado} onPress={() => { actualizarCampo('gestorId', gestor.id); setGestoresVisible(false); }}><Text style={estilos.nombreItem}>{gestor.nombre}</Text><Text style={estilos.subtituloItem}>@{gestor.usuario} · {gestor.correo}</Text></TouchableOpacity>)}{gestores.filter((gestor) => gestor.activo).length === 0 ? <Text style={estilos.vacio}>No hay usuarios gestores activos. Crea o activa un gestor en Usuarios y roles.</Text> : null}</ScrollView>
          <TouchableOpacity style={estilos.botonSecundario} onPress={() => setGestoresVisible(false)}><Text style={estilos.textoBotonSecundario}>Cerrar</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={Boolean(detalle)} animationType="slide" onRequestClose={() => setDetalle(null)}>
        <View style={estilos.detalleFondo}>
          <View style={estilos.detalleEncabezado}><View style={estilos.iconoDetalle}><Text style={estilos.iconoDetalleTexto}>✦</Text></View><View style={{ flex: 1 }}><Text style={estilos.eyebrowDetalle}>DETALLE DE RECOMPENSA</Text><Text style={estilos.tituloDetalle}>{detalle?.nombre}</Text><Text style={estilos.subtituloDetalle}>{detalle?.activo ? 'Disponible en catálogo' : 'No visible para canje'}</Text></View></View>
          <ScrollView style={estilos.detalleContenido}>
            <Text style={estilos.seccionDetalle}>Información</Text>
            <FilaDetalle etiqueta="Nombre" valor={detalle?.nombre} />
            <FilaDetalle etiqueta="Descripción" valor={detalle?.descripcion} />
            <FilaDetalle etiqueta="Gestor responsable" valor={detalle ? gestoresPorId.get(detalle.gestorId ?? '')?.nombre ?? 'Sin gestor asociado' : undefined} />
            <FilaDetalle etiqueta="Puntos requeridos" valor={detalle?.puntosRequeridos} />
            <FilaDetalle etiqueta="Existencias" valor={detalle?.stock} />
            <FilaDetalle etiqueta="Estado" valor={detalle?.activo ? 'Activa' : 'Inactiva'} />
          </ScrollView>
          <View style={estilos.accionesDetalle}>
            <TouchableOpacity style={estilos.botonPrincipal} onPress={() => detalle && editar(detalle)}><Text style={estilos.textoBotonPrincipal}>Editar recompensa</Text></TouchableOpacity>
            {detalle ? <TouchableOpacity style={estilos.botonEstadoDetalle} onPress={() => cambiarEstado(detalle)}><Text style={estilos.textoBotonSecundario}>{detalle.activo ? 'Desactivar' : 'Activar'}</Text></TouchableOpacity> : null}
            {detalle ? <TouchableOpacity style={estilos.botonEliminarDetalle} onPress={() => eliminar(detalle)}><Text style={estilos.textoEliminar}>Eliminar recompensa</Text></TouchableOpacity> : null}
            <TouchableOpacity style={estilos.botonVolverDetalle} onPress={() => setDetalle(null)}><Text style={estilos.textoVolverDetalle}>Volver al catálogo</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(dialogo)} transparent animationType="fade" onRequestClose={() => !guardando && setDialogo(null)}>
        <View style={estilos.fondoModal}><View style={estilos.modal}>
          <Text style={estilos.tituloModal}>{dialogo?.titulo}</Text><Text style={estilos.textoDialogo}>{dialogo?.mensaje}</Text>
          {dialogo?.tipo === 'confirmar' ? <View style={estilos.accionesDialogo}><TouchableOpacity style={estilos.botonSecundarioModal} disabled={guardando} onPress={() => setDialogo(null)}><Text style={estilos.textoBotonSecundario}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={estilos.botonConfirmar} disabled={guardando} onPress={() => void ejecutarDialogo()}>{guardando ? <ActivityIndicator color={colores.blanco} /> : <Text style={estilos.textoBotonPrincipal}>{dialogo.confirmar}</Text>}</TouchableOpacity></View> : <TouchableOpacity style={estilos.botonPrincipal} onPress={() => setDialogo(null)}><Text style={estilos.textoBotonPrincipal}>Entendido</Text></TouchableOpacity>}
        </View></View>
      </Modal>
    </ScrollView>
  );
}

// Muestro una fila con el nombre del dato y su valor en la ventana de detalle.
function FilaDetalle({ etiqueta, valor }: { etiqueta: string; valor: unknown }) {
  return <View style={estilos.filaDetalle}><Text style={estilos.etiquetaDetalle}>{etiqueta}</Text><Text style={estilos.valorDetalle}>{valor === undefined || valor === null || valor === '' ? 'No registrado' : String(valor)}</Text></View>;
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f4f5fb' },
  contenedor: { padding: 20, paddingBottom: 42, gap: 14, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  encabezado: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, backgroundColor: colores.azulOscuro, borderRadius: 16, padding: 20 },
  eyebrow: { color: '#bac1f2', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  titulo: { color: colores.blanco, fontSize: 24, fontWeight: '900', marginTop: 4 },
  subtitulo: { color: '#d7dcf7', fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 620 },
  botonVolver: { borderWidth: 1, borderColor: '#555987', backgroundColor: '#252750', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10 },
  textoVolver: { color: colores.blanco, fontSize: 13, fontWeight: '800' },
  seccion: { color: colores.azulOscuro, fontSize: 17, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tarjetaResumen: { flexGrow: 1, minWidth: 150, backgroundColor: colores.blanco, borderRadius: 12, borderWidth: 1, borderColor: '#e0e2f1', padding: 16 },
  numeroResumen: { color: colores.azulOscuro, fontSize: 25, fontWeight: '900' },
  etiquetaResumen: { color: colores.textoSuave, fontSize: 13, marginTop: 4 },
  tarjetaFormulario: { backgroundColor: colores.blanco, borderWidth: 1, borderColor: '#e0e2f1', borderRadius: 14, padding: 18, gap: 9 },
  ayuda: { color: colores.textoSuave, fontSize: 13, lineHeight: 19 },
  error: { color: colores.error, backgroundColor: '#fff0ee', padding: 11, borderRadius: 8, lineHeight: 20, fontSize: 13, marginTop: 4 },
  etiquetaCampo: { color: colores.azulOscuro, fontSize: 13, fontWeight: '800', marginTop: 5 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#d8dbea', backgroundColor: '#fbfbfe', borderRadius: 9, paddingHorizontal: 13, color: colores.azulOscuro },
  inputMultilinea: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },
  selectorAliado: { minHeight: 46, borderWidth: 1, borderColor: '#d8dbea', backgroundColor: '#fbfbfe', borderRadius: 9, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textoSelector: { color: colores.azulOscuro, fontSize: 14 },
  textoPlaceholder: { color: '#8790a6', fontSize: 14 },
  iconoSelector: { color: colores.azulOscuro, fontSize: 20, fontWeight: '800' },
  filaCampos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  campoMitad: { flexGrow: 1, minWidth: 180, gap: 8 },
  estadoFormulario: { gap: 8 },
  filaEstado: { flexDirection: 'row', gap: 8 },
  chipEstado: { borderWidth: 1, borderColor: '#d8dbea', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 },
  chipEstadoActivo: { backgroundColor: colores.azulOscuro, borderColor: colores.azulOscuro },
  textoEstado: { color: colores.azulOscuro, fontSize: 12, fontWeight: '800' },
  textoEstadoActivo: { color: colores.blanco },
  botonPrincipal: { minHeight: 46, backgroundColor: colores.azulOscuro, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginTop: 6 },
  textoBotonPrincipal: { color: colores.blanco, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  botonSecundario: { minHeight: 44, backgroundColor: '#f6f6fc', borderWidth: 1, borderColor: '#c9cbea', borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  textoBotonSecundario: { color: colores.azulOscuro, fontSize: 13, fontWeight: '800' },
  tarjetaLista: { backgroundColor: colores.blanco, borderWidth: 1, borderColor: '#e0e2f1', borderRadius: 14, padding: 18, gap: 12 },
  encabezadoLista: { flexDirection: 'row', alignItems: 'center' },
  vacio: { color: colores.textoSuave, textAlign: 'center', padding: 18, lineHeight: 20 },
  tarjetaItem: { borderWidth: 1, borderColor: '#e4e5f0', backgroundColor: '#fcfcff', borderRadius: 12, padding: 14, gap: 10 },
  filaTituloItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nombreItem: { color: colores.azulOscuro, fontSize: 15, fontWeight: '900' },
  subtituloItem: { color: colores.textoSuave, fontSize: 12, marginTop: 3 },
  badge: { fontSize: 9, fontWeight: '900', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, overflow: 'hidden' },
  badgeActiva: { color: '#12643a', backgroundColor: '#e4f6eb' },
  badgeInactiva: { color: '#7c4a11', backgroundColor: '#fff1d8' },
  descripcionItem: { color: colores.textoSuave, fontSize: 13, lineHeight: 19 },
  datosItem: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  datoDestacado: { color: colores.azulOscuro, fontSize: 13, fontWeight: '900' },
  datoSecundario: { color: colores.textoSuave, fontSize: 12 },
  sinStock: { color: colores.error, fontSize: 11, fontWeight: '800' },
  accionesItem: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: '#ececf4', paddingTop: 10 },
  botonDetalle: { backgroundColor: colores.azulOscuro, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9 },
  textoDetalle: { color: colores.blanco, fontSize: 12, fontWeight: '800' },
  botonAccion: { borderWidth: 1, borderColor: '#c9cbea', backgroundColor: '#f6f6fc', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9 },
  textoAccion: { color: colores.azulOscuro, fontSize: 12, fontWeight: '800' },
  botonEliminar: { borderWidth: 1, borderColor: '#edb2ae', backgroundColor: '#fff1f0', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9 },
  textoEliminar: { color: colores.error, fontSize: 12, fontWeight: '800' },
  fondoModal: { flex: 1, backgroundColor: 'rgba(12,13,55,.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: '100%', maxWidth: 460, maxHeight: '85%', backgroundColor: colores.blanco, borderRadius: 16, padding: 20, gap: 12, borderWidth: 1, borderColor: '#d9dcef' },
  tituloModal: { color: colores.azulOscuro, fontSize: 20, fontWeight: '900' },
  opcionAliado: { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#ececf4' },
  textoDialogo: { color: colores.textoSuave, fontSize: 14, lineHeight: 21 },
  accionesDialogo: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 9, marginTop: 5 },
  botonSecundarioModal: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: '#c9cbea', borderRadius: 9 },
  botonConfirmar: { minHeight: 42, minWidth: 145, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colores.azulOscuro, borderRadius: 9 },
  detalleFondo: { flex: 1, padding: 22, paddingTop: 42, backgroundColor: '#f4f5fb' },
  detalleEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: colores.azulOscuro, borderRadius: 18, padding: 20 },
  iconoDetalle: { height: 56, width: 56, borderRadius: 18, backgroundColor: '#30335f', alignItems: 'center', justifyContent: 'center' },
  iconoDetalleTexto: { color: colores.blanco, fontSize: 27, fontWeight: '900' },
  eyebrowDetalle: { color: '#bac1f2', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  tituloDetalle: { color: colores.blanco, fontSize: 21, fontWeight: '900', marginTop: 3 },
  subtituloDetalle: { color: '#d7dcf7', fontSize: 12, marginTop: 3 },
  detalleContenido: { flexGrow: 1, backgroundColor: colores.blanco, borderRadius: 16, padding: 16, marginTop: 14, borderWidth: 1, borderColor: '#e0e2f1' },
  seccionDetalle: { color: colores.azulOscuro, fontSize: 14, fontWeight: '900', marginTop: 7, marginBottom: 5 },
  filaDetalle: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: '#ececf4', paddingVertical: 12 },
  etiquetaDetalle: { color: colores.textoSuave, fontSize: 13, flex: 1 },
  valorDetalle: { color: colores.azulOscuro, fontSize: 13, fontWeight: '700', flex: 1.2, textAlign: 'right' },
  accionesDetalle: { gap: 9, marginTop: 14 },
  botonEstadoDetalle: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#c9cbea', backgroundColor: '#f6f6fc', borderRadius: 9 },
  botonEliminarDetalle: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#edb2ae', backgroundColor: '#fff1f0', borderRadius: 9 },
  botonVolverDetalle: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  textoVolverDetalle: { color: colores.azulOscuro, fontWeight: '800' },
});
