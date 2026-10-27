# ReciCash

Aplicacion movil construida con Expo SDK 57, React Native y Supabase. Permite crear cuentas de cliente, iniciar sesion, mantener la sesion en el dispositivo y gestionar las tablas operativas de la base de datos.

## Requisitos

- Node.js 22.13 o superior, segun Expo SDK 57.
- Una cuenta y un proyecto de Supabase.
- Expo Go actualizado o un emulador Android/iOS.

## Preparar Supabase

1. En el SQL Editor de Supabase, ejecuta el esquema inicial descrito en [`docs/base-datos-fase-1.md`](docs/base-datos-fase-1.md).
2. Ejecuta [`supabase/entrega_final.sql`](supabase/entrega_final.sql) para configurar Supabase Auth, el perfil de cliente y las politicas RLS. El script elimina la columna antigua `usuarios.clave`, porque las contrasenas se validan con Supabase Auth.
3. En Authentication, revisa la confirmacion de correo. Si esta activa, la persona tendra que confirmar su correo antes de iniciar sesion.
4. Crea una cuenta desde la aplicacion para obtener un perfil. Para asignar el rol de administracion al primer usuario, ejecuta en SQL Editor cambiando el correo:

   ```sql
   update public.usuarios
   set rol = 'administrador'
   where correo = 'tu-correo@ejemplo.com';
   ```

   Las cuentas nuevas se registran como clientes. Los perfiles de empleados y administradores se crean y asignan desde el panel de Supabase.

## Configurar la app

1. Copia `.env.example` como `.env` en la raiz del proyecto.
2. Reemplaza los valores con la URL del proyecto y la publishable key desde **Project Settings > API Keys** en Supabase.
3. Instala las dependencias y levanta Expo:

   ```bash
   npm install
   npx expo start
   ```

Para abrir una plataforma directamente, usa `npx expo start --android`, `npx expo start --ios` o `npx expo start --web`.

La publishable key se puede incluir en la app cliente; las politicas RLS protegen las filas. Nunca incluyas una `service_role` key ni otra clave secreta en variables `EXPO_PUBLIC_*`.

## Funciones disponibles

- Inicio y cierre de sesion con Supabase Auth.
- Persistencia de sesion con almacenamiento seguro del dispositivo en Android/iOS.
- Registro de clientes con validacion de correo y clave de minimo ocho caracteres.
- Gestion CRUD, busqueda y listado para clientes, materiales, movimientos, aliados, recompensas, canjes y centros de acopio. El acceso se limita a administradores y las politicas de la base validan permisos.
- La tabla `usuarios` almacena el perfil y el rol, no las contrasenas; las cuentas se administran con Supabase Auth.

## Estructura

- `componentes/`: pantallas y formularios.
- `src/servicios/`: autenticacion y acceso a Supabase.
- `src/modelos/`: tipos de las entidades.
- `src/datos/`: datos de ejemplo para metricas y prototipos locales.
- `docs/`: modelo de datos y relaciones.
- `supabase/`: configuracion SQL de autenticacion y RLS.
