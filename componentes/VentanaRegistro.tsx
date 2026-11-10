import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../App';
import { registrarCliente } from '../src/servicios/autenticacion';
import { colores } from '../src/tema/colores';

type Props = NativeStackScreenProps<RootStackParamList, 'Registro'>;

export default function VentanaRegistro({ navigation }: Props) {
  // Estados del formulario para capturar los datos iniciales del cliente.
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [correo, setCorreo] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [clave, setClave] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [registroCorrecto, setRegistroCorrecto] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Valido los campos y creo la cuenta de cliente con Supabase Auth.
  const guardarCliente = async () => {
    setMensaje('');
    setRegistroCorrecto(false);
    if (!nombre.trim() || !usuario.trim() || !correo.trim() || !documento.trim() || !telefono.trim() || !direccion.trim()) {
      setMensaje('Completa todos los campos del formulario.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setMensaje('Escribe un correo electronico valido.');
      return;
    }
    if (clave.length < 8) {
      setMensaje('La clave debe tener al menos 8 caracteres.');
      return;
    }

    setCargando(true);
    try {
      const resultado = await registrarCliente({ nombre, usuario, correo, clave, documento, telefono, direccion });
      setMensaje(resultado.requiereConfirmacion
        ? 'Cuenta creada. Supabase aceptó la solicitud de confirmación. Revisa tu correo y spam antes de iniciar sesión.'
        : 'Cuenta creada. Ya puedes iniciar sesion.');
      setRegistroCorrecto(true);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No fue posible crear la cuenta.');
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
            <View><Text style={estilos.marcaNombre}>ReciCash</Text><Text style={estilos.marcaOrigen}>UNA INICIATIVA 3R ENERGY</Text></View>
          </View>
          <View style={estilos.pildoraCircular}><View style={estilos.puntoVerde} /><Text style={estilos.textoCircular}>Únete al cambio</Text></View>
        </View>

        <View style={estilos.tarjetaPrincipal}>
          <View style={estilos.panelMarca}>
            <View style={estilos.decoracionGrande} />
            <View style={estilos.decoracionPequena} />
            <Image accessibilityLabel="Logo 3R Energy" source={require('../assets/logo-3r-energy.png')} resizeMode="contain" style={estilos.logoEmpresa} />
            <Text style={estilos.etiquetaMarca}>RECICLAR · SUMAR · TRANSFORMAR</Text>
            <Text style={estilos.titularMarca}>Empieza con un pequeño cambio.</Text>
            <Text style={estilos.textoMarca}>Crea tu cuenta, entrega tus materiales reciclables y convierte cada aporte en puntos y beneficios.</Text>
            <View style={estilos.pasos}>
              {[['01', 'Regístrate'], ['02', 'Recicla'], ['03', 'Disfruta']].map(([numero, texto]) => <View key={numero} style={estilos.paso}><Text style={estilos.numeroPaso}>{numero}</Text><Text style={estilos.textoPaso}>{texto}</Text></View>)}
            </View>
            <View style={estilos.firmaBloque}><Text style={estilos.firmaMarca}>3R ENERGY S.A.S. BIC</Text><Text style={estilos.firmaEslogan}>MÁS QUE PANELES SOLARES, UNA SOLUCIÓN SOSTENIBLE Y ACCESIBLE</Text></View>
          </View>

          <View style={estilos.panel}>
            <View style={estilos.encabezadoFormulario}>
              <Text style={estilos.sobrelinea}>TU ESPACIO COMIENZA AQUÍ</Text>
              <Text style={estilos.titulo}>Crear cuenta</Text>
              <Text style={estilos.subtitulo}>Regístrate como cliente de ReciCash.</Text>
            </View>

            <View style={estilos.filaCampos}>
              <View style={estilos.grupoCampo}>
                <Text style={estilos.label}>Nombre completo</Text>
                <TextInput style={estilos.campoTexto} placeholder="Tu nombre y apellido" placeholderTextColor="#929a94" autoComplete="name" value={nombre} onChangeText={setNombre} />
              </View>
              <View style={estilos.grupoCampo}>
                <Text style={estilos.label}>Nombre de usuario</Text>
                <TextInput style={estilos.campoTexto} placeholder="Elige un usuario" placeholderTextColor="#929a94" autoCapitalize="none" autoComplete="username" value={usuario} onChangeText={setUsuario} />
              </View>
            </View>

            <View style={estilos.filaCampos}>
              <View style={estilos.grupoCampo}>
                <Text style={estilos.label}>Documento</Text>
                <TextInput style={estilos.campoTexto} placeholder="Número de documento" placeholderTextColor="#929a94" keyboardType="numeric" value={documento} onChangeText={setDocumento} />
              </View>
              <View style={estilos.grupoCampo}>
                <Text style={estilos.label}>Correo electrónico</Text>
                <TextInput style={estilos.campoTexto} placeholder="nombre@correo.com" placeholderTextColor="#929a94" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={correo} onChangeText={setCorreo} />
              </View>
            </View>

            <View style={estilos.filaCampos}>
              <View style={estilos.grupoCampo}>
                <Text style={estilos.label}>Contraseña</Text>
                <TextInput style={estilos.campoTexto} placeholder="Mínimo 8 caracteres" placeholderTextColor="#929a94" value={clave} onChangeText={setClave} secureTextEntry autoComplete="new-password" />
                <Text style={estilos.ayudaCampo}>Usa al menos 8 caracteres para proteger tu cuenta.</Text>
              </View>
              <View style={estilos.grupoCampo}>
                <Text style={estilos.label}>Teléfono</Text>
                <TextInput style={estilos.campoTexto} placeholder="Número de contacto" placeholderTextColor="#929a94" keyboardType="phone-pad" autoComplete="tel" value={telefono} onChangeText={setTelefono} />
              </View>
            </View>

            <View style={estilos.grupoCampo}>
              <Text style={estilos.label}>Dirección</Text>
              <TextInput style={estilos.campoTexto} placeholder="Dirección de residencia" placeholderTextColor="#929a94" autoComplete="street-address" value={direccion} onChangeText={setDireccion} />
            </View>

            {mensaje ? <Text accessibilityRole="alert" style={[estilos.mensaje, registroCorrecto && estilos.mensajeCorrecto]}>{mensaje}</Text> : null}

            <TouchableOpacity accessibilityRole="button" style={[estilos.botonPrincipal, cargando && estilos.botonDeshabilitado]} onPress={() => void guardarCliente()} disabled={cargando}>
              <Text style={estilos.textoBotonPrincipal}>{cargando ? 'Creando tu cuenta…' : 'Crear cuenta de cliente'}</Text>
              {!cargando ? <Text style={estilos.flechaBoton}>→</Text> : null}
            </TouchableOpacity>

            <TouchableOpacity accessibilityRole="button" style={estilos.botonSecundario} onPress={() => navigation.goBack()}>
              <Text style={estilos.textoBotonSecundario}>Ya tengo una cuenta · Volver al login</Text>
            </TouchableOpacity>
            <Text style={estilos.notaSeguridad}>Tus datos se usan para gestionar tu cuenta ReciCash de forma segura.</Text>
          </View>
        </View>
        <View style={estilos.pie}><Text style={estilos.pieNombre}>ReciCash</Text><Text style={estilos.pieEslogan}>Reciclar también es una forma de ganar.</Text></View>
      </View>
    </ScrollView>
  );
}

// Estilos de la pantalla de registro.
const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, backgroundColor: colores.fondo, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 18 },
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
  panelMarca: { flexGrow: 1, flexBasis: 360, minHeight: 600, overflow: 'hidden', justifyContent: 'center', backgroundColor: colores.azulOscuro, paddingHorizontal: 38, paddingVertical: 36 },
  decoracionGrande: { position: 'absolute', width: 360, height: 360, borderWidth: 1, borderColor: '#ffffff12', borderRadius: 200, right: -170, top: -110 },
  decoracionPequena: { position: 'absolute', width: 230, height: 230, borderWidth: 1, borderColor: '#ffffff12', borderRadius: 140, right: -100, top: -45 },
  logoEmpresa: { width: 174, height: 174, marginLeft: -17, marginTop: -22, marginBottom: 5 },
  etiquetaMarca: { color: colores.amarillo, fontSize: 10, fontWeight: '900', letterSpacing: 1.7, marginBottom: 12 },
  titularMarca: { maxWidth: 390, color: colores.blanco, fontSize: 35, lineHeight: 42, fontWeight: '900', letterSpacing: -1 },
  textoMarca: { maxWidth: 380, color: '#d4d8ec', fontSize: 15, lineHeight: 24, marginTop: 14 },
  pasos: { flexDirection: 'row', gap: 11, marginTop: 27 },
  paso: { flex: 1, minHeight: 62, padding: 10, borderRadius: 12, backgroundColor: '#ffffff0d', borderWidth: 1, borderColor: '#ffffff1b' },
  numeroPaso: { color: '#67d28e', fontSize: 10, fontWeight: '900' },
  textoPaso: { color: colores.blanco, fontSize: 12, fontWeight: '800', marginTop: 6 },
  firmaBloque: { maxWidth: 390, borderLeftWidth: 3, borderLeftColor: colores.amarillo, paddingLeft: 13, marginTop: 27 },
  firmaMarca: { color: colores.blanco, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  firmaEslogan: { color: '#d4e5d8', fontSize: 10, lineHeight: 16, fontWeight: '600', marginTop: 5 },
  panel: { flexGrow: 1, flexBasis: 450, paddingHorizontal: 38, paddingVertical: 34, justifyContent: 'center' },
  encabezadoFormulario: { marginBottom: 19 },
  sobrelinea: { color: colores.verde, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 8 },
  titulo: { color: colores.azulOscuro, fontSize: 30, fontWeight: '900', letterSpacing: -0.7 },
  subtitulo: { color: colores.textoSuave, fontSize: 14, marginTop: 6 },
  filaCampos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  grupoCampo: { flexGrow: 1, flexBasis: 190, marginBottom: 12 },
  label: { color: colores.azulOscuro, fontSize: 12, fontWeight: '800', marginBottom: 7 },
  campoTexto: { height: 47, borderWidth: 1, borderColor: '#dce5dd', borderRadius: 10, paddingHorizontal: 13, fontSize: 13, backgroundColor: '#fbfcfa', color: colores.tinta },
  ayudaCampo: { color: colores.textoSuave, fontSize: 10, lineHeight: 15, marginTop: 5 },
  botonPrincipal: { minHeight: 52, flexDirection: 'row', gap: 10, borderRadius: 11, backgroundColor: colores.verde, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: '#0c6032', shadowOpacity: 0.17, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  botonDeshabilitado: { opacity: 0.65 },
  textoBotonPrincipal: { color: colores.blanco, fontSize: 14, fontWeight: '900' },
  flechaBoton: { color: colores.blanco, fontSize: 20, fontWeight: '700', marginTop: -2 },
  mensaje: { color: '#a52525', backgroundColor: '#fff0ee', borderWidth: 1, borderColor: '#f3d0cb', padding: 11, borderRadius: 9, fontSize: 12, lineHeight: 18, fontWeight: '700', marginBottom: 8 },
  mensajeCorrecto: { color: colores.verdeOscuro, backgroundColor: '#eaf7ee', borderColor: '#c8e7d1' },
  botonSecundario: { minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: '#cbd8cf', alignItems: 'center', justifyContent: 'center', marginTop: 11, backgroundColor: colores.blanco, paddingHorizontal: 9 },
  textoBotonSecundario: { color: colores.azulOscuro, fontSize: 12, fontWeight: '800' },
  notaSeguridad: { color: '#839087', fontSize: 10, textAlign: 'center', marginTop: 15, lineHeight: 15 },
  pie: { alignItems: 'center', marginTop: 17, paddingVertical: 5 },
  pieNombre: { color: colores.azulOscuro, fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  pieEslogan: { color: colores.textoSuave, fontSize: 11, marginTop: 4 },
});
