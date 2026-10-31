import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import Home from './componentes/Home';
import GestionDatos from './componentes/GestionDatos';
import VentanaLogin from './componentes/VentanaLogin';
import VentanaRegistro from './componentes/VentanaRegistro';
import VentanaCambiarClave from './componentes/VentanaCambiarClave';
import type { RolUsuario, Usuario } from './src/modelos/baseDatos';
import { obtenerRolEsperadoDuranteLogin, obtenerUsuarioDeSesion } from './src/servicios/autenticacion';
import { supabase } from './src/servicios/supabase';
import { colores } from './src/tema/colores';

// Aqui defino las pantallas que tiene mi app y que datos recibe cada una.
// Esto me ayuda a que TypeScript me avise si envio mal un parametro al navegar.
export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  CambiarClave: undefined;
  Home: {
    usuarioId: string;
    usuario: string;
    rol: RolUsuario;
    nombre: string;
    correo: string;
  };
  GestionDatos: { grupo?: string; tabla?: string; usuarioId?: string; rol?: RolUsuario } | undefined;
};

// Creo el navegador principal tipo Stack, que funciona como una pila de pantallas.
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [usuarioActivo, setUsuarioActivo] = useState<Usuario | null>(null);
  const [revisandoSesion, setRevisandoSesion] = useState(true);
  const [recuperacionActiva, setRecuperacionActiva] = useState(false);

  // Reviso si habia una sesion guardada y escucho los cambios de acceso.
  useEffect(() => {
    let sigueMontado = true;
    let revisionSesion = 0;
    let procesandoRecuperacion = false;
    if (Platform.OS === 'web' && typeof globalThis.location !== 'undefined'
      && new URLSearchParams(globalThis.location.search).get('flow') === 'recovery') {
      procesandoRecuperacion = true;
      setRecuperacionActiva(true);
    }

    const cargarSesion = async () => {
      if (!supabase) {
        setRevisandoSesion(false);
        return;
      }

      try {
        const revisionInicial = revisionSesion;
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          const perfil = await obtenerUsuarioDeSesion(data.session.user);
          if (sigueMontado && revisionInicial === revisionSesion) setUsuarioActivo(perfil);
        }
      } catch {
        await supabase.auth.signOut();
      } finally {
        if (sigueMontado) setRevisandoSesion(false);
      }
    };

    void cargarSesion();
    const { data: listener } = supabase?.auth.onAuthStateChange((evento, sesion) => {
      const revisionActual = ++revisionSesion;
      if (evento === 'PASSWORD_RECOVERY') {
        procesandoRecuperacion = true;
        setRecuperacionActiva(true);
        setUsuarioActivo(null);
        setRevisandoSesion(false);
        return;
      }
      if (procesandoRecuperacion && (evento === 'USER_UPDATED' || evento === 'SIGNED_IN')) return;
      const rolEsperado = obtenerRolEsperadoDuranteLogin();
      if (!sesion) {
        setUsuarioActivo(null);
        setRevisandoSesion(false);
        return;
      }

      // Cargo el perfil despues de que Supabase confirma la nueva sesion.
      void obtenerUsuarioDeSesion(sesion.user)
        .then((perfil) => {
          if (!sigueMontado || revisionActual !== revisionSesion) return;
          // No montar el Home desde el listener hasta que el servicio confirme el rol elegido.
          if (rolEsperado && perfil.rol !== rolEsperado) return;
          setUsuarioActivo(perfil);
        })
        .catch(() => {
          if (revisionActual === revisionSesion) void supabase?.auth.signOut();
        });
    }) ?? { data: { subscription: null } };

    // En iOS/Android el enlace de Supabase vuelve a recicash://auth/callback.
    const procesarEnlaceAuth = async (url: string | null) => {
      if (!url || !supabase || Platform.OS === 'web') return;
      try {
        const parsed = new URL(url);
        if (parsed.searchParams.get('flow') === 'recovery') {
          procesandoRecuperacion = true;
          setRecuperacionActiva(true);
          setUsuarioActivo(null);
        }
        const code = parsed.searchParams.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          return;
        }
        const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
        const access_token = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');
        if (access_token && refresh_token) await supabase.auth.setSession({ access_token, refresh_token });
      } catch {
        // Un enlace incompleto o vencido no debe impedir abrir la app.
      }
    };
    // Si el sistema no puede leer el enlace inicial, la app sigue abriendo normalmente.
    void Linking.getInitialURL().then(procesarEnlaceAuth).catch(() => undefined);
    const enlaceListener = Linking.addEventListener('url', ({ url }) => void procesarEnlaceAuth(url));

    return () => {
      sigueMontado = false;
      listener?.subscription?.unsubscribe();
      enlaceListener.remove();
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
        key={usuarioActivo?.id ?? (recuperacionActiva ? 'recuperacion' : 'sin-sesion')}
        initialRouteName={usuarioActivo ? 'Home' : recuperacionActiva ? 'CambiarClave' : 'Login'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f4f7f2' },
        }}
      >
        {recuperacionActiva ? (
          <Stack.Screen name="CambiarClave">
            {() => <VentanaCambiarClave onContinuar={() => {
              void supabase?.auth.signOut().finally(() => setRecuperacionActiva(false));
            }} />}
          </Stack.Screen>
        ) : usuarioActivo ? (
          <>
            <Stack.Screen
              name="Home"
              component={Home}
              initialParams={rutasHome!}
              options={{
                headerShown: true,
                headerBackVisible: false,
                title: 'ReciCash',
                headerStyle: { backgroundColor: colores.azulOscuro },
                headerTintColor: colores.blanco,
                headerTitleStyle: { fontWeight: '900' },
              }}
            />
            <Stack.Screen
              name="GestionDatos"
              component={GestionDatos}
              options={({ navigation }) => ({
                headerShown: true,
                headerBackVisible: false,
                title: 'ReciCash',
                headerStyle: { backgroundColor: colores.azulOscuro },
                headerTintColor: colores.blanco,
                headerTitleStyle: { fontWeight: '900' },
                // Dejo un acceso fijo a Inicio mientras se está dentro de cualquier módulo.
                headerRight: () => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Ir al menú principal"
                    onPress={() => navigation.navigate('Home', rutasHome!)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                  >
                    <Text style={{ color: colores.blanco, fontWeight: '800' }}>Inicio</Text>
                  </TouchableOpacity>
                ),
              })}
            />
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
