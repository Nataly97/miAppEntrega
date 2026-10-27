import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../App';
import { iniciarSesionConRol } from '../src/servicios/autenticacion';
import { colores } from '../src/tema/colores';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function VentanaLogin({ navigation }: Props) {
  // Guardo lo que la persona escribe y el estado de la solicitud de acceso.
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Esta funcion se ejecuta cuando presiono "Entrar al panel".
  // Valido el correo y la clave; el rol se consulta despues en el perfil de Supabase.
  const iniciarSesion = async () => {
    setMensajeError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setMensajeError('Escribe un correo electronico valido.');
      return;
    }
    if (clave.length < 8) {
      setMensajeError('La clave debe tener al menos 8 caracteres.');
      return;
    }
    setCargando(true);

    // El servicio valida el correo con Supabase Auth y consulta el rol del perfil.
    try {
      const resultado = await iniciarSesionConRol(correo, clave);
      if (!resultado.ok) setMensajeError(resultado.mensaje);
      // App escucha el cambio de sesion y abre Home con el perfil validado.
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : 'No fue posible iniciar sesion.');
    } finally {
      setCargando(false);
    }
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

        {/* Campo de correo; el rol se carga desde el perfil autenticado. */}
        <View style={estilos.grupoCampo}>
          <Text style={estilos.label}>Correo</Text>
          <TextInput
            style={estilos.campoTexto}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={correo}
            onChangeText={setCorreo}
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
