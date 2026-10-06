import { datosIniciales } from '../datos/modeloBaseDatos';
import type { ColeccionesFirebase } from '../modelos/baseDatos';

// Declaro process.env para que TypeScript entienda las variables de Expo.
declare const process: {
  env: {
    EXPO_PUBLIC_FIREBASE_DATABASE_URL?: string;
  };
};

// Aqui leo la URL publica de Firebase desde el archivo .env.
const databaseUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

type NombreColeccion = keyof ColeccionesFirebase;

// Esta bandera me dice si la app tiene Firebase configurado o si debe usar datos locales.
export const hayFirebaseConfigurado = Boolean(databaseUrl);

// Esta funcion construye la URL completa para consultar una ruta de Firebase.
const construirUrl = (ruta: string) => {
  if (!databaseUrl) {
    throw new Error('Falta configurar EXPO_PUBLIC_FIREBASE_DATABASE_URL en el archivo .env');
  }

  const baseUrl = databaseUrl.replace(/\/$/, '');
  const rutaNormalizada = ruta.replace(/^\//, '');
  return `${baseUrl}/${rutaNormalizada}.json`;
};

// Guardo informacion simple sobre la conexion para mostrarla o revisarla.
export const firebaseConfig = {
  databaseUrl,
  conectado: hayFirebaseConfigurado,
  proveedor: 'Firebase Realtime Database',
};

// Esta funcion obtiene una coleccion completa desde Firebase.
export async function obtenerColeccion<T extends NombreColeccion>(
  coleccion: T,
): Promise<ColeccionesFirebase[T]> {
  const respuesta = await fetch(construirUrl(coleccion));

  if (!respuesta.ok) {
    throw new Error(`No se pudo consultar la coleccion ${coleccion}`);
  }

  return respuesta.json();
}

// Esta funcion sirve para cargar los datos iniciales en Firebase con un PATCH.
export async function guardarDatosIniciales() {
  const respuesta = await fetch(construirUrl('/'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datosIniciales),
  });

  if (!respuesta.ok) {
    throw new Error('No se pudieron guardar los datos iniciales en Firebase');
  }

  return respuesta.json();
}

// Esta funcion revisa si Firebase esta disponible para la app.
export async function verificarConexionFirebase() {
  if (!databaseUrl) {
    return {
      ok: false,
      mensaje: 'Configura EXPO_PUBLIC_FIREBASE_DATABASE_URL para conectar Firebase.',
    };
  }

  try {
    const respuesta = await fetch(construirUrl('/'), { method: 'GET' });
    return {
      ok: respuesta.ok,
      mensaje: respuesta.ok
        ? 'Conexion activa con Firebase.'
        : 'Firebase respondio, pero revisa las reglas de acceso.',
    };
  } catch {
    return {
      ok: false,
      mensaje: 'No fue posible conectar con Firebase desde la app.',
    };
  }
}
