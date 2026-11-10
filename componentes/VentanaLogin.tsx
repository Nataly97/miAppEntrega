import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../App';
import type { RolUsuario } from '../src/modelos/baseDatos';
import { iniciarSesionConRol, mensajeAutenticacion, solicitarRestablecimientoClave } from '../src/servicios/autenticacion';
import { colores } from '../src/tema/colores';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function VentanaLogin({ navigation }: Props) {
  // Guardo lo que la persona escribe y el estado de la solicitud de acceso.
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState<RolUsuario>('cliente');
  const [mensajeError, setMensajeError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState('');

  const recuperarClave = async () => {
    setMensajeRecuperacion('');
    setEnviandoRecuperacion(true);
    try {
      await solicitarRestablecimientoClave(correo);
      setMensajeRecuperacion('Si el correo corresponde a una cuenta, recibirás un enlace para cambiar la contraseña. Revisa también spam.');
    } catch (error) {
      setMensajeRecuperacion(mensajeAutenticacion(error));
    } finally {
      setEnviandoRecuperacion(false);
    }
  };

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
      const resultado = await iniciarSesionConRol(correo, clave, rolSeleccionado);
      if (!resultado.ok) setMensajeError(resultado.mensaje);
      // App escucha el cambio de sesion y abre Home con el perfil validado.
    } catch (error) {
      setMensajeError(mensajeAutenticacion(error));
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <View style={estilos.contenido}>
        <View style={estilos.cabeceraPagina}>
          <View style={estilos.marcaSuperior}>
          <Image accessibilityLabel="Logo 3R Energy" source={require('../assets/logo-2.png')} resizeMode="contain" style={estilos.logoSuperior} />
            <View><Text style={estilos.marcaNombre}>ReciCash</Text><Text style={estilos.marcaOrigen}>UNA INICIATIVA 3R ENERGY S.A.S. BIC</Text></View>
          </View>
          <View style={estilos.pildoraCircular}><View style={estilos.puntoVerde} /><Text style={estilos.textoCircular}>Economía circular</Text></View>
        </View>

        <View style={estilos.tarjetaPrincipal}>
          <View style={estilos.panelMarca}>
            <View style={estilos.decoracionGrande} />
            <View style={estilos.decoracionPequena} />
            <Image accessibilityLabel="Logo 3R Energy" source={require('../assets/logo-3r-energy.png')} resizeMode="contain" style={estilos.logoEmpresa} />
          <Text style={estilos.etiquetaMarca}>RECICLAR · REDISEÑAR · REUTILIZAR</Text>
            <Text style={estilos.titularMarca}>Tus hábitos verdes<Text style={estilos.titularVerde}> tienen valor.</Text></Text>
            <Text style={estilos.textoMarca}>Entrega tus materiales, acumula puntos y cámbialos por beneficios para ti y para el planeta.</Text>
            <View style={estilos.pasos}>
              {[['01', 'Recicla'], ['02', 'Acumula'], ['03', 'Canjea']].map(([numero, texto]) => <View key={numero} style={estilos.paso}><Text style={estilos.numeroPaso}>{numero}</Text><Text style={estilos.textoPaso}>{texto}</Text></View>)}
            </View>
            <View style={estilos.firmaBloque}>
              <Text style={estilos.firmaMarca}>3R ENERGY S.A.S. BIC</Text>
              <Text style={estilos.firmaEslogan}>MÁS QUE PANELES SOLARES, UNA SOLUCIÓN SOSTENIBLE Y ACCESIBLE</Text>
            </View>
          </View>

          <View style={estilos.panel}>
            <View style={estilos.encabezadoFormulario}>
              <Text style={estilos.sobrelinea}>QUÉ BUENO TENERTE AQUÍ</Text>
              <Text style={estilos.titulo}>Inicia sesión</Text>
              <Text style={estilos.subtitulo}>Ingresa a tu espacio ReciCash.</Text>
            </View>

            <View style={estilos.grupoCampo}>
              <Text style={estilos.label}>¿Cómo ingresas?</Text>
              <View style={estilos.roles}>
                {([
                  ['cliente', 'Cliente'],
                  ['gestor', 'Gestor'],
                  ['entidad_financiera', 'Entidad financiera'],
                  ['administrador', 'Administrador'],
                ] as const).map(([rol, etiqueta]) => (
                  <TouchableOpacity key={rol} accessibilityRole="radio" accessibilityState={{ selected: rolSeleccionado === rol }}
                    style={[estilos.rol, rolSeleccionado === rol && estilos.rolActivo]}
                    onPress={() => setRolSeleccionado(rol)}>
                    <View style={[estilos.indicadorRol, rolSeleccionado === rol && estilos.indicadorRolActivo]} />
                    <Text style={[estilos.textoRol, rolSeleccionado === rol && estilos.textoRolActivo]}>{etiqueta}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={estilos.ayudaRol}>Selecciona el rol asignado a tu cuenta.</Text>
            </View>

            <View style={estilos.grupoCampo}>
              <Text style={estilos.label}>Correo electrónico</Text>
              <TextInput
                style={estilos.campoTexto}
                placeholder="nombre@correo.com"
                placeholderTextColor="#929a94"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={correo}
                onChangeText={setCorreo}
              />
            </View>

            <View style={[estilos.grupoCampo, estilos.grupoClave]}>
              <Text style={estilos.label}>Contraseña</Text>
              <TextInput
                style={estilos.campoTexto}
                placeholder="Escribe tu contraseña"
                placeholderTextColor="#929a94"
                value={clave}
                onChangeText={setClave}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity style={estilos.botonRecuperar} onPress={() => void recuperarClave()} disabled={enviandoRecuperacion}>
              <Text style={estilos.enlaceRecuperar}>{enviandoRecuperacion ? 'Enviando enlace…' : '¿Olvidaste tu contraseña?'}</Text>
            </TouchableOpacity>
            {mensajeRecuperacion ? <Text accessibilityRole="alert" style={estilos.mensajeRecuperacion}>{mensajeRecuperacion}</Text> : null}
            {mensajeError ? <Text accessibilityRole="alert" style={estilos.mensajeError}>{mensajeError}</Text> : null}

            <TouchableOpacity accessibilityRole="button" style={[estilos.botonPrincipal, cargando && estilos.botonDeshabilitado]} onPress={() => void iniciarSesion()} disabled={cargando}>
              <Text style={estilos.textoBotonPrincipal}>{cargando ? 'Validando acceso…' : 'Entrar a mi espacio'}</Text>
              {!cargando ? <Text style={estilos.flechaBoton}>→</Text> : null}
            </TouchableOpacity>

            <View style={estilos.divisor}><View style={estilos.lineaDivisor} /><Text style={estilos.textoDivisor}>¿Aún no tienes cuenta?</Text><View style={estilos.lineaDivisor} /></View>
            <TouchableOpacity accessibilityRole="button" style={estilos.botonSecundario} onPress={() => navigation.navigate('Registro')}>
              <Text style={estilos.textoBotonSecundario}>Crear cuenta de cliente</Text>
            </TouchableOpacity>
            <Text style={estilos.notaSeguridad}>♧  Acceso seguro · Tus datos están protegidos</Text>
          </View>
        </View>
        <View style={estilos.pie}>
          <Text style={estilos.pieNombre}>ReciCash</Text>
          <Text style={estilos.pieEslogan}>Reciclar también es una forma de ganar.</Text>
        </View>
      </View>
    </ScrollView>
  );
}


const estilos = StyleSheet.create({
  contenedor: {
    flexGrow: 1,
    backgroundColor: colores.fondo,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  contenido: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  cabeceraPagina: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  marcaSuperior: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoSuperior: { width: 58, height: 58, borderRadius: 12, backgroundColor: colores.azulOscuro },
  marcaNombre: { color: colores.azulOscuro, fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  marcaOrigen: { color: colores.textoSuave, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 2 },
  pildoraCircular: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#e7f3e9', borderRadius: 20 },
  puntoVerde: { width: 7, height: 7, borderRadius: 5, backgroundColor: colores.verde },
  textoCircular: { color: colores.verdeOscuro, fontSize: 11, fontWeight: '800' },
  tarjetaPrincipal: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', backgroundColor: colores.blanco, borderRadius: 24, borderWidth: 1, borderColor: '#e1e9e1', shadowColor: colores.azulOscuro, shadowOpacity: 0.09, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 5 },
  panelMarca: { flexGrow: 1, flexBasis: 360, minHeight: 560, overflow: 'hidden', justifyContent: 'center', backgroundColor: colores.azulOscuro, paddingHorizontal: 38, paddingVertical: 36 },
  decoracionGrande: { position: 'absolute', width: 360, height: 360, borderWidth: 1, borderColor: '#ffffff12', borderRadius: 200, right: -170, top: -110 },
  decoracionPequena: { position: 'absolute', width: 230, height: 230, borderWidth: 1, borderColor: '#ffffff12', borderRadius: 140, right: -100, top: -45 },
  logoEmpresa: { width: 174, height: 174, marginLeft: -17, marginTop: -22, marginBottom: 5 },
  etiquetaMarca: { color: colores.amarillo, fontSize: 10, fontWeight: '900', letterSpacing: 1.7, marginBottom: 12 },
  titularMarca: { maxWidth: 390, color: colores.blanco, fontSize: 35, lineHeight: 42, fontWeight: '900', letterSpacing: -1 },
  titularVerde: { color: '#64d48e' },
  textoMarca: { maxWidth: 380, color: '#d4d8ec', fontSize: 15, lineHeight: 24, marginTop: 14 },
  pasos: { flexDirection: 'row', gap: 11, marginTop: 30 },
  paso: { flex: 1, minHeight: 62, padding: 10, borderRadius: 12, backgroundColor: '#ffffff0d', borderWidth: 1, borderColor: '#ffffff1b' },
  numeroPaso: { color: '#67d28e', fontSize: 10, fontWeight: '900' },
  textoPaso: { color: colores.blanco, fontSize: 12, fontWeight: '800', marginTop: 6 },
  firmaBloque: { maxWidth: 390, borderLeftWidth: 3, borderLeftColor: colores.amarillo, paddingLeft: 13, marginTop: 35 },
  firmaMarca: { color: colores.blanco, fontFamily: Platform.select({ web: 'Trebuchet MS', ios: 'Avenir Next', android: 'sans-serif' }), fontSize: 14, fontWeight: '800', letterSpacing: 0.35 },
  firmaEslogan: { color: '#d4e5d8', fontFamily: Platform.select({ web: 'Trebuchet MS', ios: 'Avenir Next', android: 'sans-serif' }), fontSize: 12, lineHeight: 19, fontWeight: '500', marginTop: 5 },
  panel: { flexGrow: 1, flexBasis: 420, paddingHorizontal: 38, paddingVertical: 34, justifyContent: 'center' },
  encabezadoFormulario: { marginBottom: 24 },
  sobrelinea: { color: colores.verde, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 8 },
  titulo: { color: colores.azulOscuro, fontSize: 30, fontWeight: '900', letterSpacing: -0.7 },
  subtitulo: { color: colores.textoSuave, fontSize: 14, marginTop: 6 },
  grupoCampo: { marginBottom: 16 },
  grupoClave: { marginBottom: 3 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rol: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#e0e6e1', backgroundColor: '#fbfcfa', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  rolActivo: { borderColor: colores.azulOscuro, backgroundColor: colores.azulOscuro },
  indicadorRol: { width: 7, height: 7, borderRadius: 5, backgroundColor: '#a8b3aa' },
  indicadorRolActivo: { backgroundColor: colores.amarillo },
  textoRol: { color: '#48554c', fontSize: 12, fontWeight: '700' },
  textoRolActivo: { color: colores.blanco },
  ayudaRol: { color: colores.textoSuave, fontSize: 11, marginTop: 8 },
  botonRecuperar: { alignSelf: 'flex-end', paddingVertical: 8, marginBottom: 8 },
  enlaceRecuperar: { color: colores.azul, fontSize: 12, fontWeight: '800' },
  mensajeRecuperacion: { color: colores.tinta, backgroundColor: '#eef8f1', padding: 10, borderRadius: 9, fontSize: 12, marginBottom: 12, lineHeight: 18 },
  label: { color: colores.azulOscuro, fontSize: 12, fontWeight: '800', marginBottom: 7 },
  campoTexto: { height: 50, borderWidth: 1, borderColor: '#dce5dd', borderRadius: 11, paddingHorizontal: 14, fontSize: 14, backgroundColor: '#fbfcfa', color: colores.tinta },
  mensajeError: { color: '#a52525', backgroundColor: '#fff0ee', borderWidth: 1, borderColor: '#f3d0cb', padding: 11, borderRadius: 9, fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 9, marginBottom: 3 },
  botonPrincipal: { minHeight: 52, flexDirection: 'row', gap: 10, borderRadius: 11, backgroundColor: colores.verde, alignItems: 'center', justifyContent: 'center', marginTop: 13, shadowColor: '#0c6032', shadowOpacity: 0.17, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  botonDeshabilitado: { opacity: 0.65 },
  textoBotonPrincipal: { color: colores.blanco, fontSize: 14, fontWeight: '900' },
  flechaBoton: { color: colores.blanco, fontSize: 20, fontWeight: '700', marginTop: -2 },
  divisor: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20 },
  lineaDivisor: { flex: 1, height: 1, backgroundColor: '#e8ece8' },
  textoDivisor: { color: '#7a857d', fontSize: 10, fontWeight: '700' },
  botonSecundario: { height: 46, borderRadius: 10, borderWidth: 1, borderColor: '#cbd8cf', alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: colores.blanco },
  textoBotonSecundario: { color: colores.azulOscuro, fontSize: 13, fontWeight: '800' },
  notaSeguridad: { color: '#839087', fontSize: 10, textAlign: 'center', marginTop: 18 },
  pie: { alignItems: 'center', marginTop: 17, paddingVertical: 5 },
  pieNombre: { color: colores.azulOscuro, fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  pieEslogan: { color: colores.textoSuave, fontSize: 11, marginTop: 4 },
});
