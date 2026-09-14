import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import Home from './componentes/Home';
import VentanaLogin from './componentes/VentanaLogin';
import VentanaRegistro from './componentes/VentanaRegistro';

export default function App() {
  const [pantalla, setPantalla] = useState<'login' | 'registro' | 'home'>('login');

  return (
    <>
      {pantalla === 'login' && (
        <VentanaLogin
          onRegistrarse={() => setPantalla('registro')}
          onIrHome={() => setPantalla('home')}
        />
      )}

      {pantalla === 'registro' && (
        <VentanaRegistro onVolverLogin={() => setPantalla('login')} />
      )}

      {pantalla === 'home' && (
        <Home onVolverLogin={() => setPantalla('login')} />
      )}
      <StatusBar style="auto" />
    </>
  );
}
