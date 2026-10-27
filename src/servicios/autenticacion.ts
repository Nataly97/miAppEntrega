import type { User } from '@supabase/supabase-js';
import type { RolUsuario, Usuario } from '../modelos/baseDatos';
import { haySupabaseConfigurado, supabase } from './supabase';

// Este es el usuario con el que trabajo despues de iniciar sesion.
export type ResultadoLogin =
  | { ok: true; usuario: Usuario }
  | { ok: false; mensaje: string };

// Convierto el perfil de Supabase en el formato que usan las pantallas.
const obtenerPerfil = async (id: string): Promise<Usuario> => {
  if (!supabase) throw new Error('Supabase no esta configurado. Revisa el archivo .env.');

  const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).single();
  if (error) throw new Error('No se encontro el perfil del usuario en la tabla usuarios.');
  if (!data.activo) throw new Error('La cuenta esta inactiva.');

  return data as Usuario;
};

// Inicio sesion con Supabase Auth y luego cargo el perfil y el rol de la persona.
export async function iniciarSesionConRol(correo: string, clave: string): Promise<ResultadoLogin> {
  if (!correo.trim() || !clave) return { ok: false, mensaje: 'Ingresa tu correo y tu clave.' };
  if (!haySupabaseConfigurado || !supabase) {
    return { ok: false, mensaje: 'Configura Supabase en el archivo .env para iniciar sesion.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo.trim().toLowerCase(),
    password: clave,
  });

  if (error || !data.user) return { ok: false, mensaje: 'El correo o la clave no son correctos.' };

  try {
    return { ok: true, usuario: await obtenerPerfil(data.user.id) };
  } catch (errorPerfil) {
    await supabase.auth.signOut();
    return {
      ok: false,
      mensaje: errorPerfil instanceof Error ? errorPerfil.message : 'No fue posible cargar tu perfil.',
    };
  }
}

// Recupero la cuenta de Supabase que sigue activa al abrir la aplicacion.
export async function obtenerUsuarioDeSesion(user: User): Promise<Usuario> {
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

  if (error) throw new Error(error.message);
  return { requiereConfirmacion: !data.session };
}

// Cierro la sesion en Supabase y dejo que la app vuelva al login.
export async function cerrarSesion() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
