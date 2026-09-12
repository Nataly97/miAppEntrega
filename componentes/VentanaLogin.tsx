import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function VentanaLogin() {
  const titulo = 'Iniciar sesion';
  const textoBoton = 'Entrar';

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.tarjeta}>
        <Text style={estilos.titulo}>{titulo}</Text>

        <View style={estilos.grupoCampo}>
          <Text style={estilos.etiqueta}>Correo</Text>
          <TextInput
            style={estilos.campoTexto}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={estilos.grupoCampo}>
          <Text style={estilos.etiqueta}>Clave</Text>
          <TextInput
            style={estilos.campoTexto}
            placeholder="Ingresa tu clave"
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={estilos.boton}>
          <Text style={estilos.textoBoton}>{textoBoton}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#eef2f7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  grupoCampo: {
    marginBottom: 18,
  },
  etiqueta: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  campoTexto: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#111827',
  },
  boton: {
    height: 48,
    borderRadius: 6,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  textoBoton: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
