import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import Home from './componentes/Home';
import VentanaLogin from './componentes/VentanaLogin';
import VentanaRegistro from './componentes/VentanaRegistro';
import type { RolUsuario } from './src/modelos/baseDatos';

// Aqui defino las pantallas que tiene mi app y que datos recibe cada una.
// Esto me ayuda a que TypeScript me avise si envio mal un parametro al navegar.
export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  Home: {
    usuarioId: string;
    usuario: string;
    rol: RolUsuario;
    nombre: string;
    correo: string;
  };
};

// Creo el navegador principal tipo Stack, que funciona como una pila de pantallas.
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    // NavigationContainer envuelve toda la navegacion de la app.
    <NavigationContainer>
      <StatusBar style="light" />
      {/* Este Stack controla que pantalla se muestra: Login, Registro o Home. */}
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f4f7f2' },
        }}
      >
        <Stack.Screen name="Login" component={VentanaLogin} />
        <Stack.Screen name="Registro" component={VentanaRegistro} />
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
