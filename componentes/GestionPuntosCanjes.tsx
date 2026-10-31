import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/servicios/supabase';
import { colores } from '../src/tema/colores';

type Material = { id: string; nombre: string; unidadMedida: 'kg' | 'unidad'; puntosPorUnidad: number; activo: boolean };
type Movimiento = { id: string; clienteId: string; tipo: string; puntos: number; descripcion: string; fecha: string; cantidadMaterial?: number | null; materialId?: string | null };
type Canje = { id: string; clienteId: string; recompensaId: string; puntosUsados: number; estado: 'pendiente' | 'aprobado' | 'entregado' | 'cancelado'; fechaSolicitud: string; fechaEntrega?: string | null };
type Cliente = { id: string; documento: string; usuarioId: string; puntosDisponibles: number };
type Usuario = { id: string; nombre: string; correo: string };
type Recompensa = { id: string; nombre: string };
type Dialogo = { titulo: string; mensaje: string; confirmar?: string; accion?: () => Promise<string>; resultado?: boolean; error?: boolean };
type Seccion = 'materiales' | 'movimientos' | 'canjes';
type Formulario = { nombre: string; unidadMedida: 'kg' | 'unidad'; puntosPorUnidad: string; activo: boolean };

// Devuelvo el formulario limpio para crear otro material.
const formularioVacio = (): Formulario => ({ nombre: '', unidadMedida: 'kg', puntosPorUnidad: '', activo: true });
// Formateo las fechas para que se entiendan fácilmente en pantalla.
const fechaLegible = (valor: string) => { const fecha = new Date(valor); return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString(); };
// Cambio los estados internos de los canjes por palabras visibles para la persona.
const etiquetaEstado = (estado: string) => ({ pendiente: 'Pendiente', aprobado: 'Aprobado', entregado: 'Entregado', cancelado: 'Cancelado' }[estado] ?? estado);

