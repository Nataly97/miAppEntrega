import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { guardarNuevaClave } from '../src/servicios/autenticacion';
import { colores } from '../src/tema/colores';

export default function VentanaCambiarClave({ onContinuar }: { onContinuar: () => void }) {
  const [clave, setClave] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [correcto, setCorrecto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setMensaje('');
    if (clave.length < 8) return setMensaje('La contraseña debe tener al menos 8 caracteres.');
    if (clave !== confirmacion) return setMensaje('Las contraseñas no coinciden.');
    setGuardando(true);
    try {
      await guardarNuevaClave(clave);
      setCorrecto(true);
      setMensaje('La contraseña se actualizó correctamente.');
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo actualizar la contraseña. Solicita un enlace nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <View style={estilos.panel}>
        <Text style={estilos.marca}>ReciCash</Text>
        <Text style={estilos.titulo}>{correcto ? 'Contraseña actualizada' : 'Crea una contraseña nueva'}</Text>
        {!correcto ? <>
          <Text style={estilos.descripcion}>El enlace fue validado. Escribe y confirma tu nueva contraseña.</Text>
          <Text style={estilos.etiqueta}>Nueva contraseña</Text>
          <TextInput style={estilos.campo} value={clave} onChangeText={setClave} secureTextEntry autoCapitalize="none" />
          <Text style={estilos.etiqueta}>Confirmar contraseña</Text>
          <TextInput style={estilos.campo} value={confirmacion} onChangeText={setConfirmacion} secureTextEntry autoCapitalize="none" />
        </> : null}
        {mensaje ? <Text style={[estilos.mensaje, correcto && estilos.exito]}>{mensaje}</Text> : null}
        <TouchableOpacity style={estilos.boton} onPress={correcto ? onContinuar : () => void guardar()} disabled={guardando}>
          <Text style={estilos.textoBoton}>{correcto ? 'Volver al inicio de sesión' : guardando ? 'Guardando…' : 'Guardar contraseña'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, backgroundColor: colores.fondo, justifyContent: 'center', padding: 24 },
  panel: { width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: colores.blanco, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: colores.borde },
  marca: { color: colores.verdeOscuro, fontSize: 28, fontWeight: '900', marginBottom: 16 },
  titulo: { color: colores.tinta, fontSize: 24, fontWeight: '800', marginBottom: 10 },
  descripcion: { color: colores.textoSuave, fontSize: 14, marginBottom: 18 },
  etiqueta: { color: colores.tinta, fontSize: 14, fontWeight: '700', marginBottom: 7, marginTop: 12 },
  campo: { height: 48, borderWidth: 1, borderColor: colores.borde, borderRadius: 8, paddingHorizontal: 14, fontSize: 16, color: colores.tinta },
  mensaje: { color: colores.error, fontSize: 14, fontWeight: '700', marginTop: 16 },
  exito: { color: colores.verdeOscuro },
  boton: { height: 50, borderRadius: 8, backgroundColor: colores.verde, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  textoBoton: { color: colores.blanco, fontSize: 15, fontWeight: '800' },
});
