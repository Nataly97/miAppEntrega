import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../App';
import type { RolUsuario } from '../src/modelos/baseDatos';
import { iniciarSesionConRol } from '../src/servicios/autenticacion';
import { colores } from '../src/tema/colores';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// Opciones de rol que muestro en el login.
// El rol elegido debe coincidir con el rol guardado en la base de datos.
const roles: { valor: RolUsuario; etiqueta: string}[] = [
  {
    valor: 'administrador',
    etiqueta: 'Admin',
    // descripcion: 'Control total',
  },
  {
    valor: 'empleado',
    etiqueta: 'Empleado',
    // descripcion: 'Registra puntos',
  },
  {
    valor: 'cliente',
    etiqueta: 'Cliente',
    // descripcion: 'Consulta y canjea',
  },
];

export default function VentanaLogin({ navigation }: Props) {
  // Estados del formulario de login.
  // Datos de cliente por defecto para probar rapido durante la fase 1.
  const [rol, setRol] = useState<RolUsuario>('administrador');
  const [usuario, setUsuario] = useState('admin@ecopuntos.com');
  const [clave, setClave] = useState('admin123');
  const [mensajeError, setMensajeError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Esta funcion se ejecuta cuando presiono "Entrar al panel".
  // Valida usuario, clave y rol antes de permitir navegar al Home.
  const iniciarSesion = async () => {
    setCargando(true);
    setMensajeError('');

    // Llamo al servicio de autenticacion para no mezclar la logica del login con la vista.
    const resultado = await iniciarSesionConRol({
      usuario,
      clave,
      rol,
    });

    setCargando(false);

    // Si algo falla, muestro el mensaje y no dejo pasar al usuario.
    if (!resultado.ok) {
      setMensajeError(resultado.mensaje);
      return;
    }

    // Si el login fue correcto, envio al Home los datos necesarios del usuario.
    navigation.navigate('Home', {
      usuarioId: resultado.usuario.id,
      usuario: resultado.usuario.usuario,
      rol: resultado.usuario.rol,
      nombre: resultado.usuario.nombre,
      correo: resultado.usuario.correo,
    });
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      {/* Encabezado visual de la app. */}
      <View style={estilos.encabezado}>
        <Text style={estilos.marca}>ReciCash</Text>
        <Text style={estilos.subtitulo}>Intercambia reciclaje por puntos, productos y beneficios.</Text>
      </View>

      {/* Panel principal del formulario de inicio de sesion. */}
      <View style={estilos.panel}>
        <Text style={estilos.titulo}>Iniciar sesion</Text>
        {/* <Text style={estilos.textoAyuda}>Valida usuario, clave y rol desde la base de datos.</Text> */}

        {/* Selector de rol. Cada boton cambia el rol que se va a validar. */}
        <View style={estilos.selectorRoles}>
          {roles.map((item) => {
            const activo = item.valor === rol;
            return (
              <TouchableOpacity
                key={item.valor}
                style={[estilos.rol, activo && estilos.rolActivo]}
                onPress={() => setRol(item.valor)}
              >
                <Text style={[estilos.rolEtiqueta, activo && estilos.rolEtiquetaActiva]}>{item.etiqueta}</Text>
                {/* <Text style={[estilos.rolDescripcion, activo && estilos.rolDescripcionActiva]}>{item.descripcion}</Text> */}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Campo para escribir nombre de usuario o correo. */}
        <View style={estilos.grupoCampo}>
          <Text style={estilos.label}>Correo</Text>
          <TextInput
            style={estilos.campoTexto}
            placeholder="usuario o correo"
            autoCapitalize="none"
            value={usuario}
            onChangeText={setUsuario}
          />
        </View>

        {/* Campo de clave. Uso secureTextEntry para ocultar lo que se escribe. */}
        <View style={estilos.grupoCampo}>
          <Text style={estilos.label}>Clave</Text>
          <TextInput
            style={estilos.campoTexto}
            placeholder="Ingresa tu clave"
            value={clave}
            onChangeText={setClave}
            secureTextEntry
          />
        </View>

        {/* Mensaje de error cuando las credenciales no coinciden. */}
        {mensajeError ? <Text style={estilos.mensajeError}>{mensajeError}</Text> : null}

        {/* Boton principal. Se deshabilita mientras la app esta validando. */}
        <TouchableOpacity style={[estilos.botonPrincipal, cargando && estilos.botonDeshabilitado]} onPress={iniciarSesion} disabled={cargando}>
          <Text style={estilos.textoBotonPrincipal}>{cargando ? 'Validando...' : 'Entrar al panel'}</Text>
        </TouchableOpacity>

        {/* En la fase 1 este boton lleva a la pantalla base para crear cliente. */}
        <TouchableOpacity style={estilos.botonSecundario} onPress={() => navigation.navigate('Registro')}>
          <Text style={estilos.textoBotonSecundario}>Crear cliente</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}


const estilos = StyleSheet.create({
  contenedor: {
    flexGrow: 1,
    backgroundColor: colores.fondo,
    justifyContent: 'center',
    padding: 24,
  },
  encabezado: {
    marginBottom: 24,
  },
  marca: {
    color: colores.verdeOscuro,
    fontSize: 40,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.textoSuave,
    fontSize: 17,
    lineHeight: 24,
    marginTop: 8,
  },
  panel: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: colores.blanco,
    borderRadius: 8,
    padding: 22,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  titulo: {
    color: colores.tinta,
    fontSize: 28,
    fontWeight: '800',
  },
  textoAyuda: {
    color: colores.textoSuave,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 18,
  },
  selectorRoles: {
    gap: 10,
    marginBottom: 20,
  },
  rol: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colores.blanco,
  },
  rolActivo: {
    backgroundColor: colores.menta,
    borderColor: colores.verde,
  },
  rolEtiqueta: {
    color: colores.tinta,
    fontSize: 16,
    fontWeight: '800',
  },
  rolEtiquetaActiva: {
    color: colores.verdeOscuro,
  },
  rolDescripcion: {
    color: colores.textoSuave,
    fontSize: 13,
    marginTop: 2,
  },
  rolDescripcionActiva: {
    color: colores.verde,
  },
  grupoCampo: {
    marginBottom: 16,
  },
  label: {
    color: colores.tinta,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  campoTexto: {
    height: 48,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#fbfdfb',
    color: colores.tinta,
  },
  mensajeError: {
    color: colores.error,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  botonPrincipal: {
    height: 50,
    borderRadius: 8,
    backgroundColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  botonDeshabilitado: {
    opacity: 0.65,
  },
  textoBotonPrincipal: {
    color: colores.blanco,
    fontSize: 16,
    fontWeight: '800',
  },
  botonSecundario: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: colores.blanco,
  },
  textoBotonSecundario: {
    color: colores.verde,
    fontSize: 16,
    fontWeight: '800',
  },
});
