import type { User } from '@supabase/supabase-js';
import type { RolUsuario, Usuario } from '../modelos/baseDatos';
import { haySupabaseConfigurado, obtenerUrlRetornoAuth, supabase } from './supabase';

// Este es el usuario con el que trabajo despues de iniciar sesion.
export type ResultadoLogin =
  | { ok: true; usuario: Usuario }
  | { ok: false; mensaje: string };

let rolEsperadoDuranteLogin: RolUsuario | null = null;

export function obtenerRolEsperadoDuranteLogin() {
  return rolEsperadoDuranteLogin;
}

export function mensajeAutenticacion(error: unknown): string {
  const texto = error instanceof Error ? error.message : '';
  const normalizado = texto.toLowerCase();
  if (normalizado.includes('invalid login credentials')) return 'El correo o la contraseña no coinciden.';
  if (normalizado.includes('email not confirmed')) return 'Confirma tu correo desde el enlace que enviamos antes de iniciar sesión.';
  if (normalizado.includes('already registered') || normalizado.includes('already been registered')) return 'Ya existe una cuenta con ese correo. Prueba iniciar sesión.';
  if (normalizado.includes('database error saving new user')) return 'El correo, nombre de usuario o documento ya está registrado. No se creó la cuenta.';
  if (normalizado.includes('unique constraint') || normalizado.includes('duplicate key')) return 'El correo, usuario o documento ya está registrado. Verifica los datos e inténtalo de nuevo.';
  if (normalizado.includes('password') && (normalizado.includes('weak') || normalizado.includes('length'))) return 'La contraseña no cumple los requisitos de seguridad.';
  if (normalizado.includes('network') || normalizado.includes('fetch')) return 'No hay conexión con Supabase. Revisa tu internet e inténtalo de nuevo.';
  if (normalizado.includes('invalid path')) return 'La URL de Supabase debe ser la raíz del proyecto, sin /rest/v1.';
  return texto || 'No fue posible completar la solicitud. Inténtalo de nuevo.';
}

// Convierto el perfil de Supabase en el formato que usan las pantallas.
const obtenerPerfil = async (id: string): Promise<Usuario> => {
  if (!supabase) throw new Error('Supabase no esta configurado. Revisa el archivo .env.');

  const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).single();
  if (error) throw new Error('No se encontro el perfil del usuario en la tabla usuarios.');
  if (data.confirmacionPendiente) throw new Error('Confirma el correo desde el enlace enviado antes de iniciar sesión.');
  if (!data.activo) throw new Error('La cuenta esta inactiva.');

  return data as Usuario;
};

// Inicio sesion con Supabase Auth y luego cargo el perfil y el rol de la persona.
export async function iniciarSesionConRol(correo: string, clave: string, rolSeleccionado: RolUsuario): Promise<ResultadoLogin> {
  if (!correo.trim() || !clave) return { ok: false, mensaje: 'Ingresa tu correo y tu clave.' };
  if (!haySupabaseConfigurado || !supabase) {
    return { ok: false, mensaje: 'Configura Supabase en el archivo .env para iniciar sesion.' };
  }

  rolEsperadoDuranteLogin = rolSeleccionado;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo.trim().toLowerCase(),
      password: clave,
    });
    if (error || !data.user) return { ok: false, mensaje: error ? mensajeAutenticacion(error) : 'No encontramos una cuenta con esos datos.' };
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return { ok: false, mensaje: 'Tu correo aún no está confirmado. Abre el enlace de confirmación que enviamos para activar la cuenta.' };
    }

    const perfil = await obtenerPerfil(data.user.id);
    if (perfil.rol !== rolSeleccionado) {
      await supabase.auth.signOut();
      const etiquetas: Record<RolUsuario, string> = {
        cliente: 'Cliente', gestor: 'Gestor', entidad_financiera: 'Entidad financiera', administrador: 'Administrador',
      };
      return { ok: false, mensaje: `Rol incorrecto: seleccionaste ${etiquetas[rolSeleccionado]}, pero esta cuenta es ${etiquetas[perfil.rol]}. No se inició sesión.` };
    }
    return { ok: true, usuario: perfil };
  } catch (errorPerfil) {
    await supabase.auth.signOut();
    return {
      ok: false,
      mensaje: errorPerfil instanceof Error && errorPerfil.message.includes('No se encontro el perfil')
        ? 'La cuenta existe en Supabase Auth, pero no tiene un perfil asignado. Contacta al administrador.'
        : errorPerfil instanceof Error ? mensajeAutenticacion(errorPerfil) : 'No fue posible cargar tu perfil.',
    };
  } finally {
    rolEsperadoDuranteLogin = null;
  }
}

// Recupero la cuenta de Supabase que sigue activa al abrir la aplicacion.
export async function obtenerUsuarioDeSesion(user: User): Promise<Usuario> {
  if (!user.email_confirmed_at) throw new Error('Confirma el correo desde el enlace enviado antes de iniciar sesión.');
  return obtenerPerfil(user.id);
}

// Creo una cuenta de cliente; el trigger de la base crea su perfil relacionado.
export async function registrarCliente(datos: {
  nombre: string;
  usuario: string;
  correo: string;
  clave: string;
  documento: string;
  telefono: string;
  direccion: string;
}) {
  if (!supabase) throw new Error('Supabase no esta configurado. Revisa el archivo .env.');

  const { data, error } = await supabase.auth.signUp({
    email: datos.correo.trim().toLowerCase(),
    password: datos.clave,
    options: {
      emailRedirectTo: obtenerUrlRetornoAuth(),
      data: {
        nombre: datos.nombre.trim(),
        usuario: datos.usuario.trim(),
        rol: 'cliente' satisfies RolUsuario,
        documento: datos.documento.trim(),
        telefono: datos.telefono.trim(),
        direccion: datos.direccion.trim(),
      },
    },
  });

  if (error) throw new Error(mensajeAutenticacion(error));
  if (data.user?.identities?.length === 0) {
    throw new Error('El correo ya está registrado. No se creó la cuenta; inicia sesión o usa otra dirección.');
  }
  return { requiereConfirmacion: !data.session };
}

export async function solicitarRestablecimientoClave(correo: string) {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa la conexión del proyecto.');
  const email = correo.trim().toLowerCase();
  if (!email) throw new Error('Escribe el correo asociado a tu cuenta.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${obtenerUrlRetornoAuth()}${obtenerUrlRetornoAuth().includes('?') ? '&' : '?'}flow=recovery`,
  });
  if (error) throw new Error(mensajeAutenticacion(error));
}

export async function guardarNuevaClave(clave: string) {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa la conexión del proyecto.');
  const { error } = await supabase.auth.updateUser({ password: clave });
  if (error) throw new Error(mensajeAutenticacion(error));
}

// Cierro la sesion en Supabase y dejo que la app vuelva al login.
export async function cerrarSesion() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
