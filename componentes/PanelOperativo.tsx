import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RolUsuario } from '../src/modelos/baseDatos';
import { supabase } from '../src/servicios/supabase';
import { colores } from '../src/tema/colores';

type Props = { rol: RolUsuario; usuarioId: string; seccion?: string };
type Registro = Record<string, any>;
type ClienteParaRecogida = { id: string; nombre: string; documento: string; telefono: string };
type GestorParaRecogida = { id: string; nombre: string; usuario: string; correo: string };
type DialogoAccion = { tipo: 'confirmacion' | 'resultado'; titulo: string; mensaje: string; textoConfirmar?: string; error?: string; accion?: () => Promise<string> };

// Explico los errores más comunes al guardar una recogida.
function mensajeErrorAlCrearRecogida(error: { code?: string; message: string }) {
  if (error.code === '42501') return 'Supabase rechazó la creación por permisos. Verifica que tu cuenta esté activa y que la función tenga permisos para tu rol. Si acabas de actualizar la base, recarga el esquema de la API de Supabase.';
  if (error.code === '23503') return 'El cliente o el gestor seleccionado ya no existe o está inactivo. Actualiza la lista y vuelve a intentarlo.';
  if (error.code === 'PGRST202') return 'Supabase no encuentra la función para crear recogidas. Actualiza el esquema de la API en Supabase y vuelve a intentarlo.';
  return error.message || 'No se pudo crear la recogida. Revisa los datos y vuelve a intentarlo.';
}

// Envío las acciones de cuentas al servicio seguro de Supabase.
async function gestionarCuenta(payload: Record<string, unknown>) {
  if (!supabase) throw new Error('No hay conexión configurada con Supabase.');
  const { data, error } = await supabase.functions.invoke('admin-gestionar-usuario', { body: payload });
  if (!error) return data;

  const contexto = (error as { context?: unknown }).context as { status?: number; clone?: () => { json: () => Promise<{ mensaje?: string }> } } | undefined;
  let mensajeServidor: string | undefined;
  if (contexto?.clone) {
    try {
      const respuesta = await contexto.clone().json();
      mensajeServidor = respuesta?.mensaje;
    } catch { /* Si la respuesta no es JSON, muestro el error HTTP inferior. */ }
  }
  if (mensajeServidor) throw new Error(mensajeServidor);
  if (contexto?.status === 404) throw new Error('No está desplegada la función de gestión de cuentas. Despliega admin-gestionar-usuario en Supabase y vuelve a intentarlo.');
  throw new Error(error.message || 'No fue posible guardar la cuenta. Verifica la función de Supabase y vuelve a intentarlo.');
}

