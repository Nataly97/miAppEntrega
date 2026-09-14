import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type VentanaLoginProps = {
  onRegistrarse: () => void;
  onIrHome: () => void;
};

export default function VentanaLogin({ onRegistrarse, onIrHome }: VentanaLoginProps) {
  const titulo = 'Iniciar sesion';
  const textoBoton = 'Entrar';

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.contenedorInfo}>
        <Text style={estilos.marca}>3R ENERGY S.A.S. BIC</Text>
        <Text style={estilos.titulo}>{titulo}</Text>

        <View style={estilos.contenedorDatos}>
          <Text style={estilos.label}>Correo</Text>
          <TextInput
            style={estilos.campoTexto}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={estilos.contenedorDatos}>
          <Text style={estilos.label}>Clave</Text>
          <TextInput
            style={estilos.campoTexto}
            placeholder="Ingresa tu clave"
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={estilos.boton}>
          <Text style={estilos.textoBoton}>{textoBoton}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={estilos.botonRegistrarse} onPress={onRegistrarse}>
          <Text style={estilos.textoBotonRegistrarse}>Registrarse</Text>
        </TouchableOpacity>

        <TouchableOpacity style={estilos.botonOk} onPress={onIrHome}>
          <Text style={estilos.textoBotonOk}>Ok</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#0b0d3a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  contenedorInfo: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: '#009846',
    shadowColor: '#ffffff',
  },
  marca: {
    color: '#009846',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0b0d3a',
    textAlign: 'center',
    marginBottom: 8,
  },
  contenedorDatos: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    color: '#0b0d3a',
    marginBottom: 8,
    fontWeight: '600',
  },
  campoTexto: {
    height: 48,
    borderWidth: 1,
    borderColor: '#009846',
    borderRadius: 6,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#111827',
  },
  boton: {
    height: 48,
    borderRadius: 6,
    backgroundColor: '#009846',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  textoBoton: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  botonRegistrarse: {
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffe500',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: '#ffffff',
  },
  textoBotonRegistrarse: {
    color: '#0b0d3a',
    fontSize: 16,
    fontWeight: '700',
  },
  botonOk: {
    height: 48,
    borderRadius: 6,
    backgroundColor: '#ffe500',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  textoBotonOk: {
    color: '#0b0d3a',
    fontSize: 16,
    fontWeight: '800',
  },
});
