import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { ColeccionesSupabase } from '../modelos/baseDatos';

// Declaro process.env para que TypeScript entienda las variables publicas de Expo.
declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    EXPO_PUBLIC_SUPABASE_KEY?: string;
  };
};

type NombreColeccion = keyof ColeccionesSupabase;
type RegistroConId = { id: string };
export type FilaColeccion = Record<string, string | number | boolean | null> & { id: string };

// Aqui conecto la app con mi proyecto de Supabase usando los datos del archivo .env.
// La llave publica identifica la app; los permisos de cada usuario los protejo con RLS en la base de datos.
// Nunca pongo aqui la llave secreta del servidor, porque este archivo se incluye en la aplicacion.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Acepto tambien el nombre EXPO_PUBLIC_SUPABASE_KEY que ya usan algunas instalaciones.
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_KEY;

// En celular guardo los tokens cifrados; en web uso el almacenamiento del navegador.
const almacenamientoSesion = {
  getItem: (clave: string) => Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage?.getItem(clave) ?? null)
    : SecureStore.getItemAsync(clave),
  setItem: (clave: string, valor: string) => Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage?.setItem(clave, valor))
    : SecureStore.setItemAsync(clave, valor),
  removeItem: (clave: string) => Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage?.removeItem(clave))
    : SecureStore.deleteItemAsync(clave),
};

// Esta bandera me dice si la app tiene las variables necesarias para conectar Supabase.
export const haySupabaseConfigurado = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = haySupabaseConfigurado
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        storage: almacenamientoSesion,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

// Guardo informacion simple sobre la conexion para mostrarla o revisarla.
export const supabaseConfig = {
  url: supabaseUrl,
  conectado: haySupabaseConfigurado,
  proveedor: 'Supabase',
};

// La URL debe coincidir con una URL permitida en Supabase > Authentication > URL Configuration.
// Preparo la URL a la que Supabase devuelve a la persona después de confirmar o recuperar su cuenta.
export function obtenerUrlRetornoAuth() {
  if (Platform.OS === 'web' && typeof globalThis.location !== 'undefined') {
    return globalThis.location.origin;
  }
  return 'recicash://auth/callback';
}

// Organizo las filas por su identificador para consultarlas fácilmente desde la app.
const convertirFilasARegistro = <T extends RegistroConId>(filas: T[] | null): Record<string, T> =>
  Object.fromEntries((filas ?? []).map((fila) => [fila.id, fila]));

// Esta funcion obtiene una tabla completa desde Supabase y la transforma al formato de la app.
export async function obtenerColeccion<T extends NombreColeccion>(
  coleccion: T,
): Promise<ColeccionesSupabase[T]> {
  if (!supabase) {
    throw new Error('Falta configurar Supabase en el archivo .env');
  }

  const { data, error } = await supabase.from(coleccion).select('*');

  if (error) {
    throw new Error(`No se pudo consultar la tabla ${coleccion}: ${error.message}`);
  }

  return convertirFilasARegistro(data as ColeccionesSupabase[T][keyof ColeccionesSupabase[T]][]) as ColeccionesSupabase[T];
}

// Leo los registros de una tabla para mostrarlos en el modulo de gestion.
export async function listarRegistros(coleccion: Exclude<NombreColeccion, 'usuarios'>): Promise<FilaColeccion[]> {
  if (!supabase) throw new Error('Falta configurar Supabase en el archivo .env');
  const { data, error } = await supabase.from(coleccion).select('*').order('id');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FilaColeccion[];
}

// Creo un registro nuevo y regreso el dato que quedo guardado.
export async function crearRegistro(coleccion: Exclude<NombreColeccion, 'usuarios'>, valores: FilaColeccion) {
  if (!supabase) throw new Error('Falta configurar Supabase en el archivo .env');
  const { data, error } = await supabase.from(coleccion).insert(valores).select('*').single();
  if (error) throw new Error(error.message);
  return data as unknown as FilaColeccion;
}

// Actualizo un registro usando su identificador.
export async function actualizarRegistro(coleccion: Exclude<NombreColeccion, 'usuarios'>, id: string, valores: FilaColeccion) {
  if (!supabase) throw new Error('Falta configurar Supabase en el archivo .env');
  const { data, error } = await supabase.from(coleccion).update(valores).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as unknown as FilaColeccion;
}

// Elimino un registro por su identificador.
export async function eliminarRegistro(coleccion: Exclude<NombreColeccion, 'usuarios'>, id: string) {
  if (!supabase) throw new Error('Falta configurar Supabase en el archivo .env');
  const { error } = await supabase.from(coleccion).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Esta funcion revisa si Supabase esta disponible para la app.
export async function verificarConexionSupabase() {
  if (!haySupabaseConfigurado || !supabase) {
    return {
      ok: false,
      mensaje: 'Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY para conectar Supabase.',
    };
  }

  try {
    const { error } = await supabase.from('usuarios').select('id').limit(1);
    return {
      ok: !error,
      mensaje: !error
        ? 'Conexion activa con Supabase.'
        : 'Supabase respondio, pero revisa tablas, API o politicas RLS.',
    };
  } catch {
    return {
      ok: false,
      mensaje: 'No fue posible conectar con Supabase desde la app.',
    };
  }
}
