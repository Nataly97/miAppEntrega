import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders as sdkCorsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const corsHeaders = {
  ...sdkCorsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const roles = ['administrador', 'gestor', 'entidad_financiera', 'cliente'] as const;
type RolInterno = (typeof roles)[number];
// Muestro mensajes claros para los errores comunes que devuelve Supabase Auth.
const mensajeErrorAuth = (mensaje: string) => {
  const texto = mensaje.toLowerCase();
  if (texto.includes('email_address_not_authorized')) return 'Supabase rechazó el envío del correo. Configura SMTP personalizado o autoriza esta dirección en el proyecto.';
  if (texto.includes('over_email_send_rate_limit') || texto.includes('email rate limit')) return 'Supabase alcanzó el límite de envío de correos. Inténtalo más tarde o configura SMTP personalizado.';
  if (texto.includes('signup is disabled') || texto.includes('signups not allowed')) return 'El registro está desactivado en Supabase Auth. Habilita nuevos registros para enviar confirmaciones.';
  if (texto.includes('already') || texto.includes('duplicate key') || texto.includes('unique constraint')) return 'El correo, usuario o documento ya está registrado.';
  if (texto.includes('database error saving new user')) return 'El correo, usuario o documento ya está registrado. No se creó la cuenta.';
  if (texto.includes('password') && (texto.includes('weak') || texto.includes('length'))) return 'La contraseña no cumple los requisitos mínimos de seguridad.';
  return mensaje;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  // Devuelvo todas las respuestas con el mismo formato para que la app pueda mostrarlas.
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  if (request.method !== 'POST') return json({ mensaje: 'Usa una solicitud POST para esta operación.' }, 405);

  try {
    // Leo las llaves del servidor sin exponerlas en la aplicación del usuario.
    const llavePorDefecto = (variable: string) => {
      const configuracion = Deno.env.get(variable);
      if (!configuracion) return undefined;
      try { return JSON.parse(configuracion).default as string | undefined; }
      catch { return undefined; }
    };
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? llavePorDefecto('SUPABASE_SECRET_KEYS');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? llavePorDefecto('SUPABASE_PUBLISHABLE_KEYS');
    const authorization = request.headers.get('Authorization');
    if (!url || !serviceKey || !anonKey || !authorization) return json({ mensaje: 'Falta configuración segura de Supabase.' }, 401);

    const servicio = createClient(url, serviceKey, { auth: { persistSession: false } });
    const autenticado = createClient(url, anonKey, {
      auth: { persistSession: false }, global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: authError } = await autenticado.auth.getUser();
    if (authError || !userData.user) return json({ mensaje: 'La sesión no es válida. Inicia sesión otra vez.' }, 401);
    const { data: perfilAdmin, error: roleError } = await servicio.from('usuarios')
      .select('rol, activo').eq('id', userData.user.id).maybeSingle();
    if (roleError || perfilAdmin?.rol !== 'administrador' || !perfilAdmin.activo) {
      return json({ mensaje: 'Solo una cuenta administradora puede gestionar usuarios.' }, 403);
    }

    const body = await request.json();
    const accion = body.accion as string;
    const id = String(body.id ?? '');
    if (accion === 'verificar_version') {
      return json({ version: 'confirmacion-correos-v1', confirmacionRequerida: true });
    }
    if (accion === 'crear') {
      const rol = body.rol as RolInterno;
      const correo = String(body.correo ?? '').trim().toLowerCase();
      const clave = String(body.clave ?? '');
      const nombre = String(body.nombre ?? '').trim();
      const usuario = String(body.usuario ?? '').trim();
      if (!roles.includes(rol) || !correo || !nombre || !usuario || clave.length < 8) {
        return json({ mensaje: 'Verifica el correo, nombre, usuario, rol y contraseña (mínimo 8 caracteres).' }, 400);
      }
      if (rol === 'entidad_financiera' && !String(body.identificacion ?? '').trim()) {
        return json({ mensaje: 'La entidad financiera requiere NIT o identificación.' }, 400);
      }
      if (rol === 'cliente' && !String(body.documento ?? '').trim()) {
        return json({ mensaje: 'El perfil de cliente requiere documento.' }, 400);
      }
      const altaUsuario = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: nueva, error } = await altaUsuario.auth.signUp({
        email: correo,
        password: clave,
        options: {
          emailRedirectTo: Deno.env.get('APP_SITE_URL')?.trim() || undefined,
          data: {
            nombre,
            usuario,
            rol: 'cliente',
            cuentaInternaPendiente: true,
            documento: rol === 'cliente' ? String(body.documento).trim() : crypto.randomUUID(),
            telefono: String(body.telefono ?? ''),
            direccion: String(body.direccion ?? ''),
          },
        },
      });
      if (error || !nueva.user) return json({ mensaje: error ? mensajeErrorAuth(error.message) : 'No se pudo crear la cuenta.' }, 400);
      if (nueva.user.identities?.length === 0) return json({ mensaje: 'El correo ya está registrado. No se creó otra cuenta.' }, 409);
      if (nueva.user.email_confirmed_at) {
        await servicio.from('entidadesFinancieras').delete().eq('usuarioId', nueva.user.id);
        await servicio.from('clientes').delete().eq('usuarioId', nueva.user.id);
        await servicio.from('usuarios').delete().eq('id', nueva.user.id);
        await servicio.auth.admin.deleteUser(nueva.user.id);
        return json({ mensaje: 'Supabase tiene desactivada la confirmación de correo. Activa Confirm email en Auth > Providers > Email para crear cuentas pendientes de verificación.' }, 400);
      }
      const userId = nueva.user.id;
      const { error: updateError } = await servicio.from('usuarios').update({ nombre, usuario, correo, rol, activo: false, confirmacionPendiente: true })
        .eq('id', userId);
      if (!updateError && rol !== 'cliente') await servicio.from('clientes').delete().eq('usuarioId', userId);
      if (!updateError && rol === 'entidad_financiera') {
        const { error: financialError } = await servicio.from('entidadesFinancieras').insert({
          usuarioId: userId, nombre, identificacion: String(body.identificacion).trim(), activo: true,
        });
        if (financialError) {
          await servicio.from('clientes').delete().eq('usuarioId', userId);
          await servicio.from('usuarios').delete().eq('id', userId);
          await servicio.auth.admin.deleteUser(userId);
          return json({ mensaje: `No se pudo crear el perfil financiero: ${financialError.message}` }, 500);
        }
      }
      if (updateError) {
        await servicio.from('clientes').delete().eq('usuarioId', userId);
        await servicio.from('entidadesFinancieras').delete().eq('usuarioId', userId);
        await servicio.from('usuarios').delete().eq('id', userId);
        await servicio.auth.admin.deleteUser(userId);
        return json({ mensaje: `No se pudo asignar el perfil: ${updateError.message}` }, 500);
      }
      return json({
        id: userId,
        confirmacionRequerida: true,
        mensaje: `Cuenta creada. Supabase aceptó la solicitud de confirmación para ${correo}. La cuenta seguirá inactiva hasta que confirme el correo. Si el mensaje no llega, revisa los registros de Auth y la plantilla Confirm signup.`,
      }, 201);
    }

    if (!id) return json({ mensaje: 'Falta el identificador del usuario.' }, 400);
    if (id === userData.user.id && accion === 'eliminar') return json({ mensaje: 'No puedes eliminar la sesión administradora actual.' }, 400);
    const { data: cuentaObjetivo } = await servicio.from('usuarios').select('rol,activo,confirmacionPendiente').eq('id', id).maybeSingle();
    if (!cuentaObjetivo) return json({ mensaje: 'No se encontró la cuenta indicada.' }, 404);
    // Evito desactivar o quitar el rol de la última cuenta administradora activa.
    const ultimaAdministracion = async () => {
      if (cuentaObjetivo.rol !== 'administrador' || !cuentaObjetivo.activo) return false;
      const { count } = await servicio.from('usuarios').select('id', { count: 'exact', head: true })
        .eq('rol', 'administrador').eq('activo', true);
      return (count ?? 0) <= 1;
    };
    if (accion === 'borrar') {
      if (id === userData.user.id) return json({ mensaje: 'No puedes eliminar tu propia cuenta administradora.' }, 400);
      if (cuentaObjetivo.rol === 'administrador' && cuentaObjetivo.activo && await ultimaAdministracion()) {
        return json({ mensaje: 'No se puede eliminar la última cuenta administradora activa.' }, 409);
      }
      const { data: perfilCliente, error: errorCliente } = await servicio.from('clientes').select('id').eq('usuarioId', id).maybeSingle();
      if (errorCliente) return json({ mensaje: `No se pudo verificar el historial del usuario: ${errorCliente.message}` }, 500);
      const revisiones: PromiseLike<{ count: number | null; error: { message: string } | null }>[] = [
        servicio.from('movimientosPuntos').select('id', { count: 'exact', head: true }).eq('empleadoId', id),
        servicio.from('canjes').select('id', { count: 'exact', head: true }).eq('empleadoId', id),
        servicio.from('solicitudesRecogida').select('id', { count: 'exact', head: true }).eq('gestorId', id),
      ];
      if (perfilCliente?.id) {
        revisiones.push(
          servicio.from('movimientosPuntos').select('id', { count: 'exact', head: true }).eq('clienteId', perfilCliente.id),
          servicio.from('canjes').select('id', { count: 'exact', head: true }).eq('clienteId', perfilCliente.id),
          servicio.from('solicitudesRecogida').select('id', { count: 'exact', head: true }).eq('clienteId', perfilCliente.id),
        );
      }
      const resultados = await Promise.all(revisiones);
      const errorRevision = resultados.find((resultado) => resultado.error)?.error;
      if (errorRevision) return json({ mensaje: `No se pudo verificar si el usuario tiene movimientos: ${errorRevision.message}` }, 500);
      const movimientosAsociados = resultados.reduce((total, resultado) => total + (resultado.count ?? 0), 0);
      if (movimientosAsociados > 0) {
        return json({ mensaje: 'No se puede eliminar este usuario porque está asociado a movimientos de puntos, canjes o solicitudes de recogida. Puedes desactivar su cuenta para conservar el historial.' }, 409);
      }
      const { error: financieraError } = await servicio.from('entidadesFinancieras').delete().eq('usuarioId', id);
      if (financieraError) return json({ mensaje: `No se pudo eliminar el perfil financiero: ${financieraError.message}` }, 400);
      const { error: clienteErrorBorrado } = await servicio.from('clientes').delete().eq('usuarioId', id);
      if (clienteErrorBorrado) return json({ mensaje: `No se pudo eliminar el perfil de cliente: ${clienteErrorBorrado.message}` }, 400);
      const { error: usuarioError } = await servicio.from('usuarios').delete().eq('id', id);
      if (usuarioError) return json({ mensaje: `No se pudo eliminar el perfil del usuario: ${usuarioError.message}` }, 400);
      const { error: authDeleteError } = await servicio.auth.admin.deleteUser(id);
      if (authDeleteError) return json({ mensaje: `El perfil fue eliminado, pero no se pudo borrar el acceso de autenticación: ${authDeleteError.message}` }, 500);
      return json({ mensaje: 'Usuario eliminado correctamente. No tenía movimientos ni solicitudes asociadas.' });
    }
    if (accion === 'eliminar') {
      if (await ultimaAdministracion()) return json({ mensaje: 'No se puede desactivar la última cuenta administradora activa.' }, 400);
      const { error: authError } = await servicio.auth.admin.updateUserById(id, { ban_duration: '876000h' });
      if (authError) return json({ mensaje: `No se pudo bloquear el acceso de la cuenta: ${authError.message}` }, 400);
      const { error: profileError } = await servicio.from('usuarios').update({ activo: false }).eq('id', id);
      if (profileError) {
        await servicio.auth.admin.updateUserById(id, { ban_duration: 'none' });
        return json({ mensaje: `No se pudo marcar la cuenta como inactiva: ${profileError.message}` }, 400);
      }
      return json({ mensaje: 'Cuenta desactivada; se conservaron sus registros históricos.' });
    }
    if (accion === 'actualizar') {
      const rol = body.rol as RolInterno;
      if (!roles.includes(rol)) return json({ mensaje: 'El rol indicado no es válido.' }, 400);
      if (id === userData.user.id && (rol !== 'administrador' || body.activo === false)) {
        return json({ mensaje: 'No puedes cambiar ni desactivar tu propio rol de administrador.' }, 400);
      }
      if ((rol !== 'administrador' || body.activo === false) && await ultimaAdministracion()) {
        return json({ mensaje: 'No se puede retirar el rol a la última cuenta administradora activa.' }, 400);
      }
      const nombre = String(body.nombre ?? '').trim();
      const usuario = String(body.usuario ?? '').trim();
      const correo = String(body.correo ?? '').trim().toLowerCase();
      if (!nombre || !usuario || !correo) return json({ mensaje: 'Nombre, usuario y correo son obligatorios.' }, 400);
      const { error: authUpdateError } = await servicio.auth.admin.updateUserById(id, {
        email: correo,
        user_metadata: {
          nombre, usuario,
          ...(body.documento ? { documento: String(body.documento).trim() } : {}),
          ...(body.telefono !== undefined ? { telefono: String(body.telefono) } : {}),
          ...(body.direccion !== undefined ? { direccion: String(body.direccion) } : {}),
        },
        ban_duration: body.activo === false && !cuentaObjetivo.confirmacionPendiente ? '876000h' : 'none',
      });
      if (authUpdateError) return json({ mensaje: authUpdateError.message }, 400);
      const { error } = await servicio.from('usuarios').update({ nombre, usuario, correo, rol, activo: body.activo !== false }).eq('id', id);
      if (error) return json({ mensaje: error.message }, 400);
      const { data: financieraActual } = await servicio.from('entidadesFinancieras')
        .select('identificacion').eq('usuarioId', id).maybeSingle();
      const identificacion = String(body.identificacion ?? financieraActual?.identificacion ?? '').trim();
      if (rol === 'entidad_financiera' && !identificacion) {
        return json({ mensaje: 'Indica la identificación financiera antes de asignar ese rol.' }, 400);
      }
      if (rol === 'entidad_financiera') {
        const { data: perfil } = await servicio.from('usuarios').select('nombre').eq('id', id).single();
        const { error: financialError } = await servicio.from('entidadesFinancieras').upsert({ usuarioId: id, nombre: perfil?.nombre ?? 'Entidad', identificacion, activo: true }, { onConflict: 'usuarioId' });
        if (financialError) return json({ mensaje: financialError.message }, 400);
      } else {
        await servicio.from('entidadesFinancieras').delete().eq('usuarioId', id);
      }
      if (rol === 'cliente') {
        const { data: clienteActual } = await servicio.from('clientes').select('id').eq('usuarioId', id).maybeSingle();
        if (!clienteActual) {
          const { error: clientError } = await servicio.from('clientes').insert({ id, usuarioId: id, documento: String(body.documento ?? `pendiente-${id}`).trim(), telefono: String(body.telefono ?? ''), direccion: String(body.direccion ?? ''), puntosDisponibles: 0, puntosAcumulados: 0 });
          if (clientError) return json({ mensaje: `No se pudo crear el perfil de cliente: ${clientError.message}` }, 400);
        } else if (body.documento !== undefined) {
          const { error: clientError } = await servicio.from('clientes').update({
            documento: String(body.documento).trim(), telefono: String(body.telefono ?? ''), direccion: String(body.direccion ?? ''),
          }).eq('usuarioId', id);
          if (clientError) return json({ mensaje: clientError.message }, 400);
        }
      } else {
        await servicio.from('clientes').delete().eq('usuarioId', id);
      }
      return json({ mensaje: 'Perfil actualizado.' });
    }
    return json({ mensaje: 'Acción no reconocida.' }, 400);
  } catch (error) {
    return json({ mensaje: error instanceof Error ? error.message : 'No se pudo completar la operación.' }, 500);
  }
});
