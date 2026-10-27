import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
        ? 'Cuenta creada. Revisa tu correo para confirmar el registro antes de iniciar sesion.'
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
      {/* Formulario base para que un empleado cree un cliente. */}
      <View style={estilos.panel}>
        <Text style={estilos.marca}>ReciCash</Text>
        <Text style={estilos.titulo}>Crear cliente</Text>

        {/* Nombre completo del cliente. */}
        <View style={estilos.grupoCampo}>
          <Text style={estilos.label}>Nombre completo</Text>
          <TextInput
            style={estilos.campoTexto}
            placeholder="Nombre del cliente"
            value={nombre}
            onChangeText={setNombre}
          />
        </View>

        <View style={estilos.grupoCampo}>
          <Text style={estilos.label}>Nombre de usuario</Text>
          <TextInput style={estilos.campoTexto} placeholder="miusuario" autoCapitalize="none" value={usuario} onChangeText={setUsuario} />
        </View>

        {/* Documento del cliente para identificarlo. */}
        <View style={estilos.grupoCampo}>
          <Text style={estilos.label}>Documento</Text>
          <TextInput
            style={estilos.campoTexto}
            placeholder="Numero de documento"
            keyboardType="numeric"
            value={documento}
            onChangeText={setDocumento}
          />
        </View>

        {/* Correo del cliente para su cuenta o contacto. */}
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

        <View style={estilos.grupoCampo}>
          <Text style={estilos.label}>Clave (minimo 8 caracteres)</Text>
          <TextInput style={estilos.campoTexto} placeholder="Crea una clave segura" value={clave} onChangeText={setClave} secureTextEntry />
        </View>

        <View style={estilos.grupoCampo}>
          <Text style={estilos.label}>Telefono</Text>
          <TextInput style={estilos.campoTexto} placeholder="Telefono de contacto" keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
        </View>

        <View style={estilos.grupoCampo}>
          <Text style={estilos.label}>Direccion</Text>
          <TextInput style={estilos.campoTexto} placeholder="Direccion de residencia" value={direccion} onChangeText={setDireccion} />
        </View>

        {mensaje ? <Text style={[estilos.mensaje, registroCorrecto && estilos.mensajeCorrecto]}>{mensaje}</Text> : null}

        <TouchableOpacity style={estilos.botonPrincipal} onPress={guardarCliente} disabled={cargando}>
          <Text style={estilos.textoBotonPrincipal}>{cargando ? 'Guardando...' : 'Crear cuenta'}</Text>
        </TouchableOpacity>

        {/* Boton para regresar al login si no quiero registrar. */}
        <TouchableOpacity style={estilos.botonSecundario} onPress={() => navigation.goBack()}>
          <Text style={estilos.textoBotonSecundario}>Volver al login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Estilos de la pantalla de registro.
const estilos = StyleSheet.create({
  contenedor: {
    flexGrow: 1,
    backgroundColor: colores.fondo,
    justifyContent: 'center',
    padding: 24,
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
  marca: {
    color: colores.verde,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  titulo: {
    color: colores.tinta,
    fontSize: 28,
    fontWeight: '800',
  },
  textoAyuda: {
    color: colores.textoSuave,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
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
  botonPrincipal: {
    height: 50,
    borderRadius: 8,
    backgroundColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  textoBotonPrincipal: {
    color: colores.blanco,
    fontSize: 16,
    fontWeight: '800',
  },
  mensaje: {
    color: colores.error,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  mensajeCorrecto: {
    color: colores.verdeOscuro,
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