// Muestro las funciones que corresponden al rol de la persona que inició sesión.
export default function PanelOperativo({ rol, usuarioId, seccion = 'todos' }: Props) {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cliente, setCliente] = useState<Registro | null>(null);
  const [puntos, setPuntos] = useState<Registro[]>([]);
  const [premios, setPremios] = useState<Registro[]>([]);
  const [carrito, setCarrito] = useState<string[]>([]);
  const [canjes, setCanjes] = useState<Registro[]>([]);
  const [recogidas, setRecogidas] = useState<Registro[]>([]);
  const [clientesParaRecogida, setClientesParaRecogida] = useState<ClienteParaRecogida[]>([]);
  const [gestoresParaRecogida, setGestoresParaRecogida] = useState<GestorParaRecogida[]>([]);
  const [clienteRecogidaSeleccionado, setClienteRecogidaSeleccionado] = useState('');
  const [gestorRecogidaSeleccionado, setGestorRecogidaSeleccionado] = useState(usuarioId);
  const [selectorRecogidaVisible, setSelectorRecogidaVisible] = useState<'cliente' | 'gestor' | null>(null);
  const [direccion, setDireccion] = useState('');
  const [fecha, setFecha] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [errorRecogida, setErrorRecogida] = useState('');
  const [usuarios, setUsuarios] = useState<Registro[]>([]);
  const [filtroUsuarios, setFiltroUsuarios] = useState('');
  const [errorFormulario, setErrorFormulario] = useState('');
  const [errorClave, setErrorClave] = useState('');
  const [dialogoAccion, setDialogoAccion] = useState<DialogoAccion | null>(null);
  const [procesandoDialogo, setProcesandoDialogo] = useState(false);
  const [restaurarPerfilAlCancelar, setRestaurarPerfilAlCancelar] = useState(false);
  const [perfilVisible, setPerfilVisible] = useState(false);
  const [cuentaPerfil, setCuentaPerfil] = useState<Registro | null>(null);
  const [detallePerfil, setDetallePerfil] = useState<Registro | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [idUsuarioEditando, setIdUsuarioEditando] = useState<string | null>(null);
  const [activoUsuarioEditando, setActivoUsuarioEditando] = useState<boolean | null>(null);
  const [tipoUsuario, setTipoUsuario] = useState<RolUsuario>('cliente');
  const [nuevo, setNuevo] = useState({ nombre: '', usuario: '', correo: '', clave: '', rol: 'cliente' as RolUsuario, identificacion: '', documento: '', telefono: '', direccion: '' });

  // Cargo los datos permitidos para el rol actual.
  const cargar = useCallback(async () => {
    if (!supabase) { setMensaje('No hay conexión configurada con Supabase.'); setCargando(false); return; }
    setCargando(true); setMensaje('');
    try {
      if (rol === 'cliente') {
        const { data: perfil, error: errorPerfil } = await supabase.from('clientes').select('*').eq('usuarioId', usuarioId).maybeSingle();
        if (errorPerfil) throw errorPerfil;
        setCliente(perfil);
        if (perfil) {
          const [{ data: movimientos, error: errorMov }, { data: historial, error: errorCanjes }] = await Promise.all([
            supabase.from('movimientosPuntos').select('*').eq('clienteId', perfil.id).order('fecha', { ascending: false }),
            supabase.from('canjes').select('*, recompensas(nombre, descripcion)').eq('clienteId', perfil.id).order('fechaSolicitud', { ascending: false }),
          ]);
          if (errorMov) throw errorMov;
          if (errorCanjes) throw errorCanjes;
          setPuntos(movimientos ?? []); setCanjes(historial ?? []);
        }
        const { data: catalogo, error: errorCatalogo } = await supabase.from('recompensas').select('*').eq('activo', true).gt('stock', 0).order('puntosRequeridos');
        if (errorCatalogo) throw errorCatalogo;
        setPremios(catalogo ?? []);
      } else if (rol === 'gestor') {
        const [{ data, error }, { data: clientesActivos, error: errorClientes }, { data: gestoresActivos, error: errorGestores }] = await Promise.all([
          supabase.rpc('lista_recogidas_gestor'),
          supabase.rpc('lista_clientes_para_recogida'),
          supabase.rpc('lista_gestores_para_recogida'),
        ]);
        if (error) throw error;
        if (errorClientes) throw errorClientes;
        if (errorGestores) throw errorGestores;
        setRecogidas(data ?? []);
        setClientesParaRecogida((clientesActivos ?? []) as ClienteParaRecogida[]);
        setGestoresParaRecogida((gestoresActivos ?? []) as GestorParaRecogida[]);
      } else if (rol === 'entidad_financiera') {
        const { data, error } = await supabase.rpc('historial_canjes_financieras');
        if (error) throw error;
        setCanjes(data ?? []);
      } else {
        const [{ data: filasUsuarios, error: errorUsuarios }, { data: perfilesClientes, error: errorClientes }] = await Promise.all([
          supabase.from('usuarios').select('id,nombre,usuario,correo,rol,activo,confirmacionPendiente,fechaCreacion').order('nombre'),
          supabase.from('clientes').select('usuarioId,documento'),
        ]);
        if (errorUsuarios) throw errorUsuarios;
        if (errorClientes) throw errorClientes;
        const documentos = new Map((perfilesClientes ?? []).map((perfil) => [perfil.usuarioId, perfil.documento]));
        setUsuarios((filasUsuarios ?? []).map((fila) => ({ ...fila, documento: documentos.get(fila.id) ?? '' })));
      }
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudieron cargar los datos.');
    } finally { setCargando(false); }
  }, [rol, usuarioId]);

  useEffect(() => { void cargar(); }, [cargar]);

  // Reviso si el módulo actual debe mostrar esta sección.
  const mostrar = (...modulos: string[]) => seccion === 'todos' || modulos.includes(seccion);

  // Valido y envío al sistema una solicitud de recogida del cliente.
  const solicitarRecogida = async () => {
    setErrorRecogida('');
    setMensaje('');
    if (!supabase) { setErrorRecogida('No hay conexión con Supabase. Revisa la configuración e inténtalo de nuevo.'); return; }
    if (!direccion.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(`${fecha}T12:00:00`))) {
      setErrorRecogida('Escribe la dirección y una fecha válida con formato AAAA-MM-DD.'); return;
    }
    setGuardando(true); setMensaje('');
    try {
      // Vuelvo a buscar el perfil si todavía no estaba disponible al abrir la pantalla.
      let perfilCliente = cliente;
      if (!perfilCliente) {
        const { data, error: errorPerfil } = await supabase.from('clientes').select('*').eq('usuarioId', usuarioId).maybeSingle();
        if (errorPerfil) throw errorPerfil;
        perfilCliente = data;
        if (data) {
          setCliente(data);
        } else {
          // Si falta la ficha, la creo para esta cuenta con los datos de su propio registro.
          const { data: sesion, error: errorSesion } = await supabase.auth.getUser();
          if (errorSesion) throw errorSesion;
          if (!sesion.user || sesion.user.id !== usuarioId) throw new Error('La sesión no coincide con el perfil. Cierra sesión y vuelve a ingresar.');
          const datos = sesion.user.user_metadata ?? {};
          const documento = String(datos.documento ?? '').trim() || `PENDIENTE-${usuarioId}`;
          const { data: perfilCreado, error: errorCrearPerfil } = await supabase.from('clientes').insert({
            id: usuarioId,
            usuarioId,
            documento,
            telefono: String(datos.telefono ?? ''),
            direccion: String(datos.direccion ?? ''),
            puntosDisponibles: 0,
            puntosAcumulados: 0,
          }).select('*').single();
          if (errorCrearPerfil) {
            if (errorCrearPerfil.code === '42501') throw new Error('Supabase bloqueó la creación de tu ficha por permisos. En SQL Editor ejecuta supabase/migraciones/202610300001_clientes_perfil_propio.sql; no necesitas volver a ejecutar todo el esquema. Si ya la ejecutaste, verifica que tu cuenta tenga rol Cliente y esté activa.');
            if (errorCrearPerfil.code === '23505') throw new Error('No se pudo completar tu ficha porque el documento ya está registrado. Contacta al administrador.');
            throw errorCrearPerfil;
          }
          perfilCliente = perfilCreado;
          setCliente(perfilCreado);
        }
      }
      if (!perfilCliente) throw new Error('No encontramos tu ficha de cliente. Cierra sesión y vuelve a ingresar; si el problema continúa, contacta al administrador.');

      // Guardo la solicitud directamente; RLS valida que el cliente solo cree una para su propio perfil.
      const { error } = await supabase.from('solicitudesRecogida').insert({
        id: `recogida_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        clienteId: perfilCliente.id,
        gestorId: null,
        direccion: direccion.trim(),
        fechaSolicitada: new Date(`${fecha}T12:00:00`).toISOString(),
        observaciones: observaciones.trim(),
        estado: 'pendiente',
      });
      if (error) throw new Error(mensajeErrorAlCrearRecogida(error));
      setDireccion(''); setFecha(''); setObservaciones(''); setErrorRecogida(''); setMensaje('Solicitud de recogida enviada correctamente.');
      await cargar();
    } catch (error) {
      setErrorRecogida(error instanceof Error ? error.message : 'No se pudo enviar la solicitud de recogida.');
    } finally { setGuardando(false); }
  };

  // Registro una recogida para un cliente y elijo qué gestor activo la atenderá.
  const crearRecogidaGestor = () => {
    setErrorRecogida('');
    setMensaje('');
    if (!supabase) { setErrorRecogida('No hay conexión con Supabase. Revisa la configuración e inténtalo de nuevo.'); return; }
    if (!clienteRecogidaSeleccionado) { setErrorRecogida('Selecciona un cliente antes de crear la recogida.'); return; }
    if (!direccion.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(`${fecha}T12:00:00`))) {
      setErrorRecogida('Completa la dirección y una fecha válida con formato AAAA-MM-DD.'); return;
    }
    const clienteElegido = clientesParaRecogida.find((item) => item.id === clienteRecogidaSeleccionado);
    const gestorElegido = gestoresParaRecogida.find((item) => item.id === gestorRecogidaSeleccionado);
    pedirConfirmacion('Crear recogida', `¿Confirmas registrar una recogida para ${clienteElegido?.nombre ?? 'este cliente'}${gestorElegido ? ` y asignarla a ${gestorElegido.nombre}` : ' sin gestor asignado para que otro gestor pueda tomarla'}?`, 'Crear recogida', async () => {
      if (!supabase) throw new Error('No hay conexión con Supabase.');
      const { error } = await supabase.rpc('crear_solicitud_recogida', {
        p_cliente_id: clienteRecogidaSeleccionado,
        p_gestor_id: gestorRecogidaSeleccionado || null,
        p_direccion: direccion.trim(),
        p_fecha_solicitada: new Date(`${fecha}T12:00:00`).toISOString(),
        p_observaciones: observaciones.trim(),
      });
      if (error) throw new Error(mensajeErrorAlCrearRecogida(error));
      setDireccion(''); setFecha(''); setObservaciones(''); setClienteRecogidaSeleccionado(''); setGestorRecogidaSeleccionado(usuarioId);
      setErrorRecogida('');
      await cargar();
      return gestorElegido ? `La recogida se guardó y quedó asignada a ${gestorElegido.nombre}. También aparece en tu historial porque tú la creaste.` : 'La recogida se guardó sin asignar. Quedó pendiente para que administración la asigne o un gestor se la autoasigne.';
    });
  };

  // Solicito cada canje del carrito usando la operación segura de Supabase.
  const confirmarCarrito = async () => {
    if (!supabase || !carrito.length) return;
    setGuardando(true); setMensaje('');
    let completados = 0;
    for (const premioId of carrito) {
      const { error } = await supabase.rpc('canjear_recompensa', { recompensa_id: premioId });
      if (error) { setMensaje(`${completados ? `Se procesaron ${completados} canje(s). ` : ''}${error.message}`); break; }
      completados++;
    }
    if (completados === carrito.length) setMensaje(`${completados} canje(s) solicitado(s) correctamente.`);
    setCarrito((actual) => actual.slice(completados));
    setGuardando(false);
    await cargar();
  };

  // Actualizo el estado de una recogida desde la cuenta del gestor.
  const cambiarEstadoRecogida = async (id: string, estado: string) => {
    if (!supabase) return;
    const recogida = recogidas.find((item) => item.id === id);
    pedirConfirmacion(estado === 'asignada' ? 'Asignarme la recogida' : 'Completar recogida', `¿Confirmas ${estado === 'asignada' ? 'asignarte' : 'marcar como completada'} esta recogida?`, estado === 'asignada' ? 'Asignarme' : 'Marcar completada', async () => {
      const { error } = await supabase!.from('solicitudesRecogida').update({ estado, ...(estado === 'asignada' ? { gestorId: usuarioId } : {}) }).eq('id', id);
      if (error) throw new Error(error.message);
      await cargar();
      return `La recogida de ${recogida?.nombreCliente ?? 'el cliente'} quedó ${estado === 'asignada' ? 'asignada a tu cuenta' : 'completada'}.`;
    });
  };

  // Abro un diálogo para confirmar antes de ejecutar una acción importante.
  const pedirConfirmacion = (titulo: string, descripcion: string, textoConfirmar: string, accion: () => Promise<string>) => {
    setDialogoAccion({ tipo: 'confirmacion', titulo, mensaje: descripcion, textoConfirmar, accion });
  };

  // Ejecuto la acción del diálogo y presento su resultado.
  const ejecutarAccionConfirmada = async () => {
    if (!dialogoAccion?.accion || procesandoDialogo) return;
    setProcesandoDialogo(true);
    try {
      const resultado = await dialogoAccion.accion();
      setDialogoAccion({ tipo: 'resultado', titulo: 'Acción completada', mensaje: resultado });
    } catch (error) {
      setDialogoAccion({ ...dialogoAccion, error: error instanceof Error ? error.message : 'No fue posible completar la acción.' });
    } finally {
      setProcesandoDialogo(false);
    }
  };

  // Cierro el diálogo y recupero el perfil si se canceló una acción desde allí.
  const cerrarDialogo = () => {
    if (procesandoDialogo) return;
    if (dialogoAccion?.tipo === 'confirmacion' && restaurarPerfilAlCancelar) setPerfilVisible(true);
    setRestaurarPerfilAlCancelar(false);
    setDialogoAccion(null);
  };

  // Valido los datos y pido confirmación para crear o actualizar una cuenta.
  const crearUsuario = async () => {
    setErrorFormulario(''); setErrorClave('');
    if (!supabase) {
      setErrorFormulario('No hay conexión con Supabase. Verifica la configuración e inténtalo de nuevo.'); return;
    }
    if (!nuevo.nombre.trim() || !nuevo.usuario.trim() || !nuevo.correo.trim()) {
      setErrorFormulario('Completa los campos Nombre, Usuario y Correo.'); return;
    }
    if (!idUsuarioEditando && nuevo.clave.length < 8) {
      setErrorClave('La contraseña debe tener al menos 8 caracteres.'); return;
    }
    if (nuevo.rol === 'entidad_financiera' && !nuevo.identificacion.trim()) { setErrorFormulario('Indica la identificación de la entidad financiera.'); return; }
    if (nuevo.rol === 'cliente' && !nuevo.documento.trim()) { setErrorFormulario('Indica el documento del cliente.'); return; }
    const estabaEditando = Boolean(idUsuarioEditando);
    pedirConfirmacion(
      estabaEditando ? 'Guardar cambios' : 'Crear usuario',
      estabaEditando ? `¿Confirmas guardar los cambios de ${nuevo.nombre}?` : `¿Confirmas crear la cuenta de ${nuevo.nombre}?`,
      estabaEditando ? 'Guardar cambios' : 'Crear usuario',
      async () => {
        setGuardando(true);
        try {
      const estabaEditando = Boolean(idUsuarioEditando);
      if (!estabaEditando) {
        let versionFuncion: Record<string, unknown>;
        try {
          versionFuncion = await gestionarCuenta({ accion: 'verificar_version' });
        } catch {
          throw new Error('La función de Supabase no está actualizada. No se creó el usuario. Despliega admin-gestionar-usuario antes de volver a intentarlo.');
        }
        if (versionFuncion.version !== 'confirmacion-correos-v1' || versionFuncion.confirmacionRequerida !== true) {
          throw new Error('La función de Supabase no garantiza la confirmación del correo. No se creó el usuario. Despliega admin-gestionar-usuario antes de volver a intentarlo.');
        }
      }
      const data = await gestionarCuenta({ accion: estabaEditando ? 'actualizar' : 'crear', id: idUsuarioEditando, activo: estabaEditando ? activoUsuarioEditando : true, ...nuevo });
      if (!estabaEditando && data?.confirmacionRequerida !== true) {
        throw new Error('La función admin-gestionar-usuario desplegada está desactualizada y no garantiza la confirmación del correo. Despliégala nuevamente antes de crear usuarios.');
      }
      setNuevo({ nombre: '', usuario: '', correo: '', clave: '', rol: tipoUsuario, identificacion: '', documento: '', telefono: '', direccion: '' }); setIdUsuarioEditando(null);
      setActivoUsuarioEditando(null);
      await cargar();
          return data?.mensaje ?? (estabaEditando ? 'Los cambios del usuario se guardaron correctamente.' : 'Cuenta creada. Entrega la contraseña inicial al usuario de forma segura.');
        } finally { setGuardando(false); }
      },
    );
  };

  // Guardo cambios de una cuenta y protejo al administrador de desactivarse a sí mismo.
  const actualizarUsuario = async (usuario: Registro, cambios: Record<string, unknown>) => {
    if (!supabase) return;
    if (usuario.id === usuarioId && (cambios.activo === false || (cambios.rol !== undefined && cambios.rol !== 'administrador'))) {
      setMensaje('No puedes desactivar ni cambiar tu propia cuenta administradora. Pídele a otro administrador que lo haga.');
      return;
    }
    pedirConfirmacion('Reactivar cuenta', `¿Confirmas reactivar la cuenta de ${usuario.nombre}?`, 'Reactivar cuenta', async () => {
      const data = await gestionarCuenta({ accion: 'actualizar', id: usuario.id, nombre: usuario.nombre, usuario: usuario.usuario, correo: usuario.correo, rol: usuario.rol, activo: usuario.activo, ...cambios });
      await cargar();
      return data?.mensaje ?? 'La cuenta se reactivó correctamente.';
    });
  };

  // Cargo los datos adicionales de la cuenta antes de editarla.
  const editarUsuario = async (usuario: Registro) => {
    if (!supabase) return;
    const [{ data: datosCliente }, { data: financiera }] = await Promise.all([
      supabase.from('clientes').select('documento,telefono,direccion').eq('usuarioId', usuario.id).maybeSingle(),
      supabase.from('entidadesFinancieras').select('identificacion').eq('usuarioId', usuario.id).maybeSingle(),
    ]);
    setIdUsuarioEditando(usuario.id);
    setActivoUsuarioEditando(usuario.activo);
    setTipoUsuario(usuario.rol);
    setNuevo({ nombre: usuario.nombre, usuario: usuario.usuario, correo: usuario.correo, clave: '', rol: usuario.rol,
      identificacion: financiera?.identificacion ?? '', documento: datosCliente?.documento ?? '',
      telefono: datosCliente?.telefono ?? '', direccion: datosCliente?.direccion ?? '' });
  };

  // Consulto y muestro los datos completos de una cuenta en su perfil.
  const verPerfil = async (usuario: Registro) => {
    setCuentaPerfil(usuario);
    setDetallePerfil(null);
    setPerfilVisible(true);
    setCargandoPerfil(true);
    try {
      if (!supabase) throw new Error('No hay conexión con Supabase.');
      const [{ data: datosCliente, error: errorCliente }, { data: datosFinancieros, error: errorFinanciero }] = await Promise.all([
        supabase.from('clientes').select('documento,telefono,direccion,puntosDisponibles,puntosAcumulados').eq('usuarioId', usuario.id).maybeSingle(),
        supabase.from('entidadesFinancieras').select('nombre,identificacion,activo').eq('usuarioId', usuario.id).maybeSingle(),
      ]);
      if (errorCliente) throw errorCliente;
      if (errorFinanciero) throw errorFinanciero;
      setDetallePerfil({ ...(datosCliente ?? {}), ...(datosFinancieros ?? {}) });
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo cargar el perfil.');
      setDetallePerfil({});
    } finally { setCargandoPerfil(false); }
  };

  // Desactivo una cuenta sin borrar su historial y evito desactivar la sesión actual.
  const eliminarUsuario = (usuario: Registro, alDesactivar?: () => void) => {
    if (usuario.id === usuarioId) {
      setMensaje('No puedes desactivar tu propia cuenta. Pídele a otro administrador que lo haga.');
      return;
    }
    setRestaurarPerfilAlCancelar(Boolean(alDesactivar));
    pedirConfirmacion('Desactivar cuenta', `Se bloqueará el acceso de ${usuario.nombre}; sus datos y movimientos históricos se conservarán. ¿Deseas continuar?`, 'Desactivar cuenta', async () => {
      const data = await gestionarCuenta({ accion: 'eliminar', id: usuario.id });
      await cargar();
      alDesactivar?.();
      setRestaurarPerfilAlCancelar(false);
      return data?.mensaje ?? 'La cuenta se desactivó correctamente.';
    });
  };

  // Elimino una cuenta solo cuando el servicio confirma que no tiene relaciones.
  const borrarUsuario = (usuario: Registro, desdePerfil = false) => {
    if (usuario.id === usuarioId) {
      setDialogoAccion({ tipo: 'resultado', titulo: 'No se puede eliminar', mensaje: 'No puedes eliminar tu propia cuenta administradora.' });
      return;
    }
    setRestaurarPerfilAlCancelar(desdePerfil);
    pedirConfirmacion('Eliminar usuario', `¿Confirmas eliminar permanentemente la cuenta de ${usuario.nombre}? Solo se permitirá si no tiene movimientos, canjes ni solicitudes de recogida asociados.`, 'Eliminar usuario', async () => {
      const data = await gestionarCuenta({ accion: 'borrar', id: usuario.id });
      await cargar();
      setPerfilVisible(false);
      setRestaurarPerfilAlCancelar(false);
      return data?.mensaje ?? 'El usuario se eliminó correctamente.';
    });
  };

  // Pido confirmación antes de descartar los datos del formulario.
  const cancelarEdicion = () => pedirConfirmacion('Cancelar edición', 'Se descartarán los cambios que no hayas guardado. ¿Deseas cancelar?', 'Descartar cambios', async () => {
    cambiarTipoUsuario(tipoUsuario);
    return 'Los cambios sin guardar se descartaron.';
  });

  // Cambio el tipo de cuenta y limpio el formulario para esa sección.
  const cambiarTipoUsuario = (tipo: RolUsuario) => {
    setTipoUsuario(tipo);
    setIdUsuarioEditando(null);
    setActivoUsuarioEditando(null);
    setNuevo({ nombre: '', usuario: '', correo: '', clave: '', rol: tipo, identificacion: '', documento: '', telefono: '', direccion: '' });
  };

  const terminoFiltro = filtroUsuarios.trim().toLocaleLowerCase();
  const usuariosDelTipo = usuarios.filter((usuario) => usuario.rol === tipoUsuario && (!terminoFiltro || [usuario.nombre, usuario.usuario, usuario.correo, usuario.documento].some((valor) => String(valor ?? '').toLocaleLowerCase().includes(terminoFiltro))));
  const resumenUsuarios = [
    { rol: 'cliente' as RolUsuario, etiqueta: 'Clientes', cantidad: usuarios.filter((u) => u.rol === 'cliente').length },
    { rol: 'administrador' as RolUsuario, etiqueta: 'Administradores', cantidad: usuarios.filter((u) => u.rol === 'administrador').length },
    { rol: 'gestor' as RolUsuario, etiqueta: 'Aliados / Gestores', cantidad: usuarios.filter((u) => u.rol === 'gestor').length },
    { rol: 'entidad_financiera' as RolUsuario, etiqueta: 'Entidades financieras', cantidad: usuarios.filter((u) => u.rol === 'entidad_financiera').length },
  ];

  return (
    <View style={[estilos.contenedor, rol === 'administrador' && estilos.contenedorAdmin]}>
      <Text style={estilos.titulo}>{rol === 'cliente' ? 'Mi actividad' : rol === 'gestor' ? 'Operación de recogidas' : rol === 'entidad_financiera' ? 'Historial de canjes' : 'Resumen y usuarios'}</Text>
      {cargando ? <ActivityIndicator size="large" color={colores.verde} /> : null}
      {mensaje ? <Text accessibilityRole="alert" style={estilos.mensaje}>{mensaje}</Text> : null}

      {rol === 'administrador' ? <>
        <View style={estilos.encabezadoUsuarios}><View style={{ flex: 1 }}><Text style={estilos.tituloUsuarios}>Usuarios y roles</Text><Text style={estilos.subtituloUsuarios}>Consulta, administra y actualiza las cuentas por tipo.</Text></View><TouchableOpacity style={estilos.botonMiPerfil} onPress={() => { const actual = usuarios.find((usuario) => usuario.id === usuarioId); if (actual) void verPerfil(actual); }} disabled={!usuarios.some((usuario) => usuario.id === usuarioId)}><Text style={estilos.textoBoton}>Mi perfil</Text></TouchableOpacity></View>
        <Text style={estilos.seccion}>Resumen por tipo</Text>
        <View style={estilos.grid}>{resumenUsuarios.map((item) => <View key={item.rol} style={estilos.metric}><Text style={estilos.numero}>{item.cantidad}</Text><Text style={estilos.texto}>{item.etiqueta}</Text></View>)}</View>
        <Text style={estilos.seccion}>Tipo de cuenta</Text>
        <View style={estilos.fila}>{resumenUsuarios.map((item) => <TouchableOpacity key={item.rol} style={[estilos.chip, estilos.chipAdmin, tipoUsuario === item.rol && estilos.chipAdminActivo]} onPress={() => cambiarTipoUsuario(item.rol)}><Text style={[estilos.textoChip, estilos.textoChipAdmin, tipoUsuario === item.rol && estilos.textoChipAdminActivo]}>{item.etiqueta}</Text></TouchableOpacity>)}</View>
        <Text style={estilos.seccion}>{idUsuarioEditando ? 'Editar' : 'Crear'} {tipoUsuario === 'entidad_financiera' ? 'entidad financiera' : tipoUsuario === 'gestor' ? 'aliado / gestor' : tipoUsuario}</Text>
        {errorFormulario ? <Text accessibilityRole="alert" style={estilos.errorFormulario}>{errorFormulario}</Text> : null}
        <TextInput style={estilos.input} placeholder="Nombre completo" value={nuevo.nombre} onChangeText={(nombre) => setNuevo({ ...nuevo, nombre })} />
        <TextInput style={estilos.input} placeholder="Nombre de usuario" autoCapitalize="none" value={nuevo.usuario} onChangeText={(usuario) => setNuevo({ ...nuevo, usuario })} />
        <TextInput style={estilos.input} placeholder="Correo" keyboardType="email-address" autoCapitalize="none" value={nuevo.correo} onChangeText={(correo) => setNuevo({ ...nuevo, correo })} />
        {!idUsuarioEditando ? <><TextInput style={[estilos.input, errorClave ? estilos.inputError : null]} placeholder="Contraseña inicial (mínimo 8)" secureTextEntry value={nuevo.clave} onChangeText={(clave) => { setNuevo({ ...nuevo, clave }); if (clave.length >= 8) setErrorClave(''); }} />{errorClave ? <Text accessibilityRole="alert" style={estilos.errorCampo}>{errorClave}</Text> : null}</> : null}
        {nuevo.rol === 'entidad_financiera' ? <TextInput style={estilos.input} placeholder="NIT o identificación" value={nuevo.identificacion} onChangeText={(identificacion) => setNuevo({ ...nuevo, identificacion })} /> : null}
        {nuevo.rol === 'cliente' ? <>
          <TextInput style={estilos.input} placeholder="Documento" value={nuevo.documento} onChangeText={(documento) => setNuevo({ ...nuevo, documento })} />
          <TextInput style={estilos.input} placeholder="Teléfono" value={nuevo.telefono} onChangeText={(telefono) => setNuevo({ ...nuevo, telefono })} />
          <TextInput style={estilos.input} placeholder="Dirección" value={nuevo.direccion} onChangeText={(direccion) => setNuevo({ ...nuevo, direccion })} />
        </> : null}
        <TouchableOpacity style={estilos.boton} disabled={guardando} onPress={() => void crearUsuario()}><Text style={estilos.textoBoton}>{guardando ? 'Guardando…' : idUsuarioEditando ? 'Guardar cambios' : `Crear ${tipoUsuario === 'entidad_financiera' ? 'entidad financiera' : tipoUsuario === 'gestor' ? 'aliado / gestor' : tipoUsuario}`}</Text></TouchableOpacity>
        {idUsuarioEditando ? <TouchableOpacity style={estilos.chip} onPress={cancelarEdicion}><Text style={estilos.textoChip}>Cancelar edición</Text></TouchableOpacity> : null}
        <Text style={estilos.seccion}>{({ cliente: 'Clientes', administrador: 'Administradores', gestor: 'Aliados / Gestores', entidad_financiera: 'Entidades financieras' })[tipoUsuario]}</Text>
        <TextInput style={estilos.input} placeholder="Buscar por nombre, usuario, correo o documento" value={filtroUsuarios} onChangeText={setFiltroUsuarios} autoCapitalize="none" />
        {usuariosDelTipo.length ? usuariosDelTipo.map((usuario) => <View key={usuario.id} style={estilos.registro}>
          <Text style={estilos.nombre}>{usuario.nombre} · {usuario.correo}</Text>
          <Text style={estilos.texto}>@{usuario.usuario} · {usuario.confirmacionPendiente ? 'Pendiente de confirmación' : usuario.activo ? 'Activa' : 'Inactiva'} · {usuario.rol}</Text>
          <View style={estilos.fila}>
            <TouchableOpacity style={estilos.botonPerfilLista} onPress={() => void verPerfil(usuario)}><Text style={estilos.textoPerfilLista}>Ver perfil</Text></TouchableOpacity>
            <TouchableOpacity style={estilos.chip} onPress={() => void editarUsuario(usuario)}><Text style={estilos.textoChip}>Editar</Text></TouchableOpacity>
            {usuario.id !== usuarioId ? usuario.confirmacionPendiente ? <Text style={estilos.avisoPendiente}>Debe confirmar su correo para activar la cuenta.</Text> : <TouchableOpacity style={usuario.activo ? estilos.chipPeligro : estilos.chip} onPress={() => usuario.activo ? eliminarUsuario(usuario) : void actualizarUsuario(usuario, { activo: true })}><Text style={usuario.activo ? estilos.textoPeligro : estilos.textoChip}>{usuario.activo ? 'Desactivar cuenta' : 'Reactivar cuenta'}</Text></TouchableOpacity> : <Text style={estilos.avisoPropia}>Tu cuenta: otro administrador debe desactivarla.</Text>}
            {usuario.id !== usuarioId ? <TouchableOpacity style={estilos.botonEliminarRegistro} onPress={() => borrarUsuario(usuario)}><Text style={estilos.textoPerfilDesactivar}>Eliminar usuario</Text></TouchableOpacity> : null}
          </View>
        </View>) : (!cargando ? <Text style={estilos.vacio}>{terminoFiltro ? 'No hay resultados para esa búsqueda.' : 'No hay usuarios para mostrar.'}</Text> : null)}
        <Modal visible={perfilVisible} animationType="slide" onRequestClose={() => setPerfilVisible(false)}>
          <View style={estilos.perfilPantalla}>
            <View style={estilos.perfilEncabezado}><View style={estilos.avatarPerfil}><Text style={estilos.avatarTexto}>{cuentaPerfil?.nombre?.slice(0, 1).toUpperCase() ?? 'U'}</Text></View><View style={{ flex: 1 }}><Text style={estilos.perfilEyebrow}>PERFIL DE USUARIO</Text><Text style={estilos.perfilNombre}>{cuentaPerfil?.nombre ?? 'Usuario'}</Text><Text style={estilos.perfilRol}>{cuentaPerfil?.rol === 'gestor' ? 'Aliado / Gestor' : cuentaPerfil?.rol === 'entidad_financiera' ? 'Entidad financiera' : cuentaPerfil?.rol}</Text></View></View>
            <ScrollView style={estilos.perfilContenido}>
              <Text style={estilos.perfilSeccion}>Datos de la cuenta</Text>
              <FilaPerfil etiqueta="Nombre" valor={cuentaPerfil?.nombre} />
              <FilaPerfil etiqueta="Nombre de usuario" valor={cuentaPerfil?.usuario ? `@${cuentaPerfil.usuario}` : ''} />
              <FilaPerfil etiqueta="Correo" valor={cuentaPerfil?.correo} />
              <FilaPerfil etiqueta="Tipo de cuenta" valor={cuentaPerfil?.rol === 'gestor' ? 'Aliado / Gestor' : cuentaPerfil?.rol === 'entidad_financiera' ? 'Entidad financiera' : cuentaPerfil?.rol} />
              <FilaPerfil etiqueta="Estado" valor={cuentaPerfil?.confirmacionPendiente ? 'Pendiente de confirmación de correo' : cuentaPerfil?.activo ? 'Activa' : 'Inactiva'} />
              <FilaPerfil etiqueta="Fecha de creación" valor={cuentaPerfil?.fechaCreacion} />
              {cuentaPerfil?.rol === 'cliente' ? <><Text style={estilos.perfilSeccion}>Datos del cliente</Text><FilaPerfil etiqueta="Documento" valor={detallePerfil?.documento} /><FilaPerfil etiqueta="Teléfono" valor={detallePerfil?.telefono} /><FilaPerfil etiqueta="Dirección" valor={detallePerfil?.direccion} /><FilaPerfil etiqueta="Puntos disponibles" valor={detallePerfil?.puntosDisponibles} /><FilaPerfil etiqueta="Puntos acumulados" valor={detallePerfil?.puntosAcumulados} /></> : null}
              {cuentaPerfil?.rol === 'entidad_financiera' ? <><Text style={estilos.perfilSeccion}>Datos de la entidad</Text><FilaPerfil etiqueta="Identificación" valor={detallePerfil?.identificacion} /><FilaPerfil etiqueta="Nombre de la entidad" valor={detallePerfil?.nombre} /></> : null}
              {cargandoPerfil ? <ActivityIndicator color={colores.azulOscuro} style={{ margin: 14 }} /> : null}
            </ScrollView>
            <View style={estilos.accionesPerfil}>
              <TouchableOpacity style={estilos.botonPerfilEditar} onPress={() => { if (cuentaPerfil) void editarUsuario(cuentaPerfil); setPerfilVisible(false); }}><Text style={estilos.textoBoton}>Editar perfil</Text></TouchableOpacity>
              {cuentaPerfil?.id !== usuarioId && cuentaPerfil?.activo ? <TouchableOpacity style={estilos.botonPerfilDesactivar} onPress={() => { if (cuentaPerfil) { setPerfilVisible(false); eliminarUsuario(cuentaPerfil, () => setPerfilVisible(false)); } }}><Text style={estilos.textoPerfilDesactivar}>Desactivar cuenta</Text></TouchableOpacity> : null}
              {cuentaPerfil?.id !== usuarioId ? <TouchableOpacity style={estilos.botonPerfilDesactivar} onPress={() => { if (cuentaPerfil) { setPerfilVisible(false); borrarUsuario(cuentaPerfil, true); } }}><Text style={estilos.textoPerfilDesactivar}>Eliminar usuario</Text></TouchableOpacity> : null}
              <TouchableOpacity style={estilos.botonPerfilVolver} onPress={() => setPerfilVisible(false)}><Text style={estilos.textoPerfilVolver}>Volver a Usuarios y roles</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={Boolean(dialogoAccion)} transparent animationType="fade" onRequestClose={cerrarDialogo}>
          <View style={estilos.fondoConfirmacion}>
            <View style={estilos.dialogoConfirmacion}>
              <Text style={estilos.tituloConfirmacion}>{dialogoAccion?.titulo}</Text>
              <Text style={estilos.textoConfirmacion}>{dialogoAccion?.mensaje}</Text>
              {dialogoAccion?.error ? <Text accessibilityRole="alert" style={estilos.errorConfirmacion}>{dialogoAccion.error}</Text> : null}
              {dialogoAccion?.tipo === 'confirmacion' ? <View style={estilos.accionesConfirmacion}>
                <TouchableOpacity disabled={procesandoDialogo} style={estilos.botonCancelarConfirmacion} onPress={cerrarDialogo}><Text style={estilos.textoCancelarConfirmacion}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity disabled={procesandoDialogo} style={estilos.botonConfirmarDesactivacion} onPress={() => void ejecutarAccionConfirmada()}>
                  {procesandoDialogo ? <ActivityIndicator color={colores.blanco} /> : <Text style={estilos.textoBoton}>{dialogoAccion.textoConfirmar}</Text>}
                </TouchableOpacity>
              </View> : <TouchableOpacity style={estilos.botonCerrarResultado} onPress={() => setDialogoAccion(null)}><Text style={estilos.textoBoton}>Entendido</Text></TouchableOpacity>}
            </View>
          </View>
        </Modal>
      </> : null}

      {rol === 'cliente' ? <>
        {mostrar('puntos') ? <View style={estilos.grid}><View style={estilos.metric}><Text style={estilos.numero}>{cliente?.puntosDisponibles ?? 0}</Text><Text style={estilos.texto}>Puntos disponibles</Text></View><View style={estilos.metric}><Text style={estilos.numero}>{cliente?.puntosAcumulados ?? 0}</Text><Text style={estilos.texto}>Puntos acumulados</Text></View></View> : null}
        {mostrar('recogidas') ? <>
        <View style={estilos.tarjetaRecogida}>
        <Text style={estilos.seccion}>Solicitar recogida</Text>
        <TextInput style={estilos.input} placeholder="Dirección de recogida" value={direccion} onChangeText={setDireccion} />
        <TextInput style={estilos.input} placeholder="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} />
        <TextInput style={estilos.input} placeholder="Indicaciones para el gestor (opcional)" value={observaciones} onChangeText={setObservaciones} />
        {errorRecogida ? <Text accessibilityRole="alert" style={estilos.errorFormulario}>{errorRecogida}</Text> : null}
        <TouchableOpacity accessibilityRole="button" style={estilos.botonRecogida} disabled={guardando || cargando} onPress={() => void solicitarRecogida()}><Text style={estilos.textoBoton}>{cargando ? 'Cargando perfil…' : guardando ? 'Enviando…' : 'Solicitar recogida'}</Text></TouchableOpacity>
        </View>
        </> : null}
        {mostrar('productos') ? <>
        <Text style={estilos.seccion}>Catálogo y carrito de canjes</Text>
        {premios.length ? premios.map((premio) => <View key={premio.id} style={estilos.registro}><Text style={estilos.nombre}>{premio.nombre} · {premio.puntosRequeridos} puntos</Text><Text style={estilos.texto}>{premio.descripcion} · Stock: {premio.stock}</Text><TouchableOpacity style={estilos.botonPequeno} disabled={guardando} onPress={() => setCarrito((actual) => actual.includes(premio.id) ? actual.filter((id) => id !== premio.id) : [...actual, premio.id])}><Text style={estilos.textoBoton}>{carrito.includes(premio.id) ? 'Quitar del carrito' : 'Agregar al carrito'}</Text></TouchableOpacity></View>) : (!cargando ? <Text style={estilos.vacio}>No hay productos disponibles en este momento.</Text> : null)}
        <Text style={estilos.seccion}>Carrito ({carrito.length})</Text>
        {carrito.length ? <>
          {premios.filter((premio) => carrito.includes(premio.id)).map((premio) => <Text key={premio.id} style={estilos.registro}>{premio.nombre} · {premio.puntosRequeridos} puntos</Text>)}
          <TouchableOpacity style={estilos.boton} disabled={guardando} onPress={() => void confirmarCarrito()}><Text style={estilos.textoBoton}>{guardando ? 'Procesando…' : 'Confirmar canjes'}</Text></TouchableOpacity>
        </> : <Text style={estilos.vacio}>Agrega productos para preparar un canje.</Text>}
        </> : null}
        {mostrar('puntos') ? <>
        <Text style={estilos.seccion}>Historial de puntos</Text>
        {puntos.length ? puntos.map((mov) => <Text key={mov.id} style={estilos.registro}>{mov.fecha.slice(0, 10)} · {mov.descripcion} · {mov.puntos} puntos</Text>) : (!cargando ? <Text style={estilos.vacio}>Aún no tienes movimientos de puntos.</Text> : null)}
        <Text style={estilos.seccion}>Mis canjes</Text>
        {canjes.length ? canjes.map((canje) => <Text key={canje.id} style={estilos.registro}>{canje.recompensas?.nombre ?? 'Canje'} · {canje.estado} · {canje.puntosUsados} puntos</Text>) : (!cargando ? <Text style={estilos.vacio}>Aún no has solicitado canjes.</Text> : null)}
        </> : null}
      </> : null}

      {rol === 'gestor' ? <>
        {mostrar('recogidas') ? <>
        <View style={estilos.tarjetaRecogida}>
        <Text style={estilos.seccion}>Crear recogida</Text>
        <Text style={estilos.ayudaRecogida}>Registra una recogida para un cliente activo y elige quién la atenderá, o déjala pendiente para que un gestor se la autoasigne.</Text>
        <TouchableOpacity style={estilos.input} onPress={() => setSelectorRecogidaVisible('cliente')}>
          <Text style={{ color: clienteRecogidaSeleccionado ? colores.tinta : colores.textoSuave }}>
            {clientesParaRecogida.find((item) => item.id === clienteRecogidaSeleccionado)?.nombre ?? 'Selecciona un cliente'}
          </Text>
        </TouchableOpacity>
        <Text style={estilos.etiquetaRecogida}>Gestor asignado</Text>
        <TouchableOpacity style={estilos.input} onPress={() => setSelectorRecogidaVisible('gestor')}>
          <Text style={{ color: gestorRecogidaSeleccionado ? colores.tinta : colores.textoSuave }}>
            {gestorRecogidaSeleccionado ? (gestoresParaRecogida.find((item) => item.id === gestorRecogidaSeleccionado)?.nombre ?? 'Selecciona un gestor activo') : 'Sin gestor asignado'}
          </Text>
        </TouchableOpacity>
        <TextInput style={estilos.input} placeholder="Dirección de recogida" value={direccion} onChangeText={setDireccion} />
        <TextInput style={estilos.input} placeholder="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} />
        <TextInput style={estilos.input} placeholder="Indicaciones para el gestor (opcional)" value={observaciones} onChangeText={setObservaciones} />
        {errorRecogida ? <Text accessibilityRole="alert" style={estilos.errorFormulario}>{errorRecogida}</Text> : null}
        <TouchableOpacity accessibilityRole="button" style={estilos.botonRecogida} disabled={guardando} onPress={crearRecogidaGestor}><Text style={estilos.textoBoton}>{guardando ? 'Guardando…' : 'Crear y asignar recogida'}</Text></TouchableOpacity>
        </View>
        </> : null}
        {mostrar('reportes') ? <>
        <Text style={estilos.seccion}>Reporte operativo</Text>
        <View style={estilos.grid}>
          {(['pendiente', 'asignada', 'completada', 'cancelada'] as const).map((estado) => <View key={estado} style={estilos.metric}><Text style={estilos.numero}>{recogidas.filter((r) => r.estado === estado).length}</Text><Text style={estilos.texto}>Recogidas {{ pendiente: 'pendientes', asignada: 'asignadas', completada: 'completadas', cancelada: 'canceladas' }[estado]}</Text></View>)}
        </View>
        </> : null}
        {mostrar('recogidas', 'historial') ? <>
        <Text style={estilos.seccion}>Solicitudes e historial</Text>
        {recogidas.length ? recogidas.map((r) => <View key={r.id} style={estilos.registro}><Text style={estilos.nombre}>{r.nombreCliente} · {r.telefono}</Text><Text style={estilos.texto}>{r.direccion} · {new Date(r.fechaSolicitada).toLocaleString()}</Text><Text style={estilos.texto}>Estado: {r.estado} {r.gestorId ? `· Gestor asignado: ${r.nombreGestor ?? 'Cuenta de gestor'}` : ''} {r.observaciones ? `· ${r.observaciones}` : ''}</Text>{r.estado === 'pendiente' ? <TouchableOpacity style={estilos.botonPequeno} onPress={() => void cambiarEstadoRecogida(r.id, 'asignada')}><Text style={estilos.textoBoton}>Asignarme</Text></TouchableOpacity> : null}{r.estado === 'asignada' && r.gestorId === usuarioId ? <TouchableOpacity style={estilos.botonPequeno} onPress={() => void cambiarEstadoRecogida(r.id, 'completada')}><Text style={estilos.textoBoton}>Marcar completada</Text></TouchableOpacity> : null}</View>) : (!cargando ? <Text style={estilos.vacio}>No hay solicitudes de recogida.</Text> : null)}
        </> : null}
      </> : null}

      {rol === 'entidad_financiera' ? <>
        <Text style={estilos.texto}>Solo se muestran canjes aprobados o entregados.</Text>
        {canjes.length ? canjes.map((canje) => <View key={canje.canjeId} style={estilos.registro}><Text style={estilos.nombre}>{canje.producto} · {canje.puntosUsados} puntos</Text><Text style={estilos.texto}>Estado: {canje.estado} · Fecha: {String(canje.fechaSolicitud).slice(0, 10)}</Text></View>) : (!cargando ? <Text style={estilos.vacio}>No hay canjes en el historial.</Text> : null)}
      </> : null}

      <Modal visible={selectorRecogidaVisible !== null} transparent animationType="fade" onRequestClose={() => setSelectorRecogidaVisible(null)}>
        <View style={estilos.fondoConfirmacion}>
          <View style={estilos.dialogoConfirmacion}>
            <Text style={estilos.tituloConfirmacion}>{selectorRecogidaVisible === 'gestor' ? 'Seleccionar gestor' : 'Seleccionar cliente'}</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {selectorRecogidaVisible === 'gestor' ? <TouchableOpacity style={estilos.registro} onPress={() => { setGestorRecogidaSeleccionado(''); setSelectorRecogidaVisible(null); }}>
                <Text style={estilos.nombre}>Sin gestor asignado</Text>
                <Text style={estilos.texto}>Quedará pendiente para que administración la asigne o un gestor se la autoasigne.</Text>
              </TouchableOpacity> : null}
              {selectorRecogidaVisible === 'gestor' ? gestoresParaRecogida.map((item) => <TouchableOpacity key={item.id} style={estilos.registro} onPress={() => { setGestorRecogidaSeleccionado(item.id); setSelectorRecogidaVisible(null); }}>
                <Text style={estilos.nombre}>{item.nombre}</Text>
                <Text style={estilos.texto}>@{item.usuario} · {item.correo}</Text>
              </TouchableOpacity>) : null}
              {selectorRecogidaVisible === 'cliente' ? clientesParaRecogida.map((item) => <TouchableOpacity key={item.id} style={estilos.registro} onPress={() => { setClienteRecogidaSeleccionado(item.id); setSelectorRecogidaVisible(null); }}>
                <Text style={estilos.nombre}>{item.nombre}</Text>
                <Text style={estilos.texto}>Documento: {item.documento} · Teléfono: {item.telefono || 'No registrado'}</Text>
              </TouchableOpacity>) : null}
              {selectorRecogidaVisible === 'cliente' && clientesParaRecogida.length === 0 ? <Text style={estilos.vacio}>No hay clientes activos disponibles.</Text> : null}
              {selectorRecogidaVisible === 'gestor' && gestoresParaRecogida.length === 0 ? <Text style={estilos.vacio}>No hay gestores activos disponibles.</Text> : null}
            </ScrollView>
            <TouchableOpacity style={estilos.botonCerrarResultado} onPress={() => setSelectorRecogidaVisible(null)}><Text style={estilos.textoBoton}>Cerrar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Muestro un dato del perfil y reemplazo los valores vacíos con un texto claro.
function FilaPerfil({ etiqueta, valor }: { etiqueta: string; valor: unknown }) {
  const mostrado = valor === null || valor === undefined || valor === '' ? 'No registrado' : String(valor);
  return <View style={estilos.filaPerfil}><Text style={estilos.etiquetaPerfil}>{etiqueta}</Text><Text style={estilos.valorPerfil}>{mostrado}</Text></View>;
}

const estilos = StyleSheet.create({
  contenedor: { backgroundColor: colores.blanco, borderRadius: 10, borderColor: colores.borde, borderWidth: 1, padding: 18, gap: 10, marginBottom: 18 },
  tarjetaRecogida: { backgroundColor: '#f7f8fc', borderWidth: 1, borderColor: '#d9dcef', borderRadius: 14, padding: 16, gap: 6 },
  ayudaRecogida: { color: colores.textoSuave, fontSize: 13, lineHeight: 19, marginBottom: 5 },
  etiquetaRecogida: { color: colores.azulOscuro, fontSize: 13, fontWeight: '800', marginTop: 2 },
  botonRecogida: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colores.azulOscuro, borderRadius: 9, marginTop: 3 },
  contenedorAdmin: { borderColor: '#c9cbea' },
  titulo: { color: colores.tinta, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  seccion: { color: colores.tinta, fontSize: 16, fontWeight: '800', marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, minWidth: 130, backgroundColor: colores.menta, borderRadius: 8, padding: 14 },
  numero: { color: colores.verdeOscuro, fontSize: 24, fontWeight: '900' },
  texto: { color: colores.textoSuave, fontSize: 13, lineHeight: 19 },
  registro: { borderTopWidth: 1, borderTopColor: colores.borde, paddingTop: 10, marginTop: 4, gap: 5, color: colores.tinta },
  nombre: { color: colores.tinta, fontWeight: '800' },
  input: { minHeight: 44, borderWidth: 1, borderColor: colores.borde, borderRadius: 8, paddingHorizontal: 12, color: colores.tinta },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colores.borde, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  chipActivo: { borderColor: colores.verde, backgroundColor: colores.menta },
  chipAdmin: { borderColor: '#c9cbea', backgroundColor: '#f6f6fc' },
  chipAdminActivo: { borderColor: colores.azulOscuro, backgroundColor: colores.azulOscuro },
  textoChipAdmin: { color: colores.azulOscuro },
  textoChipAdminActivo: { color: colores.blanco },
  chipPeligro: { borderWidth: 1, borderColor: colores.error, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  textoPeligro: { color: colores.error, fontSize: 12, fontWeight: '700' },
  textoChip: { color: colores.verdeOscuro, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  boton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colores.verde, borderRadius: 8 },
  botonEliminarRegistro: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 8, backgroundColor: '#fff1f0', borderWidth: 1, borderColor: '#edb2ae' },
  botonPequeno: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: colores.verde, borderRadius: 8 },
  textoBoton: { color: colores.blanco, fontWeight: '800' },
  mensaje: { color: colores.error, backgroundColor: '#fff0ee', padding: 10, borderRadius: 6 },
  vacio: { color: colores.textoSuave, textAlign: 'center', padding: 14 },
  avisoPropia: { color: colores.textoSuave, fontSize: 12, alignSelf: 'center', paddingHorizontal: 8 },
  avisoPendiente: { color: '#8a5b00', backgroundColor: '#fff6d8', borderRadius: 8, fontSize: 12, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  encabezadoUsuarios: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.azulOscuro, borderRadius: 14, padding: 16, marginBottom: 6 },
  tituloUsuarios: { color: colores.blanco, fontSize: 21, fontWeight: '900' },
  subtituloUsuarios: { color: '#d7dcf7', fontSize: 12, lineHeight: 18, marginTop: 4 },
  botonMiPerfil: { backgroundColor: '#252750', borderWidth: 1, borderColor: '#555987', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 10 },
  botonPerfilLista: { backgroundColor: colores.azulOscuro, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  textoPerfilLista: { color: colores.blanco, fontSize: 12, fontWeight: '800' },
  perfilPantalla: { flex: 1, backgroundColor: '#f4f5fb', padding: 22, paddingTop: 42 },
  perfilEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: colores.azulOscuro, borderRadius: 18, padding: 20 },
  avatarPerfil: { height: 58, width: 58, borderRadius: 20, backgroundColor: '#30335f', alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: colores.blanco, fontSize: 25, fontWeight: '900' },
  perfilEyebrow: { color: '#bac1f2', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  perfilNombre: { color: colores.blanco, fontSize: 22, fontWeight: '900', marginTop: 3 },
  perfilRol: { color: '#d7dcf7', fontSize: 13, marginTop: 3, textTransform: 'capitalize' },
  perfilContenido: { flexGrow: 1, backgroundColor: colores.blanco, borderRadius: 16, padding: 16, marginTop: 14, borderWidth: 1, borderColor: '#e0e2f1' },
  perfilSeccion: { color: colores.azulOscuro, fontSize: 14, fontWeight: '900', marginTop: 8, marginBottom: 5 },
  filaPerfil: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: '#ececf4', paddingVertical: 11 },
  etiquetaPerfil: { color: colores.textoSuave, fontSize: 13, flex: 1 },
  valorPerfil: { color: colores.azulOscuro, fontSize: 13, fontWeight: '700', flex: 1.2, textAlign: 'right' },
  accionesPerfil: { gap: 9, marginTop: 14 },
  botonPerfilEditar: { minHeight: 46, backgroundColor: colores.azulOscuro, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  botonPerfilDesactivar: { minHeight: 46, backgroundColor: '#fff1f0', borderWidth: 1, borderColor: '#edb2ae', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  textoPerfilDesactivar: { color: colores.error, fontWeight: '900' },
  botonPerfilVolver: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  textoPerfilVolver: { color: colores.azulOscuro, fontWeight: '800' },
  fondoConfirmacion: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(12, 13, 55, 0.55)' },
  dialogoConfirmacion: { width: '100%', maxWidth: 440, backgroundColor: colores.blanco, borderRadius: 16, padding: 22, gap: 14, borderWidth: 1, borderColor: '#d9dcef' },
  tituloConfirmacion: { color: colores.azulOscuro, fontSize: 20, fontWeight: '900' },
  textoConfirmacion: { color: colores.textoSuave, fontSize: 14, lineHeight: 21 },
  errorConfirmacion: { color: colores.error, backgroundColor: '#fff0ee', padding: 10, borderRadius: 8, lineHeight: 20 },
  errorFormulario: { color: colores.error, backgroundColor: '#fff0ee', padding: 12, borderRadius: 8, lineHeight: 20 },
  errorCampo: { color: colores.error, fontSize: 12, marginTop: -6, marginBottom: 4 },
  inputError: { borderColor: colores.error },
  accionesConfirmacion: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  botonCancelarConfirmacion: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: '#c9cbea', borderRadius: 9 },
  textoCancelarConfirmacion: { color: colores.azulOscuro, fontWeight: '800' },
  botonConfirmarDesactivacion: { minHeight: 42, minWidth: 145, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colores.error, borderRadius: 9 },
  botonCerrarResultado: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colores.azulOscuro, borderRadius: 9 },
});
