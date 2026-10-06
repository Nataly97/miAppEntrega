import { datosIniciales } from '../datos/modeloBaseDatos';
import type { RolUsuario, Usuario } from '../modelos/baseDatos';
import { hayFirebaseConfigurado, obtenerColeccion } from './firebase';

// Estas son las credenciales que el usuario escribe en el formulario de login.
type CredencialesLogin = {
  usuario: string;
  clave: string;
  rol: RolUsuario;
};

// Este resultado me permite saber si el login funciono o si debo mostrar un error.
export type ResultadoLogin =
  | {
      ok: true;
      usuario: Usuario;
      origen: 'firebase' | 'local';
    }
  | {
      ok: false;
      mensaje: string;
    };

// Normalizo textos para comparar usuarios sin importar mayusculas o espacios.
const normalizar = (valor: string) => valor.trim().toLowerCase();

// Esta funcion busca un usuario por nombre de usuario o correo y valida su clave.
const buscarUsuario = (usuarios: Record<string, Usuario> | null | undefined, credenciales: CredencialesLogin) => {
  const usuarioIngresado = normalizar(credenciales.usuario);
  const claveIngresada = credenciales.clave.trim();

  return Object.values(usuarios ?? {}).find((usuario) => {
    const coincideUsuario =
      normalizar(usuario.usuario) === usuarioIngresado || normalizar(usuario.correo) === usuarioIngresado;

    return coincideUsuario && usuario.clave === claveIngresada;
  });
};

// Esta es la funcion principal del login.
// Primero intenta validar contra Firebase y, si no hay conexion, usa los datos locales.
export async function iniciarSesionConRol(credenciales: CredencialesLogin): Promise<ResultadoLogin> {
  // Valido que no intenten entrar con campos vacios.
  if (!credenciales.usuario.trim() || !credenciales.clave.trim()) {
    return {
      ok: false,
      mensaje: 'Ingresa usuario y clave.',
    };
  }

  let usuarios = datosIniciales.usuarios;
  let origen: 'firebase' | 'local' = 'local';

  // Si Firebase esta configurado, intento traer la coleccion usuarios desde la base.
  if (hayFirebaseConfigurado) {
    try {
      usuarios = await obtenerColeccion('usuarios');
      origen = 'firebase';
    } catch {
      usuarios = datosIniciales.usuarios;
      origen = 'local';
    }
  }

  // Busco el usuario con la informacion que escribieron en el login.
  const usuario = buscarUsuario(usuarios, credenciales);

  if (!usuario) {
    return {
      ok: false,
      mensaje: 'Usuario o clave incorrectos.',
    };
  }

  // Aunque la clave sea correcta, un usuario inactivo no debe entrar.
  if (!usuario.activo) {
    return {
      ok: false,
      mensaje: 'El usuario esta inactivo.',
    };
  }

  // Aqui valido que el rol seleccionado coincida con el rol guardado en la base.
  if (usuario.rol !== credenciales.rol) {
    return {
      ok: false,
      mensaje: `Este usuario tiene rol ${usuario.rol}. Cambia el rol seleccionado.`,
    };
  }

  // Si todo salio bien, devuelvo el usuario para abrir su vista correspondiente.
  return {
    ok: true,
    usuario,
    origen,
  };
}
