import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../App';
import { colores } from '../src/tema/colores';

type Props = NativeStackScreenProps<RootStackParamList, 'Registro'>;

export default function VentanaRegistro({ navigation }: Props) {
  // Estados del formulario para capturar los datos iniciales del cliente.
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [documento, setDocumento] = useState('');

  // En esta fase todavia no guardo el cliente en Firebase.
  // Por ahora simulo que el empleado hizo el registro y vuelvo al panel empleado.
  const registrarCliente = () => {
    navigation.navigate('Home', {
      usuarioId: 'empleado_001',
      usuario: 'empleado',
      rol: 'empleado',
      nombre: 'Empleado Punto Verde',
      correo: 'empleado@ecopuntos.com',
    });
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      {/* Formulario base para que un empleado cree un cliente. */}
      <View style={estilos.panel}>
        <Text style={estilos.marca}>EcoPuntos</Text>
        <Text style={estilos.titulo}>Crear cliente</Text>
        <Text style={estilos.textoAyuda}>Vista base para empleados: registra los datos iniciales del cliente.</Text>

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

        {/* Boton que simula guardar el cliente. */}
        <TouchableOpacity style={estilos.botonPrincipal} onPress={registrarCliente}>
          <Text style={estilos.textoBotonPrincipal}>Guardar cliente</Text>
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
