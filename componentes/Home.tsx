import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type VentanaHomeProps = {
  onVolverLogin: () => void;
};
export default function Home({ onVolverLogin }: VentanaHomeProps) {
  return (
    <View style={estilos.contenedor}>
            <View style={estilos.contenedorInfo}>
      
      <Text style={estilos.mensaje}>Profe no me vaya a poner cero que andaba en la trabajación 🫣🫠</Text>
      <TouchableOpacity style={estilos.botonInicioSesion} onPress={onVolverLogin}>
        <Text style={estilos.textoBotonInicioSesion}>Inicio de sesión</Text>
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
  mensaje: {
    color: '#fb0d0d',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  botonInicioSesion: {
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#009846',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: '#ffffff',
  },
  textoBotonInicioSesion: {
    color: '#009846',
    fontSize: 16,
    fontWeight: '700',
  },
});