// Esta pantalla reúne el catálogo de materiales, los puntos y los canjes.
export default function GestionPuntosCanjes({ onVolver }: { onVolver: () => void }) {
  const [seccion, setSeccion] = useState<Seccion>('materiales');
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [canjes, setCanjes] = useState<Canje[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [recompensas, setRecompensas] = useState<Recompensa[]>([]);
  const [formulario, setFormulario] = useState<Formulario>(formularioVacio());
  const [editando, setEditando] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [detalle, setDetalle] = useState<Movimiento | Canje | Material | null>(null);

  // Traigo los datos y sus relaciones para mostrar nombres en vez de identificadores.
  const cargar = useCallback(async () => {
    if (!supabase) { setError('No hay conexión con Supabase. Verifica la configuración e inténtalo de nuevo.'); setCargando(false); return; }
    setCargando(true); setError('');
    try {
      const [m, mov, c, cl, u, r] = await Promise.all([
        supabase.from('materialesReciclables').select('*').order('nombre'),
        supabase.from('movimientosPuntos').select('*').order('fecha', { ascending: false }).limit(500),
        supabase.from('canjes').select('*').order('fechaSolicitud', { ascending: false }).limit(500),
        supabase.from('clientes').select('id,documento,usuarioId,puntosDisponibles'),
        supabase.from('usuarios').select('id,nombre,correo'),
        supabase.from('recompensas').select('id,nombre'),
      ]);
      const fallo = m.error ?? mov.error ?? c.error ?? cl.error ?? u.error ?? r.error;
      if (fallo) throw fallo;
      setMateriales((m.data ?? []) as Material[]); setMovimientos((mov.data ?? []) as Movimiento[]); setCanjes((c.data ?? []) as Canje[]); setClientes((cl.data ?? []) as Cliente[]); setUsuarios((u.data ?? []) as Usuario[]); setRecompensas((r.data ?? []) as Recompensa[]);
    } catch (fallo) {
      setError(`No se pudieron cargar los datos: ${fallo instanceof Error ? fallo.message : 'Inténtalo de nuevo.'}`);
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const clienteEtiqueta = useMemo(() => new Map(clientes.map((c) => { const usuario = usuarios.find((u) => u.id === c.usuarioId); return [c.id, usuario ? `${usuario.nombre} · ${c.documento}` : c.documento] as const; })), [clientes, usuarios]);
  const recompensaEtiqueta = useMemo(() => new Map(recompensas.map((r) => [r.id, r.nombre])), [recompensas]);
  const resumen = [
    { titulo: 'Materiales activos', numero: materiales.filter((m) => m.activo).length, nota: `${materiales.length} en catálogo` },
    { titulo: 'Puntos acumulados', numero: movimientos.filter((m) => m.puntos > 0).reduce((s, m) => s + m.puntos, 0), nota: 'Según el historial' },
    { titulo: 'Puntos canjeados', numero: Math.abs(movimientos.filter((m) => m.puntos < 0).reduce((s, m) => s + m.puntos, 0)), nota: 'Según el historial' },
    { titulo: 'Canjes pendientes', numero: canjes.filter((c) => c.estado === 'pendiente').length, nota: `${canjes.length} solicitudes registradas` },
  ];
  const termino = busqueda.trim().toLocaleLowerCase();
  const materialesVisibles = materiales.filter((m) => !termino || [m.nombre, m.unidadMedida, m.puntosPorUnidad, m.activo ? 'activo' : 'inactivo'].some((v) => String(v).toLocaleLowerCase().includes(termino)));
  const movimientosVisibles = movimientos.filter((m) => !termino || [clienteEtiqueta.get(m.clienteId), m.tipo, m.descripcion, m.puntos, m.fecha, materiales.find((x) => x.id === m.materialId)?.nombre].some((v) => String(v ?? '').toLocaleLowerCase().includes(termino)));
  const canjesVisibles = canjes.filter((c) => !termino || [clienteEtiqueta.get(c.clienteId), recompensaEtiqueta.get(c.recompensaId), c.estado, c.puntosUsados, c.fechaSolicitud].some((v) => String(v ?? '').toLocaleLowerCase().includes(termino)));

  // Dejo la acción lista para ejecutarla cuando la persona confirme en el modal.
  const confirmar = (titulo: string, mensaje: string, confirmarTexto: string, accion: () => Promise<string>) => setDialogo({ titulo, mensaje, confirmar: confirmarTexto, accion });
  // Reviso los campos y guardo un material nuevo o sus cambios.
  const guardarMaterial = () => {
    const puntos = Number(formulario.puntosPorUnidad);
    if (!formulario.nombre.trim() || !formulario.puntosPorUnidad || !Number.isInteger(puntos) || puntos < 0) { setError('Escribe un nombre y una cantidad válida de puntos por unidad (entero igual o mayor que cero).'); return; }
    confirmar(editando ? 'Guardar cambios' : 'Crear material', editando ? `¿Confirmas los cambios de “${formulario.nombre.trim()}”?` : `¿Confirmas crear “${formulario.nombre.trim()}” en el catálogo?`, editando ? 'Guardar cambios' : 'Crear material', async () => {
      if (!supabase) throw new Error('No hay conexión con Supabase.');
      const valores = { nombre: formulario.nombre.trim(), unidadMedida: formulario.unidadMedida, puntosPorUnidad: puntos, activo: formulario.activo };
      const respuesta = editando ? await supabase.from('materialesReciclables').update(valores).eq('id', editando) : await supabase.from('materialesReciclables').insert({ id: `material_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, ...valores });
      if (respuesta.error) throw new Error(respuesta.error.message);
      await cargar(); setFormulario(formularioVacio()); setEditando(null); return editando ? 'Los cambios del material se guardaron.' : 'El material reciclable se creó correctamente.';
    });
  };
  // Copio los datos del material seleccionado al formulario de edición.
  const editarMaterial = (material: Material) => { setEditando(material.id); setFormulario({ nombre: material.nombre, unidadMedida: material.unidadMedida, puntosPorUnidad: String(material.puntosPorUnidad), activo: material.activo }); setDetalle(null); setError(''); };
  // Activo o desactivo un material después de pedir confirmación.
  const cambiarMaterialEstado = (material: Material) => confirmar(material.activo ? 'Desactivar material' : 'Activar material', `¿Confirmas ${material.activo ? 'desactivar' : 'activar'} “${material.nombre}”?`, material.activo ? 'Desactivar' : 'Activar', async () => {
    if (!supabase) throw new Error('No hay conexión con Supabase.'); const { error: fallo } = await supabase.from('materialesReciclables').update({ activo: !material.activo }).eq('id', material.id); if (fallo) throw new Error(fallo.message); await cargar(); return `El material quedó ${material.activo ? 'inactivo' : 'activo'}.`;
  });
  // Compruebo que el material no esté en el historial antes de eliminarlo.
  const eliminarMaterial = (material: Material) => confirmar('Eliminar material', `Se comprobará si “${material.nombre}” aparece en movimientos registrados.`, 'Revisar y eliminar', async () => {
    if (!supabase) throw new Error('No hay conexión con Supabase.'); const { count, error: falloRevision } = await supabase.from('movimientosPuntos').select('id', { count: 'exact', head: true }).eq('materialId', material.id); if (falloRevision) throw new Error(`No se pudo consultar el historial: ${falloRevision.message}`); if ((count ?? 0) > 0) throw new Error('No se puede eliminar este material porque está ligado a movimientos de puntos. Puedes desactivarlo para retirarlo del catálogo.'); const { error: fallo } = await supabase.from('materialesReciclables').delete().eq('id', material.id); if (fallo) throw new Error(fallo.message); await cargar(); return 'El material se eliminó correctamente.';
  });
  // Avanzo el canje por sus pasos permitidos: pendiente, aprobado y entregado.
  const avanzarCanje = (canje: Canje) => {
    const siguiente = canje.estado === 'pendiente' ? 'aprobado' : canje.estado === 'aprobado' ? 'entregado' : null;
    if (!siguiente) return;
    confirmar(siguiente === 'aprobado' ? 'Aprobar canje' : 'Marcar como entregado', `¿Confirmas cambiar el estado del canje de ${etiquetaEstado(canje.estado)} a ${etiquetaEstado(siguiente)}?`, siguiente === 'aprobado' ? 'Aprobar' : 'Confirmar entrega', async () => {
      if (!supabase) throw new Error('No hay conexión con Supabase.');
      const valores = siguiente === 'entregado' ? { estado: siguiente, fechaEntrega: new Date().toISOString() } : { estado: siguiente };
      const { error: fallo } = await supabase.from('canjes').update(valores).eq('id', canje.id).eq('estado', canje.estado); if (fallo) throw new Error(fallo.message); await cargar(); return siguiente === 'aprobado' ? 'El canje fue aprobado.' : 'El canje quedó marcado como entregado.';
    });
  };
  // Ejecuto la acción confirmada y muestro si terminó bien o si ocurrió un error.
  const ejecutarDialogo = async () => { if (!dialogo?.accion) return; setGuardando(true); try { const mensaje = await dialogo.accion(); setDialogo({ titulo: 'Acción completada', mensaje, resultado: true }); } catch (e) { setDialogo({ titulo: 'No se completó la acción', mensaje: e instanceof Error ? e.message : 'Ocurrió un error al procesar la solicitud.', resultado: true, error: true }); } finally { setGuardando(false); } };

  return <ScrollView style={s.fondo} contentContainerStyle={s.contenedor} keyboardShouldPersistTaps="handled">
    <View style={s.encabezado}><View style={{ flex: 1 }}><Text style={s.marca}>RECICASH · OPERACIÓN</Text><Text style={s.titulo}>Puntos y Canjes</Text><Text style={s.subtitulo}>Administra los materiales, consulta la trazabilidad de puntos y gestiona las solicitudes de canje.</Text></View><TouchableOpacity style={s.volver} onPress={onVolver}><Text style={s.textoVolver}>Volver</Text></TouchableOpacity></View>
    <Text style={s.seccion}>Resumen del programa</Text><View style={s.grid}>{resumen.map((x) => <View key={x.titulo} style={s.tarjetaResumen}><Text style={s.numero}>{x.numero.toLocaleString()}</Text><Text style={s.etiquetaResumen}>{x.titulo}</Text><Text style={s.notaResumen}>{x.nota}</Text></View>)}</View>
    <View style={s.pestanas}>{([['materiales', 'Materiales reciclables'], ['movimientos', 'Movimientos de puntos'], ['canjes', 'Canjes']] as [Seccion, string][]).map(([key, label]) => <TouchableOpacity key={key} onPress={() => { setSeccion(key); setBusqueda(''); setError(''); }} style={[s.pestana, seccion === key && s.pestanaActiva]}><Text style={[s.textoPestana, seccion === key && s.textoPestanaActivo]}>{label}</Text></TouchableOpacity>)}</View>
    {seccion === 'materiales' ? <View style={s.tarjeta}><Text style={s.seccion}>{editando ? 'Editar material reciclable' : 'Nuevo material reciclable'}</Text><Text style={s.ayuda}>Define los materiales recibidos y los puntos que generan. Los movimientos ya asociados conservan su referencia.</Text>{error ? <Text style={s.error}>{error}</Text> : null}
      <Text style={s.etiqueta}>Nombre</Text><TextInput style={s.input} placeholder="Ej. Plástico PET" value={formulario.nombre} onChangeText={(v) => { setFormulario((f) => ({ ...f, nombre: v })); setError(''); }} />
      <Text style={s.etiqueta}>Unidad de medida</Text><View style={s.opciones}>{(['kg', 'unidad'] as const).map((v) => <TouchableOpacity key={v} style={[s.chip, formulario.unidadMedida === v && s.chipActivo]} onPress={() => setFormulario((f) => ({ ...f, unidadMedida: v }))}><Text style={[s.chipTexto, formulario.unidadMedida === v && s.chipTextoActivo]}>{v === 'kg' ? 'Kilogramo (kg)' : 'Unidad'}</Text></TouchableOpacity>)}</View>
      <Text style={s.etiqueta}>Puntos por unidad</Text><TextInput style={s.input} keyboardType="number-pad" placeholder="Ej. 10" value={formulario.puntosPorUnidad} onChangeText={(v) => { setFormulario((f) => ({ ...f, puntosPorUnidad: v.replace(/[^0-9]/g, '') })); setError(''); }} />
      {editando ? <><Text style={s.etiqueta}>Estado</Text><View style={s.opciones}>{[true, false].map((v) => <TouchableOpacity key={String(v)} style={[s.chip, formulario.activo === v && s.chipActivo]} onPress={() => setFormulario((f) => ({ ...f, activo: v }))}><Text style={[s.chipTexto, formulario.activo === v && s.chipTextoActivo]}>{v ? 'Activo' : 'Inactivo'}</Text></TouchableOpacity>)}</View></> : null}
      <TouchableOpacity style={s.primario} disabled={guardando} onPress={guardarMaterial}><Text style={s.textoPrimario}>{editando ? 'Guardar cambios' : 'Crear material'}</Text></TouchableOpacity>{editando ? <TouchableOpacity style={s.secundario} onPress={() => confirmar('Cancelar edición', 'Se descartarán los cambios sin guardar. ¿Deseas continuar?', 'Descartar cambios', async () => { setFormulario(formularioVacio()); setEditando(null); return 'Los cambios se descartaron.'; })}><Text style={s.textoSecundario}>Cancelar edición</Text></TouchableOpacity> : null}</View> : null}
    <View style={s.tarjeta}><View style={s.cabeceraLista}><View style={{ flex: 1 }}><Text style={s.seccion}>{seccion === 'materiales' ? 'Catálogo de materiales' : seccion === 'movimientos' ? 'Historial de movimientos' : 'Solicitudes de canje'}</Text><Text style={s.ayuda}>{seccion === 'materiales' ? `${materialesVisibles.length} de ${materiales.length} materiales` : seccion === 'movimientos' ? `${movimientosVisibles.length} de ${movimientos.length} movimientos` : `${canjesVisibles.length} de ${canjes.length} canjes`}</Text></View><TouchableOpacity style={s.recargar} onPress={() => void cargar()}><Text style={s.textoSecundario}>Actualizar</Text></TouchableOpacity></View>
      <TextInput style={s.input} placeholder={seccion === 'materiales' ? 'Buscar por nombre, unidad o estado' : seccion === 'movimientos' ? 'Buscar por cliente, descripción o tipo' : 'Buscar por cliente, recompensa o estado'} value={busqueda} onChangeText={setBusqueda} />
      {error && seccion !== 'materiales' ? <Text style={s.error}>{error}</Text> : null}{cargando ? <ActivityIndicator size="large" color={colores.azulOscuro} style={{ margin: 24 }} /> : null}
      {!cargando && seccion === 'materiales' && materialesVisibles.length === 0 ? <Text style={s.vacio}>{termino ? 'No hay resultados para esa búsqueda.' : 'Aún no hay materiales. Crea el primero desde el formulario.'}</Text> : null}
      {!cargando && seccion === 'movimientos' && movimientosVisibles.length === 0 ? <Text style={s.vacio}>{termino ? 'No hay resultados para esa búsqueda.' : 'Todavía no se han registrado movimientos de puntos.'}</Text> : null}
      {!cargando && seccion === 'canjes' && canjesVisibles.length === 0 ? <Text style={s.vacio}>{termino ? 'No hay resultados para esa búsqueda.' : 'Todavía no se han recibido solicitudes de canje.'}</Text> : null}
      {seccion === 'materiales' && materialesVisibles.map((m) => <View key={m.id} style={s.registro}><View style={s.registroFila}><View style={{ flex: 1 }}><Text style={s.nombre}>{m.nombre}</Text><Text style={s.detalle}> {m.puntosPorUnidad} puntos por {m.unidadMedida === 'kg' ? 'kg' : 'unidad'}</Text></View><Text style={[s.estado, m.activo ? s.estadoActivo : s.estadoInactivo]}>{m.activo ? 'Activo' : 'Inactivo'}</Text></View><View style={s.acciones}><TouchableOpacity style={s.secundario} onPress={() => setDetalle(m)}><Text style={s.textoSecundario}>Ver detalle</Text></TouchableOpacity><TouchableOpacity style={s.secundario} onPress={() => editarMaterial(m)}><Text style={s.textoSecundario}>Editar</Text></TouchableOpacity><TouchableOpacity style={s.secundario} onPress={() => cambiarMaterialEstado(m)}><Text style={s.textoSecundario}>{m.activo ? 'Desactivar' : 'Activar'}</Text></TouchableOpacity><TouchableOpacity style={s.peligro} onPress={() => eliminarMaterial(m)}><Text style={s.textoPeligro}>Eliminar</Text></TouchableOpacity></View></View>)}
      {seccion === 'movimientos' && movimientosVisibles.map((m) => <TouchableOpacity key={m.id} style={s.registro} onPress={() => setDetalle(m)}><View style={s.registroFila}><View style={{ flex: 1 }}><Text style={s.nombre}>{clienteEtiqueta.get(m.clienteId) ?? 'Cliente sin perfil'}</Text><Text style={s.detalle}>{m.descripcion || 'Movimiento de puntos'} · {fechaLegible(m.fecha)}</Text></View><Text style={[s.puntos, m.puntos >= 0 ? s.positivo : s.negativo]}>{m.puntos > 0 ? '+' : ''}{m.puntos} pts</Text></View><Text style={s.pildora}>{m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)}</Text></TouchableOpacity>)}
      {seccion === 'canjes' && canjesVisibles.map((c) => <View key={c.id} style={s.registro}><TouchableOpacity onPress={() => setDetalle(c)}><View style={s.registroFila}><View style={{ flex: 1 }}><Text style={s.nombre}>{recompensaEtiqueta.get(c.recompensaId) ?? 'Recompensa'}</Text><Text style={s.detalle}>{clienteEtiqueta.get(c.clienteId) ?? 'Cliente sin perfil'} · {c.puntosUsados} puntos</Text><Text style={s.detalle}>Solicitado: {fechaLegible(c.fechaSolicitud)}{c.fechaEntrega ? ` · Entregado: ${fechaLegible(c.fechaEntrega)}` : ''}</Text></View><Text style={[s.estado, c.estado === 'entregado' ? s.estadoActivo : c.estado === 'cancelado' ? s.estadoInactivo : s.estadoPendiente]}>{etiquetaEstado(c.estado)}</Text></View></TouchableOpacity>{c.estado === 'pendiente' || c.estado === 'aprobado' ? <TouchableOpacity style={s.primarioPequeno} onPress={() => avanzarCanje(c)}><Text style={s.textoPrimario}>{c.estado === 'pendiente' ? 'Aprobar canje' : 'Marcar como entregado'}</Text></TouchableOpacity> : null}</View>)}
    </View>
    <View style={s.pie}><Text style={s.pieTexto}>Los movimientos de puntos y solicitudes de canje se conservan como historial de auditoría. Los puntos y existencias se actualizan mediante el proceso de canje.</Text></View>
    <Modal visible={Boolean(dialogo)} transparent animationType="fade" onRequestClose={() => !guardando && setDialogo(null)}><View style={s.fondoModal}><View style={s.modal}><Text style={s.tituloModal}>{dialogo?.titulo}</Text><Text style={s.mensajeModal}>{dialogo?.mensaje}</Text>{dialogo?.resultado ? <TouchableOpacity style={s.primario} onPress={() => setDialogo(null)}><Text style={s.textoPrimario}>Entendido</Text></TouchableOpacity> : <View style={s.acciones}><TouchableOpacity style={s.secundario} disabled={guardando} onPress={() => setDialogo(null)}><Text style={s.textoSecundario}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={s.primario} disabled={guardando} onPress={() => void ejecutarDialogo()}><Text style={s.textoPrimario}>{guardando ? 'Procesando…' : dialogo?.confirmar}</Text></TouchableOpacity></View>}</View></View></Modal>
    <Modal visible={Boolean(detalle)} transparent animationType="fade" onRequestClose={() => setDetalle(null)}><View style={s.fondoModal}><View style={s.modal}><Text style={s.tituloModal}>{detalle && 'tipo' in detalle ? 'Detalle del movimiento' : detalle && 'estado' in detalle ? 'Detalle del canje' : 'Detalle del material'}</Text>{detalle && 'tipo' in detalle ? <><Text style={s.detalleModal}>Cliente: {clienteEtiqueta.get(detalle.clienteId) ?? detalle.clienteId}</Text><Text style={s.detalleModal}>Tipo: {detalle.tipo}</Text><Text style={s.detalleModal}>Puntos: {detalle.puntos}</Text><Text style={s.detalleModal}>Descripción: {detalle.descripcion || '—'}</Text><Text style={s.detalleModal}>Fecha: {fechaLegible(detalle.fecha)}</Text>{detalle.materialId ? <Text style={s.detalleModal}>Material: {materiales.find((m) => m.id === detalle.materialId)?.nombre ?? detalle.materialId}</Text> : null}{detalle.cantidadMaterial != null ? <Text style={s.detalleModal}>Cantidad: {detalle.cantidadMaterial}</Text> : null}</> : null}{detalle && 'estado' in detalle ? <><Text style={s.detalleModal}>Recompensa: {recompensaEtiqueta.get(detalle.recompensaId) ?? detalle.recompensaId}</Text><Text style={s.detalleModal}>Cliente: {clienteEtiqueta.get(detalle.clienteId) ?? detalle.clienteId}</Text><Text style={s.detalleModal}>Puntos utilizados: {detalle.puntosUsados}</Text><Text style={s.detalleModal}>Estado: {etiquetaEstado(detalle.estado)}</Text><Text style={s.detalleModal}>Fecha de solicitud: {fechaLegible(detalle.fechaSolicitud)}</Text></> : null}{detalle && 'unidadMedida' in detalle ? <><Text style={s.detalleModal}>Nombre: {detalle.nombre}</Text><Text style={s.detalleModal}>Unidad: {detalle.unidadMedida}</Text><Text style={s.detalleModal}>Puntos por unidad: {detalle.puntosPorUnidad}</Text><Text style={s.detalleModal}>Estado: {detalle.activo ? 'Activo' : 'Inactivo'}</Text></> : null}<TouchableOpacity style={[s.primario, { marginTop: 18 }]} onPress={() => setDetalle(null)}><Text style={s.textoPrimario}>Cerrar</Text></TouchableOpacity></View></View></Modal>
  </ScrollView>;
}

const s = StyleSheet.create({ fondo: { flex: 1, backgroundColor: '#f3f5fa' }, contenedor: { flexGrow: 1, padding: 20, paddingTop: 46, gap: 16 }, encabezado: { backgroundColor: colores.azulOscuro, borderRadius: 18, padding: 22, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, marca: { color: '#c6c8ff', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 }, titulo: { color: colores.blanco, fontSize: 28, fontWeight: '900', marginTop: 5 }, subtitulo: { color: '#d7d8ee', fontSize: 14, lineHeight: 21, marginTop: 7 }, volver: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: '#7779a2' }, textoVolver: { color: colores.blanco, fontWeight: '800' }, seccion: { color: colores.azulOscuro, fontSize: 20, fontWeight: '900', marginBottom: 8 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, tarjetaResumen: { backgroundColor: colores.blanco, borderRadius: 13, padding: 15, minWidth: '47%', flexGrow: 1, borderWidth: 1, borderColor: '#e0e2ef' }, numero: { color: colores.azulOscuro, fontSize: 25, fontWeight: '900' }, etiquetaResumen: { color: '#24264d', fontWeight: '800', marginTop: 4 }, notaResumen: { color: colores.textoSuave, fontSize: 12, marginTop: 4 }, pestanas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, pestana: { paddingVertical: 10, paddingHorizontal: 13, borderRadius: 10, backgroundColor: colores.blanco, borderWidth: 1, borderColor: '#d9dbee' }, pestanaActiva: { backgroundColor: colores.azulOscuro, borderColor: colores.azulOscuro }, textoPestana: { color: colores.azulOscuro, fontWeight: '800' }, textoPestanaActivo: { color: colores.blanco }, tarjeta: { backgroundColor: colores.blanco, borderRadius: 14, borderWidth: 1, borderColor: '#e0e2ef', padding: 17 }, ayuda: { color: colores.textoSuave, lineHeight: 19, marginBottom: 12 }, etiqueta: { color: colores.azulOscuro, fontWeight: '800', marginTop: 11, marginBottom: 5 }, input: { minHeight: 46, borderWidth: 1, borderColor: '#d7d9e9', borderRadius: 9, paddingHorizontal: 12, color: colores.azulOscuro, backgroundColor: '#fff', marginBottom: 10 }, opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }, chip: { padding: 10, borderWidth: 1, borderColor: '#d7d9e9', borderRadius: 9 }, chipActivo: { backgroundColor: '#e7e8ff', borderColor: colores.azulOscuro }, chipTexto: { color: colores.azulOscuro, fontWeight: '700' }, chipTextoActivo: { color: colores.azulOscuro }, primario: { backgroundColor: colores.azulOscuro, padding: 13, borderRadius: 9, alignItems: 'center', marginTop: 7 }, textoPrimario: { color: colores.blanco, fontWeight: '900' }, secundario: { padding: 10, borderRadius: 9, borderWidth: 1, borderColor: '#d7d9e9', alignItems: 'center', justifyContent: 'center' }, textoSecundario: { color: colores.azulOscuro, fontWeight: '800' }, error: { color: colores.error, backgroundColor: '#fff0ef', padding: 11, borderRadius: 9, lineHeight: 19, marginVertical: 7 }, cabeceraLista: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, recargar: { padding: 9, borderWidth: 1, borderColor: '#d7d9e9', borderRadius: 9 }, vacio: { color: colores.textoSuave, textAlign: 'center', padding: 24, lineHeight: 21 }, registro: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#e8e9f1' }, registroFila: { flexDirection: 'row', alignItems: 'center', gap: 10 }, nombre: { color: colores.azulOscuro, fontWeight: '900', fontSize: 15 }, detalle: { color: colores.textoSuave, marginTop: 4, lineHeight: 19 }, estado: { overflow: 'hidden', paddingVertical: 5, paddingHorizontal: 9, borderRadius: 20, fontWeight: '800', fontSize: 12 }, estadoActivo: { color: '#19653c', backgroundColor: '#e1f4e8' }, estadoInactivo: { color: '#686978', backgroundColor: '#ececf0' }, estadoPendiente: { color: '#8a5b00', backgroundColor: '#fff2cf' }, acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }, peligro: { padding: 10, borderRadius: 9, borderWidth: 1, borderColor: '#f0c9c9' }, textoPeligro: { color: colores.error, fontWeight: '800' }, puntos: { fontWeight: '900', fontSize: 16 }, positivo: { color: '#197344' }, negativo: { color: colores.error }, pildora: { color: '#4c4e72', backgroundColor: '#eeeefa', alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20, marginTop: 8, fontWeight: '700' }, primarioPequeno: { alignSelf: 'flex-start', backgroundColor: colores.azulOscuro, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, marginTop: 10 }, pie: { padding: 14, borderRadius: 10, backgroundColor: '#e9eaf4' }, pieTexto: { color: '#555773', fontSize: 12, lineHeight: 18 }, fondoModal: { flex: 1, backgroundColor: '#11133299', justifyContent: 'center', alignItems: 'center', padding: 20 }, modal: { width: '100%', maxWidth: 520, maxHeight: '85%', backgroundColor: colores.blanco, borderRadius: 16, padding: 20 }, tituloModal: { color: colores.azulOscuro, fontSize: 21, fontWeight: '900', marginBottom: 10 }, mensajeModal: { color: '#55566b', fontSize: 15, lineHeight: 22, marginBottom: 14 }, detalleModal: { color: '#42445d', lineHeight: 22, marginTop: 6 } });
