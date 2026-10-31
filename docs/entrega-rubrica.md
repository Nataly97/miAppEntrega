# Revisión de requisitos de entrega

ReciCash separa las pantallas, los servicios, los modelos y el esquema de Supabase para que sea más sencillo ubicar cada responsabilidad.

## Revisión por ponderación

| Criterio | Peso | Evidencia en el proyecto | Estado de la revisión |
| --- | ---: | --- | --- |
| Autenticación y login | 15% | Supabase Auth, validación de correo y contraseña, confirmación de correo, mensajes de error, rutas privadas y persistencia de sesión. | Código revisado; el envío de correos depende de la configuración del proyecto Supabase. |
| Navegación, sesión y Home | 10% | Panel con accesos por rol y resumen inicial. Las pantallas autenticadas comparten una barra superior y los módulos tienen acceso directo a Inicio; cerrar sesión vuelve al login. | Código revisado; persistencia configurada para web y móvil. |
| Modelo de datos y entidades | 35% | Diez tablas relacionadas, restricciones e índices únicos, CRUD por módulos y funciones transaccionales para recogidas y canjes. | Esquema revisado; RLS y políticas se comprueban al ejecutar el SQL. Las pruebas de acceso por rol requieren cuentas de prueba reales. |
| Diseño visual y experiencia | 15% | Paleta consistente, panel adaptativo, barra global de navegación, indicadores de carga y mensajes para listas vacías. | Código revisado y export web generado. |
| Arquitectura y funcionamiento | 25% | Componentes, modelos y servicios separados; variables de entorno; capturas de errores; README con preparación y ejecución. | `npm run typecheck` y export web pasaron. La Edge Function requiere despliegue en Supabase. |

Las tablas son `usuarios`, `clientes`, `materialesReciclables`, `movimientosPuntos`, `aliados`, `recompensas`, `canjes`, `centrosAcopio`, `solicitudesRecogida` y `entidadesFinancieras`.

## Estructura y modularidad

- `componentes/` contiene pantallas y módulos visuales.
- `src/servicios/` contiene la conexión con Supabase, autenticación y consultas.
- `src/modelos/` define la forma de los datos que usa la app.
- `src/datos/` contiene datos de muestra para la interfaz; no crea cuentas reales.
- `supabase/esquema_inicial.sql` contiene en un solo archivo tablas, relaciones, funciones, triggers, permisos y comprobaciones RLS.
- `supabase/functions/admin-gestionar-usuario/` contiene la función de servidor para administrar cuentas con permisos elevados.

La conexión a la base de datos está en `src/servicios/supabase.ts`. Ahí leo la URL y la llave pública que guardo en `.env` y creo el cliente que usa la app. La llave pública sirve para identificar el proyecto desde el cliente; las políticas RLS de Supabase son las que limitan qué puede hacer cada rol. La llave secreta del servidor se queda en Supabase y nunca se incluye en la aplicación.

## Errores y operaciones asíncronas

Las consultas y cambios a Supabase esperan su respuesta y revisan el error que devuelve. Los formularios muestran el resultado, y las pantallas de carga muestran un estado mientras esperan los datos. El panel principal también captura errores al cargar conexión y métricas para que un fallo de red no deje una promesa sin atender.

La conexión a internet, la configuración del proyecto, las políticas RLS y la entrega de correo dependen de Supabase y del dispositivo. Por eso, para la revisión final se debe ejecutar el flujo con un proyecto de prueba y cuentas de cada rol.

## Despliegue y ejecución

El [README](../README.md) explica requisitos, instalación con `npm ci`, variables de entorno, preparación de Supabase, despliegue de la Edge Function y comandos de Expo. Para una instalación nueva se ejecuta solamente `supabase/esquema_inicial.sql` en SQL Editor. El archivo termina verificando que RLS esté habilitada y que cada tabla tenga políticas registradas.

La Edge Function se despliega por separado porque el SQL no puede publicar código de servidor. Después de enlazar el proyecto con Supabase CLI, se ejecuta `npx supabase functions deploy admin-gestionar-usuario`.

## Accesos por rol

| Rol | Acceso principal |
| --- | --- |
| Cliente | Solicita recogidas, consulta sus puntos e historial y solicita canjes. |
| Gestor / aliado | Consulta recogidas disponibles y asignadas; crea solicitudes y las asigna a gestores activos. |
| Entidad financiera | Consulta el historial permitido de canjes. |
| Administrador | Gestiona cuentas, catálogos, puntos, canjes, recogidas y reportes. |

RLS controla el acceso desde la base de datos y la interfaz muestra las opciones del rol. El selector del login solo comprueba el rol guardado; no concede permisos. Para verificar permisos hay que iniciar sesión con cada rol e intentar tanto acciones permitidas como denegadas.

## Pruebas que requieren Supabase

La exportación local no puede probar las políticas con sesiones reales, confirmar que SMTP entregue mensajes, comprobar que el proyecto remoto tenga este esquema o que la Edge Function desplegada sea la versión del repositorio. En Supabase de prueba, crea una cuenta por rol y verifica: que un cliente no lea datos de otro; que un gestor gestione solo las recogidas permitidas; que una entidad financiera consulte únicamente el historial autorizado; y que solo un administrador gestione cuentas y catálogos. El SQL comprueba RLS y la existencia de políticas, pero esa comprobación no reemplaza estas pruebas funcionales.
