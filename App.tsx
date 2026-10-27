import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import Home from './componentes/Home';
import GestionDatos from './componentes/GestionDatos';
import VentanaLogin from './componentes/VentanaLogin';
import VentanaRegistro from './componentes/VentanaRegistro';
import type { RolUsuario, Usuario } from './src/modelos/baseDatos';
import { obtenerUsuarioDeSesion } from './src/servicios/autenticacion';
import { supabase } from './src/servicios/supabase';
import { colores } from './src/tema/colores';

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
  GestionDatos: undefined;
};

// Creo el navegador principal tipo Stack, que funciona como una pila de pantallas.
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [usuarioActivo, setUsuarioActivo] = useState<Usuario | null>(null);
  const [revisandoSesion, setRevisandoSesion] = useState(true);

  // Reviso si habia una sesion guardada y escucho los cambios de acceso.
  useEffect(() => {
    let sigueMontado = true;

    const cargarSesion = async () => {
      if (!supabase) {
        setRevisandoSesion(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          const perfil = await obtenerUsuarioDeSesion(data.session.user);
          if (sigueMontado) setUsuarioActivo(perfil);
        }
      } catch {
        await supabase.auth.signOut();
      } finally {
        if (sigueMontado) setRevisandoSesion(false);
      }
    };

    void cargarSesion();
    const { data: listener } = supabase?.auth.onAuthStateChange((_evento, sesion) => {
      if (!sesion) {
        setUsuarioActivo(null);
        setRevisandoSesion(false);
        return;
      }

      // Cargo el perfil despues de que Supabase confirma la nueva sesion.
      void obtenerUsuarioDeSesion(sesion.user)
        .then((perfil) => sigueMontado && setUsuarioActivo(perfil))
        .catch(() => supabase?.auth.signOut());
    }) ?? { data: { subscription: null } };

    return () => {
      sigueMontado = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  if (revisandoSesion) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo }}>
        <ActivityIndicator size="large" color={colores.verde} />
      </View>
    );
  }

  const rutasHome = usuarioActivo
    ? {
        usuarioId: usuarioActivo.id,
        usuario: usuarioActivo.usuario,
        rol: usuarioActivo.rol,
        nombre: usuarioActivo.nombre,
        correo: usuarioActivo.correo,
      }
    : undefined;

  return (
    // NavigationContainer envuelve toda la navegacion de la app.
    <NavigationContainer>
      <StatusBar style="light" />
      {/* Este Stack controla que pantalla se muestra: Login, Registro o Home. */}
      <Stack.Navigator
        key={usuarioActivo?.id ?? 'sin-sesion'}
        initialRouteName={usuarioActivo ? 'Home' : 'Login'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f4f7f2' },
        }}
      >
        {usuarioActivo ? (
          <>
            <Stack.Screen name="Home" component={Home} initialParams={rutasHome!} />
            <Stack.Screen name="GestionDatos" component={GestionDatos} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={VentanaLogin} />
            <Stack.Screen name="Registro" component={VentanaRegistro} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
