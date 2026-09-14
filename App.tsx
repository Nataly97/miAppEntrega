import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import VentanaLogin from './componentes/VentanaLogin';
import VentanaRegistro from './componentes/VentanaRegistro';

export default function App() {
  const [pantalla, setPantalla] = useState<'login' | 'registro'>('login');

  return (
    <>
      {pantalla === 'login' ? (
        <VentanaLogin onRegistrarse={() => setPantalla('registro')} />
      ) : (
        <VentanaRegistro onVolverLogin={() => setPantalla('login')} />
      )}
      <StatusBar style="auto" />
    </>
  );
}
